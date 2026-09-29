import axios from "axios";

const API_URL = "http://localhost:3000/api";

//Guardar paciente
export async function savePaciente(paciente) {
    const res = await axios.post(`${API_URL}/pacientes`, paciente);
    return res.data;
}

//Obtener todos los pacientes
export async function obtenerPacientes() {
    const res = await axios.get(`${API_URL}/pacientes`);
    return res.data;
}

