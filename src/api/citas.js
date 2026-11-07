import axios from "axios";

const API_URL = "http://localhost:3000/api/citas";

export async function getCitas() {
  const response = await axios.get(API_URL);
  return response.data;
}

export async function saveCita(cita) {
  const response = await axios.post(API_URL, cita);
  return response.data;
}

export async function deleteCita(id) {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
}
