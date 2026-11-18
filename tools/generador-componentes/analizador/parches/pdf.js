// Parches del informe PDF. La pantalla ya usa generarPDF con una estructura fija
// (cabeceras + filas), así que añadir una columna son dos inserciones alineadas:
// una en la cabecera y otra en el array de cada fila.

import { elementosDe, textoRenderizado } from "../vue.js"
import { importaciones } from "../js.js"
import { crearParche, insertarDespues, insertarEnColeccion } from "./util.js"

export function parchearColumnaPdf(inventario, { campo, etiqueta }) {
  const { pdf } = inventario
  if (!pdf?.existe) {
    return {
      parches: [],
      notas: ["La pantalla no genera un informe PDF todavía; se puede crear uno desde la acción «Informe PDF»."],
    }
  }
  if (!pdf.cabeceras?.nodo || !pdf.filas?.nodo) {
    return {
      parches: [],
      notas: ["El PDF existe pero no usa el patrón cabeceras + filas de este proyecto; añade la columna a mano."],
    }
  }

  const parches = [
    insertarEnColeccion({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      nodo: pdf.cabeceras.nodo,
      desplazamiento: inventario.vue.offsetScript,
      codigo: `"${etiqueta}"`,
      titulo: "PDF: nueva cabecera",
      explicacion:
        "La tabla del PDF dibuja una columna por cada cabecera. El orden de esta lista es el orden " +
        "de las columnas del informe.",
    }),
    insertarEnColeccion({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      nodo: pdf.filas.nodo,
      desplazamiento: inventario.vue.offsetScript,
      codigo: `${pdf.filas.variable ?? "item"}.${campo} ?? ""`,
      titulo: "PDF: nuevo valor de cada fila",
      explicacion:
        "Cada fila es un array; el valor nuevo va en la misma posición que su cabecera, al final.",
    }),
  ]
  return { parches, notas: [] }
}

// Genera el informe desde cero para una pantalla que aún no exporta nada. Se
// apoya en la tabla ya existente: sus columnas pasan a ser las del PDF.
export function parchearPdfNuevo(inventario, accion = {}) {
  const parches = []
  const notas = []

  if (inventario.pdf?.existe) {
    return { parches, notas: ["La pantalla ya genera un informe PDF; usa la acción «añadir columna al PDF»."] }
  }
  const tabla = inventario.tabla
  if (!tabla?.existe) {
    return { parches, notas: ["La pantalla no tiene tabla, así que no hay datos que exportar."] }
  }
  if (!inventario.scriptRoot) {
    return { parches, notas: ["La pantalla no tiene bloque <script>."] }
  }

  const variable = tabla.variable ?? "item"
  const lista = tabla.lista ?? `${variable}s`
  const usables = (tabla.columnas ?? []).filter((columna) => columna.propiedad)
  if (!usables.length) {
    return { parches, notas: ["No se han podido leer las propiedades de las celdas de la tabla."] }
  }

  const componente = inventario.componente
  const nombreFuncion = `exportar${componente}`
  const titulo = accion.titulo || `Informe de ${componente}`
  const nombreArchivo = accion.nombreArchivo || `informe_${componente.toLowerCase()}.pdf`
  const cabeceras = usables.map((columna) => columna.titulo)
  const filas = usables.map((columna) => `        ${variable}.${columna.propiedad} ?? "",`)

  const bloque = [
    "",
    `// Exporta la lista a PDF con la utilidad compartida del proyecto.`,
    `async function ${nombreFuncion}() {`,
    "  try {",
    "    await generarPDF({",
    `      titulo: ${JSON.stringify(titulo)},`,
    `      cabeceras: ${JSON.stringify(cabeceras)},`,
    `      filas: ${lista}.value.map((${variable}) => [`,
    ...filas,
    "      ]),",
    `      nombreArchivo: ${JSON.stringify(nombreArchivo)},`,
    "    })",
    "  } catch (error) {",
    '    alertaError(mensajeError(error, "No se pudo generar el informe."))',
    "  }",
    "}",
  ].join("\n")

  const imports = importaciones(inventario.scriptRoot)
  const yaImportaPdf = imports.some((entrada) => entrada.fuente.includes("utils/pdf"))
  const yaImportaAlertas = imports.some((entrada) =>
    entrada.fuente.includes("utils/alertas") && entrada.nombres.has("alertaError"))
  const ultimoImport = imports.at(-1)
  const lineasImport = [
    yaImportaPdf ? "" : 'import { generarPDF } from "../utils/pdf.js"',
    yaImportaAlertas ? "" : 'import { alertaError } from "../utils/alertas.js"',
  ].filter(Boolean)

  if (lineasImport.length) {
    parches.push({
      ...insertarDespues({
        archivo: inventario.archivo,
        fuente: inventario.fuente,
        offset: ultimoImport ? inventario.vue.offsetScript + ultimoImport.nodo.end : inventario.vue.offsetScript,
        codigo: lineasImport.join("\n"),
        sangria: "",
        titulo: "PDF: importar las utilidades",
        explicacion: "generarPDF dibuja el informe y alertaError muestra el mensaje si falla.",
      }),
    })
  }

  parches.push(crearParche({
    archivo: inventario.archivo,
    fuente: inventario.fuente,
    offset: inventario.vue.offsetScript + inventario.vue.contenidoScript.length,
    texto: bloque,
    titulo: "PDF: función que genera el informe",
    explicacion:
      `Reutiliza las ${usables.length} columnas de la tabla como cabeceras del PDF, con la misma ` +
      "lista que pinta el v-for.",
  }))

  const cabeceraLista = elementosDe(inventario.vue.ast)
    .find((nodo) => nodo.tag === "h4" && /list|listaxe|listado|tabla|rexistro/i.test(textoRenderizado(nodo)))
  if (cabeceraLista) {
    parches.push(insertarDespues({
      archivo: inventario.archivo,
      fuente: inventario.fuente,
      offset: inventario.vue.offsetPlantilla + cabeceraLista.loc.end.offset,
      codigo: [
        "<button",
        '  type="button"',
        '  class="btn-informe"',
        '  title="Exportar a PDF"',
        '  aria-label="Exportar a PDF"',
        `  :disabled="${lista}.length === 0"`,
        `  @click="${nombreFuncion}"`,
        ">",
        "  📄",
        "</button>",
      ].join("\n"),
      sangria: "      ",
      titulo: "PDF: botón de exportar",
      explicacion: "Se coloca junto al título del listado. Ajusta la clase si tu pantalla usa otro estilo de botón.",
    }))
  } else {
    notas.push(`No se encontró el título del listado: coloca el botón que llama a ${nombreFuncion}() donde quieras.`)
  }

  return { parches, notas }
}
