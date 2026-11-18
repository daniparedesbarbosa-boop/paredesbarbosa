// Parche «añadir un campo»: modelo, lista blanca del router, plantilla (control,
// cabecera y celda), objeto de estado, objeto de envío y validación. Cada pieza
// se calcula sobre el nodo real del archivo, así que la línea que se muestra es
// la línea de verdad.

import { parchearColumnaPdf } from "./pdf.js"
import { campoEnModelo } from "../modelo.js"
import { campoEnListaBlanca } from "../rutas.js"
import {
  crearParche,
  escaparHtml,
  insertarAntes,
  insertarDespues,
  insertarEnColeccion,
  slug,
  validarEtiqueta,
  validarNombreCampo,
} from "./util.js"

const TIPOS_VALIDOS = new Set([
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "time",
  "boolean",
  "select",
  "radio",
])

export function parchearCampo(inventario, accion) {
  const nombre = validarNombreCampo(accion?.nombre)
  const etiqueta = validarEtiqueta(accion?.etiqueta, nombre)
  const tipoCampo = TIPOS_VALIDOS.has(accion?.tipoCampo) ? accion.tipoCampo : "text"
  const requerido = Boolean(accion?.requerido)
  const opciones = leerOpciones(accion?.opciones)
  const datos = { nombre, etiqueta, tipoCampo, requerido, opciones }
  const parches = []
  const notas = []

  comprobarDuplicado(inventario, nombre)

  if (["select", "radio"].includes(tipoCampo) && !opciones.length) {
    throw new Error(`Un campo de tipo «${tipoCampo}» necesita al menos una opción (valor|etiqueta por línea).`)
  }

  const modelo = inventario.backend?.modelo
  if (modelo?.existe) {
    if (campoEnModelo(modelo, nombre)) {
      notas.push(`El modelo ${modelo.archivo} ya declara «${nombre}»: no se toca.`)
    } else {
      parches.push(parcheModelo(inventario, datos))
    }
  } else {
    notas.push("No se ha encontrado el modelo Mongoose del recurso: el campo se añadirá solo al frontend.")
  }

  const lista = inventario.backend?.rutas?.listaBlanca
  if (lista) {
    if (campoEnListaBlanca(lista, nombre)) {
      notas.push(`La lista blanca ${lista.nombre} ya incluye «${nombre}».`)
    } else {
      parches.push(parcheListaBlanca(inventario, nombre))
    }
  } else if (inventario.backend?.rutas?.usaBodyDirecto) {
    notas.push(
      `El router ${inventario.backend.rutas.archivo} no filtra el cuerpo de la petición, así que no hay lista blanca que actualizar.`,
    )
  } else if (inventario.backend?.rutas) {
    notas.push("El router no tiene lista blanca de campos; no hay nada que añadir en el backend.")
  }

  if (accion?.enFormulario !== false) {
    const parche = parcheFormulario(inventario, datos)
    if (parche) parches.push(parche)
    else notas.push("La pantalla no tiene formulario: no se puede añadir el control.")
  }

  if (accion?.enTabla !== false) {
    const cabecera = parcheCabecera(inventario, etiqueta)
    const celda = parcheCelda(inventario, nombre)
    if (cabecera && celda) parches.push(cabecera, celda)
    else if (!inventario.tabla?.existe) notas.push("La pantalla no tiene tabla: no se añade columna.")
  }

  const estado = parcheEstado(inventario, datos)
  if (estado) parches.push(estado)
  else notas.push("No se ha identificado el objeto reactivo del formulario: añade la propiedad a mano.")

  const payload = parchePayload(inventario, nombre)
  if (payload) parches.push(payload)

  if (requerido) {
    const validacion = parcheValidacionObligatorio(inventario, nombre)
    if (validacion) parches.push(validacion)
    else notas.push("No hay validación previa al envío: añade la comprobación a mano si la necesitas.")
  }

  if (accion?.enPdf) {
    const pdf = parchearColumnaPdf(inventario, { campo: nombre, etiqueta })
    if (pdf) parches.push(...pdf.parches)
    else notas.push(...pdf.notas)
  }

  return { parches, notas }
}

/* ------------------------------------------------------------------ */
/* Backend                                                             */
/* ------------------------------------------------------------------ */

function tipoMongoose(tipoCampo) {
  if (tipoCampo === "number") return "Number"
  if (tipoCampo === "boolean") return "Boolean"
  return "String"
}

function parcheModelo(inventario, { nombre, tipoCampo, requerido }) {
  const modelo = inventario.backend.modelo
  const fuente = inventario.backend.fuenteModelo
  const tipo = tipoMongoose(tipoCampo)
  const opciones = [`type: ${tipo}`]
  if (requerido) opciones.push("required: true")
  else if (tipoCampo === "boolean") opciones.push("default: false")
  else if (tipoCampo === "number") opciones.push("default: 0")
  else opciones.push('default: ""')

  return insertarEnColeccion({
    archivo: modelo.archivo,
    fuente,
    nodo: modelo.objeto,
    codigo: `${nombre}: { ${opciones.join(", ")} }`,
    titulo: `Modelo Mongoose: declarar «${nombre}»`,
    explicacion:
      `Mongoose solo guarda los campos que declara el esquema. Sin esta línea el valor llega al backend, ` +
      `se descarta y no aparece en la base de datos.`,
  })
}

function parcheListaBlanca(inventario, nombre) {
  const rutas = inventario.backend.rutas
  return insertarEnColeccion({
    archivo: rutas.archivo,
    fuente: inventario.backend.fuenteRutas,
    nodo: rutas.listaBlanca.array,
    codigo: `"${nombre}"`,
    titulo: `Router: añadir «${nombre}» a ${rutas.listaBlanca.nombre}`,
    explicacion:
      `El router copia solo las claves de esta lista antes de guardar. Si el campo no está aquí, ` +
      `se pierde aunque el modelo lo admita.`,
  })
}

/* ------------------------------------------------------------------ */
/* Plantilla                                                           */
/* ------------------------------------------------------------------ */

function parcheFormulario(inventario, datos) {
  const { formulario } = inventario
  if (!formulario?.existe || formulario.offset === null) return null
  return insertarDespues({
    archivo: inventario.archivo,
    fuente: inventario.fuente,
    offset: formulario.offset,
    codigo: bloqueControl(inventario, datos),
    sangria: formulario.sangria,
    titulo: "Plantilla: nuevo campo del formulario",
    explicacion:
      `Se inserta como hermano del último campo y reutiliza su clase base (${formulario.claseBase}) ` +
      `para heredar el estilo de la pantalla. Ajusta la clase si quieres darle un ancho distinto.`,
  })
}

function bloqueControl(inventario, { nombre, etiqueta, tipoCampo, requerido, opciones }) {
  const { formulario, componente } = inventario
  const clase = formulario.claseBase
  const objeto = formulario.objeto ?? "registro"
  const id = `${nombre}-${slug(componente)}`
  const obligatorio = requerido ? "\n  required" : ""
  const etiquetaHtml = formulario.etiquetaConFor
    ? `<label for="${id}">${escaparHtml(etiqueta)}:</label>`
    : `<label>${escaparHtml(etiqueta)}:</label>`

  if (tipoCampo === "boolean") {
    return [
      `<div class="${clase}">`,
      "  <label>",
      `    <input v-model="${objeto}.${nombre}" type="checkbox">`,
      `    ${escaparHtml(etiqueta)}`,
      "  </label>",
      "</div>",
    ].join("\n")
  }

  if (tipoCampo === "select" || tipoCampo === "radio") {
    if (tipoCampo === "select") {
      return [
        `<div class="${clase}">`,
        `  ${etiquetaHtml}`,
        "  <select",
        `    id="${id}"`,
        `    v-model="${objeto}.${nombre}"`,
        ...(requerido ? ["    required"] : []),
        "  >",
        '    <option value="">Selecciona una opción</option>',
        ...opciones.map((opcion) => `    <option value="${escaparHtml(opcion.valor)}">${escaparHtml(opcion.etiqueta)}</option>`),
        "  </select>",
        "</div>",
      ].join("\n")
    }
    return [
      `<fieldset class="${clase}">`,
      `  <legend>${escaparHtml(etiqueta)}</legend>`,
      ...opciones.map((opcion) => [
        "  <label>",
        `    <input v-model="${objeto}.${nombre}" type="radio" value="${escaparHtml(opcion.valor)}"${requerido ? " required" : ""}>`,
        `    ${escaparHtml(opcion.etiqueta)}`,
        "  </label>",
      ].join("\n")),
      "</fieldset>",
    ].join("\n")
  }

  const modificador = tipoCampo === "textarea" ? ".trim" : modificadorDeModelo(tipoCampo)
  const atributos = [
    `    id="${id}"`,
    `    v-model${modificador}="${objeto}.${nombre}"`,
    tipoCampo === "textarea" ? '    rows="3"' : `    type="${tipoDeInput(tipoCampo)}"`,
    ...(requerido ? ["    required"] : []),
  ]
  const apertura = tipoCampo === "textarea" ? "  <textarea" : "  <input"
  const cierre = tipoCampo === "textarea" ? "  />" : "  >"

  return [`<div class="${clase}">`, `  ${etiquetaHtml}`, apertura, ...atributos, cierre, "</div>"].join("\n")
}

function tipoDeInput(tipoCampo) {
  return {
    text: "text",
    email: "email",
    phone: "tel",
    number: "number",
    date: "date",
    time: "time",
  }[tipoCampo] ?? "text"
}

function modificadorDeModelo(tipoCampo) {
  if (tipoCampo === "number") return ".number"
  if (["text", "email", "phone"].includes(tipoCampo)) return ".trim"
  return ""
}

function parcheCabecera(inventario, etiqueta) {
  const { tabla } = inventario
  if (!tabla?.existe || !tabla.cabecera) return null
  return insertarEnAncla({
    inventario,
    ancla: tabla.cabecera,
    codigo: `<th>${escaparHtml(etiqueta)}</th>`,
    titulo: "Plantilla: nueva columna en la cabecera",
    explicacion:
      "La cabecera y la celda se insertan en la misma posición para que los títulos sigan " +
      "correspondiendo con sus columnas.",
  })
}

function parcheCelda(inventario, nombre) {
  const { tabla } = inventario
  if (!tabla?.existe || !tabla.celda) return null
  const variable = tabla.variable ?? "item"
  return insertarEnAncla({
    inventario,
    ancla: tabla.celda,
    codigo: `<td>{{ ${variable}.${nombre} }}</td>`,
    titulo: "Plantilla: nueva celda en la fila",
    explicacion: `Sale de la variable «${variable}» del v-for, la misma que usan las demás celdas.`,
  })
}

function insertarEnAncla({ inventario, ancla, codigo, titulo, explicacion }) {
  const base = {
    archivo: inventario.archivo,
    fuente: inventario.fuente,
    offset: ancla.offset,
    codigo,
    sangria: ancla.sangria,
    titulo,
    explicacion,
  }
  return ancla.modo === "despues" ? insertarDespues(base) : insertarAntes(base)
}

/* ------------------------------------------------------------------ */
/* Estado, envío y validación                                          */
/* ------------------------------------------------------------------ */

function parcheEstado(inventario, { nombre, tipoCampo }) {
  const { estado } = inventario
  if (!estado?.existe || !estado.objetoNodo) return null
  const valor = tipoCampo === "number" ? "0" : tipoCampo === "boolean" ? "false" : '""'
  return insertarEnColeccion({
    archivo: inventario.archivo,
    fuente: inventario.fuente,
    nodo: estado.objetoNodo,
    desplazamiento: inventario.vue.offsetScript,
    codigo: `${nombre}: ${valor}`,
    titulo: `Estado: declarar «${nombre}» en ${estado.objeto}`,
    explicacion:
      `v-model necesita que la propiedad exista en el objeto reactivo. Si falta, el control pinta ` +
      `pero el valor no se sincroniza ni se limpia al cancelar.`,
  })
}

function parchePayload(inventario, nombre) {
  const { payload, estado } = inventario
  if (payload?.modo === "manual" && payload.nodo) {
    return insertarEnColeccion({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      nodo: payload.nodo,
      desplazamiento: inventario.vue.offsetScript,
      codigo: `${nombre}: ${estado.objeto}.${nombre}`,
      titulo: "Envío: incluir el campo en el objeto que va a la API",
      explicacion:
        "Esta pantalla construye el cuerpo de la petición campo a campo, así que lo que no se " +
        "enumera aquí nunca llega al backend.",
    })
  }
  return null
}

function parcheValidacionObligatorio(inventario, nombre) {
  const { validacion, estado, formulario } = inventario
  const objeto = formulario?.objeto ?? estado?.objeto ?? "registro"
  if (validacion?.tipo === "computed" && validacion.offset !== null) {
    return crearParche({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      offset: validacion.offset,
      texto: ` && Boolean(${objeto}.${nombre})`,
      titulo: "Validación: exigir el campo antes de guardar",
      explicacion: `Se añade a «${validacion.nombre}», el computed que ya bloquea el botón Guardar.`,
    })
  }
  if (validacion?.tipo === "inline" && validacion.offset !== null) {
    return crearParche({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      offset: validacion.offset,
      texto: ` || !${objeto}.${nombre}`,
      titulo: "Validación: exigir el campo antes de guardar",
      explicacion: "Se añade a la expresión del :disabled del botón de guardar.",
    })
  }
  return null
}

/* ------------------------------------------------------------------ */
/* Ayudantes                                                           */
/* ------------------------------------------------------------------ */

function leerOpciones(valor) {
  if (Array.isArray(valor)) {
    return valor
      .map((entrada) => ({
        valor: String(entrada?.valor ?? entrada?.value ?? "").trim(),
        etiqueta: String(entrada?.etiqueta ?? entrada?.label ?? "").trim(),
      }))
      .filter((entrada) => entrada.valor)
  }
  return String(valor ?? "")
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter(Boolean)
    .map((linea) => {
      const separador = linea.indexOf("|")
      if (separador < 0) return { valor: linea, etiqueta: linea }
      return {
        valor: linea.slice(0, separador).trim(),
        etiqueta: linea.slice(separador + 1).trim() || linea.slice(0, separador).trim(),
      }
    })
}

function comprobarDuplicado(inventario, nombre) {
  const enFormulario = (inventario.formulario?.campos ?? []).some((campo) => campo.nombre === nombre)
  const enEstado = (inventario.estado?.propiedades ?? []).some((propiedad) => propiedad.nombre === nombre)
  const enModelo = Boolean(campoEnModelo(inventario.backend?.modelo, nombre))
  if (enFormulario || enEstado || enModelo) {
    throw new Error(`La pantalla ya tiene un campo «${nombre}»; elige otro nombre.`)
  }
}
