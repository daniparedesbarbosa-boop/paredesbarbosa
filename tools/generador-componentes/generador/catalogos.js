// Utilidades puras para catálogos JSON: analizan la estructura de los datos y
// deciden qué lista y qué campos alimentan un <select>. No tocan el sistema de
// archivos: las usan la validación, las plantillas, el servidor local y el
// asistente de terminal, y las pruebas las ejecutan sin proyecto real.

export const CATALOG_SOURCES = new Set(["project", "inline"])

// Nombres habituales para el identificador y para el texto visible. Se comparan
// sin acentos ni mayúsculas, así que «código» y «codigo» cuentan igual.
const ID_FIELD_CANDIDATES = ["id", "_id", "codigo", "code", "clave", "value", "valor"]
const LABEL_FIELD_CANDIDATES = [
  "nm",
  "nombre",
  "name",
  "label",
  "etiqueta",
  "titulo",
  "denominacion",
  "descripcion",
  "texto",
]

const MAX_LINE_CATALOG = 200

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

export function pascalCase(value) {
  const text = String(value ?? "")
  return text ? text[0].toUpperCase() + text.slice(1) : ""
}

// Acceso a una propiedad del JSON: punto cuando es un identificador válido y
// corchetes cuando la clave tiene espacios, acentos o guiones.
export function propertyAccess(expression, field) {
  if (!field) return expression
  return /^[A-Za-z_$][\w$]*$/.test(field)
    ? `${expression}.${field}`
    : `${expression}[${JSON.stringify(field)}]`
}

export function catalogNameFromFile(file) {
  const normalized = String(file ?? "").replaceAll("\\", "/")
  const match = /^backend\/data\/([a-z][a-z0-9]*)\.json$/.exec(normalized)
  return match ? match[1] : ""
}

// Todos los catálogos viven en backend/data: los que ya existen en el proyecto
// y los que se generan con datos nuevos. El backend los sirve por HTTP en
// /api/<nombre> y el frontend los pide con Axios desde src/api/.
export const catalogDataFile = (name) => `backend/data/${name}.json`
export const catalogApiFile = (name) => `src/api/${name}.js`
export const catalogRoutePath = (name) => `/api/${name}`
export const catalogApiFunctionName = (name) => `obtener${pascalCase(name)}`

// Cada catálogo distinto se genera una sola vez aunque varios campos lo usen.
export function collectCatalogs(config) {
  const catalogs = new Map()
  for (const field of config.fields ?? []) {
    if (field.type !== "catalog" || !field.catalog?.name) continue
    if (!catalogs.has(field.catalog.name)) catalogs.set(field.catalog.name, field.catalog)
  }
  return [...catalogs.values()]
}

export function catalogFields(config) {
  return (config.fields ?? []).filter((field) => field.type === "catalog" && field.catalog)
}

function isPrimitiveValue(value) {
  return value == null || ["string", "number", "boolean"].includes(typeof value)
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function valueOf(item, field) {
  return field ? item?.[field] : item
}

function isFilled(value) {
  return value !== null && value !== undefined && value !== ""
}

function isUniqueField(items, field) {
  const values = items.map((item) => valueOf(item, field))
  if (!values.every(isFilled)) return false
  return new Set(values.map(String)).size === values.length
}

function hasTextValues(items, field) {
  return items.some((item) => typeof valueOf(item, field) === "string" && valueOf(item, field).trim() !== "")
}

function hasDuplicates(items, field) {
  const values = items.map((item) => String(valueOf(item, field) ?? ""))
  return new Set(values).size !== values.length
}

function pickIdField(items, fields) {
  for (const candidate of ID_FIELD_CANDIDATES) {
    const found = fields.find((field) => normalizeKey(field) === candidate)
    if (found && isUniqueField(items, found)) return found
  }
  return fields.find((field) => isUniqueField(items, field)) ?? ""
}

function pickLabelField(items, fields, idField) {
  for (const candidate of LABEL_FIELD_CANDIDATES) {
    const found = fields.find((field) => normalizeKey(field) === candidate && hasTextValues(items, field))
    if (found) return found
  }
  return fields.find((field) => field !== idField && hasTextValues(items, field)) ?? ""
}

// Acepta además una lista de líneas «valor|etiqueta» cuando el texto no es JSON,
// para poder pegar catálogos cortos sin escribir la estructura completa.
function parseCatalogLines(raw) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.length || lines.some((line) => line.length > MAX_LINE_CATALOG)) return []
  const items = []
  for (const [index, line] of lines.entries()) {
    const separator = line.indexOf("|")
    const value = separator >= 0 ? line.slice(0, separator).trim() : line
    const label = separator >= 0 ? line.slice(separator + 1).trim() : line
    if (!label && !value) return []
    items.push({ id: index + 1, nm: label || value })
  }
  return items
}

// Analiza el JSON completo: elige la lista que se usará, detecta el campo
// identificador y el texto visible, y propone el valor que se guardará en el
// formulario (de momento el mismo texto visible, como hace espedoc).
export function analyzeCatalog(text, { name = "", file = "", rootKey } = {}) {
  const raw = typeof text === "string" ? text : ""
  if (!raw.trim()) {
    return { ok: false, error: "El catálogo está vacío: elige un archivo JSON de backend/data o pega sus datos." }
  }

  let parsed
  let fromLines = false
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const items = parseCatalogLines(raw)
    if (!items.length) {
      return { ok: false, error: `Los datos del catálogo deben ser JSON válido: ${error.message}` }
    }
    parsed = { [name || "catalogo"]: items }
    fromLines = true
  }

  let arrays = []
  if (Array.isArray(parsed)) {
    arrays = [{ key: "", items: parsed }]
  } else if (isPlainObject(parsed)) {
    arrays = Object.entries(parsed)
      .filter(([, value]) => Array.isArray(value))
      .map(([key, items]) => ({ key, items }))
  }
  if (!arrays.length) {
    return {
      ok: false,
      error: "El JSON no contiene ninguna lista que pueda usarse como catálogo: añade un array de objetos o de valores.",
    }
  }

  const forced = rootKey === undefined || rootKey === null ? null : String(rootKey)
  const chosen = forced !== null
    ? arrays.find((array) => array.key === forced)
    : arrays.find((array) => array.key && normalizeKey(array.key) === normalizeKey(name))
      ?? arrays.reduce((best, array) => (array.items.length > best.items.length ? array : best), arrays[0])
  if (!chosen) {
    return {
      ok: false,
      error: `La lista «${forced}» no existe en el catálogo. Listas disponibles: ${arrays
        .map((array) => array.key || "(la raíz es una lista)")
        .join(", ")}.`,
    }
  }
  if (chosen.items.length === 0) {
    return { ok: false, error: `La lista «${chosen.key || "principal"}» está vacía: no hay opciones para el selector.` }
  }

  const objects = chosen.items.every(isPlainObject)
  const primitive = !objects && chosen.items.every(isPrimitiveValue)
  if (!objects && !primitive) {
    return {
      ok: false,
      error: "La lista debe contener objetos ({ \"id\": 1, \"nm\": \"...\" }) o valores simples, no una mezcla.",
    }
  }

  const fields = objects ? [...new Set(chosen.items.flatMap((item) => Object.keys(item)))] : []
  const idField = objects ? pickIdField(chosen.items, fields) : ""
  const labelField = objects ? pickLabelField(chosen.items, fields, idField) : ""
  const repeatedLabels = Boolean(objects && labelField && hasDuplicates(chosen.items, labelField))
  const valueField = labelField && !repeatedLabels ? labelField : idField || labelField

  const notes = []
  if (fromLines) {
    notes.push("Los datos no eran JSON: se interpretaron como una lista de líneas «valor|etiqueta».")
  }
  if (arrays.length > 1) {
    const others = arrays
      .filter((array) => array !== chosen)
      .map((array) => `${array.key || "(la raíz es una lista)"} (${array.items.length})`)
      .join(", ")
    notes.push(`El JSON también contiene otras listas: ${others}. El selector usará solo «${chosen.key || "la lista raíz"}».`)
  }
  if (objects && !idField) {
    notes.push("No se detectó un identificador único: el filtro por otro selector no estará disponible.")
  }
  if (repeatedLabels) {
    notes.push(`El campo «${labelField}» repite valores; se propone «${valueField}» como valor guardado.`)
  }
  if (objects && !labelField) {
    notes.push("No se detectó un campo de texto visible; elige uno manualmente.")
  }

  return {
    ok: true,
    name: name || catalogNameFromFile(file),
    file,
    rootKey: chosen.key,
    arrays: arrays.map((array) => ({ key: array.key, count: array.items.length })),
    count: chosen.items.length,
    primitive,
    fields,
    idField,
    labelField,
    valueField,
    duplicateLabels: repeatedLabels,
    sample: chosen.items.slice(0, 3),
    parsed,
    notes,
  }
}

// Extrae las funciones exportadas de un módulo de src/api/ y cuántos argumentos
// obligatorios recibe cada una. Sirve para no reutilizar una función que espera
// parámetros y fallaría si el componente la llamara sin argumentos.
export function extractExportedFunctions(source) {
  const functions = []
  const add = (name, params) => {
    if (!functions.some((entry) => entry.name === name)) {
      functions.push({ name, params: countRequiredParams(params) })
    }
  }
  for (const match of String(source ?? "").matchAll(/export\s+async\s+function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    add(match[1], match[2])
  }
  for (const match of String(source ?? "").matchAll(/export\s+function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)) {
    add(match[1], match[2])
  }
  for (const match of String(source ?? "").matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*)?\(([^)]*)\)/g)) {
    add(match[1], match[2])
  }
  return functions
}

function countRequiredParams(params) {
  return String(params ?? "")
    .split(",")
    .map((param) => param.trim())
    .filter(Boolean)
    .filter((param) => !param.includes("="))
    .length
}
