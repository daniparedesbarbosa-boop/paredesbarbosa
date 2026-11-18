// Descubre en el disco lo que la generación necesita saber del proyecto para
// las relaciones: los stores de Pinia reales de src/store/ y las entidades que
// la propia herramienta generó antes (modelo en backend/modelos, módulo en
// src/api y, si se pidió, store). Con eso, el modo «Selección compartida con
// Pinia» deja de depender de una lista fija y funciona también con entidades
// nuevas.

import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { RESOURCE_LIBRARY, slugify } from "./datos.js"
import { extractExportedFunctions } from "./catalogos.js"

const MODEL_DIRECTORY = "backend/modelos"
const API_DIRECTORY = "src/api"
const STORE_DIRECTORY = "src/store"

async function listDirectoryFiles(projectRoot, directory) {
  try {
    const entries = await readdir(path.resolve(projectRoot, directory), { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
      .map((entry) => entry.name)
      .sort((first, second) => first.localeCompare(second))
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
}

// Interpreta un archivo de src/store/: el export con defineStore, las claves de
// state y los nombres de las acciones. Es una lectura de estructura, no un
// analizador de JavaScript: sirve para los stores de este proyecto, que siguen
// todos el mismo patrón (state: () => ({...}) y actions: {...}).
export function parseStore(source, file) {
  const definicion = /export\s+const\s+([A-Za-z_$][\w$]*)\s*=\s*defineStore\(\s*(["'`])([^"'`]+)\2/.exec(source)
  if (!definicion) return null

  const estado = /state\s*:\s*\(\s*\)\s*=>\s*\(\s*\{([\s\S]*?)\n\s*\}\s*\)/.exec(source)
  const stateKeys = estado
    ? [...estado[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:/gm)].map((match) => match[1])
    : []

  const bloqueAcciones = source.slice(source.indexOf("actions:"))
  const actions = source.includes("actions:")
    ? [...bloqueAcciones.matchAll(/^\s{4}([A-Za-z_$][\w$]*)\s*\(/gm)].map((match) => match[1])
    : []

  return { file, importName: definicion[1], storeId: definicion[3], stateKeys, actions }
}

export async function listProjectStores(projectRoot) {
  const stores = []
  for (const file of await listDirectoryFiles(projectRoot, STORE_DIRECTORY)) {
    const source = await readFile(path.resolve(projectRoot, STORE_DIRECTORY, file), "utf8")
    const store = parseStore(source, file)
    if (store) stores.push(store)
  }
  return stores
}

// Descriptor que las plantillas necesitan: qué id guarda la selección, qué
// propiedad se envía como referencia y cómo se llama la acción de limpiar.
export function describeStore(store, idField = "") {
  if (!store) return null
  const idProp = store.stateKeys.find((key) => /^id[A-Z0-9_]/.test(key)) ?? store.stateKeys[0]
  if (!idProp) return null
  return {
    file: store.file,
    importName: store.importName,
    storeId: store.storeId,
    idProp,
    // Si el estado guarda el identificador real de la entidad (por ejemplo
    // dnipac en pacientes), es ese el valor que se envía a la API.
    relationValueProp: idField && store.stateKeys.includes(idField) ? idField : idProp,
    seleccionar: store.actions.find((name) => /^seleccionar/i.test(name)) ?? "",
    limpiar: store.actions.find((name) => /^limpiar/i.test(name)) ?? "",
  }
}

// Busca el store de una entidad por convenio de nombre (recetaStore.js), por la
// clave del recurso o por el identificador de defineStore.
export function storeEntryFor(stores, { key, singular }) {
  const esperado = `${slugify(singular)}Store.js`
  return stores.find((store) => store.file === esperado)
    ?? stores.find((store) => store.file === `${key}Store.js`)
    ?? stores.find((store) => store.storeId === slugify(singular))
    ?? stores.find((store) => store.storeId === key)
    ?? null
}

// Campos del esquema Mongoose, en el orden del archivo.
function modelFields(source) {
  const schema = /new\s+mongoose\.Schema\(\s*\{([\s\S]*?)\n\s*\}/.exec(source)
  if (!schema) return []
  return [...schema[1].matchAll(/^\s{2,4}([a-z][A-Za-z0-9]*)\s*:\s*\{/gm)].map((match) => match[1])
}

// Entidades del proyecto que no están en la biblioteca curada: las que generó
// esta herramienta (o cualquiera que siga su estructura). Solo se ofrecen si
// tienen modelo y módulo de API con función de listado; el store es opcional y
// es lo que habilita el modo Pinia.
export async function discoverProjectEntities(projectRoot) {
  const stores = await listProjectStores(projectRoot)
  const apiFiles = await listDirectoryFiles(projectRoot, API_DIRECTORY)
  const models = (await listDirectoryFiles(projectRoot, MODEL_DIRECTORY))
    .filter((file) => /^[A-Z][A-Za-z0-9]*\.js$/.test(file))
  const entities = []

  // La biblioteca usa claves en plural (pacientes, doctores, citas); el modelo,
  // en singular (Paciente, Doctor, Cita). Se comparan ambos para no duplicar una
  // entidad curada como si fuera descubierta.
  const curated = new Set(Object.values(RESOURCE_LIBRARY).flatMap((meta) => [meta.singular, meta.refModel, meta.singularWord].filter(Boolean)))

  for (const model of models) {
    const singular = model.replace(/\.js$/, "")
    const key = slugify(singular)
    // Las entidades de la biblioteca ya tienen metadatos curados.
    if (RESOURCE_LIBRARY[key] || curated.has(singular)) continue

    const modelPath = `${MODEL_DIRECTORY}/${model}`
    const source = await readFile(path.resolve(projectRoot, modelPath), "utf8")
    const storeEntry = storeEntryFor(stores, { key, singular })
    const store = describeStore(storeEntry, "_id")
    const apiFile = apiFiles.find((file) => file === `${key}.js`)
      ?? apiFiles.find((file) => file === `${key}s.js`)
      ?? null

    let exported = []
    if (apiFile) {
      const apiSource = await readFile(path.resolve(projectRoot, API_DIRECTORY, apiFile), "utf8")
      exported = extractExportedFunctions(apiSource).map((entry) => entry.name)
    }
    const listFunction = exported.find((name) => /^(?:get|list|obtener|listar|cargar|consultar)/i.test(name)) ?? ""

    // Para mostrar cada registro en el selector: lo que el store comparte (sin
    // el identificador) o, si no hay store, los primeros campos del modelo.
    const displayFields = storeEntry
      ? storeEntry.stateKeys
        .filter((field) => ![store.idProp, store.relationValueProp].includes(field))
        .slice(0, 2)
      : modelFields(source).slice(0, 2)

    const referenceFiles = [modelPath]
    if (apiFile) referenceFiles.push(`${API_DIRECTORY}/${apiFile}`)
    if (store) referenceFiles.push(`${STORE_DIRECTORY}/${store.file}`)

    entities.push({
      key,
      name: `${singular}s`,
      label: `${singular}s`,
      singular,
      singularWord: `${singular[0].toLowerCase()}${singular.slice(1)}`,
      refModel: singular,
      // Las entidades generadas se localizan por _id de MongoDB.
      relationIdField: "",
      idField: "_id",
      displayFields,
      apiFile: apiFile ?? "",
      apiPath: `/api/${apiFile ? apiFile.replace(/\.js$/, "") : key}`,
      apiFunctions: listFunction ? { list: listFunction } : {},
      // `files` es lo que lee /api/status; el descriptor lleva el mismo dato con
      // el nombre que espera la validación.
      files: referenceFiles,
      referenceFiles,
      apiExists: Boolean(apiFile),
      missingFunctions: apiFile && !listFunction ? [{ operation: "list", name: `${key}` }] : [],
      operations: listFunction ? ["list"] : [],
      store,
      catalogOnly: false,
      // Sin módulo de API o sin función de listado no hay selector posible.
      usable: Boolean(apiFile) && Boolean(listFunction),
      // Existen para relaciones; reutilizar su pantalla completa sigue siendo
      // cosa de la biblioteca curada.
      relationOnly: true,
      origin: "project",
    })
  }

  return entities
}

// Completa las relaciones de una configuración con lo descubierto en disco:
// el descriptor de la entidad (modelo, API, campos visibles) y su store real.
// Así la interfaz web y la terminal solo envían el nombre de la entidad y la
// forma de elegir el registro.
export async function enrichRelations(projectRoot, input) {
  const relations = Array.isArray(input?.relations) ? input.relations : []
  if (!relations.length) return input

  const stores = await listProjectStores(projectRoot)
  const entities = await discoverProjectEntities(projectRoot)

  const enriched = relations.map((relation) => {
    if (!relation || typeof relation !== "object") return relation
    const key = String(relation.resource ?? "").trim()
    const library = RESOURCE_LIBRARY[key]
    const discovered = entities.find((entity) => entity.key === key)

    // Entidad generada: se copia su descriptor completo.
    if (!library && discovered) {
      const { key: entityKey, name, singularWord, refModel, relationIdField, idField, displayFields, apiFunctions, apiPath, files, store, catalogOnly } = discovered
      return {
        ...relation,
        resource: entityKey,
        entity: { label: name, singularWord, refModel, relationIdField, idField, displayFields, apiFunctions, apiPath, referenceFiles: files, catalogOnly, store },
      }
    }

    // Entidad de la biblioteca: solo se añade el store que exista de verdad en
    // src/store/, para que el modo Pinia sepa qué archivo importar. Va en su
    // propio campo para no mezclarlo con el descriptor de una entidad entera.
    if (library) {
      const storeEntry = storeEntryFor(stores, { key, singular: library.singular })
      const store = describeStore(storeEntry, library.idField)
      if (!store) return relation
      return { ...relation, store }
    }

    return relation
  })

  return { ...input, relations: enriched }
}
