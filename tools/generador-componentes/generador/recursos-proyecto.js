// Cruza la biblioteca curada de recursos (generador/datos.js) con lo que existe
// de verdad en el proyecto: módulos de src/api/, funciones exportadas y archivos
// de referencia. La usan el servidor local y el asistente de terminal; la
// validación pura sigue sin tocar el disco.

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { RESOURCE_LIBRARY } from "./datos.js"
import { extractExportedFunctions } from "./catalogos.js"
import { fileExists } from "./catalogos-proyecto.js"
import { describeStore, discoverProjectEntities, listProjectStores, storeEntryFor } from "./entidades-proyecto.js"

const API_DIRECTORY = "src/api"

// Prefijos habituales de cada operación. Solo se usan para proponer funciones y
// explicar qué hay en el módulo: el nombre por sí solo no garantiza qué hace la
// función, así que la generación sigue usando el mapa curado.
const OPERATION_PATTERNS = {
  list: /^(?:get|list|fetch|find|obtener|listar|cargar|consultar)/i,
  create: /^(?:save|create|add|insert|post|guardar|crear|registrar|insertar)/i,
  edit: /^(?:modify|update|edit|patch|actualizar|modificar|editar)/i,
  delete: /^(?:delete|remove|destroy|borrar|eliminar)/i,
}

// Fuente única de recursos: lo que el estado del proyecto y las comprobaciones
// previas necesitan se deriva de RESOURCE_LIBRARY, sin una segunda lista.
export function resourceEntries() {
  return Object.entries(RESOURCE_LIBRARY).map(([key, meta]) => ({
    key,
    name: meta.label,
    apiFile: meta.apiFile,
    files: meta.referenceFiles ?? [],
    catalogOnly: Boolean(meta.catalogOnly),
    hasStore: Boolean(meta.store),
    idField: meta.idField || "_id",
    operations: Object.keys(meta.apiFunctions ?? {}),
  }))
}

// Módulos reales de src/api/ con nombre de recurso (minúsculas y números).
export async function listProjectApiModules(projectRoot) {
  const directory = path.resolve(projectRoot, API_DIRECTORY)
  let entries = []
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
  return entries
    .filter((entry) => entry.isFile() && /^[a-z][a-z0-9]*\.js$/.test(entry.name))
    .map((entry) => ({ key: entry.name.replace(/\.js$/, ""), file: `${API_DIRECTORY}/${entry.name}` }))
    .sort((first, second) => first.key.localeCompare(second.key))
}

// Deriva el módulo de API de un recurso: usa el nombre curado si existe en disco
// y, si no, busca src/api/<clave>.js. Devuelve las funciones exportadas de verdad.
export async function describeResourceApi(projectRoot, key) {
  const meta = RESOURCE_LIBRARY[key]
  const expected = `${API_DIRECTORY}/${meta?.apiFile ?? `${key}.js`}`
  const modules = await listProjectApiModules(projectRoot)
  const found = modules.find((module) => module.file === expected)
    ?? modules.find((module) => module.key === key)
  if (!found) return { file: expected, exists: false, functions: [] }
  const source = await readFile(path.resolve(projectRoot, found.file), "utf8")
  return { file: found.file, exists: true, functions: extractExportedFunctions(source) }
}

// Propone la función de cada operación por su nombre. Es información para el
// mensaje de error y el estado del proyecto, no la fuente de la generación.
export function proposeApiFunctions(functions) {
  const proposals = {}
  for (const [operation, pattern] of Object.entries(OPERATION_PATTERNS)) {
    const candidate = functions.find((entry) =>
      (operation !== "list" || entry.params === 0) && pattern.test(entry.name))
    if (candidate) proposals[operation] = candidate.name
  }
  return proposals
}

// Estado de los recursos del proyecto: qué archivos existen, qué módulo de API
// hay, qué funciones exporta y cuáles del mapa curado no aparecen en disco.
export async function describeProjectResources(projectRoot) {
  const stores = await listProjectStores(projectRoot)
  const resources = []
  for (const reference of resourceEntries()) {
    const files = []
    for (const relativePath of reference.files) {
      if (await fileExists(path.resolve(projectRoot, relativePath))) files.push(relativePath)
    }
    const store = describeStore(
      storeEntryFor(stores, { key: reference.key, singular: RESOURCE_LIBRARY[reference.key].singular }),
      reference.idField,
    )
    const api = await describeResourceApi(projectRoot, reference.key)
    const exported = new Set(api.functions.map((entry) => entry.name))
    const apiFunctions = RESOURCE_LIBRARY[reference.key].apiFunctions ?? {}
    const missingFunctions = Object.entries(apiFunctions)
      .filter(([, name]) => api.exists && !exported.has(name))
      .map(([operation, name]) => ({ operation, name }))
    resources.push({
      key: reference.key,
      name: reference.name,
      files,
      apiFile: api.file,
      apiExists: api.exists,
      exportedFunctions: api.functions.map((entry) => entry.name),
      missingFunctions,
      operations: Object.keys(apiFunctions).filter((operation) => exported.has(apiFunctions[operation])),
      catalogOnly: reference.catalogOnly,
      // El modo Pinia depende del store real de src/store/, no de una lista
      // fija: si el archivo existe, la entidad puede compartir la selección.
      hasStore: Boolean(store),
      storeFile: store?.file ?? "",
      store,
      relationOnly: false,
      idField: reference.idField,
      // Solo se ofrece en el formulario lo que se puede generar sin sorpresas:
      // módulo de API, todos los archivos de referencia y sus funciones.
      usable: api.exists && files.length === reference.files.length && missingFunctions.length === 0,
    })
  }
  // Entidades que la herramienta generó antes (o cualquiera con la misma
  // estructura): solo sirven como destino de una relación, no para reutilizar
  // su pantalla completa.
  return resources.concat(await discoverProjectEntities(projectRoot))
}

// Comprueba que un recurso reutilizado está completo: archivos de referencia,
// módulo de API y las funciones que la pantalla va a importar según sus
// operaciones. Devuelve lo que falta para que el servidor y la terminal den el
// mismo diagnóstico en lugar de generar código que fallaría al integrarlo.
export async function inspectExistingResource(projectRoot, config) {
  const empty = { unknown: false, files: [], functions: [], available: [], apiFile: "" }
  if (config?.source !== "existing") return empty
  const key = config.existingResource
  const meta = RESOURCE_LIBRARY[key]
  if (!meta) return { ...empty, unknown: true }

  const files = []
  for (const relativePath of meta.referenceFiles ?? []) {
    if (!(await fileExists(path.resolve(projectRoot, relativePath)))) files.push(relativePath)
  }
  const api = await describeResourceApi(projectRoot, key)
  if (!api.exists && !files.includes(api.file)) files.push(api.file)

  const functions = []
  if (api.exists) {
    const exported = new Set(api.functions.map((entry) => entry.name))
    for (const operation of config.operations ?? []) {
      const name = meta.apiFunctions?.[operation]
      if (name && !exported.has(name)) functions.push({ operation, name })
    }
  }

  return {
    unknown: false,
    files,
    functions,
    available: api.functions.map((entry) => entry.name),
    apiFile: api.file,
  }
}
