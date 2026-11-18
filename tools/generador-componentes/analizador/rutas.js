// Análisis de un router de Express. Lo importante para añadir un campo es la
// «lista blanca»: si el router filtra el cuerpo con `const camposX = [...]`,
// el campo nuevo no se guardará hasta añadirlo ahí. Si el router usa `req.body`
// directamente (como pacientes), no hay nada que tocar y el analizador lo dice.

import { analizarJs, recorrer, buscarTodos, declaracion, importaciones, claves, tipoDeNodo } from "./js.js"

const PREFIJOS_LISTA = /^(campos|camposPermitidos|allowed|permitidos)/i

export function analizarRutas(fuente, archivo) {
  const raiz = analizarJs(fuente, archivo)
  const modelos = importaciones(raiz)
    .filter((entrada) => entrada.fuente.includes("modelos/"))
    .map((entrada) => ({
      local: [...entrada.nombres.keys()][0] ?? null,
      archivo: `backend/${entrada.fuente.replace(/^\.\.\//, "")}`,
      linea: entrada.linea,
    }))
    .filter((entrada) => entrada.local)

  const modeloPrincipal = detectarModeloPrincipal(raiz, modelos)
  const listaBlanca = detectarListaBlanca(raiz, fuente)

  return {
    archivo,
    modeloPrincipal,
    modelos,
    listaBlanca,
    endpoints: detectarEndpoints(raiz),
    usaBodyDirecto: detectarBodyDirecto(raiz),
  }
}

// El modelo «de la ruta» es el que se usa para crear: `Cita.create(datos)`.
// Si no hay creación, vale el primer modelo importado.
function detectarModeloPrincipal(raiz, modelos) {
  const porNombre = new Map(modelos.map((modelo) => [modelo.local, modelo]))
  let encontrado = null
  recorrer(raiz, (nodo) => {
    if (encontrado || nodo.type !== "CallExpression") return
    const callee = nodo.callee
    if (callee?.type !== "MemberExpression" || callee.object?.type !== "Identifier") return
    if (callee.property?.name !== "create") return
    encontrado = porNombre.get(callee.object.name) ?? null
  })
  return encontrado ?? modelos[0] ?? null
}

function detectarListaBlanca(raiz, fuente) {
  const candidatas = buscarTodos(raiz, (nodo) =>
    nodo.type === "VariableDeclarator" &&
    nodo.id?.type === "Identifier" &&
    nodo.init?.type === "ArrayExpression" &&
    nodo.init.elements.every((elemento) => elemento && elemento.type === "Literal" && typeof elemento.value === "string"))

  const conNombre = candidatas.find((nodo) => PREFIJOS_LISTA.test(nodo.id.name))
  const elegida = conNombre ?? (candidatas.length === 1 ? candidatas[0] : null)
  if (!elegida) return null

  return {
    nombre: elegida.id.name,
    linea: elegida.loc?.start.line ?? null,
    inicio: elegida.start,
    fin: elegida.end,
    array: elegida.init,
    valores: elegida.init.elements.map((elemento) => elemento.value),
    fuente: fuente.slice(elegida.start, elegida.end),
  }
}

function detectarEndpoints(raiz) {
  const endpoints = []
  recorrer(raiz, (nodo) => {
    if (nodo.type !== "CallExpression") return
    const callee = nodo.callee
    if (callee?.type !== "MemberExpression" || callee.object?.type !== "Identifier") return
    if (callee.object.name !== "router") return
    const metodo = callee.property?.name
    if (!["get", "post", "put", "delete", "patch"].includes(metodo)) return
    const ruta = nodo.arguments?.[0]
    endpoints.push({
      metodo: metodo.toUpperCase(),
      ruta: ruta?.type === "Literal" ? String(ruta.value) : "?",
      linea: nodo.loc?.start.line ?? null,
    })
  })
  return endpoints
}

function detectarBodyDirecto(raiz) {
  return Boolean(buscarTodos(raiz, (nodo) =>
    nodo.type === "MemberExpression" &&
    nodo.object?.type === "MemberExpression" &&
    nodo.object.object?.name === "req" &&
    nodo.object.property?.name === "body").length)
}

export function campoEnListaBlanca(listaBlanca, nombre) {
  return Boolean(listaBlanca?.valores?.includes(nombre))
}

export function clavesDeModelo(modelo) {
  return (modelo?.propiedades ?? []).map((propiedad) => propiedad.nombre)
}

export { claves, declaracion, tipoDeNodo }
