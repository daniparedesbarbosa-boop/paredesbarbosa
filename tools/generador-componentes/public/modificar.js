import { getScreens, postJson } from "./modules/api.js"

const selectPantallas = document.querySelector("#screen-select")
const screenHint = document.querySelector("#screen-hint")
const analyzeButton = document.querySelector("#analyze-button")
const analyzeMessage = document.querySelector("#analyze-message")
const mapPanel = document.querySelector("#map-panel")
const actionPanel = document.querySelector("#action-panel")
const resultPanel = document.querySelector("#result-panel")
const mapSummary = document.querySelector("#map-summary")
const mapGrid = document.querySelector("#map-grid")
const mapUnrecognized = document.querySelector("#map-unrecognized")
const actionTabs = document.querySelector("#action-tabs")
const actionForm = document.querySelector("#action-form")
const patchButton = document.querySelector("#patch-button")
const patchMessage = document.querySelector("#patch-message")
const verificationList = document.querySelector("#verification")
const patchesBox = document.querySelector("#patches")
const notesBox = document.querySelector("#patch-notes")
const copyAllButton = document.querySelector("#copy-all")

let pantallas = []
let inventario = null
let accionActual = "campo"
let ultimoResultado = null

const TIPOS_CAMPO = [
  ["text", "Texto"],
  ["textarea", "Texto largo"],
  ["email", "Correo"],
  ["phone", "Teléfono"],
  ["number", "Número"],
  ["date", "Fecha"],
  ["time", "Hora"],
  ["boolean", "Casilla sí/no"],
  ["select", "Desplegable"],
  ["radio", "Opciones excluyentes"],
]

function mostrarAviso(elemento, texto, tipo = "info") {
  if (!texto) {
    elemento.hidden = true
    elemento.textContent = ""
    return
  }
  elemento.hidden = false
  elemento.className = `notice notice-${tipo === "error" ? "error" : tipo === "success" ? "success" : "info"}`
  elemento.replaceChildren()

  const parrafo = document.createElement("p")
  parrafo.textContent = texto
  elemento.append(parrafo)
}

function crear(tag, opciones = {}, hijos = []) {
  const nodo = document.createElement(tag)
  if (opciones.clase) nodo.className = opciones.clase
  if (opciones.texto) nodo.textContent = opciones.texto
  if (opciones.tipo) nodo.type = opciones.tipo
  if (opciones.nombre) nodo.name = opciones.nombre
  if (opciones.valor !== undefined) nodo.value = opciones.valor
  if (opciones.placeholder) nodo.placeholder = opciones.placeholder
  if (opciones.checked) nodo.checked = true
  for (const hijo of hijos) nodo.append(hijo)
  return nodo
}

async function cargarPantallas() {
  try {
    const datos = await getScreens()
    pantallas = Array.isArray(datos.screens) ? datos.screens : []
  } catch (error) {
    selectPantallas.replaceChildren(crear("option", { valor: "", texto: "No se pudieron cargar las pantallas" }))
    mostrarAviso(analyzeMessage, `No se pudo leer la lista de pantallas: ${error.message}`, "error")
    return
  }

  if (!pantallas.length) {
    selectPantallas.replaceChildren(crear("option", { valor: "", texto: "No hay componentes en src/components" }))
    return
  }

  const opciones = [crear("option", { valor: "", texto: "Selecciona un componente…" })]
  for (const pantalla of pantallas) {
    const texto = pantalla.aplicable
      ? `${pantalla.componente} — formulario${pantalla.tieneTabla ? " y tabla" : ""}`
      : `${pantalla.componente} — sin formulario ni tabla`
    const opcion = crear("option", { valor: pantalla.archivo, texto })
    if (!pantalla.aplicable) opcion.disabled = true
    opciones.push(opcion)
  }
  selectPantallas.replaceChildren(...opciones)
}

function pantallaSeleccionada() {
  return pantallas.find((pantalla) => pantalla.archivo === selectPantallas.value) ?? null
}

function actualizarPista() {
  const pantalla = pantallaSeleccionada()
  if (!pantalla) {
    screenHint.textContent = "Selecciona un componente para analizarlo."
    return
  }
  if (!pantalla.aplicable) {
    screenHint.textContent = "Esta pantalla no tiene formulario ni tabla: el modo modificar no aplica."
    return
  }
  screenHint.textContent = `${pantalla.archivo} · ${pantalla.tieneFormulario ? "con formulario" : "sin formulario"}${pantalla.tieneTabla ? ", con tabla" : ", sin tabla"}.`
}

async function analizar() {
  const archivo = selectPantallas.value
  if (!archivo) {
    mostrarAviso(analyzeMessage, "Elige un componente antes de analizar.", "error")
    return
  }

  analyzeButton.disabled = true
  analyzeButton.textContent = "Analizando…"
  mostrarAviso(analyzeMessage, "")
  try {
    const { inventario: datos } = await postJson("/api/analyze", { archivo })
    inventario = datos
    accionActual = datos.acciones?.[0]?.id ?? "campo"
    renderizarMapa(datos)
    renderizarAcciones(datos)
    resultPanel.hidden = true
    ultimoResultado = null
  } catch (error) {
    mostrarAviso(analyzeMessage, error.message, "error")
    mapPanel.hidden = true
    actionPanel.hidden = true
  } finally {
    analyzeButton.disabled = false
    analyzeButton.textContent = "Analizar pantalla"
  }
}

function renderizarMapa(datos) {
  mapPanel.hidden = false
  mapSummary.replaceChildren(...(datos.explicaciones ?? []).map((linea) => crear("li", { texto: linea })))

  mapGrid.replaceChildren(
    tarjeta("Formulario", datos.formulario.existe
      ? [
        ["Línea", String(datos.formulario.linea ?? "—")],
        ["Objeto del formulario", datos.formulario.objeto ?? "—"],
        ["Se envía con", datos.formulario.manejador ?? "—"],
        ["Campos", (datos.formulario.campos ?? [])
          .map((campo) => `${campo.nombre ?? "(solo lectura)"} · ${campo.etiqueta || "sin etiqueta"} · ${campo.tipo}${campo.requerido ? " · obligatorio" : ""}`)
          .join("\n") || "—"],
      ]
      : [["Estado", "No hay formulario en la plantilla."]]),
    tarjeta("Tabla", datos.tabla.existe
      ? [
        ["Línea", String(datos.tabla.linea ?? "—")],
        ["Variable del v-for", datos.tabla.variable ?? "—"],
        ["Lista", datos.tabla.lista ?? "—"],
        ["Columnas", (datos.tabla.columnas ?? [])
          .map((columna) => `${columna.titulo}${columna.propiedad ? ` → ${columna.propiedad}` : ""}`)
          .join("\n") || "—"],
      ]
      : [["Estado", "No hay tabla en la plantilla."]]),
    tarjeta("Estado del formulario", datos.estado.existe
      ? [
        ["Objeto", datos.estado.objeto],
        ["Se crea con", datos.estado.fabrica ? `${datos.estado.fabrica}()` : "objeto literal"],
        ["Línea", String(datos.estado.linea ?? "—")],
        ["Propiedades", (datos.estado.propiedades ?? []).join(", ")],
      ]
      : [["Estado", "No se ha identificado el objeto reactivo."]]),
    tarjeta("Envío a la API", [
      ["Modo", describirPayload(datos.payload.modo)],
      ["Línea", datos.payload.linea ? String(datos.payload.linea) : "—"],
      ["Nota", datos.payload.motivo || (datos.payload.modo === "manual"
        ? "La pantalla copia los campos uno a uno: un campo nuevo hay que añadirlo en el envío."
        : "El objeto de estado viaja entero: un campo nuevo no necesita cambios aquí.")],
    ]),
    tarjeta("Validación", datos.validacion.tipo === "computed"
      ? [["Tipo", "computed que bloquea el botón"], ["Nombre", datos.validacion.nombre], ["Línea", String(datos.validacion.linea ?? "—")]]
      : datos.validacion.tipo === "inline"
        ? [["Tipo", ":disabled del botón Guardar"], ["Línea", String(datos.validacion.linea ?? "—")]]
        : [["Estado", datos.validacion.motivo || "Sin validación antes de enviar."]]),
    tarjeta("Informe PDF", datos.pdf.existe
      ? [
        ["Función", datos.pdf.funcion ?? "—"],
        ["Columnas", String((datos.pdf.columnas ?? []).length)],
        ["Cabeceras", (datos.pdf.columnas ?? []).join(" · ")],
      ]
      : [["Estado", "La pantalla no genera informe."]]),
    tarjeta("Backend", datos.backend.existe
      ? [
        ["Ruta de la API", datos.backend.api?.ruta ?? "—"],
        ["Módulo de API", datos.backend.api?.archivo ?? "—"],
        ["Router", datos.backend.rutas?.archivo ?? "no encontrado"],
        ["Lista blanca", datos.backend.rutas?.listaBlanca
          ? `${datos.backend.rutas.listaBlanca.nombre} (${datos.backend.rutas.listaBlanca.valores.length} campos)`
          : datos.backend.rutas?.usaBodyDirecto
            ? "No hay: el router acepta el cuerpo entero"
            : "No hay"],
        ["Modelo", datos.backend.modelo?.archivo ?? "no encontrado"],
        ["Campos del modelo", (datos.backend.modelo?.propiedades ?? [])
          .map((propiedad) => `${propiedad.nombre}: ${propiedad.tipo}`)
          .join(", ") || "—"],
      ]
      : [["Estado", datos.backend.motivo || "No se ha podido seguir la cadena del backend."]]),
  )

  const avisos = datos.noReconocido ?? []
  if (!avisos.length) {
    mapUnrecognized.replaceChildren()
    return
  }
  const caja = crear("div", { clase: "notice notice-info" })
  caja.append(crear("p", { texto: "Lo que el analizador no ha podido reconocer:" }))
  const lista = crear("ul")
  for (const aviso of avisos) lista.append(crear("li", { texto: aviso }))
  caja.append(lista)
  mapUnrecognized.replaceChildren(caja)
}

function describirPayload(modo) {
  return {
    manual: "objeto propio construido a mano",
    spread: "copia del objeto de estado (...)",
    "objeto-completo": "el objeto de estado tal cual",
    desconocido: "no identificado",
  }[modo] ?? modo
}

function tarjeta(titulo, filas) {
  const articulo = crear("article", { clase: "mapa-tarjeta" })
  articulo.append(crear("h3", { texto: titulo }))
  const lista = crear("dl")
  for (const [clave, valor] of filas) {
    lista.append(crear("dt", { texto: clave }))
    const dato = crear("dd", { texto: valor || "—" })
    if (!valor) dato.className = "vacio"
    lista.append(dato)
  }
  articulo.append(lista)
  return articulo
}

function renderizarAcciones(datos) {
  actionPanel.hidden = false
  actionTabs.replaceChildren(...(datos.acciones ?? []).map((accion) => {
    const boton = crear("button", { clase: "pestana", texto: accion.nombre })
    boton.type = "button"
    boton.title = accion.descripcion
    if (accion.id === accionActual) boton.classList.add("is-active")
    boton.addEventListener("click", () => {
      accionActual = accion.id
      renderizarAcciones(datos)
    })
    return boton
  }))
  renderizarFormulario(datos)
}

function camposDelFormulario() {
  return (inventario?.formulario?.campos ?? []).filter((campo) => campo.nombre)
}

function campoTexto(etiqueta, nombre, opciones = {}) {
  const contenedor = crear("label", { clase: "field" })
  contenedor.append(crear("span", { texto: etiqueta }))
  contenedor.append(crear("input", {
    nombre,
    tipo: opciones.tipo ?? "text",
    valor: opciones.valor ?? "",
    placeholder: opciones.placeholder ?? "",
  }))
  if (opciones.ayuda) contenedor.append(crear("small", { texto: opciones.ayuda }))
  return contenedor
}

function campoArea(etiqueta, nombre, opciones = {}) {
  const contenedor = crear("label", { clase: "field" })
  contenedor.append(crear("span", { texto: etiqueta }))
  const area = crear("textarea", { nombre })
  area.rows = opciones.filas ?? 3
  area.value = opciones.valor ?? ""
  if (opciones.placeholder) area.placeholder = opciones.placeholder
  contenedor.append(area)
  if (opciones.ayuda) contenedor.append(crear("small", { texto: opciones.ayuda }))
  return contenedor
}

function campoSelect(etiqueta, nombre, opciones, valorInicial = "") {
  const contenedor = crear("label", { clase: "field" })
  contenedor.append(crear("span", { texto: etiqueta }))
  const select = crear("select", { nombre })
  for (const [valor, texto] of opciones) {
    select.append(crear("option", { valor, texto }))
  }
  select.value = valorInicial
  contenedor.append(select)
  return contenedor
}

function campoCasilla(etiqueta, nombre, marcada = false) {
  const contenedor = crear("label", { clase: "check-card" })
  const casilla = crear("input", { nombre, tipo: "checkbox", checked: marcada })
  const texto = crear("span")
  texto.append(crear("strong", { texto: etiqueta }))
  contenedor.append(casilla, texto)
  return contenedor
}

function renderizarFormulario(datos) {
  actionForm.replaceChildren()
  const rejilla = crear("div", { clase: "form-grid" })

  if (accionActual === "campo") {
    rejilla.append(
      campoTexto("Nombre técnico", "nombre", {
        placeholder: "duracion",
        ayuda: "camelCase, como los campos que ya existen (motivo, observacions).",
      }),
      campoTexto("Etiqueta visible", "etiqueta", { placeholder: "Duración" }),
      campoSelect("Tipo de campo", "tipoCampo", TIPOS_CAMPO, "text"),
    )
    const opciones = campoArea("Opciones (solo desplegable u opciones excluyentes)", "opciones", {
      filas: 3,
      placeholder: "pendente|Pendiente\nconfirmada|Confirmada",
      ayuda: "Una por línea, con el formato valor|etiqueta.",
    })
    opciones.id = "campo-opciones"
    rejilla.append(opciones)
  }

  if (accionActual === "validacion") {
    const campos = camposDelFormulario().map((campo) => [campo.nombre, `${campo.etiqueta || campo.nombre} (${campo.nombre})`])
    rejilla.append(
      campoSelect("Campo a validar", "campo", campos),
      campoSelect("Regla", "regla", [
        ["patron", "Expresión regular"],
        ["fecha-no-pasada", "La fecha no puede ser anterior a hoy"],
      ], "patron"),
      campoTexto("Expresión regular", "patron", {
        placeholder: "^[0-9]{3}$",
        ayuda: "Solo se aplica a la regla de expresión regular.",
      }),
      campoTexto("Mensaje del aviso", "mensaje", {
        placeholder: "El valor no tiene el formato esperado.",
      }),
    )
  }

  if (accionActual === "pdf") {
    const campos = camposDelFormulario().map((campo) => [campo.nombre, `${campo.etiqueta || campo.nombre} (${campo.nombre})`])
    rejilla.append(
      campoSelect("Qué hacer", "modo", [
        ["agregar-campo", "Añadir un campo al informe existente"],
        ["crear", "Crear el informe (la pantalla no tiene)"],
      ], datos.pdf?.existe ? "agregar-campo" : "crear"),
      campoSelect("Campo", "campoPdf", campos),
      campoTexto("Cabecera del informe", "etiquetaPdf", { placeholder: "Duración" }),
    )
    rejilla.append(
      campoTexto("Título del informe", "tituloPdf", { placeholder: "Informe de citas" }),
      campoTexto("Nombre del archivo", "nombreArchivo", { placeholder: "informe_citas.pdf" }),
    )
  }

  actionForm.append(rejilla)

  if (accionActual === "campo") {
    const casillas = crear("div", { clase: "form-grid" })
    casillas.append(
      campoCasilla("Obligatorio en el formulario", "requerido"),
      campoCasilla("Añadir columna a la tabla", "enTabla", true),
      campoCasilla("Añadir columna al PDF", "enPdf"),
    )
    actionForm.append(casillas)
  }

  const descripcion = crear("p", { clase: "help-panel", texto: (datos.acciones ?? []).find((accion) => accion.id === accionActual)?.descripcion ?? "" })
  actionForm.prepend(descripcion)

  const selectTipo = actionForm.querySelector('[name="tipoCampo"]')
  const areaOpciones = actionForm.querySelector("#campo-opciones")
  if (selectTipo && areaOpciones) {
    const sincronizar = () => {
      areaOpciones.hidden = !["select", "radio"].includes(selectTipo.value)
    }
    selectTipo.addEventListener("change", sincronizar)
    sincronizar()
  }
}

function leerAccion() {
  const valor = (nombre) => actionForm.querySelector(`[name="${nombre}"]`)?.value?.trim() ?? ""
  const marcado = (nombre) => Boolean(actionForm.querySelector(`[name="${nombre}"]`)?.checked)

  if (accionActual === "campo") {
    return {
      tipo: "campo",
      nombre: valor("nombre"),
      etiqueta: valor("etiqueta"),
      tipoCampo: valor("tipoCampo"),
      requerido: marcado("requerido"),
      enTabla: marcado("enTabla"),
      enPdf: marcado("enPdf"),
      opciones: valor("opciones"),
    }
  }
  if (accionActual === "validacion") {
    return {
      tipo: "validacion",
      campo: valor("campo"),
      regla: valor("regla"),
      patron: valor("patron"),
      mensaje: valor("mensaje"),
    }
  }
  return {
    tipo: "pdf",
    modo: valor("modo"),
    campo: valor("campoPdf"),
    etiqueta: valor("etiquetaPdf"),
    titulo: valor("tituloPdf"),
    nombreArchivo: valor("nombreArchivo"),
  }
}

async function generar() {
  if (!inventario) return
  patchButton.disabled = true
  patchButton.textContent = "Generando…"
  mostrarAviso(patchMessage, "")
  try {
    const resultado = await postJson("/api/patch", {
      archivo: inventario.archivo,
      accion: leerAccion(),
    })
    ultimoResultado = resultado
    renderizarResultado(resultado)
  } catch (error) {
    mostrarAviso(patchMessage, error.message, "error")
    if (error.details?.length) {
      const lista = crear("ul")
      for (const detalle of error.details) lista.append(crear("li", { texto: detalle }))
      patchMessage.append(lista)
    }
    resultPanel.hidden = true
  } finally {
    patchButton.disabled = false
    patchButton.textContent = "Generar los parches"
  }
}

function renderizarResultado(resultado) {
  resultPanel.hidden = false
  patchButton.disabled = false
  mostrarAviso(patchMessage, resultado.verificacion?.ok
    ? "Parches listos y verificados en memoria."
    : "Parches generados, pero alguna comprobación no ha pasado: revisa la lista antes de pegar.",
  resultado.verificacion?.ok ? "success" : "error")

  verificationList.replaceChildren(...(resultado.verificacion?.comprobaciones ?? []).map((comprobacion) => {
    const item = crear("li", { clase: comprobacion.ok ? "ok" : "fallo" })
    item.append(crear("span", { texto: comprobacion.ok ? "✔" : "✖" }))
    item.append(crear("span", { texto: `${comprobacion.que}${comprobacion.detalle ? ` — ${comprobacion.detalle}` : ""}` }))
    return item
  }))

  patchesBox.replaceChildren(...(resultado.parches ?? []).map((parche, indice) => tarjetaParche(parche, indice)))

  if (resultado.notas?.length) {
    const caja = crear("div", { clase: "notice notice-info" })
    caja.append(crear("p", { texto: "Ten en cuenta:" }))
    const lista = crear("ul", { clase: "notas-parche" })
    for (const nota of resultado.notas) lista.append(crear("li", { texto: nota }))
    caja.append(lista)
    notesBox.replaceChildren(caja)
  } else {
    notesBox.replaceChildren()
  }

  resultPanel.scrollIntoView({ behavior: "smooth", block: "start" })
}

function tarjetaParche(parche, indice) {
  const articulo = crear("article", { clase: "parche" })
  const cabecera = crear("div", { clase: "fila-codigo" })
  cabecera.append(crear("code", { clase: "ruta", texto: `${parche.archivo}:${parche.linea}` }))
  cabecera.append(crear("span", { clase: "ruta", texto: `parche ${indice + 1}` }))
  articulo.append(cabecera)
  articulo.append(crear("h3", { texto: parche.titulo }))
  articulo.append(crear("p", { clase: "explicacion", texto: parche.explicacion }))

  articulo.append(crear("p", { clase: "etiqueta-bloque", texto: `Pega esto ${parche.contexto?.antes?.length ? `después de la línea ${parche.linea - 1}` : "aquí"}` }))
  articulo.append(pre(parche.contexto?.antes ?? [], "bloque-antes"))
  articulo.append(crear("p", { clase: "etiqueta-bloque", texto: "Código a pegar" }))
  const bloque = crear("div", { clase: "bloque-codigo" })
  bloque.append(pre(parche.codigo.split(/\r?\n/), "bloque-codigo-pre"))
  articulo.append(bloque)
  articulo.append(crear("p", { clase: "etiqueta-bloque", texto: "Lo que sigue, sin tocar" }))
  articulo.append(pre(parche.contexto?.despues ?? [], "bloque-despues"))

  const acciones = crear("div", { clase: "fila-codigo" })
  const copiar = crear("button", { clase: "button button-secondary", texto: "Copiar este bloque" })
  copiar.type = "button"
  copiar.addEventListener("click", async () => {
    await copiarTexto(parche.codigo)
    copiar.textContent = "Copiado"
    window.setTimeout(() => { copiar.textContent = "Copiar este bloque" }, 1500)
  })
  acciones.append(copiar)
  articulo.append(acciones)

  return articulo
}

function pre(lineas, clase) {
  const bloque = document.createElement("pre")
  if (clase) bloque.className = clase
  bloque.textContent = lineas.join("\n")
  return bloque
}

async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto)
  } catch {
    const area = document.createElement("textarea")
    area.value = texto
    document.body.append(area)
    area.select()
    document.execCommand("copy")
    area.remove()
  }
}

function instruccionesCompletas(resultado) {
  const lineas = []
  lineas.push(`Cambios en ${resultado.inventario?.archivo ?? ""}`)
  lineas.push("")
  resultado.parches.forEach((parche, indice) => {
    lineas.push(`${indice + 1}. ${parche.titulo}`)
    lineas.push(`   Archivo: ${parche.archivo} · línea aproximada ${parche.linea}`)
    lineas.push(`   ${parche.explicacion}`)
    if (parche.contexto?.antes?.length) {
      lineas.push("   --- contexto anterior ---")
      for (const texto of parche.contexto.antes) lineas.push(`   ${texto}`)
    }
    lineas.push("   +++ pegar esto +++")
    for (const texto of parche.codigo.split(/\r?\n/)) lineas.push(`   ${texto}`)
    if (parche.contexto?.despues?.length) {
      lineas.push("   --- contexto siguiente ---")
      for (const texto of parche.contexto.despues) lineas.push(`   ${texto}`)
    }
    lineas.push("")
  })
  if (resultado.notas?.length) {
    lineas.push("Notas:")
    for (const nota of resultado.notas) lineas.push(`- ${nota}`)
  }
  return lineas.join("\n")
}

selectPantallas.addEventListener("change", actualizarPista)
analyzeButton.addEventListener("click", analizar)
patchButton.addEventListener("click", generar)
copyAllButton.addEventListener("click", async () => {
  if (!ultimoResultado) return
  await copiarTexto(instruccionesCompletas(ultimoResultado))
  copyAllButton.textContent = "Instrucciones copiadas"
  window.setTimeout(() => { copyAllButton.textContent = "Copiar todas las instrucciones" }, 1600)
})

await cargarPantallas()
actualizarPista()
