import { CATALOG_SOURCES, analyzeCatalog, catalogDataFile, catalogNameFromFile } from "./catalogos.js"
import {
  FIELD_TYPES,
  OPERATIONS,
  RELATION_SELECTIONS,
  RELATION_SCREEN_TYPES,
  RESOURCE_LIBRARY,
  SCREEN_TYPES,
  isValidDate,
  isValidIdentifier,
  isValidPascalCase,
  isValidTime,
  matchesPattern,
  parseOptions,
  parsePattern,
  slugify,
} from "./datos.js"
import { relacionMeta } from "./relaciones.js"

const IDENTIFIER = /^[a-z][A-Za-z0-9]*$/
const FUNCTION_NAME = /^[A-Za-z_$][\w$]*$/

function normalizeCatalog(input) {
  const catalog = input && typeof input === "object" && !Array.isArray(input) ? input : {}
  const source = String(catalog.source ?? "project").trim() || "project"
  const file = String(catalog.file ?? "").replaceAll("\\", "/").trim()
  const name = String(catalog.name ?? "").trim() || catalogNameFromFile(file)
  return {
    source,
    name,
    // El archivo siempre es backend/data/<nombre>.json: la ruta generada,
    // el módulo de API y el JSON deben compartir el mismo nombre.
    file: source === "project" ? (catalogNameFromFile(file) ? file : catalogDataFile(name)) : "",
    rootKey: String(catalog.rootKey ?? ""),
    idField: String(catalog.idField ?? "").trim(),
    labelField: String(catalog.labelField ?? "").trim(),
    valueField: String(catalog.valueField ?? "").trim(),
    parentField: String(catalog.parentField ?? "").trim(),
    apiFunction: String(catalog.apiFunction ?? "").trim(),
    primitive: Boolean(catalog.primitive),
    routeExists: Boolean(catalog.routeExists),
    count: Number.isInteger(catalog.count) ? catalog.count : null,
    data: source === "inline" ? String(catalog.data ?? "") : "",
  }
}

function normalizeField(field) {
  const type = String(field.type ?? "")
  const options = parseOptions(field.options)
  const min = field.min === "" || field.min == null ? null : String(field.min).trim()
  const max = field.max === "" || field.max == null ? null : String(field.max).trim()
  const step = field.step === "" || field.step == null ? null : String(field.step).trim()
  const { pattern, patternFlags } = parsePattern(field.pattern)
  const patternMessage = String(field.patternMessage ?? "").trim()
  return {
    name: String(field.name ?? "").trim(),
    label: String(field.label ?? "").trim(),
    type,
    required: Boolean(field.required),
    defaultValue: field.defaultValue == null ? "" : String(field.defaultValue),
    min,
    max,
    step,
    pattern,
    patternFlags,
    patternMessage,
    options,
    form: field.form !== false,
    list: Boolean(field.list),
    search: Boolean(field.search),
    ...(type === "catalog" ? { catalog: normalizeCatalog(field.catalog) } : {}),
  }
}

// Analiza la estructura del catálogo y completa lo que no se haya indicado. Un
// campo catálogo guarda un valor de una lista JSON: no usa opciones fijas, así
// que su configuración se valida aparte.
function validateCatalogField(field, prefix, errors) {
  const catalog = field.catalog
  if (!CATALOG_SOURCES.has(catalog.source)) {
    errors.push(`${prefix}: elige el origen del catálogo: un archivo del proyecto o datos JSON nuevos.`)
    return
  }
  if (!/^[a-z][a-z0-9]*$/.test(catalog.name) || catalog.name.length > 40) {
    errors.push(`${prefix}: el nombre del catálogo debe empezar en minúscula y usar solo letras y números (por ejemplo, especialidades).`)
  }
  if (catalog.apiFunction && !/^[A-Za-z_$][\w$]*$/.test(catalog.apiFunction)) {
    errors.push(`${prefix}: la función de la API del catálogo no es un nombre de función válido.`)
  }
  if (catalog.source === "inline" && catalog.apiFunction) {
    errors.push(`${prefix}: los datos nuevos generan siempre su propio módulo de API; no se puede reutilizar una función existente.`)
  }
  if (catalog.source === "project") {
    if (!catalog.primitive) {
      if (!catalog.labelField) {
        errors.push(`${prefix}: analiza el catálogo y elige el campo visible (por ejemplo, nm).`)
      }
      if (!catalog.valueField) {
        errors.push(`${prefix}: analiza el catálogo y elige el campo que se guardará en el formulario (por ejemplo, nm).`)
      }
    }
    return
  }

  if (!catalog.data.trim()) {
    errors.push(`${prefix}: pega los datos JSON del catálogo nuevo.`)
    return
  }
  if (catalog.data.length > 300000) {
    errors.push(`${prefix}: los datos del catálogo nuevo no pueden superar 300 KB.`)
    return
  }
  const analysis = analyzeCatalog(catalog.data, {
    name: catalog.name,
    rootKey: catalog.rootKey === "" ? undefined : catalog.rootKey,
  })
  if (!analysis.ok) {
    errors.push(`${prefix}: ${analysis.error}`)
    return
  }
  catalog.primitive = analysis.primitive
  catalog.rootKey = analysis.rootKey
  catalog.count = analysis.count
  if (analysis.primitive) {
    catalog.labelField = ""
    catalog.valueField = ""
    catalog.idField = ""
  } else {
    if (!catalog.labelField) catalog.labelField = analysis.labelField
    if (!catalog.valueField) catalog.valueField = analysis.valueField
    if (!catalog.idField) catalog.idField = analysis.idField
    if (!catalog.labelField) {
      errors.push(`${prefix}: el catálogo no tiene un campo de texto visible; añade una etiqueta a cada elemento.`)
    }
    for (const [key, label] of [
      ["labelField", "campo visible"],
      ["valueField", "valor guardado"],
      ["idField", "identificador"],
    ]) {
      if (catalog[key] && !analysis.fields.includes(catalog[key])) {
        errors.push(`${prefix}: el ${label} «${catalog[key]}» no existe en el catálogo. Campos disponibles: ${analysis.fields.join(", ")}.`)
      }
    }
  }
  // Se guarda el JSON ya analizado y ordenado: es el archivo que se genera.
  catalog.data = `${JSON.stringify(analysis.parsed, null, 2)}\n`
}

// Los catálogos se comparten entre campos: dos campos pueden leer la misma lista,
// pero deben coincidir en la lista, el origen y los campos del JSON.
function validateCatalogGroup(fields, errors) {
  const catalogs = fields.filter((field) => field.type === "catalog" && field.catalog)
  const byName = new Map()
  for (const field of catalogs) {
    const catalog = field.catalog
    const signature = JSON.stringify({
      source: catalog.source,
      rootKey: catalog.rootKey,
      idField: catalog.idField,
      labelField: catalog.labelField,
      apiFunction: catalog.apiFunction,
      primitive: catalog.primitive,
      data: catalog.source === "inline" ? catalog.data : "",
    })
    const previous = byName.get(catalog.name)
    if (previous && previous.signature !== signature) {
      errors.push(
        `Los campos «${previous.field.name}» y «${field.name}» usan el catálogo «${catalog.name}» con configuraciones distintas; usa la misma lista y los mismos campos del JSON.`,
      )
    } else if (!previous) {
      byName.set(catalog.name, { field, signature })
    }
  }

  for (const field of catalogs) {
    const parentName = field.catalog.parentField
    if (!parentName) continue
    if (parentName === field.name) {
      errors.push(`Campo ${field.name}: un catálogo no puede filtrarse por sí mismo.`)
      continue
    }
    const parent = catalogs.find((item) => item.name === parentName)
    if (!parent) {
      errors.push(`Campo ${field.name}: el selector del que depende («${parentName}») debe ser otro campo catálogo de esta pantalla.`)
      continue
    }
    if (!parent.form) {
      errors.push(`Campo ${field.name}: «${parentName}» debe aparecer en el formulario para poder filtrar el catálogo.`)
    }
    if (parent.catalog.primitive || !parent.catalog.idField) {
      errors.push(`Campo ${field.name}: «${parentName}» necesita un campo identificador en su catálogo para filtrar este selector.`)
    }
    if (field.catalog.primitive || !field.catalog.idField) {
      errors.push(`Campo ${field.name}: este catálogo necesita un campo identificador para poder filtrarse por «${parentName}».`)
    }
    // Evita cadenas circulares (A depende de B y B de A).
    let current = parent
    const visited = new Set([field.name])
    while (current?.catalog.parentField) {
      if (visited.has(current.name)) {
        errors.push(`Campo ${field.name}: la dependencia entre catálogos es circular.`)
        break
      }
      visited.add(current.name)
      current = catalogs.find((item) => item.name === current.catalog.parentField)
      if (current?.name === field.name) {
        errors.push(`Campo ${field.name}: la dependencia entre catálogos es circular.`)
        break
      }
    }
  }
}

// Descriptor del store de Pinia que la relación va a importar. Solo se acepta
// lo que tiene forma segura: un archivo .js de src/store/, un export válido y
// dos propiedades del estado con nombre de identificador.
function normalizeStoreDescriptor(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  // Solo el nombre del archivo dentro de src/store/: cualquier ruta ("../") se
  // rechaza en lugar de recortarse, para que la generación no escriba imports
  // fuera de esa carpeta.
  const file = String(input.file ?? "").trim()
  const importName = String(input.importName ?? "").trim()
  const idProp = String(input.idProp ?? "").trim()
  const relationValueProp = String(input.relationValueProp ?? "").trim() || idProp
  if (!/^[A-Za-z][A-Za-z0-9_-]*\.js$/.test(file)) return null
  if (!FUNCTION_NAME.test(importName) || !IDENTIFIER.test(idProp) || !IDENTIFIER.test(relationValueProp)) return null
  const seleccionar = String(input.seleccionar ?? "").trim()
  const limpiar = String(input.limpiar ?? "").trim()
  return {
    file,
    importName,
    storeId: String(input.storeId ?? "").trim(),
    idProp,
    relationValueProp,
    seleccionar: FUNCTION_NAME.test(seleccionar) ? seleccionar : "",
    limpiar: FUNCTION_NAME.test(limpiar) ? limpiar : "",
  }
}

// Descriptor de una entidad descubierta en el proyecto (por ejemplo, una
// generada antes): lo que las plantillas necesitan para el modelo, el router y
// el selector del formulario.
function normalizeRelationEntity(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  const displayFields = Array.isArray(input.displayFields)
    ? [...new Set(input.displayFields.map((name) => String(name).trim()).filter((name) => IDENTIFIER.test(name)))].slice(0, 4)
    : []
  const list = String(input.apiFunctions?.list ?? "").trim()
  const apiFile = String(input.apiFile ?? "").replaceAll("\\", "/").split("/").pop().trim()
  return {
    label: String(input.label ?? "").trim(),
    singularWord: String(input.singularWord ?? "").trim(),
    refModel: String(input.refModel ?? "").trim(),
    relationIdField: String(input.relationIdField ?? "").trim(),
    idField: String(input.idField ?? "_id").trim() || "_id",
    apiFile: /^[a-z][a-z0-9]*\.js$/.test(apiFile) ? apiFile : "",
    apiPath: String(input.apiPath ?? "").trim(),
    displayFields,
    apiFunctions: FUNCTION_NAME.test(list) ? { list } : {},
    referenceFiles: Array.isArray(input.referenceFiles)
      ? input.referenceFiles.map((file) => String(file).replaceAll("\\", "/").trim()).filter(Boolean)
      : [],
    catalogOnly: Boolean(input.catalogOnly),
    store: normalizeStoreDescriptor(input.store),
  }
}

function normalizeRelation(relation) {
  const entity = normalizeRelationEntity(relation.entity)
  const store = normalizeStoreDescriptor(relation.store) ?? entity?.store ?? null
  return {
    resource: String(relation.resource ?? "").trim(),
    fieldName: String(relation.fieldName ?? "").trim(),
    label: String(relation.label ?? "").trim(),
    required: Boolean(relation.required),
    selection: String(relation.selection ?? "api").trim() || "api",
    ...(store ? { store } : {}),
    ...(entity ? { entity } : {}),
  }
}

function normalizePinia(input) {
  const pinia = input.pinia ?? {}
  return {
    enabled: Boolean(pinia.enabled),
    fields: Array.isArray(pinia.fields) ? [...new Set(pinia.fields.map(String).map((name) => name.trim()).filter(Boolean))] : [],
  }
}

export function validateConfiguration(input) {
  const errors = []
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { errors: ["La configuración debe ser un objeto JSON."], config: null }
  }

  const source = String(input.source ?? "new").trim() || "new"
  const existingResource = String(input.existingResource ?? "").trim()
  const screen = input.screen ?? {}
  const entity = input.entity ?? {}
  const operations = Array.isArray(input.operations)
    ? [...new Set(input.operations.map(String).filter((operation) => operation !== "search"))]
    : []
  if (Array.isArray(input.operations) && input.operations.includes("search") && !input.operations.includes("list")) {
    errors.push("La opción de búsqueda ha sido retirada; añade la operación listar para mostrar todos los registros.")
  }
  const fields = Array.isArray(input.fields) ? input.fields.map(normalizeField) : []
  const relations = Array.isArray(input.relations) ? input.relations.map(normalizeRelation) : []
  const pinia = normalizePinia(input)

  if (!SCREEN_TYPES.has(String(screen.type ?? ""))) {
    errors.push("Selecciona un tipo de pantalla válido: CRUD, Listado, Detalle o Formulario.")
  }
  if (String(screen.title ?? "").trim().length < 2 || String(screen.title ?? "").trim().length > 120) {
    errors.push("El nombre visible de la pantalla debe tener entre 2 y 120 caracteres.")
  }
  if (!isValidPascalCase(String(screen.component ?? "")) || String(screen.component ?? "").length > 60) {
    errors.push("El nombre técnico del componente debe comenzar en mayúscula y contener solo letras y números (por ejemplo, GestionTareas).")
  }
  if (!/^\/[a-zA-Z0-9/_-]*$/.test(String(screen.route ?? "")) ||
      String(screen.route).includes("//") || String(screen.route).length > 100) {
    errors.push("La ruta del navegador debe comenzar por / y contener solo letras, números, /, _ o -.")
  }
  if (screen.menuLabel != null && typeof screen.menuLabel !== "string") {
    errors.push("El texto del menú debe ser texto.")
  }

  if (source === "existing") {
    if (!existingResource || !RESOURCE_LIBRARY[existingResource]) {
      errors.push("Selecciona un recurso existente válido del proyecto para reutilizarlo.")
    } else {
      const resourceMeta = RESOURCE_LIBRARY[existingResource]
      const expectedPath = String(resourceMeta.apiPath ?? "")
      if (String(entity.apiPath ?? "").trim() && String(entity.apiPath ?? "").trim() !== expectedPath) {
        errors.push(`El recurso existente ${existingResource} ya usa la ruta ${expectedPath}; no debe duplicarse otra API.`)
      }
      if (String(entity.singular ?? "").trim() && !isValidPascalCase(String(entity.singular ?? ""))) {
        errors.push("El nombre singular del recurso existente debe seguir el formato PascalCase.")
      }
      if (String(entity.plural ?? "").trim() && !/^[a-z][a-z0-9]*$/.test(String(entity.plural ?? ""))) {
        errors.push("El nombre plural del recurso existente debe estar en minúsculas, empezar por letra y usar solo letras y números.")
      }
      // La especificación prohíbe deducir endpoints: solo se admiten las operaciones
      // que el módulo real de src/api/ exporta (search es filtrado local, no backend).
      const operationLabels = { list: "listar", create: "crear", edit: "editar", delete: "borrar", search: "buscar" }
      const unsupportedOperations = operations.filter((operation) => operation !== "search" && !resourceMeta.apiFunctions[operation])
      if (unsupportedOperations.length) {
        const available = Object.keys(resourceMeta.apiFunctions)
          .map((operation) => operationLabels[operation] ?? operation)
          .join(", ")
        const requested = unsupportedOperations.map((operation) => operationLabels[operation] ?? operation).join(", ")
        errors.push(`El recurso ${existingResource} solo ofrece estas operaciones reales: ${available}. No tiene ${requested}; quítala o revisa src/api/${resourceMeta.apiFile} antes de pedirla.`)
      }
    }
  } else {
    if (!isValidPascalCase(String(entity.singular ?? ""))) {
      errors.push("El nombre singular debe estar en PascalCase (por ejemplo, Tarea).")
    }
    if (!/^[a-z][a-z0-9]*$/.test(String(entity.plural ?? "")) || String(entity.plural ?? "").length > 60) {
      errors.push("El nombre plural debe estar en minúsculas, empezar con una letra y contener solo letras y números (por ejemplo, tareas).")
    }
    const apiPath = String(entity.apiPath ?? "")
    const expectedApiPath = `/api/${String(entity.plural ?? "")}`
    if (!/^\/api\/[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(apiPath) || apiPath.length > 100) {
      errors.push("La ruta REST debe tener el formato /api/recurso (por ejemplo, /api/tareas).")
    } else if (apiPath !== expectedApiPath) {
      errors.push(`La ruta REST debe coincidir con la colección: usa ${expectedApiPath}, no ${apiPath}.`)
    }
    if (entity.idField !== "_id") {
      errors.push("Esta versión usa _id, el identificador que Mongoose genera automáticamente.")
    }
  }

  if (operations.some((operation) => !OPERATIONS.has(operation))) {
    errors.push("Se ha seleccionado una operación no admitida.")
  }
  if (operations.length === 0) errors.push("Selecciona al menos una operación.")
  if (operations.includes("search") && !operations.includes("list")) {
    errors.push("La búsqueda local necesita que también esté seleccionada la operación listar.")
  }
  if (operations.includes("edit") && !operations.includes("list")) {
    errors.push("La edición necesita listar para poder seleccionar un registro existente.")
  }
  if (operations.includes("delete") && !operations.includes("list")) {
    errors.push("El borrado necesita listar para poder seleccionar un registro existente.")
  }
  if (String(screen.type ?? "") === "Formulario" && !(operations.includes("create") || operations.includes("edit"))) {
    errors.push("Las pantallas de tipo Formulario requieren crear o editar.")
  }
  if (String(screen.type ?? "") === "Formulario" && operations.includes("edit") && !operations.includes("create")) {
    errors.push("Una pantalla de tipo Formulario que edita necesita también crear: para editar registros existentes elige el tipo CRUD.")
  }
  if (String(screen.type ?? "") === "Formulario" && operations.includes("delete")) {
    errors.push("Las pantallas de tipo Formulario no borran registros; elige el tipo CRUD para combinar formulario y tabla.")
  }
  if (String(screen.type ?? "") === "Detalle" &&
      operations.some((operation) => operation !== "list")) {
    errors.push("Las pantallas de tipo Detalle solo muestran registros: elige listar, sin crear, editar ni borrar.")
  }
  if (["Listado", "Detalle"].includes(String(screen.type ?? "")) && !operations.includes("list")) {
    errors.push("Las pantallas de tipo Listado o Detalle necesitan la operación listar.")
  }
  if ((operations.includes("create") || operations.includes("edit")) &&
      !fields.some((field) => field.form) &&
      relations.length === 0) {
    errors.push("Añade al menos un campo visible en el formulario para crear o editar.")
  }
  if (operations.includes("list") && !fields.some((field) => field.list) && relations.length === 0) {
    errors.push("Marca al menos un campo para mostrarlo en la tabla.")
  }

  const seenFields = new Set()
  if (relations.length && source !== "new") {
    errors.push("Las relaciones solo están disponibles para entidades nuevas: una pantalla que reutiliza un recurso existente no crea colección donde guardar referencias.")
  }
  if (relations.length && !RELATION_SCREEN_TYPES.has(String(screen.type ?? ""))) {
    errors.push("Las relaciones solo están disponibles para las pantallas de tipo CRUD, Relacionado y Formulario; Listado y Detalle no tienen formulario donde escoger el registro relacionado.")
  }
  if (String(screen.type ?? "") === "Relacionado" && relations.length === 0) {
    errors.push("El tipo Relacionado necesita al menos una relación: define en el paso de relaciones qué entidad usarás y cómo se escoge su registro.")
  }
  if (relations.length > 5) {
    errors.push("Una pantalla puede declarar como máximo 5 relaciones en esta versión.")
  }
  const seenRelationNames = new Set()
  for (const [index, relation] of relations.entries()) {
    const prefix = `Relación ${index + 1}`
    const relationMeta = RESOURCE_LIBRARY[relation.resource]
    const meta = relacionMeta(relation)
    const displayLabel = meta?.label ?? relation.resource
    if (!relationMeta && !relation.entity) {
      errors.push(`${prefix}: elige una entidad relacionada conocida del proyecto o una entidad generada antes que tenga modelo en backend/modelos y módulo en src/api.`)
    } else if (meta?.catalogOnly) {
      errors.push(`${prefix}: ${displayLabel} es un catálogo de solo lectura y no guarda documentos en MongoDB, así que no puede referenciarse con ObjectId. Usa un campo selector con opciones fijas si solo necesitas etiquetas.`)
    } else if (relation.entity) {
      if (!isValidPascalCase(relation.entity.refModel)) {
        errors.push(`${prefix}: ${displayLabel} no tiene un modelo válido en backend/modelos; revisa el archivo del modelo antes de generar.`)
      } else if (!relation.entity.apiFunctions.list) {
        errors.push(`${prefix}: ${displayLabel} no exporta una función de listado en su módulo de src/api/; sin ella no se puede rellenar el selector.`)
      }
    }
    if (!isValidIdentifier(relation.fieldName) || relation.fieldName.length > 40) {
      errors.push(`${prefix}: el campo que guarda la relación debe empezar en minúscula y usar solo letras y números (por ejemplo, pacienteDNI).`)
    } else if (seenFields.has(relation.fieldName)) {
      errors.push(`${prefix}: el campo "${relation.fieldName}" ya existe entre los campos de la pantalla.`)
    } else if (seenRelationNames.has(relation.fieldName)) {
      errors.push(`${prefix}: el campo "${relation.fieldName}" está repetido entre las relaciones.`)
    }
    seenRelationNames.add(relation.fieldName)
    if (!relation.label) errors.push(`${prefix}: escribe la etiqueta visible que verá la persona usuaria (por ejemplo, Paciente).`)
    if (!RELATION_SELECTIONS.has(relation.selection)) {
      errors.push(`${prefix}: el modo de escoger el registro debe ser un selector de la API o la selección compartida de un store Pinia.`)
    }
    if (meta && relation.selection === "pinia" && !meta.store) {
      const expectedStore = `src/store/${slugify(meta.refModel || relation.resource)}Store.js`
      errors.push(`${prefix}: ${displayLabel} no tiene un store de Pinia en este proyecto; no existe ${expectedStore}. Crea ese store (o genera la pantalla con «compartir la selección»), o elige el modo selector de la API.`)
    }
  }

  if (pinia.enabled) {
    if (!fields.length) {
      errors.push("Para compartir la selección con Pinia, la pantalla necesita al menos un campo propio cuyo valor se guarde en el store.")
    }
    if (pinia.fields.length === 0) {
      errors.push("Marca al menos un campo de datos mínimos para guardar en el store de Pinia, además del identificador.")
    }
    if (pinia.fields.length > 8) {
      errors.push("El store de Pinia guarda como máximo 8 campos de datos mínimos además del identificador.")
    }
    for (const fieldName of pinia.fields) {
      if (!fields.some((field) => field.name === fieldName)) {
        errors.push(`El store de Pinia no puede guardar "${fieldName}": no coincide con ningún campo definido en la pantalla.`)
      }
    }
    if (!operations.includes("list")) {
      errors.push("Compartir la selección con Pinia necesita la operación listar: el botón Compartir vive en la tabla de registros.")
    }
  }
  if (operations.includes("search") && !fields.some((field) => field.search)) {
    errors.push("Marca al menos un campo para incluirlo en la búsqueda.")
  }

  if (fields.length > 50) errors.push("Una pantalla puede definir como máximo 50 campos en esta versión.")
  for (const [index, field] of fields.entries()) {
    const prefix = `Campo ${index + 1}`
    if (!isValidIdentifier(field.name) || field.name.length > 40) {
      errors.push(`${prefix}: el nombre técnico debe empezar en minúscula y usar solo letras y números.`)
    } else if (seenFields.has(field.name)) {
      errors.push(`${prefix}: el nombre técnico "${field.name}" está repetido.`)
    }
    seenFields.add(field.name)
    if (!field.label) errors.push(`${prefix}: escribe una etiqueta visible.`)
    if (!FIELD_TYPES.has(field.type)) errors.push(`${prefix}: selecciona un tipo de campo admitido.`)
    if (field.type === "catalog") validateCatalogField(field, prefix, errors)

    if (["select", "radio"].includes(field.type)) {
      if (field.options.length === 0 || field.options.some((option) => !option.value || !option.label)) {
        errors.push(`${prefix}: añade opciones como "valor|etiqueta", una por línea.`)
      } else if (new Set(field.options.map((option) => option.value)).size !== field.options.length) {
        errors.push(`${prefix}: los valores de sus opciones deben ser únicos.`)
      }
    } else if (field.options.length) {
      errors.push(`${prefix}: solo los campos selector y radio admiten opciones.`)
    }

    const lengthTypes = ["text", "textarea", "email", "phone"]
    const rangeKind = lengthTypes.includes(field.type) ? "length"
      : ["number", "date", "time"].includes(field.type) ? field.type : ""
    const hasRange = field.min !== null || field.max !== null
    if ((field.min !== null || field.max !== null) &&
        !rangeKind) {
      errors.push(`${prefix}: los límites solo se admiten para texto, correo, teléfono, número, fecha y hora.`)
    }
    let validRange = Boolean(rangeKind)
    for (const limit of [field.min, field.max]) {
      if (limit === null) continue
      if (rangeKind === "length" && (!Number.isInteger(Number(limit)) || Number(limit) < 0)) {
        errors.push(`${prefix}: los límites de longitud deben ser números enteros iguales o mayores que cero.`)
        validRange = false
        break
      }
      if (rangeKind === "number" && !Number.isFinite(Number(limit))) {
        errors.push(`${prefix}: los límites de un campo numérico deben ser números válidos.`)
        validRange = false
        break
      }
      if (rangeKind === "date" && !isValidDate(limit)) {
        errors.push(`${prefix}: los límites de fecha deben tener formato YYYY-MM-DD y ser fechas válidas.`)
        validRange = false
        break
      }
      if (rangeKind === "time" && !isValidTime(limit)) {
        errors.push(`${prefix}: los límites de hora deben tener formato HH:MM y ser válidos.`)
        validRange = false
        break
      }
    }
    if (hasRange && validRange && field.min !== null && field.max !== null) {
      const minimum = rangeKind === "length" || rangeKind === "number" ? Number(field.min) : field.min
      const maximum = rangeKind === "length" || rangeKind === "number" ? Number(field.max) : field.max
      if (minimum > maximum) {
        errors.push(`${prefix}: el mínimo no puede ser mayor que el máximo.`)
      }
    }
    if (field.step !== null && field.type !== "number") {
      errors.push(`${prefix}: el incremento solo se admite para campos numéricos.`)
    }
    if (field.step !== null && field.type === "number" &&
        (!Number.isFinite(Number(field.step)) || Number(field.step) <= 0)) {
      errors.push(`${prefix}: el incremento numérico debe ser un número mayor que cero.`)
    }
    if (field.patternMessage && !field.pattern) {
      errors.push(`${prefix}: escribe una expresión regular antes de personalizar su mensaje.`)
    }
    if (field.patternMessage.length > 160) {
      errors.push(`${prefix}: el mensaje de validación no puede superar 160 caracteres.`)
    }
    if (field.pattern) {
      if (!["text", "textarea", "email", "phone"].includes(field.type)) {
        errors.push(`${prefix}: la expresión regular solo se aplica a texto, texto largo, correo y teléfono; usa las restricciones propias para número, fecha y hora.`)
      }
      try {
        new RegExp(field.pattern, field.patternFlags)
        if (!field.patternFlags) new RegExp(field.pattern, "v")
      } catch {
        errors.push(`${prefix}: la expresión regular no es válida o usa una sintaxis no compatible con el navegador.`)
      }
      if (field.pattern.length > 200) errors.push(`${prefix}: la expresión regular no puede superar 200 caracteres.`)
    }
    if (field.defaultValue !== "") {
      if (field.type === "number" && !Number.isFinite(Number(field.defaultValue))) {
        errors.push(`${prefix}: el valor inicial numérico no es válido.`)
      }
      if (field.type === "boolean" && !["true", "false"].includes(field.defaultValue)) {
        errors.push(`${prefix}: el valor inicial booleano debe ser true o false.`)
      }
      if (["select", "radio"].includes(field.type) &&
          !field.options.some((option) => option.value === field.defaultValue)) {
        errors.push(`${prefix}: el valor inicial debe coincidir con una de sus opciones.`)
      }
      if (field.type === "number") {
        const value = Number(field.defaultValue)
        if (field.min !== null && value < Number(field.min)) errors.push(`${prefix}: el valor inicial es menor que el mínimo.`)
        if (field.max !== null && value > Number(field.max)) errors.push(`${prefix}: el valor inicial es mayor que el máximo.`)
        if (field.step !== null && Number.isFinite(Number(field.step))) {
          const base = field.min === null ? 0 : Number(field.min)
          const steps = (value - base) / Number(field.step)
          if (Math.abs(steps - Math.round(steps)) > 1e-8) {
            errors.push(`${prefix}: el valor inicial no coincide con el incremento configurado.`)
          }
        }
      } else if (field.type === "date") {
        if (!isValidDate(field.defaultValue)) errors.push(`${prefix}: el valor inicial debe ser una fecha válida con formato YYYY-MM-DD.`)
        if (field.min !== null && field.defaultValue < field.min) errors.push(`${prefix}: el valor inicial es anterior a la fecha mínima.`)
        if (field.max !== null && field.defaultValue > field.max) errors.push(`${prefix}: el valor inicial supera la fecha máxima.`)
      } else if (field.type === "time") {
        if (!isValidTime(field.defaultValue)) errors.push(`${prefix}: el valor inicial de hora debe tener formato HH:MM.`)
        if (field.min !== null && field.defaultValue < field.min) errors.push(`${prefix}: el valor inicial es anterior a la hora mínima.`)
        if (field.max !== null && field.defaultValue > field.max) errors.push(`${prefix}: el valor inicial supera la hora máxima.`)
      } else if (lengthTypes.includes(field.type)) {
        if (field.min !== null && field.defaultValue.length < Number(field.min)) {
          errors.push(`${prefix}: el valor inicial no alcanza la longitud mínima.`)
        }
        if (field.max !== null && field.defaultValue.length > Number(field.max)) {
          errors.push(`${prefix}: el valor inicial supera la longitud máxima.`)
        }
      }
      const defaultPattern = field.pattern || (field.type === "email" ? "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" : "")
      try {
        if (defaultPattern && !matchesPattern(field.defaultValue, defaultPattern, field.patternFlags)) {
          errors.push(`${prefix}: el valor inicial no cumple la expresión regular.`)
        }
      } catch {
        // La validación principal de la expresión ya ha añadido un error al formulario.
      }
      if (field.type === "boolean" && field.required && field.defaultValue === "false") {
        errors.push(`${prefix}: una casilla obligatoria no puede tener false como valor inicial.`)
      }
    }
    if (operations.includes("create") && field.required && !field.form && field.defaultValue === "") {
      errors.push(`${prefix}: un campo obligatorio que no aparece en el formulario necesita un valor inicial para poder crear registros.`)
    }
  }

  validateCatalogGroup(fields, errors)

  const resourceMeta = source === "existing" && existingResource && RESOURCE_LIBRARY[existingResource]
    ? RESOURCE_LIBRARY[existingResource]
    : null

  const config = {
    version: 1,
    source,
    existingResource: resourceMeta ? existingResource : "",
    screen: {
      type: String(screen.type ?? "CRUD").trim() || "CRUD",
      title: String(screen.title ?? "").trim(),
      component: String(screen.component ?? "").trim(),
      route: String(screen.route ?? "").trim(),
      menuLabel: String(screen.menuLabel ?? "").trim(),
    },
    entity: {
      singular: String(entity.singular ?? "").trim() || (resourceMeta ? resourceMeta.singular : ""),
      plural: String(entity.plural ?? "").trim() || (resourceMeta ? existingResource : ""),
      apiPath: resourceMeta
        ? resourceMeta.apiPath
        : (`/api/${String(entity.plural ?? "").trim()}`),
      // Los recursos reales pueden identificarse por otro campo (por ejemplo dnipac);
      // las entidades nuevas siempre usan el _id automático de Mongoose.
      idField: resourceMeta ? (resourceMeta.idField || "_id") : "_id",
    },
    fields,
    operations: operations.filter((operation) => OPERATIONS.has(operation)),
    relations,
    pinia,
    features: {
      validation: true,
    },
  }

  return { errors, config }
}
