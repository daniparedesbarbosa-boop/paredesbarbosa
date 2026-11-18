// Lectura de un componente .vue. La plantilla se parsea con el compilador real
// de Vue, no con expresiones regulares: así sabemos exactamente dónde empieza y
// termina cada <div class="campo">, cada <th> y cada <td>, y los parches pueden
// decir «pega esto en la línea N» sin equivocarse.

import { parse as parseSfc } from "@vue/compiler-sfc"
import { parse as parsePlantilla } from "@vue/compiler-dom"

export const ELEMENTO = 1
export const TEXTO = 2
export const COMENTARIO = 3
export const EXPRESION = 4
export const INTERPOLACION = 5
export const ATRIBUTO = 6
export const DIRECTIVA = 7

export function analizarVue(fuente, archivo = "Componente.vue") {
  const { descriptor, errors } = parseSfc(fuente, { filename: archivo })
  const primerError = Array.isArray(errors) ? errors[0] : null
  if (primerError) {
    throw new Error(`No se pudo leer ${archivo}: ${primerError.message ?? primerError}`)
  }
  if (!descriptor.template) {
    throw new Error(`${archivo} no tiene bloque <template>; no es una pantalla que se pueda analizar.`)
  }

  const erroresPlantilla = []
  const ast = parsePlantilla(descriptor.template.content, {
    comments: true,
    onError: (error) => erroresPlantilla.push(error),
  })

  const script = descriptor.scriptSetup ?? descriptor.script
  const offsetScript = script ? desplazamientoDelContenido(fuente, script) : 0
  return {
    descriptor,
    ast,
    erroresPlantilla,
    // Algunas versiones dejan `loc` en el contenido del bloque y otras en la
    // etiqueta completa; con indexOf se cubren las dos convenciones.
    offsetPlantilla: desplazamientoDelContenido(fuente, descriptor.template),
    contenidoPlantilla: descriptor.template.content,
    offsetScript,
    // Línea del archivo en la que empieza el bloque <script>, para convertir las
    // líneas que devuelve acorn (relativas al bloque) en líneas reales.
    lineaBaseScript: contarLineas(fuente, offsetScript),
    contenidoScript: script?.content ?? "",
    tieneScriptSetup: Boolean(descriptor.scriptSetup),
    tieneEstilos: (descriptor.styles ?? []).length > 0,
  }
}

function desplazamientoDelContenido(fuente, bloque) {
  const base = bloque.loc?.start?.offset ?? 0
  const dentro = bloque.loc?.source?.indexOf(bloque.content) ?? 0
  if (dentro > 0) return base + dentro
  const absoluto = fuente.indexOf(bloque.content, base)
  return absoluto >= 0 ? absoluto : base
}

export function recorrerNodos(nodo, visitar) {
  if (!nodo || typeof nodo !== "object") return
  visitar(nodo)
  const hijos = nodo.children
  if (Array.isArray(hijos)) for (const hijo of hijos) recorrerNodos(hijo, visitar)
}

// Descendientes de un nodo sin incluirlo a él mismo.
export function descendientes(nodo) {
  const encontrados = []
  const hijos = Array.isArray(nodo?.children) ? nodo.children : []
  for (const hijo of hijos) recorrerNodos(hijo, (actual) => encontrados.push(actual))
  return encontrados
}

export function elementosDe(nodo) {
  return descendientes(nodo).filter((actual) => actual.type === ELEMENTO)
}

export function hijosElemento(nodo) {
  return (nodo?.children ?? []).filter((hijo) => hijo.type === ELEMENTO)
}

export function primerDescendiente(nodo, etiqueta) {
  return elementosDe(nodo).find((actual) => actual.tag === etiqueta) ?? null
}

export function clasesDe(nodo) {
  const atributo = (nodo?.props ?? []).find((prop) => prop.type === ATRIBUTO && prop.name === "class")
  if (atributo) return String(atributo.value?.content ?? "").trim()
  const enlace = (nodo?.props ?? []).find((prop) => prop.type === DIRECTIVA && prop.name === "bind" && prop.arg?.content === "class")
  return enlace ? String(enlace.exp?.content ?? "") : ""
}

export function tieneClase(nodo, patron) {
  const tokens = clasesDe(nodo).split(/\s+/).filter(Boolean)
  return tokens.some((token) => patron.test(token))
}

export function atributoDe(nodo, nombre) {
  return (nodo?.props ?? []).find((prop) => prop.type === ATRIBUTO && prop.name === nombre) ?? null
}

export function valorDeAtributo(nodo, nombre) {
  const atributo = atributoDe(nodo, nombre)
  if (!atributo) return null
  return String(atributo.value?.content ?? "")
}

export function directivaDe(nodo, nombre, argumento = null) {
  return (nodo?.props ?? []).find((prop) => {
    if (prop.type !== DIRECTIVA || prop.name !== nombre) return false
    if (argumento === null) return true
    return prop.arg?.content === argumento
  }) ?? null
}

export function expresionDeDirectiva(nodo, nombre, argumento = null) {
  const directiva = directivaDe(nodo, nombre, argumento)
  return directiva ? String(directiva.exp?.content ?? "").trim() : null
}

export function esEvento(nodo) {
  return (nodo?.props ?? []).some((prop) => prop.type === DIRECTIVA && prop.name === "on")
}

// Texto que verá la persona usuaria: contenido estático más interpolaciones.
export function textoRenderizado(nodo) {
  let texto = ""
  const recorrerTexto = (actual) => {
    if (!actual || typeof actual !== "object") return
    if (actual.type === TEXTO) texto += actual.content
    if (actual.type === INTERPOLACION) texto += `{{ ${actual.content?.content ?? ""} }}`
    if (Array.isArray(actual.children)) for (const hijo of actual.children) recorrerTexto(hijo)
  }
  recorrerTexto(nodo)
  return texto.replace(/\s+/g, " ").trim()
}

// `v-for="item in citas"` o `v-for="(u, index) in pacientes"` → nombre de la variable.
export function variableDeVFor(nodo) {
  const expresion = expresionDeDirectiva(nodo, "for")
  if (!expresion) return null
  const coincidencia = /(?:\(\s*([A-Za-z_$][\w$]*)\s*(?:,[^)]*)?\)|([A-Za-z_$][\w$]*))\s+(?:in|of)\s+/.exec(expresion)
  return coincidencia ? (coincidencia[1] ?? coincidencia[2]) : null
}

// `v-model="cita.fecha"` → { objeto: "cita", propiedad: "fecha" }.
export function enlaceDeModelo(nodo) {
  const expresion = expresionDeDirectiva(nodo, "model")
  if (!expresion) return null
  const coincidencia = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(expresion)
  if (!coincidencia) return null
  return {
    expresion,
    objeto: coincidencia[1],
    propiedad: coincidencia[2],
    modificadores: (directivaDe(nodo, "model")?.modifiers ?? []).map((modificador) => modificador.content ?? modificador),
  }
}

// Expresión de una celda o etiqueta con forma `algo.campo`.
export function rutaDePropiedad(expresion) {
  const coincidencia = /^([A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)$/.exec(String(expresion ?? "").trim())
  return coincidencia ? { objeto: coincidencia[1], propiedad: coincidencia[2] } : null
}

export function lineaDeNodo(vue, fuente, nodo) {
  const offset = vue.offsetPlantilla + (nodo?.loc?.start?.offset ?? 0)
  return contarLineas(fuente, offset)
}

export function contarLineas(fuente, offset) {
  let linea = 1
  for (let indice = 0; indice < offset; indice += 1) if (fuente[indice] === "\n") linea += 1
  return linea
}

export const ETIQUETAS_CONTROL = new Set(["input", "select", "textarea", "fieldset"])
