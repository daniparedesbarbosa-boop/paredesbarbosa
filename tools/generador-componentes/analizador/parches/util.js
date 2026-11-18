// Piezas comunes de los parches: cada parche es una inserción de texto en un
// punto exacto del archivo, con su línea, su contexto y su explicación. Nada se
// escribe en el disco: el resultado es una guía que la persona copia a mano.

import { contextoEn, detectarEol, indentacionEn, lineaDeInsercion } from "../fuentes.js"

export function crearParche({ archivo, fuente, offset, texto, titulo, explicacion }) {
  return {
    archivo,
    offset,
    linea: lineaDeInsercion(fuente, offset),
    titulo,
    explicacion,
    codigo: texto,
    contexto: contextoEn(fuente, offset),
  }
}

// Calcula dónde termina el último elemento de un objeto o array, para insertar
// uno nuevo respetando la coma y la sangría que ya usa el archivo.
// `desplazamiento` convierte las posiciones del nodo (relativas al bloque de
// script) en posiciones del archivo completo.
export function puntoDeInsercion(fuente, nodo, { desplazamiento = 0 } = {}) {
  const elementos = nodo.type === "ObjectExpression" ? nodo.properties : nodo.elements
  const lista = (elementos ?? []).filter(Boolean)
  const inicio = desplazamiento + nodo.start
  const fin = desplazamiento + nodo.end

  if (!lista.length) {
    // Colección vacía: se abre en varias líneas con la sangría del cierre.
    const sangriaCierre = indentacionEn(fuente, inicio)
    return { offset: fin - 1, prefijo: "", sufijo: "", sangria: `${sangriaCierre}  `, vacio: true, unaSolaLinea: false }
  }

  const ultimo = lista.at(-1)
  const finUltimo = desplazamiento + ultimo.end
  const texto = fuente.slice(inicio, fin)
  const unaSolaLinea = !texto.includes("\n")
  const sangria = indentacionEn(fuente, desplazamiento + lista[0].start)

  // Si el último elemento ya lleva coma (estilo con coma final), el nuevo se
  // inserta detrás de esa coma; si no la lleva, se añade la que falta.
  let offset = finUltimo
  let comaExistente = false
  let sonda = offset
  while (sonda < fin && /[ \t]/.test(fuente[sonda])) sonda += 1
  if (fuente[sonda] === ",") {
    comaExistente = true
    offset = sonda + 1
  }

  // En una lista de una sola línea (por ejemplo `["a", "b"]`) se añade el
  // elemento en la misma línea; en una lista de varias, en su propia línea.
  if (unaSolaLinea) {
    return { offset: finUltimo, prefijo: ", ", sufijo: "", sangria, vacio: false, unaSolaLinea }
  }

  return {
    offset,
    prefijo: comaExistente ? "" : ",",
    sufijo: comaExistente ? "," : "",
    sangria,
    vacio: false,
    unaSolaLinea,
  }
}

export function insertarEnColeccion({ archivo, fuente, nodo, codigo, titulo, explicacion, desplazamiento = 0 }) {
  const eol = detectarEol(fuente)
  const punto = puntoDeInsercion(fuente, nodo, { desplazamiento })
  const texto = punto.vacio
    ? `${eol}${punto.sangria}${codigo}${punto.sufijo}`
    : punto.unaSolaLinea
      ? `${punto.prefijo}${codigo}`
      : `${punto.prefijo}${eol}${punto.sangria}${codigo}${punto.sufijo}`
  return crearParche({ archivo, fuente, offset: punto.offset, texto, titulo, explicacion })
}

// Inserción con salto de línea detrás del último carácter de un nodo: se usa
// para añadir un hermano (un campo nuevo, un <th>, un <td>).
export function insertarDespues({ archivo, fuente, offset, codigo, sangria, titulo, explicacion }) {
  const eol = detectarEol(fuente)
  return crearParche({
    archivo,
    fuente,
    offset,
    texto: `${eol}${indentar(codigo, sangria)}`,
    titulo,
    explicacion,
  })
}

export function insertarAntes({ archivo, fuente, offset, codigo, sangria, titulo, explicacion }) {
  const eol = detectarEol(fuente)
  return crearParche({
    archivo,
    fuente,
    offset,
    texto: `${indentar(codigo, sangria)}${eol}${sangria}`,
    titulo,
    explicacion,
  })
}

export function indentar(texto, sangria) {
  return String(texto)
    .split("\n")
    .map((linea) => (linea.trim() ? `${sangria}${linea}` : linea))
    .join("\n")
}

export function slug(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

export function validarNombreCampo(nombre) {
  const texto = String(nombre ?? "").trim()
  if (!texto) throw new Error("Indica el nombre técnico del campo.")
  if (!/^[a-z][A-Za-z0-9]*$/.test(texto)) {
    throw new Error("El nombre del campo debe empezar por minúscula y usar solo letras y números (camelCase), como nombrepac o fechaCaducidad.")
  }
  return texto
}

export function validarEtiqueta(etiqueta, nombre) {
  const texto = String(etiqueta ?? "").trim() || nombre
  if (texto.length > 60) throw new Error("La etiqueta no puede pasar de 60 caracteres.")
  return texto
}
