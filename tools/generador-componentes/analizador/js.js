// Ayudantes de AST para el JavaScript de las pantallas, los modelos y los
// routers. Se apoya en acorn (ya presente en el proyecto como dependencia de
// Vite) para no adivinar posiciones con expresiones regulares: cada parche se
// calcula sobre el nodo real, de ahí salen las líneas exactas.

import { parse as parseJs } from "acorn"

const CAMPOS_IGNORADOS = new Set(["loc", "range", "start", "end", "parent", "type"])

export function analizarJs(fuente, archivo = "archivo.js") {
  try {
    return parseJs(fuente, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      allowAwaitOutsideFunction: true,
      allowHashBang: true,
    })
  } catch (error) {
    const detalle = error.loc ? ` (línea ${error.loc.line}, columna ${error.loc.column})` : ""
    throw new Error(`No se pudo leer ${archivo}${detalle}: ${error.message}`)
  }
}

// Recorrido genérico: visita cada nodo con su padre inmediato. Se omiten los
// metadatos de posición para no recorrer objetos que no son nodos.
export function recorrer(nodo, visitar, padre = null) {
  if (!nodo || typeof nodo !== "object") return
  visitar(nodo, padre)
  for (const [clave, valor] of Object.entries(nodo)) {
    if (CAMPOS_IGNORADOS.has(clave)) continue
    if (Array.isArray(valor)) {
      for (const hijo of valor) recorrer(hijo, visitar, nodo)
    } else if (valor && typeof valor === "object" && typeof valor.type === "string") {
      recorrer(valor, visitar, nodo)
    }
  }
}

export function buscar(nodo, condicion) {
  let encontrado = null
  recorrer(nodo, (actual) => {
    if (!encontrado && condicion(actual)) encontrado = actual
  })
  return encontrado
}

export function buscarTodos(nodo, condicion) {
  const encontrados = []
  recorrer(nodo, (actual) => {
    if (condicion(actual)) encontrados.push(actual)
  })
  return encontrados
}

// Declaración de variable por nombre (`const cita = ...`, `const citaVacia = () => ...`).
export function declaracion(raiz, nombre) {
  return buscar(raiz, (nodo) =>
    nodo.type === "VariableDeclarator" &&
    nodo.id?.type === "Identifier" &&
    nodo.id.name === nombre) ?? null
}

export function declaraciones(raiz) {
  return buscarTodos(raiz, (nodo) => nodo.type === "VariableDeclarator" && nodo.id?.type === "Identifier")
}

// Resuelve el objeto literal detrás de una expresión: el propio objeto, el
// cuerpo de una función que lo devuelve o el primer argumento de una llamada
// (`reactive({...})`).
export function objetoDe(nodo) {
  if (!nodo) return null
  if (nodo.type === "ObjectExpression") return nodo
  if (nodo.type === "ArrowFunctionExpression" || nodo.type === "FunctionExpression") return objetoDe(nodo.body)
  if (nodo.type === "CallExpression") return objetoDe(nodo.arguments?.[0])
  if (nodo.type === "ParenthesizedExpression") return objetoDe(nodo.expression)
  return null
}

export function nombreDeClave(propiedad) {
  if (!propiedad) return null
  if (propiedad.key?.type === "Identifier") return propiedad.key.name
  if (propiedad.key?.type === "Literal") return String(propiedad.key.value)
  return null
}

export function claves(objeto) {
  if (!objeto || objeto.type !== "ObjectExpression") return []
  return objeto.properties
    .filter((propiedad) => propiedad.type === "Property" && !propiedad.computed)
    .map((propiedad) => ({
      nombre: nombreDeClave(propiedad),
      nodo: propiedad,
      valor: propiedad.value,
      linea: propiedad.loc?.start.line ?? null,
    }))
    .filter((entrada) => entrada.nombre)
}

export function propiedadesDeObjeto(objeto, nombre) {
  if (!objeto || objeto.type !== "ObjectExpression") return null
  const propiedad = objeto.properties.find((entrada) => entrada.type === "Property" && nombreDeClave(entrada) === nombre)
  return propiedad?.value ?? null
}

// Imports de la pantalla: módulo y funciones que aporta cada uno. La cadena
// pantalla → módulo de API → ruta → modelo se apoya en esta información.
export function importaciones(raiz) {
  const resultado = []
  for (const sentencia of raiz.body ?? []) {
    if (sentencia.type !== "ImportDeclaration") continue
    const nombres = new Map()
    for (const especificador of sentencia.specifiers ?? []) {
      if (especificador.type === "ImportSpecifier") {
        nombres.set(especificador.local.name, especificador.imported?.name ?? especificador.local.name)
      }
      if (especificador.type === "ImportDefaultSpecifier" || especificador.type === "ImportNamespaceSpecifier") {
        // `import Cita from "../modelos/cita.js"` también cuenta: es como los
        // routers traen sus modelos.
        nombres.set(especificador.local.name, "default")
      }
    }
    resultado.push({
      fuente: sentencia.source.value,
      nombres,
      nodo: sentencia,
      linea: sentencia.loc?.start.line ?? null,
    })
  }
  return resultado
}

export function funcionesExportadas(raiz) {
  const funciones = []
  for (const sentencia of raiz.body ?? []) {
    if (sentencia.type === "ExportNamedDeclaration" && sentencia.declaration?.type === "FunctionDeclaration") {
      funciones.push(sentencia.declaration.id.name)
    }
    if (sentencia.type === "ExportNamedDeclaration" && sentencia.declaration?.type === "VariableDeclaration") {
      for (const declarada of sentencia.declaration.declarations) {
        if (declarada.id?.type === "Identifier") funciones.push(declarada.id.name)
      }
    }
  }
  return funciones
}

// Función que contiene un offset: sirve para saber en qué función vive una
// llamada (por ejemplo, la que genera el PDF).
export function funcionQueContiene(raiz, inicio, fin) {
  const candidatas = buscarTodos(raiz, (nodo) =>
    (nodo.type === "FunctionDeclaration" || nodo.type === "FunctionExpression" || nodo.type === "ArrowFunctionExpression") &&
    nodo.start <= inicio && nodo.end >= fin)
  if (!candidatas.length) return null
  // La más pequeña que contiene el rango es la función real, no un ancestro.
  return candidatas.sort((primera, segunda) => (primera.end - primera.start) - (segunda.end - segunda.start))[0]
}

export function nombreDeFuncion(nodo) {
  if (!nodo) return null
  if (nodo.type === "FunctionDeclaration") return nodo.id?.name ?? null
  if (nodo.type === "VariableDeclarator") return nodo.id?.name ?? null
  return null
}

export function tipoDeNodo(nodo) {
  if (!nodo) return "desconocido"
  if (nodo.type === "Identifier") return nodo.name
  if (nodo.type === "MemberExpression") {
    return `${nodo.object?.name ?? nodo.object?.type}.${nodo.property?.name ?? nodo.property?.value}`
  }
  if (nodo.type === "ArrayExpression") return "Array"
  if (nodo.type === "ObjectExpression") return "Object"
  return nodo.type
}

export function llamadasA(raiz, nombre) {
  return buscarTodos(raiz, (nodo) =>
    nodo.type === "CallExpression" &&
    nodo.callee?.type === "Identifier" &&
    nodo.callee.name === nombre)
}
