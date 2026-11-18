// Parche «añadir una validación solo en el frontend»: un computed nuevo, su
// enganche en la comprobación que ya bloquea el guardado y, si la pantalla usa
// mensajes bajo el campo, el aviso visible. No toca el backend.

import { importaciones } from "../js.js"
import { indentacionEn } from "../fuentes.js"
import { crearParche, insertarDespues, validarNombreCampo } from "./util.js"

export function parchearValidacion(inventario, accion) {
  const campo = validarNombreCampo(accion?.campo)
  const declarado = (inventario.formulario?.campos ?? []).find((entrada) => entrada.nombre === campo)
  if (!declarado) {
    throw new Error(`«${campo}» no es un campo del formulario de esta pantalla.`)
  }
  if (!inventario.scriptRoot) {
    throw new Error("La pantalla no tiene bloque <script>: no se puede añadir la validación.")
  }

  const regla = accion?.regla === "fecha-no-pasada" ? "fecha-no-pasada" : "patron"
  const objeto = inventario.formulario.objeto ?? inventario.estado?.objeto ?? "registro"
  const nombreComputado = `${campo}Invalido`
  const parches = []
  const notas = []

  const cuerpo = regla === "fecha-no-pasada"
    ? [
      `const ${nombreComputado} = computed(() => {`,
      `  const valor = String(${objeto}.${campo} ?? "")`,
      '  if (valor === "") return false',
      '  const hoy = new Date().toISOString().slice(0, 10)',
      "  return valor < hoy",
      "})",
    ]
    : [
      `const ${nombreComputado} = computed(() => {`,
      `  const valor = String(${objeto}.${campo} ?? "")`,
      '  if (valor === "") return false',
      `  return !new RegExp(${JSON.stringify(String(accion?.patron ?? ""))}).test(valor)`,
      "})",
    ]

  if (regla === "patron" && !String(accion?.patron ?? "").trim()) {
    throw new Error("Escribe la expresión regular de la validación.")
  }

  if (!importaComputed(inventario)) {
    const parcheImport = parcheImportComputed(inventario)
    if (parcheImport) parches.push(parcheImport)
    else notas.push("Añade «computed» al import de vue a mano.")
  }

  const offsetScript = inventario.vue.offsetScript
  const sentenciaOnMounted = (inventario.scriptRoot.body ?? []).find((sentencia) =>
    sentencia.type === "ExpressionStatement" &&
    sentencia.expression?.type === "CallExpression" &&
    sentencia.expression.callee?.name === "onMounted")
  const offset = sentenciaOnMounted
    ? offsetScript + sentenciaOnMounted.start
    : offsetScript + inventario.vue.contenidoScript.length

  parches.push(crearParche({
    archivo: inventario.archivo,
    fuente: inventario.fuente,
    offset,
    texto: `${cuerpo.join(inventario.eol)}\n\n`,
    titulo: `Validación: comprobación de «${declarado.etiqueta || campo}»`,
    explicacion: regla === "fecha-no-pasada"
      ? "Rechaza una fecha anterior a hoy. El valor vacío se considera válido: la obligatoriedad se controla aparte."
      : "Devuelve true cuando el valor no cumple el formato y el campo no está vacío.",
  }))

  const enganche = parcheEnganche(inventario, nombreComputado)
  if (enganche) parches.push(enganche)
  else notas.push(`Añade la comprobación de «${nombreComputado}» a la validación del formulario a mano.`)

  const mensaje = String(accion?.mensaje ?? "").trim() || mensajePorDefecto(regla)
  const aviso = parcheAviso(inventario, declarado, nombreComputado, mensaje)
  if (aviso) parches.push(aviso)

  return { parches, notas }
}

function mensajePorDefecto(regla) {
  return regla === "fecha-no-pasada"
    ? "La fecha no puede ser anterior a hoy."
    : "El formato del campo no es válido."
}

function importaComputed(inventario) {
  const importVue = importaciones(inventario.scriptRoot).find((entrada) => entrada.fuente === "vue")
  return Boolean(importVue?.nombres?.has("computed"))
}

function parcheImportComputed(inventario) {
  const imports = importaciones(inventario.scriptRoot)
  const importVue = imports.find((entrada) => entrada.fuente === "vue")
  const offsetScript = inventario.vue.offsetScript

  if (!importVue) {
    return crearParche({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      offset: offsetScript,
      texto: `import { computed } from "vue"${inventario.eol}${inventario.eol}`,
      titulo: "Importar computed de Vue",
      explicacion: "El módulo no importaba computed, necesario para la comprobación reactiva.",
    })
  }

  const ultimo = importVue.nodo.specifiers.at(-1)
  if (!ultimo) return null
  return crearParche({
    archivo: inventario.archivo,
    fuente: inventario.fuente,
    offset: offsetScript + ultimo.end,
    texto: ", computed",
    titulo: "Importar computed de Vue",
    explicacion: "Se añade al import que la pantalla ya tiene de vue.",
  })
}

function parcheEnganche(inventario, nombreComputado) {
  const { validacion, formulario } = inventario
  if (validacion?.tipo === "computed" && validacion.offset !== null) {
    return crearParche({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      offset: validacion.offset,
      texto: ` && !${nombreComputado}.value`,
      titulo: "Validación: bloquear el guardado",
      explicacion: `Se engancha en «${validacion.nombre}», el computed que ya desactiva el botón.`,
    })
  }
  if (validacion?.tipo === "inline" && validacion.offset !== null) {
    return crearParche({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      offset: validacion.offset,
      texto: ` || ${nombreComputado}`,
      titulo: "Validación: bloquear el guardado",
      explicacion: "Se engancha en la expresión del :disabled del botón de guardar (en la plantilla no hace falta .value).",
    })
  }
  return null
}

// Mensaje bajo el campo, como los que ya usa la pantalla (erro-mail, erro-campo).
function parcheAviso(inventario, declarado, nombreComputado, mensaje) {
  const control = declarado.control
  if (!control) return null
  const sangria = indentacionEn(inventario.vue.contenidoPlantilla, control.loc.start.offset)
  return insertarDespues({
    archivo: inventario.archivo,
    fuente: inventario.fuente,
    offset: inventario.vue.offsetPlantilla + control.loc.end.offset,
    codigo: `<small v-if="${nombreComputado}" class="erro-campo">${escapar(mensaje)}</small>`,
    sangria,
    titulo: "Validación: mensaje bajo el campo",
    explicacion: "El aviso solo aparece cuando la comprobación devuelve true.",
  })
}

function escapar(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}
