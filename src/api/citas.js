import axios from "axios"

// Punto de entrada comun para las peticiones HTTP de citas.
const API_URL = "http://localhost:3000/api/citas"

// Devuelve todas las citas guardadas; propaga los errores HTTP para que la pantalla los muestre.
export async function getCitas() {
  // res es la respuesta HTTP completa; el modulo expone solo el cuerpo JSON.
  const res = await axios.get(API_URL)
  return res.data
}

// Crea una cita; cita debe incluir las referencias y campos obligatorios del esquema.
export async function saveCita(cita) {
  // Axios serializa cita como JSON en el cuerpo de la peticion POST.
  const res = await axios.post(API_URL, cita)
  return res.data
}

// Actualiza la cita indicada por su identificador de MongoDB.
export async function updateCita(id, cita) {
  // id selecciona el documento y cita contiene los campos nuevos.
  const res = await axios.put(`${API_URL}/${id}`, cita)
  return res.data
}

// Elimina una cita por su identificador de MongoDB.
export async function deleteCita(id) {
  // La peticion DELETE solo necesita el identificador de la cita en la URL.
  const res = await axios.delete(`${API_URL}/${id}`)
  return res.data
}