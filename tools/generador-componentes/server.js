import { createServer } from "node:http"
import { randomUUID } from "node:crypto"
import { access, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { publishGeneratedDirectory } from "./generador/archivos.js"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { generateFiles, validateConfiguration, relationRequiredFiles } from "./generador.js"
import { analyzeCatalog, catalogRoutePath } from "./generador/catalogos.js"
import {
  analyzeProjectCatalog,
  catalogRouteExists,
  describeCatalogApi,
  enrichCatalogs,
  listProjectCatalogFiles,
  publicCatalogAnalysis,
} from "./generador/catalogos-proyecto.js"
import {
  describeProjectResources,
  inspectExistingResource,
} from "./generador/recursos-proyecto.js"
import { enrichRelations } from "./generador/entidades-proyecto.js"
import { normalizarArchivo } from "./analizador/fuentes.js"
import { analizarPantalla, resumenPantallas } from "./analizador/inventario.js"
import { inventarioPublico } from "./analizador/publico.js"
import { generarParches } from "./analizador/parches/registro.js"
import { verificarParches } from "./analizador/verificar.js"

if (process.argv.includes("--terminal")) {
  if (!process.stdin.isTTY) {
    console.error("El modo terminal necesita una consola interactiva. Ejecuta este comando desde PowerShell, CMD o la terminal de VS Code.")
    process.exitCode = 1
  } else {
    const { runTerminal } = await import("./terminal.js")
    await runTerminal()
  }
} else {
// El modo terminal conserva el mismo generador, pero no inicia el servidor HTTP.
const TOOL_ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(TOOL_ROOT, "..", "..")
const OUTPUT_ROOT = path.resolve(TOOL_ROOT, "salidas")
const HOST = "127.0.0.1"
const PORT = Number(process.env.COMPONENT_GENERATOR_PORT || 4179)
const MAX_BODY_BYTES = 1_000_000
const PUBLIC_MODULES = new Set(["api.js", "ui.js", "restricciones.js"])

function send(response, status, body, contentType = "application/json; charset=utf-8") {
  response.writeHead(status, {
    "Content-Type": contentType,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "Content-Security-Policy": "default-src 'self'; connect-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  })
  response.end(contentType.startsWith("application/json") ? JSON.stringify(body) : body)
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) {
      const error = new Error("La solicitud supera el tamaño permitido.")
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch {
    const error = new Error("El cuerpo de la solicitud no contiene JSON válido.")
    error.statusCode = 400
    throw error
  }
}

function getOutputPath(slug) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 60) {
    throw new Error("El nombre de salida calculado no es seguro.")
  }
  const target = path.resolve(OUTPUT_ROOT, slug)
  if (path.dirname(target) !== OUTPUT_ROOT) {
    throw new Error("La salida solicitada queda fuera de la carpeta permitida.")
  }
  return target
}

async function ensureOutputRoot() {
  await mkdir(OUTPUT_ROOT, { recursive: true })
  const info = await lstat(OUTPUT_ROOT)
  if (!info.isDirectory() || info.isSymbolicLink()) {
    throw new Error("La carpeta salidas debe ser una carpeta local normal, no un enlace simbólico.")
  }
}

async function inspectOutput(target) {
  try {
    const info = await lstat(target)
    if (!info.isDirectory() || info.isSymbolicLink()) {
      throw new Error("La salida existente no es una carpeta segura; no se modificó.")
    }
    return true
  } catch (error) {
    if (error.code === "ENOENT") return false
    throw error
  }
}

async function findProjectCollisions(files, config) {
  const matches = []
  for (const relativePath of Object.keys(files)) {
    if (!relativePath.startsWith("backend/") && !relativePath.startsWith("src/")) continue
    const target = path.resolve(PROJECT_ROOT, relativePath)
    try {
      await access(target)
      matches.push(relativePath)
    } catch (error) {
      if (error.code !== "ENOENT") throw error
    }
  }

  const routerPath = path.join(PROJECT_ROOT, "src", "router", "index.js")
  try {
    const routerSource = await readFile(routerPath, "utf8")
    const routePattern = /\bpath\s*:\s*(["'])(.*?)\1/g
    for (const match of routerSource.matchAll(routePattern)) {
      if (match[2] === config.screen.route) {
        matches.push(`src/router/index.js (ya registra la ruta ${config.screen.route})`)
        break
      }
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }

  // El solape con backend/server.js solo interfiere cuando la pantalla crea una
  // API nueva; reutilizar un recurso existente usa una ruta ya registrada.
  if (config.source !== "existing") {
    const backendPath = path.join(PROJECT_ROOT, "backend", "server.js")
    try {
      const backendSource = await readFile(backendPath, "utf8")
      const endpointPattern = /\bapp\.(?:use|get|post|put|delete)\s*\(\s*(["'`])([^"'`]+)\1/g
      for (const match of backendSource.matchAll(endpointPattern)) {
        const currentPath = match[2].replace(/\/+$/, "")
        const proposedPath = config.entity.apiPath.replace(/\/+$/, "")
        if (currentPath === proposedPath ||
            currentPath.startsWith(`${proposedPath}/`) ||
            proposedPath.startsWith(`${currentPath}/`)) {
          matches.push(`backend/server.js (la ruta ${proposedPath} se solapa con ${currentPath})`)
          break
        }
      }
    } catch (error) {
      if (error.code !== "ENOENT") throw error
    }
  }
  return matches
}

// Para pantallas que reutilizan un recurso real, comprueba que sus archivos,
// su módulo de src/api/ y las funciones que el componente va a importar existen
// de verdad; si falta algo, la generación se detiene en lugar de fingir que
// funcionará.
async function ensureExistingResourceFiles(config) {
  if (config.source !== "existing") return
  const inspection = await inspectExistingResource(PROJECT_ROOT, config)
  if (inspection.unknown) {
    const error = new Error("El recurso solicitado no figura entre los recursos conocidos del proyecto.")
    error.statusCode = 400
    throw error
  }
  if (inspection.files.length) {
    const error = new Error(`El recurso ${config.existingResource} no está completo en el proyecto; faltan: ${inspection.files.join(", ")}. No se puede garantizar que las funciones importadas existan, así que no se generó nada.`)
    error.statusCode = 400
    throw error
  }
  if (inspection.functions.length) {
    const missing = inspection.functions.map((entry) => entry.name).join(", ")
    const available = inspection.available.map((name) => `${name}()`).join(", ") || "ninguna"
    const error = new Error(`El recurso ${config.existingResource} no exporta en ${inspection.apiFile} las funciones que la pantalla necesita: ${missing}. Funciones disponibles: ${available}. Revisa src/api/ o ajusta las operaciones antes de generar.`)
    error.statusCode = 400
    throw error
  }
}

// Las pantallas con relaciones importan módulos y stores reales del proyecto
// (por ejemplo getPacientes o usePacienteStore); si alguno no existe, la
// generación se detiene en lugar de fabricar código que no compilaría.
async function ensureRelationResourceFiles(config) {
  const missing = []
  for (const relativePath of relationRequiredFiles(config)) {
    try {
      await access(path.resolve(PROJECT_ROOT, relativePath))
    } catch (error) {
      if (error.code === "ENOENT") missing.push(relativePath)
      else throw error
    }
  }
  if (missing.length) {
    const error = new Error(`Las relaciones de la pantalla necesitan archivos del proyecto que no están disponibles: ${missing.join(", ")}. No se generó nada para evitar código que fallaría al integrarlo.`)
    error.statusCode = 400
    throw error
  }
}

async function projectStatus() {
  // El estado sale de los archivos reales: la lista de recursos no se repite
  // aquí, se deriva de la biblioteca y se contrasta con src/api/.
  const resources = (await describeProjectResources(PROJECT_ROOT))
    .filter((resource) => resource.files.length)
    .map(({ key, name, files, apiFile, apiExists, operations, missingFunctions, catalogOnly, hasStore, storeFile, idField, usable, relationOnly }) => ({
      key,
      name,
      files,
      apiFile,
      apiExists,
      operations,
      missingFunctions,
      catalogOnly,
      hasStore,
      storeFile,
      idField,
      usable,
      relationOnly: Boolean(relationOnly),
    }))

  let outputs = []
  try {
    outputs = (await readdir(OUTPUT_ROOT, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name))
      .map((entry) => entry.name)
  } catch (error) {
    if (error.code !== "ENOENT") throw error
  }
  return {
    resources,
    outputs,
    // Catálogos JSON que el formulario puede usar en un campo de tipo catálogo.
    catalogs: await listProjectCatalogFiles(PROJECT_ROOT),
  }
}

// Analiza la estructura de un catálogo: un archivo real de backend/data o los
// datos pegados en el formulario. Devuelve la lista detectada, sus campos y lo
// que el proyecto ya tiene para ese catálogo (módulo de API y ruta).
async function handleCatalogAnalysis(request, response) {
  const input = await readJson(request)
  const rootKey = typeof input?.rootKey === "string" ? input.rootKey : undefined
  const file = typeof input?.file === "string" ? input.file.trim() : ""
  if (file) {
    const analysis = await analyzeProjectCatalog(PROJECT_ROOT, file, { rootKey })
    return send(response, 200, publicCatalogAnalysis(analysis))
  }

  const name = String(input?.name ?? "").trim()
  const analysis = analyzeCatalog(String(input?.data ?? ""), { name, rootKey })
  if (!analysis.ok) {
    return send(response, 400, { message: analysis.error })
  }
  if (/^[a-z][a-z0-9]*$/.test(name)) {
    const api = await describeCatalogApi(PROJECT_ROOT, name)
    const route = { path: catalogRoutePath(name), exists: await catalogRouteExists(PROJECT_ROOT, name) }
    return send(response, 200, publicCatalogAnalysis({ ...analysis, api, route }))
  }
  return send(response, 200, publicCatalogAnalysis(analysis))
}

// Toda solicitud pasa por aquí: completa los campos catálogo con la estructura
// real de sus archivos y valida una sola vez, tanto la vista previa como la
// generación definitiva.
async function prepareConfiguration(request) {
  const input = await readJson(request)
  const { input: enriched, errors: catalogErrors } = await enrichCatalogs(PROJECT_ROOT, input)
  // Las relaciones se completan con el store y la entidad reales de disco: solo
  // se envía el nombre de la entidad y cómo se elige el registro.
  const conRelaciones = await enrichRelations(PROJECT_ROOT, enriched)
  const { errors } = validateConfiguration(conRelaciones)
  return { input: conRelaciones, errors: [...catalogErrors, ...errors] }
}

async function handlePreview(request, response) {
  const { input, errors } = await prepareConfiguration(request)
  if (errors.length) {
    return send(response, 400, { message: "Revisa los datos del formulario.", errors })
  }

  const generated = generateFiles(input)
  await ensureExistingResourceFiles(generated.config)
  await ensureRelationResourceFiles(generated.config)
  const target = getOutputPath(generated.outputSlug)
  const exists = await inspectOutput(target)
  const collisions = await findProjectCollisions(generated.files, generated.config)
  return send(response, 200, {
    outputSlug: generated.outputSlug,
    outputPath: path.relative(PROJECT_ROOT, target).split(path.sep).join("/"),
    exists,
    collisions,
    files: Object.keys(generated.files),
  })
}

async function handleGenerate(request, response) {
  const { input, errors } = await prepareConfiguration(request)
  if (errors.length) {
    return send(response, 400, { message: "Revisa los datos del formulario.", errors })
  }

  const generated = generateFiles(input)
  await ensureExistingResourceFiles(generated.config)
  await ensureRelationResourceFiles(generated.config)
  const target = getOutputPath(generated.outputSlug)
  await ensureOutputRoot()
  const exists = await inspectOutput(target)
  if (exists && input.overwriteConfirmed !== true) {
    return send(response, 409, {
      message: "La salida ya existe. Confirma su reemplazo antes de volver a generar.",
      overwriteRequired: true,
    })
  }

  const collisions = await findProjectCollisions(generated.files, generated.config)
  if (collisions.length) {
    return send(response, 409, {
      message: "Algunos archivos o rutas coinciden con lo que ya existe en el proyecto y la generación se canceló para evitar duplicados. Cambia el nombre técnico del componente o la ruta de la pantalla, o revisa los archivos indicados si quieres reutilizarlos manualmente.",
      collisions,
    })
  }

  const temporaryDirectory = await mkdtemp(path.join(OUTPUT_ROOT, `.generador-${randomUUID()}-`))
  try {
    for (const [relativePath, contents] of Object.entries(generated.files)) {
      const destination = path.resolve(temporaryDirectory, relativePath)
      if (!destination.startsWith(`${temporaryDirectory}${path.sep}`)) {
        throw new Error("Un archivo generado intenta salir de la carpeta temporal.")
      }
      await mkdir(path.dirname(destination), { recursive: true })
      await writeFile(destination, contents, { encoding: "utf8", flag: "wx" })
    }

    if (exists) await rm(target, { recursive: true, force: false })
    await publishGeneratedDirectory(temporaryDirectory, target)
  } catch (error) {
    await rm(temporaryDirectory, { recursive: true, force: true })
    throw error
  }

  return send(response, 201, {
    message: "Generación completada.",
    outputSlug: generated.outputSlug,
    outputPath: path.relative(PROJECT_ROOT, target).split(path.sep).join("/"),
    files: Object.entries(generated.files).map(([filePath, contents]) => ({ path: filePath, contents })),
    configuration: generated.config,
  })
}

// El modo «modificar» solo lee. Analiza la pantalla y devuelve los parches que
// hay que pegar a mano: nunca escribe en src/ ni en backend/.
function archivoPedido(input) {
  try {
    return normalizarArchivo(input?.archivo)
  } catch (error) {
    error.statusCode = 400
    throw error
  }
}

async function handleAnalyze(request, response) {
  const input = await readJson(request)
  const archivo = archivoPedido(input)
  let inventario
  try {
    inventario = await analizarPantalla({ projectRoot: PROJECT_ROOT, archivo })
  } catch (error) {
    error.statusCode = 400
    throw error
  }
  return send(response, 200, { inventario: inventarioPublico(inventario) })
}

async function handlePatches(request, response) {
  const input = await readJson(request)
  const archivo = archivoPedido(input)

  let inventario
  try {
    inventario = await analizarPantalla({ projectRoot: PROJECT_ROOT, archivo })
  } catch (error) {
    error.statusCode = 400
    throw error
  }
  if (!inventario.aplicable) {
    return send(response, 400, {
      message: inventario.motivo || "Esta pantalla no admite cambios automáticos.",
    })
  }

  let resultado
  try {
    resultado = generarParches(inventario, input?.accion)
  } catch (error) {
    error.statusCode = 400
    throw error
  }

  const { parches, notas } = resultado
  if (!parches.length) {
    return send(response, 400, {
      message: notas[0] || "No se pudo generar ningún parche para esta pantalla.",
      errors: notas.slice(1),
    })
  }

  const accion = input?.accion ?? {}
  const esperado = {
    campo: accion.tipo === "campo" ? accion.nombre : undefined,
    pdf: accion.tipo === "campo" ? Boolean(accion.enPdf) : accion.tipo === "pdf",
    pdfEtiqueta: accion.tipo === "pdf" ? (accion.etiqueta || accion.campo) : undefined,
    validacion: accion.tipo === "validacion" ? `${accion.campo}Invalido` : undefined,
  }
  const verificacion = await verificarParches({
    projectRoot: PROJECT_ROOT,
    archivo,
    parches,
    esperado,
  })

  return send(response, 200, {
    parches,
    notas,
    verificacion,
    inventario: inventarioPublico(inventario),
  })
}

function staticFile(response, file, contentType) {
  return readFile(path.join(TOOL_ROOT, "public", file))
    .then((contents) => send(response, 200, contents.toString("utf8"), contentType))
    .catch((error) => {
      console.error(`No se pudo leer la página local (${file}):`, error)
      send(response, 500, "No se pudo cargar un archivo de la herramienta.", "text/plain; charset=utf-8")
    })
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${HOST}:${PORT}`)
    if (request.method === "GET" && url.pathname === "/") {
      return await staticFile(response, "index.html", "text/html; charset=utf-8")
    }
    if (request.method === "GET" && url.pathname === "/app.js") {
      return await staticFile(response, "app.js", "text/javascript; charset=utf-8")
    }
    if (request.method === "GET" && url.pathname.startsWith("/modules/")) {
      const moduleName = url.pathname.slice("/modules/".length)
      if (!PUBLIC_MODULES.has(moduleName)) {
        return send(response, 404, { message: "No se encontró ese archivo." })
      }
      return await staticFile(response, path.join("modules", moduleName), "text/javascript; charset=utf-8")
    }
    if (request.method === "GET" && url.pathname === "/styles.css") {
      return await staticFile(response, "styles.css", "text/css; charset=utf-8")
    }
    if (request.method === "GET" && (url.pathname === "/modificar" || url.pathname === "/modificar.html")) {
      return await staticFile(response, "modificar.html", "text/html; charset=utf-8")
    }
    if (request.method === "GET" && url.pathname === "/modificar.js") {
      return await staticFile(response, "modificar.js", "text/javascript; charset=utf-8")
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      return send(response, 200, await projectStatus())
    }
    if (request.method === "POST" && url.pathname === "/api/catalog") {
      return await handleCatalogAnalysis(request, response)
    }
    if (request.method === "GET" && url.pathname === "/api/screens") {
      return send(response, 200, { screens: await resumenPantallas(PROJECT_ROOT) })
    }
    if (request.method === "POST" && url.pathname === "/api/analyze") {
      return await handleAnalyze(request, response)
    }
    if (request.method === "POST" && url.pathname === "/api/patch") {
      return await handlePatches(request, response)
    }
    if (request.method === "POST" && url.pathname === "/api/preview") {
      return await handlePreview(request, response)
    }
    if (request.method === "POST" && url.pathname === "/api/generate") {
      return await handleGenerate(request, response)
    }
    send(response, 404, { message: "No se encontró esa ruta." })
  } catch (error) {
    if (error.statusCode) return send(response, error.statusCode, { message: error.message })
    console.error("Error en el generador local:", error)
    send(response, 500, { message: error.message || "Error interno del generador." })
  }
})

server.on("error", (error) => {
  console.error(`No se pudo iniciar el generador en http://${HOST}:${PORT}:`, error.message)
  process.exitCode = 1
})

server.listen(PORT, HOST, () => {
  console.log(`Generador de componentes disponible en http://${HOST}:${PORT}`)
  console.log("El servidor escucha solo en este equipo; cierra el proceso con Ctrl+C al terminar.")
})
}
