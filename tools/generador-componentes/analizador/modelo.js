// Análisis de un modelo Mongoose: el objeto que `new mongoose.Schema({...})`
// recibe es la lista de campos que acepta la colección. De ahí se saca el tipo,
// si es obligatorio, su valor por defecto y si es una referencia a otro modelo.

import { analizarJs, recorrer, claves, nombreDeClave, tipoDeNodo, propiedadesDeObjeto } from "./js.js"

export function analizarModelo(fuente, archivo) {
  const raiz = analizarJs(fuente, archivo)

  let schema = null
  recorrer(raiz, (nodo) => {
    if (schema || nodo.type !== "NewExpression") return
    const callee = nodo.callee
    const nombre = callee?.type === "MemberExpression"
      ? `${callee.object?.name}.${callee.property?.name}`
      : callee?.name
    if (!/mongoose\.Schema$/.test(nombre ?? "bin/")) return
    const argumento = nodo.arguments?.[0]
    if (argumento?.type === "ObjectExpression") schema = argumento
  })

  if (!schema) {
    return { archivo, existe: false, propiedades: [], coleccion: "", objeto: null }
  }

  const propiedades = claves(schema).map((propiedad) => describirPropiedad(propiedad, fuente))
  const coleccion = propiedadesDeObjeto(schema, "collection")

  return {
    archivo,
    existe: true,
    objeto: schema,
    linea: schema.loc?.start.line ?? null,
    coleccion: coleccion ? String(coleccion.value ?? "") : "",
    propiedades: propiedades.filter(Boolean),
  }
}

function describirPropiedad(propiedad, fuente) {
  const nombre = propiedad.nombre
  const valor = propiedad.valor
  let tipo = tipoDeNodo(valor)
  let requerido = false
  let porDefecto = null
  let referencia = null

  if (valor?.type === "ObjectExpression") {
    const tipoDeclarado = propiedadesDeObjeto(valor, "type")
    if (tipoDeclarado) tipo = tipoDeNodo(tipoDeclarado)
    const obligatorio = propiedadesDeObjeto(valor, "required")
    if (obligatorio) requerido = obligatorio.type === "Literal" ? Boolean(obligatorio.value) : obligatorio.name === "true"
    const defecto = propiedadesDeObjeto(valor, "default")
    if (defecto) porDefecto = fuente.slice(defecto.start, defecto.end)
    const ref = propiedadesDeObjeto(valor, "ref")
    if (ref) referencia = String(ref.value ?? "")
  }

  return {
    nombre,
    tipo: normalizarTipo(tipo),
    requerido,
    porDefecto,
    referencia,
    linea: propiedad.linea,
  }
}

// Los tipos de Mongoose se reducen a los tipos de campo que entiende el
// generador: texto, número, booleano, fecha o referencia.
export function normalizarTipo(tipo) {
  const texto = String(tipo ?? "").toLowerCase()
  if (texto.includes("objectid")) return "ObjectId"
  if (texto.includes("number")) return "Number"
  if (texto.includes("boolean")) return "Boolean"
  if (texto.includes("date")) return "Date"
  if (texto.includes("array")) return "Array"
  if (texto.includes("string")) return "String"
  return tipo || "desconocido"
}

export function campoEnModelo(modelo, nombre) {
  return modelo?.propiedades?.find((propiedad) => propiedad.nombre === nombre) ?? null
}

export function esReferencia(propiedad) {
  return Boolean(propiedad?.referencia) || propiedad?.tipo === "ObjectId"
}
