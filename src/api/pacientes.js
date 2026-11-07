// Capa API de pacientes: separa las peticiones HTTP de la interfaz Vue.
// El backend es quien conecta con MongoDB; estas funciones solo llaman a Express.
import axios from "axios";

const API_URL = "http://localhost:3000/api";

// Crea un paciente en la BBDD.
export async function savePaciente(paciente) {
    const res = await axios.post(`${API_URL}/pacientes`, paciente);
    return res.data;
}

// Lee todos los pacientes para construir la tabla.
export async function getPacientes() {
    const res = await axios.get(`${API_URL}/pacientes`);
    return res.data;
}

// Elimina por DNI, que actúa como identificador del paciente.
export async function deletePaciente(dni) {
    const res = await axios.delete(`${API_URL}/pacientes/${dni}`);
    return res.data;
}

// Actualiza los datos del paciente identificado por DNI.
export async function modifyPaciente(dni, paciente) {
    const res = await axios.put(`${API_URL}/pacientes/${dni}`, paciente);
    return res.data;
}
