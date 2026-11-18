import { RESOURCE_LIBRARY, escapeHtml, slugify } from "../datos.js"
import { relacionMeta } from "../relaciones.js"
import { catalogApiFunctionName, catalogRoutePath, collectCatalogs } from "../catalogos.js"

const OPERATION_LABELS = { list: "listar", create: "crear", edit: "editar", delete: "borrar" }

// Enlace relativo dentro de la carpeta de salida. La ruta de destino en el
// repositorio es la misma, así que sirve para abrir el archivo y para saber
// exactamente dónde copiarlo.
const fileLink = (path) => `[\`${path}\`](./${path})`

const fence = (source, language = "js") => "```" + language + "\n" +
  String(source).replace(/\s+$/, "") + "\n```"

function orderIndex(path) {
  const prefixes = ["backend/data/", "backend/modelos/", "backend/rutas/", "src/api/", "src/store/", "src/components/"]
  const index = prefixes.findIndex((prefix) => path.startsWith(prefix))
  return index === -1 ? prefixes.length : index
}

// Archivos que el usuario debe copiar, en el orden en que conviene hacerlo.
function generatedFileList(files) {
  return Object.keys(files)
    .filter((path) => path !== "INSTRUCCIONES.md" && path !== "configuracion.json")
    .sort((a, b) => orderIndex(a) - orderIndex(b) || a.localeCompare(b))
}

function filePurpose(config, path) {
  const { singular, plural } = config.entity
  const catalog = collectCatalogs(config).find((entry) => `src/api/${entry.name}.js` === path)
  if (path === `backend/modelos/${slugify(singular)}.js`) {
    return `Esquema Mongoose de \`${singular}\`: campos, tipos, obligatoriedad y validaciones de la colección \`${plural}\`.`
  }
  if (path === `backend/rutas/${slugify(plural)}.rutas.js`) {
    return `Router Express del recurso: \`GET\`, \`POST\`, \`PUT\` y \`DELETE\` según las operaciones elegidas.`
  }
  if (path === `src/api/${slugify(plural)}.js`) {
    return `Capa Axios de \`${plural}\`: las funciones que importa el componente.`
  }
  if (path === `src/components/${config.screen.component}.vue`) {
    return `Pantalla Vue completa (${config.screen.type}) con tabla, formulario y avisos.`
  }
  if (path === `src/store/${slugify(singular)}Store.js`) {
    return "Store Pinia propio para compartir el registro seleccionado entre pantallas."
  }
  if (path.startsWith("backend/data/")) {
    const name = path.slice("backend/data/".length, -".json".length)
    const catalog = collectCatalogs(config).find((entry) => entry.name === name)
    return `Datos del catálogo \`${name}\` (${catalog?.count ?? "varios"} elementos): \`src/api/${name}.js\` importa este JSON directamente, sin ruta ni peticiones al backend.`
  }
  if (catalog) {
    return `Módulo de datos del catálogo \`${catalog.name}\`: importa \`backend/data/${catalog.name}.json\` y devuelve la lista que alimenta el \`<select>\`; no necesita ruta en el backend.`
  }
  return "Archivo generado."
}

// Bloque de código completo de cada módulo generado. Es dinámico: si la
// pantalla usa dos APIs (la entidad y un catálogo, o dos catálogos), aparecen
// las dos con su código y su enlace.
function generatedCode(config, files) {
  const { singular, plural } = config.entity
  const blocks = []
  const add = (path, intro) => {
    if (!files[path]) return
    blocks.push(
      `### \`${path}\`\n\n${intro}\n\nAbre o copia el archivo completo desde ${fileLink(path)}.\n\n${fence(files[path])}`
    )
  }

  add(
    `backend/modelos/${slugify(singular)}.js`,
    `Esquema Mongoose del recurso. Debe existir antes de arrancar el backend, porque el router lo importa.`,
  )
  add(
    `backend/rutas/${slugify(plural)}.rutas.js`,
    `Router Express. Se activa al registrarlo en \`backend/server.js\` con el prefijo \`${config.entity.apiPath}\`.`,
  )
  add(
    `src/api/${slugify(plural)}.js`,
    `Capa Axios de la entidad. El componente importa estas funciones; no cambies sus nombres al copiar.`,
  )
  for (const catalog of collectCatalogs(config)) {
    add(
      `src/api/${catalog.name}.js`,
      catalog.apiFunction
        ? `No se genera: el proyecto ya tiene \`src/api/${catalog.name}.js\` y el componente reutiliza \`${catalog.apiFunction}()\`.`
        : `Capa de datos del catálogo \`${catalog.name}\`: importa ${fileLink(`backend/data/${catalog.name}.json`)} directamente y devuelve la lista para el \`<select>\`; no pide nada al backend ni necesita una ruta nueva.`,
    )
  }
  add(
    `src/store/${slugify(singular)}Store.js`,
    "Store Pinia propio, solo si pediste compartir la selección entre pantallas.",
  )
  return blocks.join("\n\n")
}

// Sección común para las pantallas que cargan algún selector desde un catálogo
// JSON: explica de dónde salen los datos, qué módulo los expone y cómo se filtra.
function catalogsSection(config) {
  const catalogs = collectCatalogs(config)
  if (!catalogs.length) return ""
  const fieldsUsing = (name) => (config.fields ?? [])
    .filter((field) => field.type === "catalog" && field.catalog.name === name)
    .map((field) => `\`${field.name}\`${field.catalog.parentField ? ` (filtrado por \`${field.catalog.parentField}\`)` : ""}`)
    .join(", ")
  const blocks = catalogs.map((catalog) => {
    const loadFunction = catalog.apiFunction || catalogApiFunctionName(catalog.name)
    const dataLine = catalog.source === "inline"
      ? `- ${fileLink(`backend/data/${catalog.name}.json`)}: datos analizados y guardados por el generador (${catalog.count ?? "los"} elementos de la lista \`${catalog.rootKey || "(la raíz es una lista)"}\`). Cópialo a \`backend/data/\`: el módulo \`src/api/${catalog.name}.js\` lo importa desde ahí.`
      : `- \`backend/data/${catalog.name}.json\`: archivo que ya existe en el proyecto; no se copia ni se modifica.`
    const apiLine = catalog.apiFunction
      ? `- \`src/api/${catalog.name}.js\`: se reutiliza la función \`${loadFunction}()\` que ya existe; no se genera otro módulo. El componente la importa igual que las demás.`
      : `- ${fileLink(`src/api/${catalog.name}.js`)}: módulo generado con \`${loadFunction}()\`, que importa el JSON de \`backend/data/\` y devuelve la lista del catálogo. Su código está en la sección de código de los archivos generados.`
    const metadataLine = catalog.primitive
      ? "- La lista contiene valores simples: el `<select>` usa cada valor tal cual."
      : `- Campo visible: \`${catalog.labelField}\`; valor guardado en el formulario: \`${catalog.valueField}\`; identificador: ${catalog.idField ? `\`${catalog.idField}\`` : "no detectado"}.`
    const route = catalog.source === "inline"
      ? `No añadas ninguna ruta en \`backend/server.js\`: este catálogo se importa desde el frontend, así que no depende del backend ni de MongoDB. El JSON tiene que estar en \`backend/data/${catalog.name}.json\` porque el módulo lo importa desde esa ruta.`
      : catalog.routeExists
        ? `La ruta \`${catalogRoutePath(catalog.name)}\` ya está registrada en \`backend/server.js\`; no la dupliques. Comprueba que siga leyendo \`backend/data/${catalog.name}.json\`.`
        : `Comprueba que \`backend/server.js\` tenga registrada la ruta \`${catalogRoutePath(catalog.name)}\`, que lee \`backend/data/${catalog.name}.json\`.`
    return `### Catálogo \`${catalog.name}\`

${dataLine}
${apiLine}
${metadataLine}
- Campos del formulario que lo usan: ${fieldsUsing(catalog.name)}.

${route}`
  }).join("\n\n")

  return `## Catálogos cargados desde archivo JSON

Los campos de tipo **catálogo** no usan opciones fijas: cargan su lista de un JSON guardado en \`backend/data/\`. Los catálogos nuevos se generan en \`backend/data/<nombre>.json\` y \`src/api/<nombre>.js\` importa ese JSON directamente (Vite lo incluye en el bundle), así que no necesitan ruta ni peticiones al backend; los catálogos que ya existen en el proyecto se siguen pidiendo a su ruta \`/api/...\` (\`/api/especialidades\`, \`/api/municipios\`). El componente carga todo en \`cargarCatalogos()\`, que se ejecuta en \`onMounted()\`, y pinta un \`<select>\` con \`v-for\`.

${blocks}

### Filtro dependiente (provincia → municipio)

Si un campo catálogo declara \`parentField\`, el componente busca el registro del catálogo padre por el valor guardado y filtra el hijo con \`startsWith\` sobre los identificadores; es el patrón de \`XestionPacientes.vue\`. Al cambiar el padre se vacía la selección dependiente. Requiere que el identificador del hijo empiece por el del padre y que ambos catálogos tengan identificador.

### Límites de los catálogos

- Son catálogos de solo lectura: no se generan altas, ediciones ni borrados de opciones.
- El backend guarda el valor elegido como texto (como \`espedoc\` en \`backend/modelos/doctor.js\`) y no lo valida contra el JSON; añade esa comprobación en la ruta si la necesitas.
- El JSON se importa al compilar: en desarrollo Vite recarga al cambiarlo y en producción hay que volver a compilar. No se genera caché, paginación ni búsqueda sobre el catálogo.

`
}

function fileTable(config, files) {
  const rows = generatedFileList(files).map((path) =>
    `| ${fileLink(path)} | \`${path}\` | ${filePurpose(config, path)} |`)
  return `| Archivo generado | Ruta en el repositorio | Qué es |
| --- | --- | --- |
${rows.join("\n")}`
}

function relationsSection(config) {
  const relations = config.relations ?? []
  if (!relations.length) return ""
  const rows = relations.map((relation) => {
    const meta = relacionMeta(relation)
    const validation = meta.relationIdField
      ? `\`${meta.refModel}.exists({ ${meta.relationIdField}: ... })\``
      : `\`${meta.refModel}.exists({ _id: ... })\``
    return `| \`${relation.fieldName}\` | ${meta?.label ?? relation.resource} | ${validation} | ${relation.selection === "pinia" ? "Pinia" : "Selector con la API"} |`
  })
  return `## Relaciones incluidas

El router genera \`validarRelaciones()\`, que comprueba que los documentos relacionados existen antes de crear o editar. Si una referencia no existe, el backend responde 400.

| Campo | Recurso | Comprobación en el backend | Origen de la selección |
| --- | --- | --- | --- |
${rows.join("\n")}
`
}

function menuFragment(menuLabel, route) {
  if (!menuLabel) {
    return "\n\nNo se solicitó un enlace de menú. Si lo necesitas, añade uno manualmente a `src/components/NavBar.vue`."
  }
  return `\n\nPara añadir el enlace del menú, revisa el estilo de \`src/components/NavBar.vue\` e inserta dentro de su navegación un enlace como este:\n\n${fence(`<RouterLink to="${escapeHtml(route)}">${escapeHtml(menuLabel)}</RouterLink>`, "vue")}\n`
}

/* ------------------------------------------------------------------ */
/* Reutilizar un recurso que ya existe en el proyecto                  */
/* ------------------------------------------------------------------ */

function existingInstructions(config, files) {
  const resourceMeta = RESOURCE_LIBRARY[config.existingResource] ?? null
  const resourceLabel = resourceMeta?.label ?? config.existingResource
  const supportedText = resourceMeta
    ? Object.keys(resourceMeta.apiFunctions).map((operation) => OPERATION_LABELS[operation] ?? operation).join(", ")
    : config.operations.map((operation) => OPERATION_LABELS[operation] ?? operation).join(", ")
  const referenceText = resourceMeta
    ? resourceMeta.referenceFiles.map((file) => `- \`${file}\``).join("\n")
    : "- los módulos de `src/api/` del proyecto"
  const operationsText = config.operations.map((operation) => OPERATION_LABELS[operation]).join(", ")
  const componentPath = `src/components/${config.screen.component}.vue`
  const code = generatedCode(config, files)
  const catalogApis = collectCatalogs(config).filter((catalog) => !catalog.apiFunction)
  const catalogData = collectCatalogs(config).filter((catalog) => catalog.source === "inline")

  const copySteps = [
    catalogData.length
      ? `Copia el JSON de cada catálogo a \`backend/data/\`: ${catalogData.map((catalog) => fileLink(`backend/data/${catalog.name}.json`)).join(", ")}.`
      : "",
    catalogApis.length
      ? `Copia ${catalogApis.map((catalog) => fileLink(`src/api/${catalog.name}.js`)).join(", ")} al proyecto (rutas de \`src/api/\`).`
      : "",
    `Copia ${fileLink(componentPath)} a \`${componentPath}\`.`,
    config.screen.menuLabel
      ? `Registra la ruta en \`src/router/index.js\` y añade el enlace del menú (código abajo).`
      : `Registra la ruta en \`src/router/index.js\` (código abajo).`,
    "Ejecuta `npm run build` y comprueba la pantalla con el backend en marcha.",
  ].filter(Boolean)

  return `# Integración de ${config.screen.title}

Se reutiliza el recurso existente **${resourceLabel}** (\`${config.existingResource}\`) para la pantalla **${config.screen.title}** (${config.screen.type}). No se genera backend nuevo: la pantalla llama a las funciones que ya exporta \`src/api/${resourceMeta?.apiFile ?? ""}\`.

## Pasos

${copySteps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

## Archivos generados (${generatedFileList(files).length})

${fileTable(config, files)}

## Operaciones que ofrece la API

Las operaciones reales de este recurso son: ${supportedText}. Si la pantalla necesita una operación fuera de esa lista, hay que implementarla primero en el backend y en el módulo de la API.

## Identificador real del recurso

${resourceMeta?.catalogOnly
  ? "Esta API es un catálogo de solo lectura: devuelve listas generadas desde un archivo JSON y no trabaja con identificadores por documento, así que la pantalla generada solo consulta y muestra."
  : (config.entity.idField === "_id"
      ? "Esta API localiza cada documento por `_id`, el identificador automático de MongoDB."
      : `Esta API localiza cada documento por \`${config.entity.idField}\`, no por \`_id\`. \`_id\` sigue existiendo en MongoDB, pero no identifica el recurso en esta API.`) + ` El componente generado usa \`item.${config.entity.idField}\` como clave de la tabla y al editar o borrar.`}

${resourceMeta?.notes ? `**Importante:** ${resourceMeta.notes}\n\n` : ""}## Archivos del proyecto que fundamentan el patrón

${referenceText}

Lee esos archivos para confirmar los nombres reales de los campos antes de copiar el componente; si algún campo configurado no coincide, ajústalo.

${catalogsSection(config)}## Registrar la pantalla en el router

En \`src/router/index.js\`, importa el componente junto a las demás pantallas y añade la ruta antes del comodín \`/:pathMatch(.*)\`:

${fence(`import ${config.screen.component} from "../components/${config.screen.component}.vue";

{ path: "${escapeHtml(config.screen.route)}", name: "${config.screen.component}", component: ${config.screen.component} },`)}
${menuFragment(config.screen.menuLabel, config.screen.route)}
## Código de los módulos generados

El componente Vue es largo y va comentado bloque a bloque: ábrelo en ${fileLink(componentPath)} y cópialo tal cual.
${code ? `\n${code}\n` : ""}
## Comprobaciones manuales

- Comprueba que la pantalla carga la API real sin errores de red.
- Prueba las operaciones elegidas: ${operationsText}.
- Asegúrate de que la lista y el formulario usan los campos reales que devuelve la API.
- Escribe en el buscador de la tabla y comprueba que filtra las filas por sus columnas.
- Ejecuta **npm run build** para validar que el componente compila en el proyecto; este comando no comprueba que la API responda correctamente ni que MongoDB esté conectada.

## Límites de esta entrega

- No se genera backend nuevo, para no duplicar recursos reales.
- Las relaciones con otras entidades y los stores de Pinia no se generan al reutilizar un recurso; complétalos a mano.
- Los campos catálogo sí se generan: guardan su JSON en \`backend/data\` y \`src/api/<nombre>.js\` lo importa directamente, sin rutas nuevas en el backend.
- Esta versión solo se apoya en recursos ya presentes en el repositorio y no inventa rutas ni colecciones.
`
}

/* ------------------------------------------------------------------ */
/* Entidad nueva                                                       */
/* ------------------------------------------------------------------ */

export function generateInstructions(config, files = {}) {
  if (config.source === "existing") return existingInstructions(config, files)

  const { singular, plural, apiPath } = config.entity
  const { component, route, title, type } = config.screen
  const catalogs = collectCatalogs(config)
  const generatedCatalogApis = catalogs.filter((catalog) => !catalog.apiFunction)
  const catalogData = catalogs.filter((catalog) => catalog.source === "inline")
  const operationsText = config.operations.map((operation) => OPERATION_LABELS[operation]).join(", ")

  const modelPath = `backend/modelos/${slugify(singular)}.js`
  const routerPath = `backend/rutas/${slugify(plural)}.rutas.js`
  const apiFile = `src/api/${slugify(plural)}.js`
  const componentPath = `src/components/${component}.vue`
  const storePath = `src/store/${slugify(singular)}Store.js`
  const has = (path) => Boolean(files[path])

  const serverLines = [
    `// Añade estas líneas a backend/server.js, junto al resto de rutas.`,
    `import ${singular}Rutas from "./rutas/${slugify(plural)}.rutas.js";`,
    "",
    `app.use("${apiPath}", requireDatabase, ${singular}Rutas);`,
  ]
  const steps = []
  const step = (text) => `${steps.length + 1}. ${text}`
  if (has(modelPath)) steps.push(step(`Copia ${fileLink(modelPath)} a \`${modelPath}\`.`))
  if (has(routerPath)) steps.push(step(`Copia ${fileLink(routerPath)} a \`${routerPath}\`.`))
  if (has(modelPath) || has(routerPath)) {
    steps.push(step(`Registra el router en \`backend/server.js\` con el bloque de «Integración de backend».`))
  }
  if (catalogData.length) {
    steps.push(step(`Copia el JSON del catálogo a \`backend/data/\`: ${catalogData.map((catalog) => fileLink(`backend/data/${catalog.name}.json`)).join(", ")}. El módulo de API lo importa desde ahí, así que no hay que añadir ninguna ruta en \`backend/server.js\`.`))
  }
  if (generatedCatalogApis.length) {
    steps.push(step(`Copia las capas de API de catálogo: ${generatedCatalogApis.map((catalog) => fileLink(`src/api/${catalog.name}.js`)).join(", ")}.`))
  }
  if (has(apiFile)) steps.push(step(`Copia ${fileLink(apiFile)} a \`${apiFile}\`.`))
  if (has(storePath)) steps.push(step(`Copia ${fileLink(storePath)} a \`${storePath}\`.`))
  steps.push(step(`Copia ${fileLink(componentPath)} a \`${componentPath}\`.`))
  steps.push(step(`Registra la pantalla en \`src/router/index.js\`` + (config.screen.menuLabel ? " y añade el enlace del menú." : ".")))
  steps.push(step("Reinicia backend y frontend y prueba las operaciones."))

  return `# Integración de ${title}

Pantalla **${type}** para **${title}** (${operationsText}) sobre la colección \`${plural}\`, con la API en \`${apiPath}\` y \`_id\` como identificador. **No se monta ni se registra automáticamente** en la app real: copia los archivos en el orden de los pasos.

## Pasos

${steps.join("\n")}

## Archivos generados (${generatedFileList(files).length})

${fileTable(config, files)}

## Integración de backend

1. Copia el modelo y el router a sus rutas del proyecto.
2. En \`backend/server.js\`, importa el router y registra el prefijo con el mismo nombre de archivo del import. No cambies entre singular y plural:

${fence(serverLines.join("\n"))}

El nombre del archivo del router y la ruta REST son independientes: copia el import literalmente y registra el prefijo \`${apiPath}\`. Si Node muestra \`ERR_MODULE_NOT_FOUND\`, comprueba que la ruta del import coincide carácter por carácter con el archivo copiado.

## Conectar MongoDB y crear o actualizar la colección

1. Comprueba que \`MONGO_URI\` existe en el entorno usado por \`backend/server.js\` y apunta a una base MongoDB disponible.
2. Una colección nueva se crea al guardar el primer documento. Mongoose usa \`${plural}\` mediante \`collection: "${plural}"\`.
3. Si amplías una entidad existente, añade los campos nuevos a \`backend/modelos/<Entidad>.js\` antes de usar el formulario. MongoDB no modifica automáticamente los documentos antiguos.
4. Reinicia backend y frontend después de integrar el modelo y el router.

## Integración de frontend

1. Copia ${fileLink(componentPath)} a \`${componentPath}\`.
2. En \`src/router/index.js\`, importa el componente junto a las demás pantallas y añade la ruta antes del comodín:

${fence(`import ${component} from "../components/${component}.vue";
{ path: "${escapeHtml(route)}", name: "${component}", component: ${component} },`)}
${menuFragment(config.screen.menuLabel, route)}
${config.pinia.enabled ? `## Store Pinia propio

El componente genera \`seleccionar${singular}(registro)\` y usa \`limpiar${singular}()\` para compartir \`id${singular}\` y los campos mínimos configurados.
` : ""}${relationsSection(config)}## Código de los archivos generados

Cada bloque se puede copiar tal cual al archivo de la misma ruta. Si un módulo aparece como «no se genera», es porque ya existe en el proyecto y se reutiliza.

${generatedCode(config, files)}

${catalogData.length ? `### Datos JSON de los catálogos

${catalogData.map((catalog) => `- ${fileLink(`backend/data/${catalog.name}.json`)} (${catalog.count ?? "varios"} elementos): cópialo a \`backend/data/${catalog.name}.json\` sin renombrar la lista \`${catalog.rootKey || "(raíz)"}\`.`).join("\n")}

No se muestran aquí porque son datos, no código; ábrelos con el enlace y cópialos íntegros. El módulo de API del catálogo los importa directamente: no hace falta ninguna ruta en el backend.
` : ""}
${catalogsSection(config)}## Comprobaciones manuales

- Comprueba \`MONGO_URI\` y que el backend haya iniciado sin errores.
- Abre la pantalla y verifica que muestra todos los documentos.
- Escribe en el buscador de la tabla y comprueba que filtra por las columnas visibles.
- Crea, edita y elimina un documento de prueba.
- Comprueba validaciones, relaciones inexistentes y errores de conexión.
- Ejecuta \`npm run build\` después de integrar los archivos.

## Límites

- El identificador automático es \`_id\`; no se generan identificadores de negocio.
- El buscador filtra en el navegador la lista ya cargada; no hay búsqueda en el backend ni paginación.
- La generación no modifica archivos reales ni prueba MongoDB automáticamente.
`
}
