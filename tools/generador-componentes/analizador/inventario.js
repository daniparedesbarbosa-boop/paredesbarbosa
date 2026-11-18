// Inventario de una pantalla existente. Responde a «¿qué hay aquí?»: formulario
// y sus campos, tabla y sus columnas, objeto de estado, objeto que se envía al
// backend, validación, PDF y la cadena modelo → router → API. Todo es de solo
// lectura: este módulo nunca escribe en el proyecto.

import { indentacionEn, leerArchivo, listarPantallas } from "./fuentes.js"
import {
  ELEMENTO,
  analizarVue,
  elementosDe,
  hijosElemento,
  primerDescendiente,
  clasesDe,
  atributoDe,
  valorDeAtributo,
  expresionDeDirectiva,
  directivaDe,
  textoRenderizado,
  variableDeVFor,
  enlaceDeModelo,
  rutaDePropiedad,
  lineaDeNodo,
  ETIQUETAS_CONTROL,
} from "./vue.js"
import {
  analizarJs,
  buscarTodos,
  declaracion,
  declaraciones,
  objetoDe,
  claves,
  importaciones,
  funcionQueContiene,
  propiedadesDeObjeto,
  funcionesExportadas,
} from "./js.js"
import { analizarModelo } from "./modelo.js"
import { analizarRutas } from "./rutas.js"

const PATRON_CONTENEDOR_CAMPO = /campo|field/i
const PATRON_ACCIONES = /^acci/i
const PATRON_ACCIONES_ALTERNATIVO = /acci|selecci/i

// Resumen ligero para el desplegable del modo «modificar»: solo parsea el .vue y
// dice si hay formulario y tabla. No recorre la cadena de backend, para que la
// lista de pantallas responda rápido.
export async function resumenPantallas(projectRoot) {
  const resumenes = []
  for (const archivo of await listarPantallas(projectRoot)) {
    const componente = archivo.split("/").at(-1).replace(/\.vue$/, "")
    try {
      const fuente = await leerArchivo(projectRoot, archivo)
      const vue = analizarVue(fuente, archivo)
      const tieneFormulario = elementosDe(vue.ast).some((nodo) => nodo.tag === "form")
      const tieneTabla = elementosDe(vue.ast).some((nodo) => nodo.tag === "table")
      resumenes.push({
        archivo,
        componente,
        tieneFormulario,
        tieneTabla,
        aplicable: tieneFormulario || tieneTabla,
        error: "",
      })
    } catch (error) {
      resumenes.push({
        archivo,
        componente,
        tieneFormulario: false,
        tieneTabla: false,
        aplicable: false,
        error: error.message,
      })
    }
  }
  return resumenes
}

export async function analizarPantalla({ projectRoot, archivo, overrides = new Map() }) {
  const fuente = await leerArchivo(projectRoot, archivo, overrides)
  if (fuente === null) {
    throw new Error(`No se encontró ${archivo} en el proyecto.`)
  }
  const vue = analizarVue(fuente, archivo)
  const scriptRoot = vue.contenidoScript.trim() ? analizarJs(vue.contenidoScript, archivo) : null

  const formulario = analizarFormulario(vue, fuente, scriptRoot)
  const tabla = analizarTabla(vue, fuente)
  const estado = analizarEstado(scriptRoot, formulario, vue)
  const payload = analizarPayload(scriptRoot, formulario, estado, vue)
  const validacion = analizarValidacion(scriptRoot, vue, formulario, fuente)
  const pdf = analizarPdf(scriptRoot, formulario)
  const backend = await analizarBackend({ vue, scriptRoot, formulario, projectRoot, overrides, archivo })

  const inventario = {
    archivo,
    componente: archivo.split("/").at(-1).replace(/\.vue$/, ""),
    fuente,
    eol: fuente.includes("\r\n") ? "\r\n" : "\n",
    vue,
    scriptRoot,
    formulario,
    tabla,
    estado,
    payload,
    validacion,
    pdf,
    backend,
    aplicable: formulario.existe || tabla.existe,
    motivo: "",
    explicaciones: [],
    noReconocido: [],
  }

  inventario.explicaciones = explicar(inventario)
  inventario.noReconocido = avisos(inventario)
  if (!inventario.aplicable) {
    inventario.motivo = formulario.existe || tabla.existe
      ? ""
      : "Esta pantalla no tiene formulario ni tabla de datos, así que no hay nada a lo que añadir campos o columnas."
  }
  return inventario
}

/* ------------------------------------------------------------------ */
/* Formulario                                                          */
/* ------------------------------------------------------------------ */

function analizarFormulario(vue, fuente, scriptRoot) {
  const formulario = elementosDe(vue.ast).find((nodo) => nodo.tag === "form") ?? null
  if (!formulario) {
    return {
      existe: false,
      nodo: null,
      campos: [],
      contenedores: [],
      objeto: null,
      linea: null,
      manejador: null,
    }
  }

  const contenedores = elementosDe(formulario).filter(esContenedorDeCampo)
  const campos = contenedores.map((contenedor) => describirCampo(contenedor, vue, fuente))
  if (campos.length === 0) {
    const enlaces = [...(vue.contenidoPlantilla || "").matchAll(/v-model(?:\.[A-Za-z]+)*="([A-Za-z_][\w]*)\.([A-Za-z_][\w]*)"/g)]
    for (const enlace of enlaces) {
      const objeto = enlace[1]
      const nombre = enlace[2]
      campos.push({
        nombre,
        objeto,
        etiqueta: nombre,
        tipo: "text",
        requerido: false,
        soloLectura: false,
        modificadores: [],
        nodo: null,
        control: null,
        etiquetaNodo: null,
        linea: null,
      })
    }
  }
  let objeto = campos.map((campo) => campo.objeto).find(Boolean) ?? null
  if (!objeto) {
    const reactivo = /(?:const|let)\s+([A-Za-z_][\w]*)\s*=\s*reactive\s*\(/.exec(vue.contenidoScript || "")
    objeto = reactivo?.[1] ?? null
  }
  const ultimo = contenedores.at(-1) ?? null
  const etiquetaUltimo = ultimo ? elementosDe(ultimo).find((hijo) => hijo.tag === "label") ?? null : null
  const etiquetaConFor = etiquetaUltimo ? Boolean(atributoDe(etiquetaUltimo, "for")) : false
  const clasesUltimo = ultimo ? clasesDe(ultimo).split(/\s+/).filter(Boolean) : []
  const manejador = expresionDeDirectiva(formulario, "on", "submit")
  const sangria = ultimo ? indentacionEn(vue.contenidoPlantilla, ultimo.loc.start.offset) : "          "
  const cierreFormulario = ultimo ? null : formulario.loc.end.offset - "</form>".length
  const offsetFallback = cierreFormulario === null ? null : vue.offsetPlantilla + cierreFormulario

  return {
    existe: true,
    nodo: formulario,
    campos,
    contenedores,
    objeto,
    linea: lineaDeNodo(vue, fuente, formulario),
    manejador,
    manejadorNodo: manejador && scriptRoot
      ? buscarTodos(scriptRoot, (nodo) => nodo.type === "FunctionDeclaration" && nodo.id?.name === manejador)[0] ?? null
      : null,
    ultimo,
    claseBase: clasesUltimo[0] ?? "campo",
    clases: clasesUltimo,
    sangria,
    etiquetaConFor,
    // Punto real de inserción: justo después del cierre del último campo.
    offset: ultimo ? vue.offsetPlantilla + ultimo.loc.end.offset : offsetFallback,
  }
}

function esContenedorDeCampo(nodo) {
  if (nodo.type !== ELEMENTO) return false
  const tokens = clasesDe(nodo).split(/\s+/).filter(Boolean)
  if (!tokens.some((token) => PATRON_CONTENEDOR_CAMPO.test(token))) return false
  const control = elementosDe(nodo).find((hijo) => ETIQUETAS_CONTROL.has(hijo.tag))
  const etiqueta = elementosDe(nodo).find((hijo) => hijo.tag === "label")
  return Boolean(control && etiqueta)
}

function describirCampo(contenedor, vue, fuente) {
  const control = elementosDe(contenedor).find((hijo) => ETIQUETAS_CONTROL.has(hijo.tag)) ?? null
  const etiquetaNodo = elementosDe(contenedor).find((hijo) => hijo.tag === "label") ?? null
  const enlace = control ? enlaceDeModelo(control) : null
  const textoEtiqueta = etiquetaNodo ? textoRenderizado(etiquetaNodo).replace(/:\s*$/, "").trim() : ""

  return {
    nombre: enlace?.propiedad ?? null,
    objeto: enlace?.objeto ?? null,
    etiqueta: textoEtiqueta,
    tipo: tipoDeControl(control),
    requerido: Boolean(control && atributoDe(control, "required")),
    soloLectura: !enlace,
    modificadores: enlace?.modificadores ?? [],
    nodo: contenedor,
    control,
    etiquetaNodo,
    linea: lineaDeNodo(vue, fuente, contenedor),
  }
}

function tipoDeControl(control) {
  if (!control) return "desconocido"
  if (control.tag === "textarea") return "textarea"
  if (control.tag === "select") return "select"
  if (control.tag === "fieldset") return "radio"
  const tipo = valorDeAtributo(control, "type")
  return tipo ? tipo.toLowerCase() : "text"
}

/* ------------------------------------------------------------------ */
/* Tabla                                                               */
/* ------------------------------------------------------------------ */

function analizarTabla(vue, fuente) {
  const tabla = elementosDe(vue.ast).find((nodo) => nodo.tag === "table") ?? null
  if (!tabla) return { existe: false }

  const thead = primerDescendiente(tabla, "thead")
  const tbody = primerDescendiente(tabla, "tbody")
  const filaCabecera = thead
    ? hijosElemento(thead).find((hijo) => hijo.tag === "tr") ?? elementosDe(thead).find((hijo) => hijo.tag === "tr")
    : null
  const ths = filaCabecera
    ? (filaCabecera.children ?? []).filter((hijo) => hijo.type === ELEMENTO && hijo.tag === "th")
    : []
  const filaCuerpo = tbody
    ? elementosDe(tbody).find((nodo) => nodo.tag === "tr" && variableDeVFor(nodo))
    : null
  const tds = filaCuerpo
    ? (filaCuerpo.children ?? []).filter((hijo) => hijo.type === ELEMENTO && hijo.tag === "td")
    : []
  const variable = filaCuerpo ? variableDeVFor(filaCuerpo) : null
  const expresionFor = filaCuerpo ? expresionDeDirectiva(filaCuerpo, "for") : null
  const lista = expresionFor ? (expresionFor.split(/\s+(?:in|of)\s+/)[1] ?? null) : null
  const celdasTexto = tds.map((td) => textoRenderizado(td))
  const propiedades = tds.map((td) => {
    const interpolacion = (td.children ?? []).find((hijo) => hijo.type === 5)
    const contenido = interpolacion?.content?.content ?? ""
    return rutaDePropiedad(contenido)?.propiedad ?? null
  })

  const indiceAcciones = (() => {
    const directo = ths.findIndex((th) => PATRON_ACCIONES.test(textoRenderizado(th)))
    if (directo >= 0) return directo
    return ths.findIndex((th) => PATRON_ACCIONES_ALTERNATIVO.test(textoRenderizado(th)))
  })()

  const indiceInsercion = indiceAcciones >= 0 ? indiceAcciones : ths.length
  const thAnterior = indiceInsercion > 0 ? ths[indiceInsercion - 1] ?? null : null
  const thPrimero = ths[0] ?? null
  const tdAnterior = indiceInsercion > 0 ? tds[indiceInsercion - 1] ?? tds.at(-1) ?? null : null
  const tdPrimero = tds[0] ?? null

  // La cabecera y la celda nuevas se insertan en la misma posición para que las
  // columnas sigan cuadrando. Si el campo va antes de cualquier columna conocida
  // se inserta delante de la primera, no detrás de la última.
  const ancla = (nodo, modo, contenido) => (nodo
    ? {
      modo,
      nodo,
      offset: vue.offsetPlantilla + (modo === "despues" ? nodo.loc.end.offset : nodo.loc.start.offset),
      sangria: indentacionEn(contenido, nodo.loc.start.offset),
    }
    : null)
  const cabecera = ancla(thAnterior, "despues", vue.contenidoPlantilla)
    ?? ancla(thPrimero, "antes", vue.contenidoPlantilla)
  const celda = ancla(tdAnterior, "despues", vue.contenidoPlantilla)
    ?? ancla(tdPrimero, "antes", vue.contenidoPlantilla)

  return {
    existe: ths.length > 0,
    nodo: tabla,
    linea: lineaDeNodo(vue, fuente, tabla),
    filaCabecera,
    filas: ths,
    columnas: ths.map((th, indice) => ({
      titulo: textoRenderizado(th),
      linea: lineaDeNodo(vue, fuente, th),
      propiedad: propiedades[indice] ?? null,
    })),
    filaCuerpo,
    variable,
    lista,
    celdas: tds,
    celdasTexto,
    indiceAcciones,
    indiceInsercion,
    cabecera,
    celda,
  }
}

/* ------------------------------------------------------------------ */
/* Estado, envío y validación                                          */
/* ------------------------------------------------------------------ */

// Las líneas que devuelve acorn son relativas al bloque <script>; se convierten
// a líneas del archivo para que la explicación apunte donde de verdad está.
function lineaDeScript(vue, nodo) {
  return nodo?.loc?.start?.line ? vue.lineaBaseScript + nodo.loc.start.line - 1 : null
}

function analizarEstado(scriptRoot, formulario, vue) {
  if (!scriptRoot) return { existe: false }
  const nombre = formulario.objeto ?? detectarObjetoReactivo(scriptRoot)
  if (!nombre) return { existe: false }

  const declarada = declaracion(scriptRoot, nombre)
  if (!declarada) return { existe: false, objeto: nombre }

  let objeto = objetoDe(declarada.init)
  let fabrica = null
  const primerArgumento = declarada.init?.type === "CallExpression" ? declarada.init.arguments?.[0] : null
  // `reactive(citaVacia())` no es un objeto literal: hay que resolver la fábrica
  // (citaVacia, doctorVacio…) para llegar al objeto con las propiedades.
  const nombreFabrica = primerArgumento?.type === "Identifier"
    ? primerArgumento.name
    : primerArgumento?.type === "CallExpression" && primerArgumento.callee?.type === "Identifier"
      ? primerArgumento.callee.name
      : null
  if (!objeto && nombreFabrica) {
    const declaracionFabrica = declaracion(scriptRoot, nombreFabrica)
    objeto = objetoDe(declaracionFabrica?.init)
    if (objeto) fabrica = { nombre: nombreFabrica, nodo: declaracionFabrica }
  }

  return {
    existe: Boolean(objeto),
    objeto: nombre,
    declaracion: declarada,
    objetoNodo: objeto,
    fabrica,
    propiedades: objeto ? claves(objeto) : [],
    linea: lineaDeScript(vue, declarada),
    nombreReal: fabrica?.nombre ?? nombre,
  }
}

function detectarObjetoReactivo(scriptRoot) {
  const declaradas = declaraciones(scriptRoot)
  const reactiva = declaradas.find((nodo) =>
    nodo.init?.type === "CallExpression" &&
    nodo.init.callee?.name === "reactive" &&
    objetoDe(nodo.init))
  return reactiva?.id?.name ?? null
}

function analizarPayload(scriptRoot, formulario, estado, vue) {
  const funcion = formulario.manejadorNodo
  if (!scriptRoot) return { modo: "desconocido", motivo: "La pantalla no tiene bloque <script>." }
  if (!estado?.existe) return { modo: "desconocido", motivo: "No se ha identificado el objeto de estado del formulario." }
  if (!funcion) {
    return {
      modo: "desconocido",
      motivo: `No se encontró la función «${formulario.manejador ?? "que guarda"}» del formulario.`,
    }
  }

  const objetos = buscarTodos(funcion, (nodo) => nodo.type === "ObjectExpression")
  const conSpread = objetos.find((nodo) =>
    nodo.properties.some((propiedad) =>
      propiedad.type === "SpreadElement" && propiedad.argument?.name === estado.objeto))
  if (conSpread) {
    return { modo: "spread", nombreFuncion: formulario.manejador, nodo: conSpread, motivo: "" }
  }

  const nombresEstado = new Set(estado.propiedades.map((propiedad) => propiedad.nombre))
  const manuales = objetos
    .map((nodo) => ({
      nodo,
      claves: nodo.properties.filter((propiedad) => propiedad.type === "Property"),
    }))
    .filter((candidato) => candidato.claves.filter((propiedad) => nombresEstado.has(propiedad.key?.name)).length >= 2)
    .sort((primero, segundo) => segundo.claves.length - primero.claves.length)

  if (manuales.length) {
    const elegido = manuales[0]
    return {
      modo: "manual",
      nombreFuncion: formulario.manejador,
      nodo: elegido.nodo,
      claves: elegido.claves.map((propiedad) => propiedad.key?.name).filter(Boolean),
      linea: lineaDeScript(vue, elegido.nodo),
      motivo: "",
    }
  }

  const pasaObjeto = buscarTodos(funcion, (nodo) =>
    nodo.type === "CallExpression" &&
    nodo.arguments?.some((argumento) => argumento?.type === "Identifier" && argumento.name === estado.objeto))
  if (pasaObjeto.length) {
    return { modo: "objeto-completo", nombreFuncion: formulario.manejador, nodo: null, motivo: "" }
  }

  return {
    modo: "desconocido",
    nombreFuncion: formulario.manejador,
    motivo: "No se ha identificado el objeto que se envía al backend dentro de la función de guardado.",
  }
}

function analizarValidacion(scriptRoot, vue, formulario, fuente) {
  if (scriptRoot) {
    const computado = declaraciones(scriptRoot).find((nodo) =>
      /^(formularioValido|formValido|puedeGuardar|esValido|datosValidos)/i.test(nodo.id.name) &&
      nodo.init?.type === "CallExpression" &&
      nodo.init.callee?.name === "computed")
    if (computado) {
      const funcion = computado.init.arguments?.[0]
      const cuerpo = funcion?.body
      return {
        tipo: "computed",
        nombre: computado.id.name,
        nodo: computado,
        cuerpo,
        linea: lineaDeScript(vue, computado),
        offset: cuerpo ? vue.offsetScript + cuerpo.end : null,
        motivo: "",
      }
    }
  }

  const boton = formulario.existe
    ? elementosDe(formulario.nodo).find((nodo) =>
      nodo.tag === "button" && (valorDeAtributo(nodo, "type") ?? "submit") === "submit")
    : null
  const directiva = boton ? directivaDe(boton, "bind", "disabled") : null
  if (directiva?.exp) {
    return {
      tipo: "inline",
      nombre: null,
      nodo: boton,
      directiva,
      expresion: String(directiva.exp.content ?? "").trim(),
      linea: lineaDeNodo(vue, fuente, boton),
      offset: vue.offsetPlantilla + (directiva.exp.loc?.end?.offset ?? 0),
      motivo: "",
    }
  }

  return {
    tipo: "ninguna",
    nombre: null,
    nodo: null,
    offset: null,
    motivo: "La pantalla no valida el formulario antes de enviarlo, así que no hay dónde enganchar la comprobación.",
  }
}

function analizarPdf(scriptRoot, formulario) {
  if (!scriptRoot) return { existe: false }
  const llamada = buscarTodos(scriptRoot, (nodo) =>
    nodo.type === "CallExpression" &&
    nodo.callee?.type === "Identifier" &&
    nodo.callee.name === "generarPDF")[0]
  if (!llamada) return { existe: false }

  const opciones = llamada.arguments?.[0]?.type === "ObjectExpression"
    ? llamada.arguments[0]
    : null
  const cabecerasPosicionales = llamada.arguments?.[1]?.type === "ArrayExpression"
    ? llamada.arguments[1]
    : null
  const filasPosicionales = llamada.arguments?.[2]?.type === "CallExpression"
    ? llamada.arguments[2]
    : null
  const cabeceras = opciones
    ? propiedadesDeObjeto(opciones, "cabeceras")
    : cabecerasPosicionales
  const filas = opciones
    ? propiedadesDeObjeto(opciones, "filas")
    : filasPosicionales
  const arrow = filas?.type === "CallExpression"
    ? filas.arguments?.[0]
    : filasPosicionales?.arguments?.[0]
  const arrayFilas = arrow?.body?.type === "ArrayExpression" ? arrow.body : null
  const funcion = funcionQueContiene(scriptRoot, llamada.start, llamada.end)

  return {
    existe: true,
    llamada,
    opciones,
    funcion: funcion?.id?.name ?? null,
    lineaFuncion: funcion?.loc?.start.line ?? null,
    cabeceras: cabeceras?.type === "ArrayExpression"
      ? {
        nodo: cabeceras,
        valores: cabeceras.elements.map((elemento) => (elemento?.type === "Literal" ? elemento.value : null)),
        linea: cabeceras.loc?.start.line ?? null,
      }
      : null,
    filas: arrayFilas
      ? {
        nodo: arrayFilas,
        variable: arrow.params?.[0]?.name ?? null,
        linea: arrayFilas.loc?.start.line ?? null,
      }
      : null,
  }
}

/* ------------------------------------------------------------------ */
/* Cadena backend: pantalla → api → router → modelo                    */
/* ------------------------------------------------------------------ */

async function analizarBackend({ vue, scriptRoot, formulario, projectRoot, overrides, archivo }) {
  if (!scriptRoot) return { existe: false, motivo: "La pantalla no tiene <script>, así que no llama a ningún módulo de API." }
  const imports = importaciones(scriptRoot)
  const modulosApi = imports.filter((entrada) => /(^|\/)api\//.test(entrada.fuente))
  if (!modulosApi.length) {
    return { existe: false, motivo: "La pantalla no importa ningún módulo de src/api/." }
  }

  const elegido = elegirModuloApi(modulosApi, formulario, archivo)
  const archivoApi = `src/${elegido.fuente.replace(/^\.\.\//, "")}`
  const fuenteApi = await leerArchivo(projectRoot, archivoApi, overrides).catch(() => null)
  if (!fuenteApi) {
    return { existe: false, motivo: `No se encontró el módulo ${archivoApi}.` }
  }

  const raizApi = analizarJs(fuenteApi, archivoApi)
  const rutaApi = detectarRutaApi(raizApi)
  const funciones = funcionesExportadas(raizApi)
  // Algunos módulos declaran la base (`/api`) y añaden el recurso en cada
  // función; en ese caso el nombre del recurso sale del propio archivo.
  const desdeArchivo = elegido.fuente.replace(/^.*\/api\//, "").replace(/\.js$/, "")
  const ultimoSegmento = rutaApi ? rutaApi.split("/").filter(Boolean).at(-1) : null
  const recurso = ultimoSegmento && ultimoSegmento !== "api" ? ultimoSegmento : desdeArchivo
  const rutaCompleta = ultimoSegmento && ultimoSegmento !== "api" ? rutaApi : `${rutaApi ?? "/api"}/${recurso}`

  const archivoRutas = `backend/rutas/${recurso}.rutas.js`
  const fuenteRutas = await leerArchivo(projectRoot, archivoRutas, overrides).catch(() => null)
  const rutas = fuenteRutas ? analizarRutas(fuenteRutas, archivoRutas) : null

  let modelo = null
  let archivoModelo = null
  let fuenteModelo = null
  if (rutas?.modeloPrincipal?.archivo) {
    archivoModelo = rutas.modeloPrincipal.archivo
    fuenteModelo = await leerArchivo(projectRoot, archivoModelo, overrides).catch(() => null)
    if (fuenteModelo) modelo = analizarModelo(fuenteModelo, archivoModelo)
  }

  return {
    existe: true,
    api: { archivo: archivoApi, ruta: rutaCompleta, funciones, linea: elegido.linea },
    rutas: rutas
      ? {
        archivo: archivoRutas,
        listaBlanca: rutas.listaBlanca,
        modeloPrincipal: rutas.modeloPrincipal,
        endpoints: rutas.endpoints,
        usaBodyDirecto: rutas.usaBodyDirecto,
      }
      : null,
    modelo,
    archivoModelo,
    fuenteApi,
    fuenteRutas,
    fuenteModelo,
    motivo: rutas ? "" : `No se encontró el router ${archivoRutas}; el campo solo se podrá añadir al frontend.`,
  }
}

// El módulo «de la pantalla» es el que exporta la función que se llama al
// guardar: en Citas es el que ofrece saveCita/updateCita. Si no se localiza, se
// usa el que coincide con el nombre del componente y, en último caso, el primero.
function elegirModuloApi(modulosApi, formulario, archivo) {
  const funcion = formulario.manejadorNodo
  if (funcion) {
    const llamadas = buscarTodos(funcion, (nodo) =>
      nodo.type === "CallExpression" && nodo.callee?.type === "Identifier")
    for (const llamada of llamadas) {
      const modulo = modulosApi.find((entrada) => entrada.nombres.has(llamada.callee.name))
      if (modulo) return modulo
    }
  }
  const componente = archivo.split("/").at(-1).replace(/\.vue$/, "").toLowerCase()
  const porNombre = modulosApi.find((entrada) => componente.includes(entrada.fuente.replace(/^.*api\//, "").replace(/\.js$/, "")))
  return porNombre ?? modulosApi[0]
}

function detectarRutaApi(raizApi) {
  const declarada = buscarTodos(raizApi, (nodo) =>
    nodo.type === "VariableDeclarator" &&
    nodo.id?.name === "API_URL" &&
    nodo.init?.type === "Literal")[0]
  if (!declarada) return null
  const valor = String(declarada.init.value ?? "")
  try {
    return new URL(valor).pathname
  } catch {
    const coincidencia = /\/api\/[A-Za-z0-9/_-]+/.exec(valor)
    return coincidencia ? coincidencia[0] : null
  }
}

/* ------------------------------------------------------------------ */
/* Explicaciones                                                       */
/* ------------------------------------------------------------------ */

function explicar(inventario) {
  const { formulario, tabla, estado, payload, validacion, pdf, backend } = inventario
  const lineas = []

  lineas.push(`He leído ${inventario.archivo}: un componente Vue con plantilla${inventario.vue.tieneScriptSetup ? " y <script setup>" : ""}${inventario.vue.tieneEstilos ? " y estilos propios" : ""}.`)

  if (formulario.existe) {
    const enlazados = formulario.campos.filter((campo) => campo.nombre)
    lineas.push(
      `El formulario está en la línea ${formulario.linea}: ${formulario.campos.length} controles, ` +
      `${enlazados.length} de ellos enlazados con v-model al objeto «${formulario.objeto ?? "?"}». ` +
      `Se envía con la función «${formulario.manejador ?? "?"}».`,
    )
    const soloLectura = formulario.campos.filter((campo) => campo.soloLectura)
    if (soloLectura.length) {
      lineas.push(
        `${soloLectura.length} controles no tienen v-model porque son de solo lectura ` +
        `(${soloLectura.map((campo) => campo.etiqueta || "sin etiqueta").join(", ")}).`,
      )
    }
  }

  if (tabla.existe) {
    lineas.push(
      `La tabla está en la línea ${tabla.linea} y recorre la lista con la variable «${tabla.variable ?? "?"}». ` +
      `Columnas: ${tabla.columnas.map((columna) => columna.titulo).join(" · ")}.`,
    )
  }

  if (estado?.existe) {
    const propiedades = estado.propiedades.map((propiedad) => propiedad.nombre)
    lineas.push(
      estado.fabrica
        ? `El estado del formulario es «${estado.objeto}», que se crea llamando a ${estado.fabrica.nombre}() (${propiedades.length} propiedades: ${propiedades.join(", ")}).`
        : `El estado del formulario es «${estado.objeto}», declarado con ${propiedades.length} propiedades (${propiedades.join(", ")}).`,
    )
  }

  if (payload) {
    const explicaciones = {
      manual: `Antes de enviar, la pantalla copia los campos a un objeto propio (línea ${payload.linea ?? "?"}), así que un campo nuevo hay que añadirlo también ahí.`,
      spread: "La pantalla envía una copia del objeto de estado entero (...), así que un campo nuevo viaja solo: no hay que tocar el envío.",
      "objeto-completo": "La pantalla envía el objeto de estado tal cual a la API, así que un campo nuevo viaja solo: no hay que tocar el envío.",
      desconocido: payload.motivo,
    }
    const texto = explicaciones[payload.modo]
    if (texto) lineas.push(texto)
  }

  if (validacion?.tipo === "computed") {
    lineas.push(`La validación antes de enviar vive en el computed «${validacion.nombre}» (línea ${validacion.linea}).`)
  } else if (validacion?.tipo === "inline") {
    lineas.push(`La validación está dentro del :disabled del botón de guardar, en la línea ${validacion.linea}.`)
  } else if (validacion?.tipo === "ninguna") {
    lineas.push(validacion.motivo)
  }

  if (pdf?.existe) {
    lineas.push(
      `El informe PDF se genera en «${pdf.funcion ?? "una función"}» con generarPDF; ` +
      `hoy exporta ${pdf.cabeceras?.valores?.length ?? 0} columnas.`,
    )
  }

  if (backend?.existe) {
    lineas.push(
      `El backend del recurso es la ruta ${backend.api.ruta ?? "?"} (${backend.api.archivo})` +
      (backend.rutas ? ` → router ${backend.rutas.archivo}` : "") +
      (backend.rutas?.listaBlanca
        ? `, que filtra los campos con la lista blanca «${backend.rutas.listaBlanca.nombre}».`
        : backend.rutas
          ? ", que no tiene lista blanca: acepta el cuerpo entero de la petición."
          : "."),
    )
    if (backend.modelo?.existe) {
      lineas.push(
        `El modelo ${backend.modelo.archivo} declara ${backend.modelo.propiedades.length} campos ` +
        `(${backend.modelo.propiedades.map((propiedad) => `${propiedad.nombre}: ${propiedad.tipo}`).join(", ")}).`,
      )
    }
  }

  return lineas
}

function avisos(inventario) {
  const avisos = []
  if (!inventario.formulario.existe) avisos.push("No hay <form> en la plantilla: no se pueden añadir campos de formulario.")
  if (!inventario.tabla.existe) avisos.push("No hay <table> con cabecera: no se pueden añadir columnas al listado.")
  if (inventario.formulario.existe && !inventario.estado?.existe) {
    avisos.push("No se ha identificado el objeto reactivo del formulario, así que no se sabe dónde declarar el campo.")
  }
  if (inventario.payload?.modo === "desconocido" && inventario.payload.motivo) {
    avisos.push(inventario.payload.motivo)
  }
  if (inventario.backend?.motivo) avisos.push(inventario.backend.motivo)
  return avisos
}

