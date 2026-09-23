import axios from "axios";

//Dirección de la API
const URL =  "http://localhost:3000/api/municipios";

//Obtener todos las provincias
export async function obtenerProvincias() {
    const respuesta = await axios.get(URL)

    return respuesta.data.provincias
}

//Obtener los municipios de una provincia
export async function obtenerMunicipios(idProvincia) {
    const respuesta = await axios.get(URL)

    const municipios = respuesta.data.municipios

    //El código de provincia son los dos primeros carácteres
    return municipios.filter(
        municipio => municipio.id.substring(0, 2) === idProvincia
    )
}