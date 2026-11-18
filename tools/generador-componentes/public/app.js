import { getProjectStatus, postCatalogAnalysis, postJson } from "./modules/api.js"
import { TEXT_PATTERN_PRESETS } from "./modules/restricciones.js"
import { createUi } from "./modules/ui.js"

const form = document.querySelector("#generator-form")
const panels = [...document.querySelectorAll("[data-step]")]
const stepLinks = [...document.querySelectorAll("[data-step-link]")]
const fieldsList = document.querySelector("#fields-list")
const fieldTemplate = document.querySelector("#field-template")
const relationsList = document.querySelector("#relations-list")
const relationTemplate = document.querySelector("#relation-template")
const piniaEnabled = document.querySelector("#pinia-enabled")
const piniaFields = document.querySelector("#pinia-fields")
const piniaHint = document.querySelector("#pinia-hint")
const validationMessage = document.querySelector("#validation-message")
const generateButton = document.querySelector("#generate-button")
let currentStep = 0
let currentPreview = null
const ui = createUi(formConfig)
const {
  clearNotice,
  generationErrors,
  previewMessage,
  renderGeneratedFiles,
  renderPreview,
  showNotice,
} = ui

// Recursos del proyecto tal como los devuelve /api/status: los selects de
// origen y de relaciones se llenan con lo que existe de verdad en src/api/.
let projectResources = []

// Los controles del panel de catálogo se envían anidados en field.catalog, que
// es lo que valida y consume el generador. El archivo elegido se añade aparte
// porque su <select> se rellena con los JSON reales de backend/data.
const CATALOG_PROPERTIES = {
  catalogSource: "source",
  catalogName: "name",
  catalogData: "data",
  catalogRootKey: "rootKey",
  catalogLabelField: "labelField",
  catalogValueField: "valueField",
  catalogIdField: "idField",
  catalogParentField: "parentField",
  catalogApiFunction: "apiFunction",
}
let projectCatalogs = []

function showStep(index) {
  currentStep = index
  for (const [panelIndex, panel] of panels.entries()) {
    panel.hidden = panelIndex !== index
  }
  for (const [linkIndex, link] of stepLinks.entries()) {
    link.classList.toggle("is-active", linkIndex === index)
    link.classList.toggle("is-complete", linkIndex < index)
    if (linkIndex === index) link.setAttribute("aria-current", "step")
    else link.removeAttribute("aria-current")
  }
  window.scrollTo({ top: 0, behavior: "smooth" })
}

function addField(field = {}) {
  const fragment = fieldTemplate.content.cloneNode(true)
  const card = fragment.querySelector(".field-card")
  const controls = [...card.querySelectorAll("[data-property]")]
  for (const control of controls) {
    const property = control.dataset.property
    if (control.type === "checkbox") control.checked = field[property] ?? control.checked
    else if (field[property] != null) {
      control.value = Array.isArray(field[property])
        ? field[property].map((option) => `${option.value}|${option.label}`).join("\n")
        : field[property]
    }
  }
  const typeControl = card.querySelector('[data-property="type"]')
  const optionsField = card.querySelector(".options-field")
  const title = card.querySelector("legend")
  const patternControl = card.querySelector('[data-property="pattern"]')
  const patternMessageControl = card.querySelector('[data-property="patternMessage"]')
  const patternPresetControl = card.querySelector("[data-pattern-preset]")
  const patternAdvanced = card.querySelector('[data-restriction="pattern-advanced"]')
  const catalogPanel = card.querySelector("[data-catalog-panel]")
  const catalogMeta = card.querySelector("[data-catalog-meta]")
  const catalogSourceControl = card.querySelector('[data-property="catalogSource"]')
  const catalogFileControl = card.querySelector("[data-catalog-file]")
  const catalogNameControl = card.querySelector('[data-property="catalogName"]')
  const catalogDataControl = card.querySelector('[data-property="catalogData"]')
  const catalogRootKeyControl = card.querySelector('[data-property="catalogRootKey"]')
  const matchedPreset = TEXT_PATTERN_PRESETS.find((preset) => preset.pattern === patternControl.value)
  patternPresetControl.value = matchedPreset?.value ?? (patternControl.value ? "custom" : "none")
  let previousRangeKind = ["text", "textarea", "email", "phone"].includes(typeControl.value)
    ? "length"
    : typeControl.value === "number" || typeControl.value === "date" || typeControl.value === "time"
      ? typeControl.value
      : ""

  function updateFieldType() {
    const selectedType = typeControl.value
    const rangeKind = (type) => ["text", "textarea", "email", "phone"].includes(type)
      ? "length"
      : type === "number" ? "number" : type === "date" ? "date" : ""
    const selectedRangeKind = rangeKind(selectedType) || (selectedType === "time" ? "time" : "")
    const patternSupported = ["text", "textarea", "email", "phone"].includes(selectedType)
    const optionsSupported = ["radio", "select"].includes(selectedType)
    optionsField.hidden = !["radio", "select"].includes(selectedType)
    const minControl = card.querySelector('[data-property="min"]')
    const maxControl = card.querySelector('[data-property="max"]')
    const optionsControl = card.querySelector('[data-property="options"]')
    const stepControl = card.querySelector('[data-property="step"]')
    const rangeSupported = Boolean(selectedRangeKind)
    card.querySelector('[data-restriction="range"]').hidden = !rangeSupported
    card.querySelector('[data-restriction="step"]').hidden = selectedType !== "number"
    card.querySelector('[data-restriction="pattern-preset"]').hidden = !patternSupported
    patternAdvanced.hidden = !patternSupported
    card.querySelector('[data-restriction="pattern-message"]').hidden = !patternSupported || !patternControl.value
    minControl.disabled = !rangeSupported
    maxControl.disabled = !rangeSupported
    stepControl.disabled = selectedType !== "number"
    patternControl.disabled = !patternSupported
    patternMessageControl.disabled = !patternSupported || !patternControl.value
    if (previousRangeKind !== selectedRangeKind) {
      minControl.value = ""
      maxControl.value = ""
    }
    if (selectedType !== "number") stepControl.value = ""
    if (!patternSupported) patternControl.value = ""
    if (!patternSupported || !patternControl.value) patternMessageControl.value = ""
    if (!patternSupported) patternPresetControl.value = "none"
    if (!optionsSupported) optionsControl.value = ""
    const rangeLabels = {
      length: ["Longitud mínima (opcional)", "Longitud máxima (opcional)", "Número entero de caracteres"],
      number: ["Valor mínimo (opcional)", "Valor máximo (opcional)", "Ej.: 0"],
      date: ["Fecha desde (opcional)", "Fecha hasta (opcional)", "Selecciona la fecha mínima o máxima"],
      time: ["Hora desde (opcional)", "Hora hasta (opcional)", "Selecciona la hora mínima o máxima"],
    }
    if (rangeSupported) {
      const [minLabel, maxLabel, placeholder] = rangeLabels[selectedRangeKind]
      card.querySelector('[data-label-for="min"]').textContent = minLabel
      card.querySelector('[data-label-for="max"]').textContent = maxLabel
      minControl.type = ["date", "time"].includes(selectedRangeKind) ? selectedRangeKind : "number"
      maxControl.type = ["date", "time"].includes(selectedRangeKind) ? selectedRangeKind : "number"
      minControl.step = selectedRangeKind === "length" || selectedRangeKind === "number" ? "any" : ""
      maxControl.step = selectedRangeKind === "length" || selectedRangeKind === "number" ? "any" : ""
      minControl.placeholder = placeholder
      maxControl.placeholder = placeholder
      card.querySelector('[data-hint-for="min"]').textContent = selectedRangeKind === "date"
        ? "La fecha introducida y las posteriores serán válidas."
        : selectedRangeKind === "time"
          ? "La hora introducida y las posteriores serán válidas."
          : selectedRangeKind === "length"
            ? "Debe ser un entero igual o mayor que cero."
            : "El valor introducido y los superiores serán válidos."
      card.querySelector('[data-hint-for="max"]').textContent = selectedRangeKind === "date"
        ? "La fecha introducida y las anteriores serán válidas."
        : selectedRangeKind === "time"
          ? "La hora introducida y las anteriores serán válidas."
          : selectedRangeKind === "length"
            ? "Debe ser un entero igual o mayor que cero."
            : "El valor introducido y los inferiores serán válidos."
    } else {
      minControl.value = ""
      maxControl.value = ""
      minControl.type = "number"
      maxControl.type = "number"
    }
    card.querySelector('[data-hint-for="defaultValue"]').textContent = selectedType === "boolean"
      ? 'Escribe "true" o "false"; una casilla obligatoria debe ser true.'
      : ["radio", "select"].includes(selectedType)
        ? "Debe coincidir con una de las opciones fijas."
        : "Se comprobará también frente a las restricciones del campo."
    const typeHints = {
      text: "Configura longitud y, si quieres, elige una regla de texto sencilla.",
      textarea: "Configura longitud y, si quieres, elige una regla de texto sencilla.",
      email: "El correo ya comprueba automáticamente su formato; también puedes limitar su longitud.",
      phone: "Configura longitud y una regla sencilla o avanzada si hace falta.",
      number: "Usa mínimo, máximo e incremento; para números no hace falta una expresión regular.",
      date: "Usa las fechas Desde/Hasta; el selector ya garantiza una fecha válida.",
      time: "Usa las horas Desde/Hasta; no hace falta escribir una expresión regular.",
      boolean: "Se guarda como una casilla true/false.",
      radio: "Añade las opciones permitidas más abajo.",
      select: "Añade las opciones permitidas más abajo.",
    }
    card.querySelector('[data-hint-for="type"]').textContent = typeHints[selectedType]
    previousRangeKind = selectedRangeKind
    title.textContent = card.querySelector('[data-property="label"]').value.trim() || "Campo nuevo"
    updateCatalogPanel()
  }

  // El panel de catálogo solo se ve con el tipo catálogo; al cambiar el origen
  // se muestran los campos del archivo del proyecto o los de datos nuevos.
  function updateCatalogPanel() {
    const isCatalog = typeControl.value === "catalog"
    catalogPanel.hidden = !isCatalog
    if (!isCatalog) return
    for (const element of card.querySelectorAll("[data-catalog-only]")) {
      element.hidden = element.dataset.catalogOnly !== catalogSourceControl.value
    }
    catalogMeta.hidden = card.dataset.catalogAnalyzed !== "true"
  }

  typeControl.addEventListener("change", () => {
    updateFieldType()
    // Al elegir catálogo se analiza el archivo ya preseleccionado, para no
    // obligar a pulsar «Analizar estructura» en el caso habitual.
    if (typeControl.value === "catalog" && card.dataset.catalogAnalyzed !== "true") {
      analyzeCatalogCard(card)
    }
  })
  patternPresetControl.addEventListener("change", () => {
    const preset = TEXT_PATTERN_PRESETS.find((item) => item.value === patternPresetControl.value)
    if (preset && preset.value !== "custom") {
      patternControl.value = preset.pattern
      patternMessageControl.value = preset.message
    } else {
      patternAdvanced.open = true
      patternControl.focus()
      if (!patternControl.value) patternMessageControl.value = ""
    }
    updateFieldType()
  })
  patternControl.addEventListener("input", () => {
    const matched = TEXT_PATTERN_PRESETS.find((preset) => preset.pattern === patternControl.value)
    patternPresetControl.value = matched?.value ?? (patternControl.value ? "custom" : "none")
    updateFieldType()
  })
  // Cada cambio relevante vuelve a analizar la estructura en el servidor local:
  // así los selectores de campos se rellenan con lo que hay de verdad en el JSON.
  catalogSourceControl.addEventListener("change", () => {
    updateCatalogPanel()
    analyzeCatalogCard(card)
  })
  catalogFileControl.addEventListener("change", () => {
    syncCatalogFileOptions(card, catalogFileControl.value)
    analyzeCatalogCard(card)
  })
  card.querySelector("[data-catalog-analyze]").addEventListener("click", () => analyzeCatalogCard(card))
  catalogRootKeyControl.addEventListener("change", () => analyzeCatalogCard(card))
  let catalogAnalysisTimer = 0
  const scheduleCatalogAnalysis = () => {
    window.clearTimeout(catalogAnalysisTimer)
    catalogAnalysisTimer = window.setTimeout(() => analyzeCatalogCard(card), 600)
  }
  catalogNameControl.addEventListener("input", scheduleCatalogAnalysis)
  catalogDataControl.addEventListener("input", scheduleCatalogAnalysis)

  if (field.catalog) {
    for (const [property, key] of Object.entries(CATALOG_PROPERTIES)) {
      const control = card.querySelector(`[data-property="${property}"]`)
      if (control && field.catalog[key] != null) control.value = String(field.catalog[key])
    }
    catalogSourceControl.value = field.catalog.source === "inline" ? "inline" : "project"
    syncCatalogFileOptions(card, field.catalog.file ?? "")
  } else {
    syncCatalogFileOptions(card)
  }

  card.querySelector('[data-property="label"]').addEventListener("input", updateFieldType)
  card.querySelector(".remove-field").addEventListener("click", () => card.remove())
  fieldsList.append(card)
  updateFieldType()
  return card
}

function fillSelect(select, options, value, fallback = "") {
  const entries = options.length ? options : [{ value: "", label: "Sin opciones" }]
  select.replaceChildren(...entries.map(({ value: optionValue, label }) => {
    const option = document.createElement("option")
    option.value = optionValue
    option.textContent = label
    return option
  }))
  const available = [...select.options]
  const desired = value != null && available.some((option) => option.value === value) ? value : fallback
  select.value = available.some((option) => option.value === desired) ? desired : available[0]?.value ?? ""
}

// Los recursos reutilizables salen de /api/status, no de una lista escrita a
// mano: si el proyecto añade o pierde un recurso, el formulario lo refleja.
function fillExistingResourceOptions() {
  const select = form.elements.namedItem("existingResource")
  if (!select) return
  const options = projectResources.filter((resource) => resource.usable && !resource.relationOnly)
  if (!options.length) {
    select.replaceChildren(new Option("No hay recursos completos en el proyecto; revisa el aviso de la cabecera", ""))
    return
  }
  const previous = select.value
  const placeholder = select.options[0]?.value === "" ? select.options[0].textContent : "Selecciona un recurso…"
  select.replaceChildren(new Option(placeholder, ""), ...options.map((resource) => new Option(resource.name, resource.key)))
  if (previous && options.some((resource) => resource.key === previous)) select.value = previous
}

// Relaciones: solo entidades con documentos (los catálogos de solo lectura no se
// referencian) y el modo Pinia solo si el store existe de verdad.
function fillRelationResourceOptions(card) {
  if (!card) return
  const resourceControl = card.querySelector('[data-property="resource"]')
  const selectionControl = card.querySelector('[data-property="selection"]')
  if (!resourceControl) return
  const options = projectResources.filter((resource) => resource.usable && !resource.catalogOnly)
  if (!options.length) {
    resourceControl.replaceChildren(new Option("No hay entidades completas en el proyecto; revisa el aviso de la cabecera", ""))
  } else {
    const previous = resourceControl.value
    const placeholder = resourceControl.options[0]?.value === ""
      ? resourceControl.options[0].textContent
      : "Selecciona una entidad…"
    resourceControl.replaceChildren(new Option(placeholder, ""), ...options.map((resource) => new Option(resource.name, resource.key)))
    resourceControl.value = options.some((resource) => resource.key === previous) ? previous : ""
  }
  const info = projectResources.find((resource) => resource.key === resourceControl.value)
  const piniaOption = selectionControl?.querySelector('option[value="pinia"]')
  if (piniaOption) piniaOption.disabled = info ? !info.hasStore : false
  if (info && !info.hasStore && selectionControl.value === "pinia") selectionControl.value = "api"
}

function markResourceSelectsUnavailable() {
  const existing = form.elements.namedItem("existingResource")
  if (existing) existing.replaceChildren(new Option("No se pudieron cargar los recursos del proyecto", ""))
  for (const card of relationsList.querySelectorAll(".field-card")) {
    const select = card.querySelector('[data-property="resource"]')
    if (select) select.replaceChildren(new Option("No se pudieron cargar las entidades del proyecto", ""))
  }
}

async function loadProjectResources() {
  try {
    const status = await getProjectStatus()
    projectResources = Array.isArray(status.resources) ? status.resources : []
  } catch {
    projectResources = []
    markResourceSelectsUnavailable()
    return
  }
  fillExistingResourceOptions()
  for (const card of relationsList.querySelectorAll(".field-card")) fillRelationResourceOptions(card)
}

// Rellena el selector de archivos con los JSON que el servidor encontró en
// backend/data y conserva el valor guardado aunque el archivo aún no exista.
function syncCatalogFileOptions(card, desired = card.querySelector("[data-catalog-file]")?.value ?? "") {
  const select = card.querySelector("[data-catalog-file]")
  if (!select) return
  const options = projectCatalogs.map((catalog) => ({ value: catalog.file, label: `${catalog.file} (${catalog.name})` }))
  if (desired && !options.some((option) => option.value === desired)) {
    options.unshift({ value: desired, label: desired })
  }
  if (!options.length) options.push({ value: "", label: "No hay archivos JSON en backend/data" })
  fillSelect(select, options, desired, options[0].value)
  card.dataset.catalogFile = select.value
}

function readCatalogMeta(card) {
  return {
    labelField: card.querySelector('[data-property="catalogLabelField"]').value,
    valueField: card.querySelector('[data-property="catalogValueField"]').value,
    idField: card.querySelector('[data-property="catalogIdField"]').value,
    parentField: card.querySelector('[data-property="catalogParentField"]').value,
    apiFunction: card.querySelector('[data-property="catalogApiFunction"]').value,
  }
}

function refreshCatalogParents(card, value = "") {
  const select = card.querySelector('[data-property="catalogParentField"]')
  const options = [{ value: "", label: "Sin filtro: mostrar todo el catálogo" }]
  for (const other of fieldsList.querySelectorAll(".field-card")) {
    if (other === card) continue
    if (other.querySelector('[data-property="type"]')?.value !== "catalog") continue
    const name = other.querySelector('[data-property="name"]')?.value.trim()
    if (!name) continue
    const label = other.querySelector('[data-property="label"]')?.value.trim() || name
    options.push({ value: name, label: `${label} (${name})` })
  }
  fillSelect(select, options, value)
}

function applyCatalogAnalysis(card, analysis, saved = {}) {
  const summary = card.querySelector("[data-catalog-summary]")
  const rootSelect = card.querySelector('[data-property="catalogRootKey"]')
  const labelSelect = card.querySelector('[data-property="catalogLabelField"]')
  const valueSelect = card.querySelector('[data-property="catalogValueField"]')
  const idSelect = card.querySelector('[data-property="catalogIdField"]')
  const apiSelect = card.querySelector('[data-property="catalogApiFunction"]')

  fillSelect(
    rootSelect,
    analysis.arrays.map((array) => ({
      value: array.key,
      label: array.key
        ? `${array.key} (${array.count} elementos)`
        : `La raíz es una lista (${array.count} elementos)`,
    })),
    saved.rootKey ?? analysis.rootKey,
    analysis.rootKey,
  )

  const fieldOptions = analysis.primitive
    ? [{ value: "", label: "Valores simples de la lista" }]
    : analysis.fields.map((name) => ({ value: name, label: name }))
  fillSelect(labelSelect, fieldOptions, saved.labelField, analysis.labelField)
  fillSelect(valueSelect, fieldOptions, saved.valueField, analysis.valueField)
  fillSelect(
    idSelect,
    [{ value: "", label: "Sin identificador" }, ...fieldOptions.filter((option) => option.value)],
    saved.idField,
    analysis.idField,
  )
  refreshCatalogParents(card, saved.parentField)

  const inline = card.querySelector('[data-property="catalogSource"]').value === "inline"
  const reusable = (analysis.api?.exists ? analysis.api.functions : []).filter((entry) => entry.params === 0)
  const apiOptions = inline || !reusable.length
    ? [{ value: "", label: inline ? `Generar src/api/${analysis.name}.js` : "Generar un módulo nuevo" }]
    : reusable.map((entry) => ({ value: entry.name, label: `${entry.name}() de ${analysis.api.file}` }))
  fillSelect(apiSelect, apiOptions, saved.apiFunction, apiOptions[0].value)
  apiSelect.disabled = inline || !analysis.api?.exists

  summary.hidden = false
  summary.className = "notice notice-info"
  summary.replaceChildren()
  const lead = document.createElement("p")
  lead.textContent = `Lista «${analysis.rootKey || "raíz"}»: ${analysis.count} elementos.` +
    (analysis.primitive ? " Contiene valores simples." : ` Campos: ${analysis.fields.join(", ")}.`)
  summary.append(lead)
  for (const note of analysis.notes ?? []) {
    const paragraph = document.createElement("p")
    paragraph.textContent = note
    summary.append(paragraph)
  }
  if (analysis.route) {
    const paragraph = document.createElement("p")
    paragraph.textContent = `Ruta ${analysis.route.path}: ${analysis.route.exists
      ? "ya registrada en backend/server.js"
      : "hay que registrarla; la guía incluye el fragmento"}.`
    summary.append(paragraph)
  }
  if (analysis.api?.exists) {
    const paragraph = document.createElement("p")
    paragraph.textContent = `Módulo ${analysis.api.file}: ${analysis.api.functions.length
      ? analysis.api.functions.map((entry) => `${entry.name}(${entry.params})`).join(", ")
      : "sin funciones exportadas"}.`
    summary.append(paragraph)
  }
  card.dataset.catalogAnalyzed = "true"
  card.querySelector("[data-catalog-meta]").hidden = false
}

async function analyzeCatalogCard(card, { saved } = {}) {
  if (card.querySelector('[data-property="type"]').value !== "catalog") return null
  const source = card.querySelector('[data-property="catalogSource"]').value
  const file = card.querySelector("[data-catalog-file]").value
  const name = card.querySelector('[data-property="catalogName"]').value.trim()
  const data = card.querySelector('[data-property="catalogData"]').value
  const rootKeySelect = card.querySelector('[data-property="catalogRootKey"]')
  const rootKey = rootKeySelect.options.length ? rootKeySelect.value : undefined
  const summary = card.querySelector("[data-catalog-summary]")
  if (source === "project" && !file) return null
  if (source === "inline" && !data.trim()) return null

  const previous = { ...(saved ?? readCatalogMeta(card)) }
  if (rootKey !== undefined) previous.rootKey = rootKey
  summary.hidden = false
  summary.className = "notice notice-info"
  summary.textContent = "Analizando la estructura del catálogo…"
  try {
    const analysis = await postCatalogAnalysis(source === "project" ? { file, rootKey } : { name, data, rootKey })
    applyCatalogAnalysis(card, analysis, previous)
    return analysis
  } catch (error) {
    summary.className = "notice notice-error"
    summary.textContent = error.message
    card.dataset.catalogAnalyzed = "false"
    card.querySelector("[data-catalog-meta]").hidden = true
    return null
  }
}

async function loadProjectCatalogs() {
  try {
    const status = await getProjectStatus()
    projectCatalogs = status.catalogs ?? []
  } catch {
    projectCatalogs = []
  }
  for (const card of fieldsList.querySelectorAll(".field-card")) {
    syncCatalogFileOptions(card)
  }
}

function addRelation(relation = {}) {
  const fragment = relationTemplate.content.cloneNode(true)
  const card = fragment.querySelector(".field-card")
  for (const control of card.querySelectorAll("[data-property]")) {
    const property = control.dataset.property
    if (property === "selection-hint") continue
    if (control.type === "checkbox") control.checked = Boolean(relation[property])
    else if (relation[property] != null) control.value = relation[property]
  }
  const selectionControl = card.querySelector('[data-property="selection"]')
  const resourceControl = card.querySelector('[data-property="resource"]')
  const hint = card.querySelector('[data-property="selection-hint"]')

  function updateSelectionHint() {
    const info = projectResources.find((resource) => resource.key === resourceControl.value)
    if (info && !info.hasStore && selectionControl.value === "pinia") {
      hint.textContent = `${info.name} no tiene store de Pinia en este proyecto: elige el selector de la API, o crea src/store/${info.key}Store.js.`
    } else if (info?.hasStore && selectionControl.value === "pinia") {
      hint.textContent = `Sin desplegable: el formulario leerá la selección compartida de src/store/${info.storeFile} (patrón de Citas.vue).`
    } else if (selectionControl.value === "pinia") {
      hint.textContent = "El formulario leerá la selección compartida del store en lugar de cargar un desplegable."
    } else {
      hint.textContent = info?.hasStore
        ? `El selector carga la lista real del recurso; el modo Pinia usaría ${info.storeFile}.`
        : "El selector carga la lista real del recurso; el modo Pinia usa el store que ya existe en el proyecto."
    }
  }

  selectionControl.addEventListener("change", updateSelectionHint)
  resourceControl.addEventListener("change", () => {
    fillRelationResourceOptions(card)
    updateSelectionHint()
  })
  card.querySelector(".remove-field").addEventListener("click", () => card.remove())
  relationsList.append(card)
  fillRelationResourceOptions(card)
  updateSelectionHint()
}

function syncPiniaSection() {
  piniaFields.hidden = !piniaEnabled.checked
  piniaHint.hidden = !piniaEnabled.checked
}

function renderPiniaFields(savedFields = []) {
  const names = [...fieldsList.querySelectorAll(".field-card")]
    .map((card) => card.querySelector('[data-property="name"]')?.value.trim())
    .filter(Boolean)
  piniaFields.replaceChildren()
  for (const name of names) {
    const label = document.createElement("label")
    const checkbox = document.createElement("input")
    checkbox.type = "checkbox"
    checkbox.dataset.fieldName = name
    checkbox.checked = savedFields.includes(name)
    label.append(checkbox, document.createTextNode(` ${name}`))
    piniaFields.append(label)
  }
}

function refreshPiniaFields() {
  const current = [...piniaFields.querySelectorAll("input:checked")].map((input) => input.dataset.fieldName)
  renderPiniaFields(current)
}

function formConfig() {
  const value = (name) => form.elements.namedItem(name).value.trim()
  const source = form.elements.namedItem("source").value
  const fields = [...fieldsList.querySelectorAll(".field-card")].map((card) => {
    const field = {}
    for (const control of card.querySelectorAll("[data-property]")) {
      const property = control.dataset.property
      if (CATALOG_PROPERTIES[property]) {
        field.catalog = field.catalog || {}
        field.catalog[CATALOG_PROPERTIES[property]] = control.value.trim()
      } else {
        field[property] = control.type === "checkbox" ? control.checked : control.value.trim()
      }
    }
    if (field.catalog) {
      field.catalog.file = card.querySelector("[data-catalog-file]").value || field.catalog.file
    }
    if (field.type !== "catalog") delete field.catalog
    return field
  })
  return {
    source,
    existingResource: form.elements.namedItem("existingResource").value,
    screen: {
      type: value("screenType"),
      title: value("screenTitle"),
      component: value("screenComponent"),
      route: value("screenRoute"),
      menuLabel: value("menuLabel"),
    },
    // Con un recurso existente no se envían nombres ni ruta de API: los aporta
    // el propio recurso en el servidor. Enviar los valores por defecto del
    // formulario hacía creer que había un conflicto de rutas que no existía.
    entity: source === "existing"
      ? { singular: "", plural: "", apiPath: "", idField: "_id" }
      : {
          singular: value("entitySingular"),
          plural: value("entityPlural"),
          apiPath: `/api/${value("entityPlural")}`,
          idField: "_id",
        },
    fields,
    operations: [...form.querySelectorAll('[name="operation"]:checked')].map((input) => input.value),
    relations: [...relationsList.querySelectorAll(".field-card")].map((card) => {
      const relation = {}
      for (const control of card.querySelectorAll("[data-property]")) {
        const property = control.dataset.property
        if (property === "selection-hint") continue
        relation[property] = control.type === "checkbox" ? control.checked : control.value.trim()
      }
      return relation
    }),
    pinia: {
      enabled: piniaEnabled.checked,
      fields: [...piniaFields.querySelectorAll("input:checked")].map((input) => input.dataset.fieldName),
    },
  }
}

async function refreshPreview() {
  currentPreview = null
  clearNotice(validationMessage)
  clearNotice(previewMessage)
  clearNotice(generationErrors)
  ui.clearGeneratedResult()
  generateButton.disabled = true
  try {
    currentPreview = await postJson("/api/preview", formConfig())
    renderPreview(currentPreview)
    return currentPreview.collisions.length === 0
  } catch (error) {
    showNotice(validationMessage, error.message, "error", error.details)
    return false
  }
}

function validateVisibleStep() {
  const visiblePanel = panels[currentStep]
  for (const control of visiblePanel.querySelectorAll("input, select, textarea")) {
    if (!control.disabled && !control.checkValidity()) {
      control.reportValidity()
      return false
    }
  }
  return true
}

async function advance() {
  clearNotice(validationMessage)
  if (!validateVisibleStep()) return
  refreshPiniaFields()
  if (currentStep === 3) {
    const isValid = await refreshPreview()
    if (currentPreview) showStep(4)
    if (!isValid) return
    return
  }
  showStep(Math.min(currentStep + 1, panels.length - 1))
}

function setFormValue(name, value) {
  const control = form.elements.namedItem(name)
  if (control) control.value = value ?? ""
}

function validateScreenRoute() {
  const control = form.elements.namedItem("screenRoute")
  const route = control.value.trim()
  const isValid = /^\/[a-zA-Z0-9/_-]*$/.test(route) && !route.includes("//")
  control.setCustomValidity(isValid ? "" : "Usa una ruta que empiece por / y contenga solo letras, números, /, _ o -.")
}

function syncSourceSelection() {
  const sourceValue = form.elements.namedItem("source").value
  const existingResourceField = document.querySelector("#existing-resource-field")
  const resourceControl = form.elements.namedItem("existingResource")
  const shouldShow = sourceValue === "existing"
  existingResourceField.hidden = !shouldShow
  resourceControl.disabled = !shouldShow
  if (!shouldShow) resourceControl.value = ""
}

async function loadConfiguration(config) {
  if (!config || config.version !== 1 || !config.screen || !config.entity) {
    throw new Error("El archivo no tiene el formato de configuración v1 del generador.")
  }
  setFormValue("screenType", config.screen.type)
  setFormValue("screenTitle", config.screen.title)
  setFormValue("screenComponent", config.screen.component)
  setFormValue("screenRoute", config.screen.route)
  validateScreenRoute()
  setFormValue("menuLabel", config.screen.menuLabel)
  setFormValue("source", config.source || "new")
  setFormValue("existingResource", config.existingResource || "")
  setFormValue("entitySingular", config.entity.singular)
  setFormValue("entityPlural", config.entity.plural)
  setFormValue("apiPath", config.entity.apiPath)
  fieldsList.replaceChildren()
  // Los campos catálogo vuelven a analizarse para rellenar sus selectores con
  // la estructura real del archivo y conservar lo que se había elegido.
  const catalogAnalyses = []
  for (const field of config.fields || []) {
    const card = addField(field)
    if (field.type === "catalog" && field.catalog) {
      catalogAnalyses.push(analyzeCatalogCard(card, { saved: field.catalog }))
    }
  }
  await Promise.all(catalogAnalyses)
  relationsList.replaceChildren()
  for (const relation of config.relations || []) addRelation(relation)
  piniaEnabled.checked = Boolean(config.pinia?.enabled)
  renderPiniaFields(config.pinia?.fields || [])
  syncPiniaSection()
  for (const input of form.querySelectorAll('[name="operation"]')) {
    input.checked = (config.operations || []).includes(input.value)
  }
  clearNotice(generationErrors)
  ui.clearGeneratedResult()
  currentPreview = null
  syncSourceSelection()
  showStep(0)
  showNotice(previewMessage, "Configuración cargada. Revisa los pasos antes de volver a generar.", "info")
}

async function generate() {
  if (!currentPreview) {
    const valid = await refreshPreview()
    if (!valid) return
  }

  let overwriteConfirmed = false
  if (currentPreview.exists) {
    overwriteConfirmed = window.confirm(
      `Ya existe ${currentPreview.outputPath}.\n\nSe reemplazará únicamente esa carpeta de salida. ¿Quieres continuar?`
    )
    if (!overwriteConfirmed) return
  }

  generateButton.disabled = true
  generateButton.textContent = "Generando..."
  clearNotice(generationErrors)
  try {
    const result = await postJson("/api/generate", {
      ...formConfig(),
      overwriteConfirmed,
    })
    renderGeneratedFiles(result.files, result.outputPath)
    currentPreview = { ...currentPreview, exists: true }
    showNotice(previewMessage, `Generación completada: ${result.files.length} archivos guardados.`, "success")
  } catch (error) {
    showNotice(generationErrors, error.message, "error", error.details)
    if (error.overwriteRequired) currentPreview = await postJson("/api/preview", formConfig())
  } finally {
    generateButton.disabled = Boolean(currentPreview?.collisions.length)
    generateButton.textContent = "Generar archivos"
  }
}

document.querySelector("#add-field").addEventListener("click", () => addField())
document.querySelector("#add-relation").addEventListener("click", () => addRelation())
piniaEnabled.addEventListener("change", syncPiniaSection)
document.querySelectorAll("[data-next]").forEach((button) => button.addEventListener("click", advance))
document.querySelectorAll("[data-back]").forEach((button) => button.addEventListener("click", () => showStep(Math.max(currentStep - 1, 0))))
stepLinks.forEach((button) => button.addEventListener("click", () => {
  const nextStep = Number(button.dataset.stepLink)
  if (nextStep <= currentStep) showStep(nextStep)
}))
generateButton.addEventListener("click", generate)
document.querySelector("#copy-all").addEventListener("click", async (event) => {
  await ui.copyAll(event.currentTarget)
})
document.querySelector("#load-config-button").addEventListener("click", () => {
  document.querySelector("#load-config-input").click()
})
document.querySelector("#load-config-input").addEventListener("change", async (event) => {
  const file = event.currentTarget.files?.[0]
  if (!file) return
  try {
    await loadConfiguration(JSON.parse(await file.text()))
    showNotice(previewMessage, `Se cargó ${file.name}. Comprueba los campos y las operaciones antes de generar.`, "success")
  } catch (error) {
    showNotice(generationErrors, `No se pudo cargar la configuración: ${error.message}`, "error")
  } finally {
    event.currentTarget.value = ""
  }
})

document.querySelector("#generator-form").addEventListener("submit", (event) => event.preventDefault())
form.elements.namedItem("screenRoute").addEventListener("input", validateScreenRoute)
form.elements.namedItem("source").addEventListener("change", syncSourceSelection)
validateScreenRoute()
syncSourceSelection()

addField({
  name: "titulo",
  label: "Título",
  type: "text",
  required: true,
  form: true,
  list: true,
  max: "80",
})
await loadProjectResources()
ui.loadProjectStatus()
loadProjectCatalogs()
