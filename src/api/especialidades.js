// Funciones para cargar datos auxiliares usados en los formularios.
// La fuente real es el endpoint del backend, no el componente Vue.
import axios from "axios";

// Dirección del endpoint que lee las especialidades disponibles.
const URL =  "http://localhost:3000/api/especialidades";

// Devuelve solo el array que necesita el selector del formulario.
export async function obtenerEspecialidades() {
    const respuesta = await axios.get(URL)

    return respuesta.data.especialidades
}