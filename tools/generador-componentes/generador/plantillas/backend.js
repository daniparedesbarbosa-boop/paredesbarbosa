import { js, singularPluralName, slugify } from "../datos.js"
import { relacionMeta } from "../relaciones.js"
import { catalogApiFunctionName, propertyAccess } from "../catalogos.js"

function mongooseField(field) {
  const type = field.type === "number" ? "Number" : field.type === "boolean" ? "Boolean" : "String"
  const properties = [`type: ${type}`]
  const validators = []
  if (field.required) properties.push("required: true")
  if (field.type === "number") {
    if (field.min !== null) properties.push(`min: ${Number(field.min)}`)
    if (field.max !== null) properties.push(`max: ${Number(field.max)}`)
    if (field.step !== null) {
      const step = Number(field.step)
      const base = field.min === null ? 0 : Number(field.min)
      validators.push(`{ validator: (value) => {
        if (value == null || value === "") return true;
        const steps = (value - ${base}) / ${step};
        return Number.isFinite(value) && Math.abs(steps - Math.round(steps)) < 1e-8;
      }, message: "El número no respeta el incremento permitido" }`)
    }
  } else {
    // Los catálogos guardan el valor elegido como texto, igual que espedoc en
    // backend/modelos/doctor.js; no se validan contra la lista para que el JSON
    // pueda actualizarse sin tocar el esquema.
    if (["text", "textarea", "email", "phone", "catalog"].includes(field.type)) properties.push("trim: true")
    if (field.type === "date") {
      const dateLimits = [
        field.min === null ? "" : `&& value >= ${js(field.min)}`,
        field.max === null ? "" : `&& value <= ${js(field.max)}`,
      ].filter(Boolean).join("\n          ")
      validators.push(`{ validator: (value) => {
        if (value == null || value === "") return true;
        const date = new Date(\`\${value}T00:00:00.000Z\`);
        return /^\\d{4}-\\d{2}-\\d{2}$/.test(value)
          && !Number.isNaN(date.getTime())
          && date.toISOString().slice(0, 10) === value${dateLimits ? `\n          ${dateLimits}` : ""};
      }, message: "La fecha no es válida o está fuera de los límites permitidos" }`)
    } else if (field.type === "time") {
      const timeLimits = [
        field.min === null ? "" : `&& value >= ${js(field.min)}`,
        field.max === null ? "" : `&& value <= ${js(field.max)}`,
      ].filter(Boolean).join("\n          ")
      validators.push(`{ validator: (value) => value == null || value === ""
        || (/^(?:[01]\\d|2[0-3]):[0-5]\\d$/.test(value)
          ${timeLimits ? `\n          ${timeLimits}` : ""}), message: "La hora no es válida o está fuera de los límites permitidos" }`)
    }
    if (field.min !== null && ["text", "textarea", "email", "phone"].includes(field.type)) {
      if (field.required) properties.push(`minlength: ${Number(field.min)}`)
      else {
        validators.push(`{ validator: (value) => value == null || value === "" || value.length >= ${Number(field.min)}, message: "El valor es demasiado corto" }`)
      }
    }
    if (field.max !== null && ["text", "textarea", "email", "phone"].includes(field.type)) {
      properties.push(`maxlength: ${Number(field.max)}`)
    }
  }
  const pattern = field.pattern || (field.type === "email" ? "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" : "")
  if (pattern) {
    const flags = field.pattern ? field.patternFlags : ""
    validators.push(`{ validator: (value) => {
      if (value == null || value === "") return true;
      const match = new RegExp(${js(pattern)}, ${js(flags)}).exec(String(value));
      return match?.index === 0 && match[0].length === String(value).length;
    }, message: ${js(field.patternMessage || "El formato no es válido")} }`)
  }
  if (validators.length) properties.push(`validate: [${validators.join(", ")}]`)
  if (["select", "radio"].includes(field.type)) {
    const allowedValues = field.options.map((option) => option.value)
    if (!field.required) allowedValues.push("")
    properties.push(`enum: ${js(allowedValues)}`)
  }
  if (field.defaultValue !== "") {
    const value = field.type === "number" ? Number(field.defaultValue)
      : field.type === "boolean" ? field.defaultValue === "true"
        : field.defaultValue
    properties.push(`default: ${js(value)}`)
  } else if (field.type === "boolean") {
    properties.push("default: false")
  }
  return `    ${field.name}: { ${properties.join(", ")} },`
}

function mongooseRelationField(relation) {
  const meta = relacionMeta(relation)
  if (meta.relationIdField) {
    const properties = ["type: String", "trim: true"]
    if (relation.required) properties.push("required: true")
    return `    // Relación con ${meta.label.toLowerCase()} mediante su identificador público ${meta.relationIdField}.
    ${relation.fieldName}: { ${properties.join(", ")} },`
  }
  const properties = [
    "type: mongoose.Schema.Types.ObjectId",
    `ref: ${js(meta.refModel)}`,
  ]
  if (relation.required) properties.push("required: true")
  return `    // Referencia al documento real de ${meta.label}: MongoDB guarda su ObjectId.
    ${relation.fieldName}: { ${properties.join(", ")} },`
}

export function generateModel(config) {
  const { singular, plural } = config.entity
  const modelFileName = `${singular[0].toLowerCase()}${singular.slice(1)}.js`
  return `// Dónde va: backend/modelos/${modelFileName}
// Qué es: el «modelo» ${singular}. Un esquema Mongoose declara los campos de cada
// documento de la colección ${plural}, cuáles son obligatorios y sus validaciones;
// el backend usa este modelo en las rutas para consultar y guardar datos.
import mongoose from "mongoose";

// Este esquema describe los campos y validaciones de cada documento ${singular}.
const ${singular}Schema = new mongoose.Schema(
  {
${[
    ...config.fields.map(mongooseField),
    ...config.relations.map(mongooseRelationField),
  ].join("\n")}
  },
  {
    // Fija el nombre para no depender de la pluralización automática de Mongoose.
    collection: ${js(plural)},
  }
);

// Mongoose genera el identificador _id y aplica este esquema al guardar.
export default mongoose.model(${js(singular)}, ${singular}Schema);
`
}

export function generateRoutes(config) {
  const { singular, plural } = config.entity
  const operations = new Set(config.operations)
  const relations = config.relations
  const bodyOperations = operations.has("create") || operations.has("edit")
  const relatedModels = [...new Set(relations.map((relation) => relacionMeta(relation).refModel))]
  const imports = [
    "import express from \"express\";",
    `import ${singular} from "../modelos/${slugify(singular)}.js";`,
    // Solo se importan los modelos realmente referenciados; su único uso aquí es
    // comprobar que el documento relacionado existe antes de guardar (patrón de
    // backend/rutas/citas.rutas.js).
    ...(bodyOperations ? relatedModels.map((model) => `import ${model} from "../modelos/${model}.js";`) : []),
  ]
  const lines = [
    `// Dónde va: backend/rutas/${slugify(plural)}.rutas.js`,
    `// Qué es: un router de Express, el grupo de endpoints HTTP del recurso ${plural}.`,
    "// Los métodos significan: GET consulta, POST crea, PUT edita y DELETE borra.",
    "// El archivo backend/server.js activa estas direcciones al registrar el router",
    "// con app.use(), y ahí es donde hay que añadir la línea del fragmento de integración.",
    ...imports,
    "",
    "const router = express.Router();",
    "",
  ]

  if (bodyOperations) {
    lines.push(
      `const camposPermitidos = ${js([
        ...config.fields.map((field) => field.name),
        ...relations.map((relation) => relation.fieldName),
      ])};`,
      "",
      "// Acepta solo los campos declarados; nunca se guardan propiedades arbitrarias.",
      "function datosPermitidos(body = {}) {",
      "  return Object.fromEntries(",
      "    camposPermitidos",
      "      .filter((campo) => body[campo] !== undefined)",
      "      .map((campo) => [campo, body[campo]])",
      "  );",
      "}",
      "",
      `// Comprueba que cada referencia apunte a un documento existente; devuelve una`,
      `// cadena vacía cuando todas son válidas (mismo patrón que citas.rutas.js).`,
      "async function validarRelaciones(datos) {",
      ...relations.map((relation) => {
        const meta = relacionMeta(relation)
        if (meta.relationIdField) {
          return [
            `  if (datos.${relation.fieldName}) {`,
            `    datos.${relation.fieldName} = String(datos.${relation.fieldName}).trim().toUpperCase();`,
            `    if (!(await ${meta.refModel}.exists({ ${meta.relationIdField}: datos.${relation.fieldName} }))) {`,
            `      return "El ${meta.singularWord} seleccionado no existe";`,
            "    }",
            "  }",
          ].join("\n")
        }
        const model = meta.refModel
        return [
          `  if (datos.${relation.fieldName} && !(await ${model}.exists({ _id: datos.${relation.fieldName} }))) {`,
          `    return "El ${meta.singularWord} seleccionado no existe";`,
          "  }",
        ].join("\n")
      }),
      "  return \"\";",
      "}",
      ""
    )
  }

  if (operations.has("list")) {
    lines.push(
      "// GET /: devuelve todos los documentos de la colección, sin filtros.",
      "router.get(\"/\", async (req, res) => {",
      "  try {",
      `    res.json(await ${singular}.find().lean());`,
      "  } catch (error) {",
      `    console.error("Error al listar ${config.entity.plural}:", error);`,
      `    res.status(500).json({ mensaje: "Error al listar ${config.entity.plural}" });`,
      "  }",
      "});",
      ""
    )
  }
  if (operations.has("create")) {
    lines.push(
      "// POST /: valida las referencias y crea un documento.",
      "router.post(\"/\", async (req, res) => {",
      "  try {",
      "    const datos = datosPermitidos(req.body);",
      ...(relations.length ? [
        "    const errorRelacion = await validarRelaciones(datos);",
        "    if (errorRelacion) return res.status(400).json({ mensaje: errorRelacion });",
        "",
      ] : []),
      `    res.status(201).json(await ${singular}.create(datos));`,
      "  } catch (error) {",
      "    if (error.name === \"ValidationError\" || error.name === \"CastError\") {",
      "      return res.status(400).json({ mensaje: error.message });",
      "    }",
      `    console.error("Error al crear ${config.entity.singular}:", error);`,
      `    res.status(500).json({ mensaje: "Error al crear ${config.entity.singular}" });`,
      "  }",
      "});",
      ""
    )
  }
  if (operations.has("edit")) {
    lines.push(
      "// PUT /:id: actualiza los campos permitidos y vuelve a validarlos,",
      "// incluyendo las referencias a otros documentos.",
      "router.put(\"/:id\", async (req, res) => {",
      "  try {",
      "    const datos = datosPermitidos(req.body);",
      ...(relations.length ? [
        "    const errorRelacion = await validarRelaciones(datos);",
        "    if (errorRelacion) return res.status(400).json({ mensaje: errorRelacion });",
        "",
      ] : []),
      `    const documento = await ${singular}.findByIdAndUpdate(`,
      "      req.params.id,",
      "      datosPermitidos(req.body),",
      "      { new: true, runValidators: true }",
      "    );",
      "    if (!documento) return res.status(404).json({ mensaje: \"Registro no encontrado\" });",
      "    res.json(documento);",
      "  } catch (error) {",
      "    if (error.name === \"ValidationError\" || error.name === \"CastError\") {",
      "      return res.status(400).json({ mensaje: error.message });",
      "    }",
      `    console.error("Error al modificar ${config.entity.singular}:", error);`,
      `    res.status(500).json({ mensaje: "Error al modificar ${config.entity.singular}" });`,
      "  }",
      "});",
      ""
    )
  }
  if (operations.has("delete")) {
    lines.push(
      "// DELETE /:id: elimina un documento usando su _id de MongoDB.",
      "router.delete(\"/:id\", async (req, res) => {",
      "  try {",
      `    const documento = await ${singular}.findByIdAndDelete(req.params.id);`,
      "    if (!documento) return res.status(404).json({ mensaje: \"Registro no encontrado\" });",
      "    res.json({ mensaje: \"Registro eliminado\" });",
      "  } catch (error) {",
      "    if (error.name === \"CastError\") {",
      "      return res.status(400).json({ mensaje: \"El identificador no es válido\" });",
      "    }",
      `    console.error("Error al eliminar ${config.entity.singular}:", error);`,
      `    res.status(500).json({ mensaje: "Error al eliminar ${config.entity.singular}" });`,
      "  }",
      "});",
      ""
    )
  }
  lines.push("export default router;", "")
  return lines.join("\n")
}

export function generateApi(config) {
  const { singular, plural, apiPath } = config.entity
  const operations = new Set(config.operations)
  const lines = [
    `// Dónde va: src/api/${slugify(plural)}.js`,
    "// Qué es: la capa API del frontend. Encapsula Axios para que los componentes",
    "// no construyan URLs ni peticiones a mano: cada función lanza la petición y",
    "// devuelve response.data. Los componentes solo importan y llaman a estas funciones.",
    'import axios from "axios";',
    "",
    "// Dirección completa del recurso; usa el mismo puerto que el resto de módulos del proyecto.",
    `const API_URL = "http://localhost:3000${apiPath}";`,
    "",
  ]
  if (operations.has("list")) {
    lines.push(
      `// GET ${apiPath}: devuelve la lista completa de ${plural}, sin filtros.`,
      `// El componente llama a esta función dentro de try/catch para mostrar los errores.`,
      `export async function get${singularPluralName(singular, plural)}() {`,
      "  const response = await axios.get(API_URL);",
      "  // response.data contiene el array JSON que envió el backend.",
      "  return response.data;",
      "}",
      ""
    )
  }
  if (operations.has("create")) {
    lines.push(
      `// POST ${apiPath}: guarda un ${singular} nuevo y devuelve el documento creado, con su identificador.`,
      "// datos contiene los campos del formulario; el backend valida las reglas del esquema.",
      `export async function create${singular}(datos) {`,
      "  const response = await axios.post(API_URL, datos);",
      "  return response.data;",
      "}",
      ""
    )
  }
  if (operations.has("edit")) {
    lines.push(
      `// PUT ${apiPath}/:id: actualiza un ${singular} y devuelve la versión guardada.`,
      "// id es el identificador del registro (para entidades nuevas, el _id de MongoDB).",
      `export async function update${singular}(id, datos) {`,
      "  const response = await axios.put(`${API_URL}/${encodeURIComponent(id)}`, datos);",
      "  return response.data;",
      "}",
      ""
    )
  }
  if (operations.has("delete")) {
    lines.push(
      `// DELETE ${apiPath}/:id: elimina un ${singular}.`,
      "// id es el identificador del registro; el backend responde 404 si ya no existe.",
      `export async function delete${singular}(id) {`,
      "  const response = await axios.delete(`${API_URL}/${encodeURIComponent(id)}`);",
      "  return response.data;",
      "}",
      ""
    )
  }
  return lines.join("\n")
}

// Módulo de datos del catálogo JSON. El JSON se guarda en backend/data y este
// módulo lo importa directamente: Vite lo incluye en el bundle, así que el
// selector no necesita ninguna ruta nueva en el backend ni depende de que el
// backend esté en marcha.
export function generateCatalogApi(catalog) {
  const functionName = catalog.apiFunction || catalogApiFunctionName(catalog.name)
  const list = catalog.rootKey ? propertyAccess("catalogo", catalog.rootKey) : "catalogo"
  return `// Dónde va: src/api/${catalog.name}.js
// Qué es: la capa de datos del catálogo «${catalog.name}». Importa el JSON de
// backend/data/${catalog.name}.json y devuelve la lista que llena el <select>.
// No hay que registrar ninguna ruta en backend/server.js: Vite incluye el JSON
// en el bundle y el catálogo se carga aunque el backend esté parado.
import catalogo from "../../backend/data/${catalog.name}.json";

// Devuelve la lista preparada para recorrerla con v-for en el componente.
// Es async para que el componente la use igual que las demás API.
export async function ${functionName}() {
  // El JSON puede ser la lista directamente o un objeto con la lista dentro
  // (por ejemplo { "${catalog.name}": [...] }); aquí se devuelve solo la lista.
  return ${list};
}
`
}
