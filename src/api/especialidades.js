import axios from "axios";

//Dirección de la API
const URL =  "http://localhost:3000/api/especialidades";

//Obtener todos las especialidades
export async function obtenerEspecialidades() {
    const respuesta = await axios.get(URL)

    return respuesta.data.especialidades
}