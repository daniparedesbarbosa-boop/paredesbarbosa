// Verificación de los parches sin tocar el proyecto: se aplican en memoria, se
// vuelve a analizar el resultado y se comprueba que el .vue sigue compilando y
// que el campo aparece en todas las piezas donde debería.

import { leerArchivo } from "./fuentes.js"
import { analizarJs } from "./js.js"
import { analizarVue } from "./vue.js"
import { analizarPantalla } from "./inventario.js"

export function aplicarParches(fuentes) {
  const resultado = new Map()
  for (const [archivo, lista] of fuentes) {
    const original = lista.original
    let texto = original
    for (const parche of [...lista.parches].sort((primero, segundo) => segundo.offset - primero.offset)) {
      texto = texto.slice(0, parche.offset) + parche.codigo + texto.slice(parche.offset)
    }
    resultado.set(archivo, texto)
  }
  return resultado
}

export async function verificarParches({ projectRoot, archivo, parches, esperado = {} }) {
  const comprobaciones = []
  const porArchivo = new Map()

  for (const parche of parches) {
    const entrada = porArchivo.get(parche.archivo) ?? { parches: [] }
    entrada.parches.push(parche)
    porArchivo.set(parche.archivo, entrada)
  }

  for (const [ruta, entrada] of porArchivo) {
    const original = await leerArchivo(projectRoot, ruta)
    if (original === null) {
      comprobaciones.push({ que: `Leer ${ruta}`, ok: false, detalle: "No se encontró el archivo." })
      continue
    }
    entrada.original = original
  }

  const fuentes = aplicarParches(porArchivo)

  for (const [ruta, texto] of fuentes) {
    if (ruta.endsWith(".js")) {
      comprobaciones.push(comprobarJs(ruta, texto))
    } else if (ruta.endsWith(".vue")) {
      comprobaciones.push(...comprobarVue(ruta, texto))
    }
  }

  // Re-análisis sobre el resultado: comprueba que el campo quedó en cada sitio.
  let inventario = null
  try {
    inventario = await analizarPantalla({ projectRoot, archivo, overrides: fuentes })
  } catch (error) {
    comprobaciones.push({ que: "Volver a analizar la pantalla parcheada", ok: false, detalle: error.message })
  }

  if (inventario) {
    comprobaciones.push(...comprobarResultado(inventario, esperado))
  }

  return {
    ok: comprobaciones.every((comprobacion) => comprobacion.ok),
    comprobaciones,
  }
}

function comprobarJs(ruta, texto) {
  try {
    analizarJs(texto, ruta)
    return { que: `${ruta} sigue siendo JavaScript válido`, ok: true }
  } catch (error) {
    return { que: `${ruta} sigue siendo JavaScript válido`, ok: false, detalle: error.message }
  }
}

function comprobarVue(ruta, texto) {
  const comprobaciones = []
  let vue = null
  try {
    vue = analizarVue(texto, ruta)
  } catch (error) {
    return [{ que: `${ruta} mantiene la estructura .vue`, ok: false, detalle: error.message }]
  }
  const errores = vue.erroresPlantilla ?? []
  comprobaciones.push({
    que: `${ruta} mantiene la plantilla válida`,
    ok: errores.length === 0,
    detalle: errores.length ? String(errores[0].message ?? errores[0]) : "",
  })
  if (vue.contenidoScript.trim()) {
    try {
      analizarJs(vue.contenidoScript, `${ruta} (script)`)
      comprobaciones.push({ que: `${ruta} mantiene el script válido`, ok: true })
    } catch (error) {
      comprobaciones.push({ que: `${ruta} mantiene el script válido`, ok: false, detalle: error.message })
    }
  }
  return comprobaciones
}

function comprobarResultado(inventario, esperado) {
  const comprobaciones = []
  const campo = esperado.campo

  if (campo) {
    const enFormulario = (inventario.formulario?.campos ?? []).some((entrada) => entrada.nombre === campo)
    const enEstado = (inventario.estado?.propiedades ?? []).some((entrada) => entrada.nombre === campo)
    const enModelo = (inventario.backend?.modelo?.propiedades ?? []).some((entrada) => entrada.nombre === campo)
    const enLista = inventario.backend?.rutas?.listaBlanca
      ? inventario.backend.rutas.listaBlanca.valores.includes(campo)
      : true
    const enTabla = (inventario.tabla?.celdasTexto ?? []).some((texto) => texto.includes(`.${campo}`))
    const enPayload = inventario.payload?.modo === "manual"
      ? (inventario.payload.claves ?? []).includes(campo)
      : true

    if (inventario.formulario?.existe) {
      comprobaciones.push({ que: "El campo aparece en el formulario", ok: enFormulario })
    }
    comprobaciones.push({ que: "El campo está declarado en el objeto reactivo", ok: enEstado })
    if (inventario.backend?.modelo?.existe) {
      comprobaciones.push({ que: "El modelo Mongoose declara el campo", ok: enModelo })
    }
    if (inventario.backend?.rutas?.listaBlanca) {
      comprobaciones.push({
        que: `La lista blanca ${inventario.backend.rutas.listaBlanca.nombre} incluye el campo`,
        ok: enLista,
      })
    }
    if (inventario.tabla?.existe) {
      comprobaciones.push({ que: "La tabla muestra el campo", ok: enTabla })
    }
    comprobaciones.push({ que: "El campo viaja en la petición a la API", ok: enPayload })
  }

  if (esperado.pdf && inventario.pdf?.existe) {
    const cabeceras = inventario.pdf.cabeceras?.valores ?? []
    comprobaciones.push({
      que: "El informe PDF incluye la nueva columna",
      ok: esperado.pdfEtiqueta ? cabeceras.includes(esperado.pdfEtiqueta) : true,
    })
  }

  if (esperado.validacion) {
    const fuente = inventario.fuente ?? ""
    comprobaciones.push({
      que: `La validación «${esperado.validacion}» está declarada`,
      ok: fuente.includes(`const ${esperado.validacion} = computed`),
    })
  }

  return comprobaciones
}
