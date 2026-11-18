// Capa que conecta el análisis de catálogos con el proyecto real: lee los JSON
// de backend/data, revisa los módulos de src/api/ y la ruta de backend/server.js.
// La usan el servidor local y el asistente de terminal; la validación pura no
// toca el sistema de archivos.

import { access, readdir, readFile } from "node:fs/promises"
import path from "node:path"
import {
  analyzeCatalog,
  catalogApiFile,
  catalogApiFunctionName,
  catalogDataFile,
  catalogNameFromFile,
  catalogRoutePath,
  extractExportedFunctions,
} from "./catalogos.js"

const CATALOG_DIRECTORY = "backend/data"

export async function fileExists(target) {
  try {
    await access(target)
    return true
  } catch (error) {
    if (error.code === "ENOENT") return false
    throw error
  }
}

export function isSafeCatalogFile(file) {
  return /^backend\/data\/[a-z][a-z0-9]*\.json$/.test(String(file ?? "").replaceAll("\\", "/"))
}

// Catálogos disponibles en el proyecto para el selector de archivos del
// formulario y del asistente de terminal.
export async function listProjectCatalogFiles(projectRoot) {
  const directory = path.resolve(projectRoot, CATALOG_DIRECTORY)
  let entries = []
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
  return entries
    .filter((entry) => entry.isFile() && /^[a-z][a-z0-9]*\.json$/.test(entry.name))
    .map((entry) => ({ name: entry.name.replace(/\.json$/, ""), file: `${CATALOG_DIRECTORY}/${entry.name}` }))
    .sort((first, second) => first.name.localeCompare(second.name))
}

export async function describeCatalogApi(projectRoot, name) {
  const file = catalogApiFile(name)
  const absolute = path.resolve(projectRoot, file)
  const suggestedFunction = catalogApiFunctionName(name)
  if (!(await fileExists(absolute))) {
    return { file, exists: false, functions: [], suggestedFunction }
  }
  const functions = extractExportedFunctions(await readFile(absolute, "utf8"))
  return { file, exists: true, functions, suggestedFunction }
}

export async function catalogRouteExists(projectRoot, name) {
  const backendPath = path.resolve(projectRoot, "backend", "server.js")
  if (!(await fileExists(backendPath))) return false
  const source = await readFile(backendPath, "utf8")
  const routePath = catalogRoutePath(name)
  const pattern = new RegExp(
    `app\\.(?:get|use)\\s*\\(\\s*["'\`]${routePath.replaceAll("/", "\\/")}(?:\\/)?["'\`]`,
  )
  return pattern.test(source)
}

// Analiza un archivo real de backend/data y añade lo que el proyecto ya tiene
// para ese catálogo: módulo de API, funciones exportadas y ruta registrada.
export async function analyzeProjectCatalog(projectRoot, file, { rootKey } = {}) {
  const normalized = String(file ?? "").replaceAll("\\", "/")
  if (!isSafeCatalogFile(normalized)) {
    const error = new Error(
      "El catálogo debe ser un archivo JSON de backend/data con nombre en minúsculas (por ejemplo backend/data/especialidades.json).",
    )
    error.statusCode = 400
    throw error
  }
  const name = catalogNameFromFile(normalized)
  const absolute = path.resolve(projectRoot, normalized)
  let contents
  try {
    contents = await readFile(absolute, "utf8")
  } catch (error) {
    if (error.code === "ENOENT") {
      const missing = new Error(`No existe ${normalized} en el proyecto: elige uno de los catálogos disponibles.`)
      missing.statusCode = 400
      throw missing
    }
    throw error
  }
  const analysis = analyzeCatalog(contents, { name, file: normalized, rootKey })
  if (!analysis.ok) {
    const error = new Error(analysis.error)
    error.statusCode = 400
    throw error
  }
  return {
    ...analysis,
    api: await describeCatalogApi(projectRoot, name),
    route: { path: catalogRoutePath(name), exists: await catalogRouteExists(projectRoot, name) },
  }
}

// La respuesta HTTP no envía la lista completa: basta con la estructura, una
// muestra y lo que ya existe en el proyecto.
export function publicCatalogAnalysis(analysis) {
  const { parsed, ...rest } = analysis
  return rest
}

// Completa la configuración de los campos catálogo con lo que se detecta en
// disco y comprueba que reutilizar una API o generar un módulo es posible. Así
// la web y la terminal solo necesitan elegir el archivo o pegar los datos.
export async function enrichCatalogs(projectRoot, input) {
  if (!input || typeof input !== "object" || !Array.isArray(input.fields)) {
    return { input, errors: [] }
  }
  const errors = []
  const fields = []
  for (const field of input.fields) {
    if (!field || String(field.type ?? "") !== "catalog") {
      fields.push(field)
      continue
    }
    const original = field.catalog && typeof field.catalog === "object" && !Array.isArray(field.catalog)
      ? field.catalog
      : {}
    const source = String(original.source ?? "project").trim() || "project"
    if (source !== "project") {
      // Un catálogo nuevo se guarda en backend/data y su módulo de API lo
      // importa directamente: no necesita ninguna ruta en backend/server.js.
      const name = String(original.name ?? "").trim()
      const catalog = /^[a-z][a-z0-9]*$/.test(name)
        ? { ...original, source: "inline", name }
        : original
      fields.push({ ...field, catalog })
      continue
    }

    const file = catalogNameFromFile(original.file)
      ? String(original.file).replaceAll("\\", "/")
      : catalogDataFile(String(original.name ?? "").trim())
    const name = catalogNameFromFile(file)
    if (!name) {
      errors.push(
        `Campo ${field.name || "(sin nombre)"}: el catálogo debe ser un archivo JSON de backend/data con nombre en minúsculas.`,
      )
      fields.push(field)
      continue
    }

    let analysis
    try {
      analysis = await analyzeProjectCatalog(projectRoot, file, {
        rootKey: original.rootKey === "" || original.rootKey == null ? undefined : original.rootKey,
      })
    } catch (error) {
      errors.push(`Campo ${field.name || "(sin nombre)"}: ${error.message}`)
      fields.push(field)
      continue
    }

    const catalog = {
      ...original,
      source: "project",
      name,
      file,
      rootKey: analysis.rootKey,
      primitive: analysis.primitive,
      idField: analysis.primitive ? "" : String(original.idField ?? "").trim() || analysis.idField,
      labelField: analysis.primitive ? "" : String(original.labelField ?? "").trim() || analysis.labelField,
      valueField: analysis.primitive ? "" : String(original.valueField ?? "").trim() || analysis.valueField,
      apiFunction: String(original.apiFunction ?? "").trim(),
      routeExists: analysis.route.exists,
      count: analysis.count,
    }
    if (original.rootKey !== "" && original.rootKey != null && original.rootKey !== analysis.rootKey) {
      errors.push(
        `Campo ${field.name || "(sin nombre)"}: la lista «${original.rootKey}» no existe en ${file}. Listas disponibles: ${analysis.arrays
          .map((array) => array.key || "(la raíz es una lista)")
          .join(", ")}.`,
      )
    }
    if (!analysis.primitive) {
      for (const [key, label] of [
        ["labelField", "campo visible"],
        ["valueField", "valor guardado"],
        ["idField", "identificador"],
      ]) {
        if (original[key] && !analysis.fields.includes(String(original[key]))) {
          errors.push(
            `Campo ${field.name || "(sin nombre)"}: el ${label} «${original[key]}» no existe en ${file}. Campos disponibles: ${analysis.fields.join(", ")}.`,
          )
        }
      }
      if (!catalog.labelField) {
        errors.push(
          `Campo ${field.name || "(sin nombre)"}: no se pudo detectar el campo visible de ${file}; indica cuál usar.`,
        )
      }
    }

    // Si no se eligió función, se intenta reutilizar sin preguntar la que ya
    // carga esa lista: primero la del nombre del catálogo (obtenerEspecialidades)
    // y después la de la lista elegida (municipios.json → provincias usa
    // obtenerProvincias). Con un único módulo y una sola lista se acepta su
    // única función sin argumentos.
    if (!catalog.apiFunction && analysis.api.exists) {
      const reusable = analysis.api.functions.filter((entry) => entry.params === 0)
      const suggested = reusable.find((entry) => entry.name === analysis.api.suggestedFunction)
        ?? reusable.find((entry) => entry.name === catalogApiFunctionName(analysis.rootKey))
        ?? (analysis.arrays.length === 1 && reusable.length === 1 ? reusable[0] : null)
      if (suggested) catalog.apiFunction = suggested.name
    }

    if (catalog.apiFunction) {
      const exported = analysis.api.functions.find((entry) => entry.name === catalog.apiFunction)
      if (!analysis.api.exists) {
        errors.push(
          `Campo ${field.name || "(sin nombre)"}: se pidió reutilizar ${catalog.apiFunction} pero no existe ${analysis.api.file}.`,
        )
      } else if (!exported) {
        const available = analysis.api.functions.map((entry) => `${entry.name}()`).join(", ") || "ninguna"
        errors.push(
          `Campo ${field.name || "(sin nombre)"}: ${analysis.api.file} no exporta ${catalog.apiFunction}. Funciones disponibles: ${available}.`,
        )
      } else if (exported.params > 0) {
        errors.push(
          `Campo ${field.name || "(sin nombre)"}: ${catalog.apiFunction}() necesita ${exported.params} argumento(s) y el componente la llamaría sin argumentos. Elige una función sin parámetros o genera otro módulo.`,
        )
      }
      if (!analysis.route.exists) {
        errors.push(
          `Campo ${field.name || "(sin nombre)"}: no se encontró la ruta ${analysis.route.path} en backend/server.js; el selector no podría cargar el catálogo.`,
        )
      }
    } else if (analysis.api.exists) {
      const reusable = analysis.api.functions.filter((entry) => entry.params === 0)
      errors.push(
        `Campo ${field.name || "(sin nombre)"}: ya existe ${analysis.api.file}. ${
          reusable.length
            ? `Reutiliza una de sus funciones sin argumentos (${reusable.map((entry) => entry.name).join(", ")}) en lugar de generar un módulo duplicado.`
            : "No exporta funciones sin argumentos; usa otro nombre de catálogo."
        }`,
      )
    }

    fields.push({ ...field, catalog })
  }
  return { input: { ...input, fields }, errors }
}
