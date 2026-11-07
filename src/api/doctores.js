// Este archivo es el "mensajero" entre la pantalla de doctores y el servidor.
//
// La pantalla Vue NO habla directamente con MongoDB.
// El camino completo es:
//
//   XestionDoctores.vue
//          |
//          | llama a una función de este archivo
//          v
//   Axios envía una petición HTTP
//          |
//          v
//   backend/server.js recibe la petición
//          |
//          v
//   rutas/doctores.rutas.js decide qué hacer
//          |
//          v
//   modelos/doctor.js guarda o lee MongoDB
//
// Cuando el servidor termina, devuelve una respuesta y esta función se la
// entrega de nuevo a XestionDoctores.vue.
import axios from "axios"

// "axios" sirve para hacer peticiones a otro ordenador o programa.
// En este proyecto ese "otro programa" es el backend de Express.

// En producción se usaría la dirección pública del servidor:
// const API_URL = "https://servidor.com/api";

// Durante el desarrollo, el backend está funcionando en nuestro ordenador.
// El puerto 3000 es la "puerta" por la que recibe las peticiones.
const API_URL = "http://localhost:3000/api";

// GUARDAR UN DOCTOR
//
// doctor es un objeto con los datos escritos en el formulario, por ejemplo:
// {
//   nomedoc: "Ana",
//   apeldoc: "García",
//   maildoc: "ana@email.com"
// }
//
// POST significa: "quiero crear un dato nuevo".
export async function saveDoctor(doctor) {
    // axios.post manda los datos al endpoint /api/doctores.
    // El primer argumento es la dirección.
    // El segundo argumento es el objeto que se manda al servidor.
    const res = await axios.post(`${API_URL}/doctores`, doctor);

    // res es la respuesta completa del servidor.
    // res.data contiene únicamente los datos útiles que ha devuelto.
    return res.data;
}

// LEER TODOS LOS DOCTORES
//
// GET significa: "quiero consultar datos", no crear ni borrar.
export async function getDoctores() {
    // Pide al backend la lista completa de doctores.
    const res = await axios.get(`${API_URL}/doctores`);

    // res.data es un array, es decir, una lista de doctores.
    // sort cambia esa lista para colocarla por apellido.
    res.data.sort((a, b) => 
        a.apeldoc.localeCompare(b.apeldoc, "es", { sensitivity: "base" })); 

    // Devuelve la lista ya ordenada al componente Vue.
    return res.data;
}

// BUSCAR DOCTORES POR ESPECIALIDAD
//
// especialidad es el texto elegido en el formulario, por ejemplo "Pediatría".
// La dirección final sería:
// http://localhost:3000/api/doctores/Pediatría
export async function getDoctorByEspecialidad(especialidad) {
    // GET consulta solo los doctores que coinciden con esa especialidad.
    const res = await axios.get(`${API_URL}/doctores/especialidad/${encodeURIComponent(especialidad)}`);

    // Devuelve la lista filtrada a la pantalla.
    return res.data;
} 

// MODIFICAR UN DOCTOR
//
// id indica qué doctor queremos cambiar.
// doctor contiene los nuevos datos.
// PUT significa: "cambia un dato que ya existe".
export async function modifyDoctor(id, doctor) {
    // El id se coloca en la dirección para que el backend sepa
    // exactamente qué doctor debe modificar.
    const res = await axios.put(`${API_URL}/doctores/${id}`, doctor);

    // Devuelve el doctor modificado o el mensaje del servidor.
    return res.data;
}   

// BORRAR UN DOCTOR
//
// id indica qué doctor queremos eliminar.
// DELETE significa: "borra este dato".
export async function deleteDoctor(id) {
    // No mandamos un objeto porque el identificador ya va en la dirección.
    const res = await axios.delete(`${API_URL}/doctores/${id}`);

    // Devuelve la confirmación del backend.
    return res.data;
}
