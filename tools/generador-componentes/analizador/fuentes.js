// Lectura de archivos del proyecto para el modo «modificar pantalla».
// Todo lo que el analizador mira está limitado a las carpetas que de verdad
// necesita: pantallas, módulos de API, modelos y routers. Cualquier otra ruta
// se rechaza antes de tocar el disco.

import { lstat, readFile, readdir } from "node:fs/promises"
import path from "node:path"

export const DIRECTORIOS_PERMITIDOS = [
  "src/components",
  "src/api",
  "backend/modelos",
  "backend/rutas",
]

export const PANTALLAS_DIR = "src/components"

// Los archivos del proyecto usan CRLF en Windows y LF en otros equipos. Las
// piezas generadas copian el salto de línea del archivo para no mezclar estilos.
export function detectarEol(texto) {
  return String(texto).includes("\r\n") ? "\r\n" : "\n"
}

export function lineaEn(fuente, offset) {
  let linea = 1
  const limite = Math.max(0, Math.min(offset, fuente.length))
  for (let indice = 0; indice < limite; indice += 1) {
    if (fuente[indice] === "\n") linea += 1
  }
  return linea
}

export function columnaEn(fuente, offset) {
  const inicio = fuente.lastIndexOf("\n", Math.max(0, offset - 1)) + 1
  return offset - inicio
}

// Sangría de la línea en la que cae un offset; se reutiliza para que el código
// pegado respete el estilo del archivo anfitrión.
export function indentacionEn(fuente, offset) {
  const inicio = fuente.lastIndexOf("\n", Math.max(0, offset - 1)) + 1
  const hasta = fuente.slice(inicio, offset)
  const coincidencia = /^[ \t]*/.exec(hasta)
  return coincidencia ? coincidencia[0] : ""
}

// Línea donde empieza el texto insertado: si el punto cae al final de una línea
// (lo habitual al añadir un hermano), el código entra en la línea siguiente.
export function lineaDeInsercion(fuente, offset) {
  const fin = fuente.indexOf("\n", offset)
  const resto = fuente.slice(offset, fin === -1 ? fuente.length : fin)
  return lineaEn(fuente, offset) + (resto.trim() === "" ? 1 : 0)
}

function esFinalDeLinea(fuente, offset) {
  const fin = fuente.indexOf("\n", offset)
  const resto = fuente.slice(offset, fin === -1 ? fuente.length : fin)
  return resto.trim() === ""
}

// Contexto a cada lado del punto de inserción: es lo que se muestra como «pega
// esto entre estas líneas». La línea del punto aparece siempre en uno de los dos
// lados, nunca se pierde.
export function contextoEn(fuente, offset, { antes = 4, despues = 4 } = {}) {
  const lineas = String(fuente).split(/\r?\n/)
  const numero = lineaEn(fuente, offset)
  const corte = esFinalDeLinea(fuente, offset) ? numero : numero - 1
  const desde = Math.max(0, corte - antes)
  const hasta = Math.min(lineas.length, corte + despues + 1)
  return {
    desde: desde + 1,
    hasta,
    antes: lineas.slice(desde, corte),
    despues: lineas.slice(corte, hasta),
  }
}

// Lista blanca de archivos: nombre de pantalla o ruta relativa dentro de las
// carpetas permitidas. Evita que una petición HTTP lea otra parte del proyecto.
export function normalizarArchivo(valor) {
  const texto = String(valor ?? "").trim().split("\\").join("/").replace(/^\.\//, "")
  if (!texto) throw new Error("Indica qué archivo quieres analizar.")
  if (texto.includes("..") || texto.startsWith("/") || /^[a-zA-Z]:/.test(texto)) {
    throw new Error("La ruta indicada no es válida.")
  }
  const relativo = texto.includes("/") ? texto : `${PANTALLAS_DIR}/${texto}`
  if (!/\.(vue|js)$/.test(relativo)) {
    throw new Error("Solo se pueden analizar archivos .vue y .js del proyecto.")
  }
  if (!DIRECTORIOS_PERMITIDOS.some((directorio) => relativo.startsWith(`${directorio}/`))) {
    throw new Error(`Solo se analizan archivos de: ${DIRECTORIOS_PERMITIDOS.join(", ")}.`)
  }
  if (relativo.split("/").length > 3) {
    throw new Error("La ruta indicada queda demasiado profunda.")
  }
  return relativo
}

export function rutaAbsoluta(projectRoot, relativo) {
  const raiz = path.resolve(projectRoot)
  const destino = path.resolve(raiz, relativo)
  if (destino !== raiz && !destino.startsWith(`${raiz}${path.sep}`)) {
    throw new Error("El archivo pedido queda fuera del proyecto.")
  }
  return destino
}

async function esArchivoNormal(ruta) {
  try {
    const info = await lstat(ruta)
    return info.isFile() && !info.isSymbolicLink()
  } catch (error) {
    if (error.code === "ENOENT") return false
    throw error
  }
}

// `overrides` permite analizar una versión en memoria (la que resulta de aplicar
// los parches) sin escribir nada en el disco. Así la verificación no modifica
// ni un byte del proyecto.
export async function leerArchivo(projectRoot, relativo, overrides = new Map()) {
  const normalizado = normalizarArchivo(relativo)
  if (overrides.has(normalizado)) return overrides.get(normalizado)
  const ruta = rutaAbsoluta(projectRoot, normalizado)
  if (!(await esArchivoNormal(ruta))) return null
  return readFile(ruta, "utf8")
}

export async function existeArchivo(projectRoot, relativo, overrides = new Map()) {
  const normalizado = normalizarArchivo(relativo)
  if (overrides.has(normalizado)) return true
  return esArchivoNormal(rutaAbsoluta(projectRoot, normalizado))
}

// Pantallas reales del proyecto, ordenadas. Se usa para el desplegable del modo
// «modificar» y para el estado que muestra la interfaz.
export async function listarPantallas(projectRoot) {
  const directorio = path.resolve(projectRoot, PANTALLAS_DIR)
  let entradas = []
  try {
    entradas = await readdir(directorio, { withFileTypes: true })
  } catch (error) {
    if (error.code === "ENOENT") return []
    throw error
  }
  return entradas
    .filter((entrada) => entrada.isFile() && !entrada.isSymbolicLink() && /^[A-Za-z][A-Za-z0-9]*\.vue$/.test(entrada.name))
    .map((entrada) => `${PANTALLAS_DIR}/${entrada.name}`)
    .sort((primero, segundo) => primero.localeCompare(segundo))
}
