// Consulta provincias y municipios al backend para rellenar los selectores.
import axios from "axios";

// Endpoint que entrega ambos catálogos.
const URL =  "http://localhost:3000/api/municipios";

// Obtiene las provincias para el primer selector.
export async function obtenerProvincias() {
    const respuesta = await axios.get(URL)

    return respuesta.data.provincias
}

// Obtiene todos los municipios y filtra en el navegador por provincia.
export async function obtenerMunicipios(idProvincia) {
    const respuesta = await axios.get(URL)

    const municipios = respuesta.data.municipios

    //El código de provincia son los dos primeros carácteres
    return municipios.filter(
        municipio => municipio.id.substring(0, 2) === idProvincia
    )
}