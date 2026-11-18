import { getProjectStatus } from "./api.js"

export function createUi(getConfiguration) {
  const previewMessage = document.querySelector("#preview-message")
  const previewSummary = document.querySelector("#preview-summary")
  const generationErrors = document.querySelector("#generation-errors")
  const generateButton = document.querySelector("#generate-button")
  const generatedResult = document.querySelector("#generated-result")
  const generatedFiles = document.querySelector("#generated-files")
  let generatedTextFiles = []

  function showNotice(element, message, kind = "info", details = []) {
    element.hidden = false
    element.className = `notice notice-${kind}`
    element.replaceChildren()
    const paragraph = document.createElement("p")
    paragraph.textContent = message
    element.append(paragraph)
    if (details.length) {
      const list = document.createElement("ul")
      for (const detail of details) {
        const item = document.createElement("li")
        item.textContent = detail
        list.append(item)
      }
      element.append(list)
    }
  }

  function clearNotice(element) {
    element.hidden = true
    element.replaceChildren()
  }

  function renderPreview(preview) {
    previewSummary.replaceChildren()
    const config = getConfiguration()
    const catalogFields = (config.fields ?? []).filter((field) => field.type === "catalog")
    const summaryItems = [
      ["Pantalla", `${config.screen.title} → ${config.screen.component}.vue`],
      ["Ruta de navegador", config.screen.route],
      ["Origen", config.source === "existing" ? `Recurso existente: ${config.existingResource || "sin elegir"}` : "Entidad nueva"],
      ["Colección", config.source === "existing"
        ? `recurso ${config.existingResource || "elegir"} ya existente (no se duplica)`
        : `${config.entity.plural || "recurso"} (identificador _id de MongoDB)`],
      ["Ruta REST", config.source === "existing"
        ? `${config.entity.apiPath} (API ya existente, no se toca)`
        : (config.entity.apiPath || "Se reutiliza la API existente")],
      ["Catálogos", catalogFields.length
        ? catalogFields.map((field) => `${field.name} ← ${field.catalog?.name || "catálogo sin analizar"}`).join(", ")
        : "Ninguno"],
      ["Carpeta que se escribirá", preview.outputPath],
    ]
    for (const [label, value] of summaryItems) {
      const paragraph = document.createElement("p")
      const strong = document.createElement("strong")
      strong.textContent = `${label}: `
      paragraph.append(strong, document.createTextNode(value))
      previewSummary.append(paragraph)
    }
    const fileList = document.createElement("ul")
    fileList.className = "preview-files"
    for (const file of preview.files) {
      const item = document.createElement("li")
      item.textContent = file
      fileList.append(item)
    }
    previewSummary.append(fileList)

    if (preview.collisions.length) {
      showNotice(
        previewMessage,
        "Se detectaron coincidencias con archivos o rutas que ya existen en el proyecto; para evitar duplicados, cambia el nombre técnico del componente o la ruta de la pantalla. Si lo que quieres es reutilizar un archivo existente, hazlo manualmente.",
        "error",
        preview.collisions
      )
      generateButton.disabled = true
    } else if (preview.exists) {
      showNotice(previewMessage, `La carpeta ${preview.outputPath} ya existe. Al continuar se reemplazará su contenido.`, "warning")
      generateButton.disabled = false
    } else {
      showNotice(previewMessage, "La ruta está disponible y no se detectaron colisiones con archivos del proyecto.", "success")
      generateButton.disabled = false
    }
  }

  function renderGeneratedFiles(files, outputPath) {
    generatedFiles.replaceChildren()
    generatedTextFiles = files
    document.querySelector("#result-path").textContent = outputPath
    document.querySelector("#result-note").textContent =
      "Estos bloques contienen exactamente los archivos guardados en la carpeta de salida. Usa Copiar en un archivo o el botón para copiarlos todos."

    for (const file of files) {
      const details = document.createElement("details")
      details.className = "generated-file"
      const summary = document.createElement("summary")
      const name = document.createElement("span")
      name.textContent = file.path
      const copyButton = document.createElement("button")
      copyButton.type = "button"
      copyButton.className = "copy-file"
      copyButton.textContent = "Copiar"
      copyButton.addEventListener("click", async (event) => {
        event.preventDefault()
        event.stopPropagation()
        await copyText(file.contents, copyButton)
      })
      summary.append(name, copyButton)
      const code = document.createElement("pre")
      const codeText = document.createElement("code")
      codeText.textContent = file.contents
      code.append(codeText)
      details.append(summary, code)
      generatedFiles.append(details)
    }
    generatedResult.hidden = false
  }

  async function copyText(text, button) {
    try {
      await navigator.clipboard.writeText(text)
      const oldText = button.textContent
      button.textContent = "Copiado"
      window.setTimeout(() => { button.textContent = oldText }, 1600)
    } catch (error) {
      showNotice(generationErrors, `No se pudo copiar al portapapeles: ${error.message}. Selecciona y copia el contenido del bloque.`, "error")
    }
  }

  async function copyAll(button) {
    const content = generatedTextFiles
      .map((file) => `===== ${file.path} =====\n${file.contents}`)
      .join("\n\n")
    await copyText(content, button)
  }

  async function loadProjectStatus() {
    const notice = document.querySelector("#resource-notice")
    try {
      const status = await getProjectStatus()
      notice.replaceChildren()
      const lead = document.createElement("p")
      lead.textContent = "Patrones y recursos localizados (solo lectura):"
      const list = document.createElement("ul")
      for (const resource of status.resources) {
        const item = document.createElement("li")
        const missing = resource.missingFunctions?.length
          ? ` (no exporta ${resource.missingFunctions.map((entry) => entry.name).join(", ")})`
          : ""
        item.textContent = `${resource.name}: ${resource.files.join(", ")}${missing}`
        list.append(item)
      }
      notice.append(lead, list)
      const limitation = document.createElement("p")
      limitation.textContent = "La reutilización genera solo la pantalla del recurso elegido: llama a la API real del proyecto y usa su identificador (por ejemplo, dnipac en pacientes). El backend no se duplica ni se modifica. Las pantallas Relacionadas (DNI para pacientes, referencias ObjectId/ref para doctores y citas, y stores de Pinia) están disponibles en el paso 4 para entidades nuevas. Los campos catálogo cargan su lista de un JSON: los datos nuevos se copian a backend/data y su módulo de src/api los pide por HTTP a una ruta que la guía explica cómo registrar; el PDF sigue pendiente."
      notice.append(limitation)
      if (status.outputs.length) {
        const outputs = document.createElement("p")
        outputs.textContent = `Salidas previas disponibles: ${status.outputs.join(", ")}.`
        notice.append(outputs)
      }
    } catch (error) {
      showNotice(notice, `No se pudo revisar el proyecto: ${error.message}`, "error")
    }
  }

  function clearGeneratedResult() {
    generatedResult.hidden = true
  }

  return {
    clearGeneratedResult,
    clearNotice,
    copyAll,
    copyText,
    generationErrors,
    loadProjectStatus,
    previewMessage,
    renderGeneratedFiles,
    renderPreview,
    showNotice,
  }
}
