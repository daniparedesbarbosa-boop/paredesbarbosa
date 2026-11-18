export async function postJson(endpoint, data) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const result = await response.json()
  if (!response.ok) {
    const error = new Error(result.message || "La solicitud no se pudo completar.")
    error.details = result.errors || result.collisions || []
    error.status = response.status
    error.overwriteRequired = result.overwriteRequired === true
    throw error
  }
  return result
}

// Pide al servidor local que analice la estructura de un catálogo: un archivo
// real de backend/data ({ file }) o los datos pegados en el formulario ({ name, data }).
export async function postCatalogAnalysis(payload) {
  const response = await fetch("/api/catalog", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const result = await response.json()
  if (!response.ok) throw new Error(result.message || "No se pudo analizar el catálogo.")
  return result
}

// Lista de pantallas del proyecto para el modo «modificar».
export async function getScreens() {
  const response = await fetch("/api/screens")
  if (!response.ok) throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  return response.json()
}

export async function getProjectStatus() {
  const response = await fetch("/api/status")
  if (!response.ok) throw new Error(`El servidor respondió con HTTP ${response.status}.`)
  return response.json()
}
