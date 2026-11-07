# Cómo hacer una aplicación Vue + Express + MongoDB desde cero

## Guía de examen basada en `paredesbarbosa`

Esta guía explica, con pasos sencillos, cómo construir una aplicación web como
`paredesbarbosa`: una aplicación de gestión con páginas de pacientes, doctores
y citas, formularios, tablas, navegación, API REST, MongoDB, alertas y
generación de informes PDF.

La idea más importante es esta:

```text
Usuario
  ↓
Página Vue (.vue)
  ↓
Archivo de API con Axios
  ↓
Servidor Express
  ↓
Ruta REST
  ↓
Modelo Mongoose
  ↓
MongoDB
```

Cuando se guarda un formulario, el dato hace ese camino hacia abajo. Cuando se
carga una tabla, hace el camino contrario.

---

## 1. Crear el proyecto Vue

Parte de un proyecto Vue/Vite vacío ya preparado y abre su carpeta en VS Code.
Durante el examen, la estructura y el código importante se construyen dentro
de esa carpeta.

Para comprobar que el proyecto arranca:

```text
http://localhost:5173
```

En un proyecto que ya existe, normalmente basta con:

```bash
npm run dev
```

En `paredesbarbosa`, el script `start` arranca a la vez Vite y Express:

```bash
npm start
```

Si se usa Windows y `npm` da problemas, puede usarse:

```bash
npm.cmd start
```

---

### Dependencias que utiliza el proyecto

Estas son las librerías que ya estarán disponibles en el examen y que debes
recordar para qué sirven:

| Paquete | Uso |
|---|---|
| `vue` | Crear la interfaz por componentes. |
| `vite` | Servidor de desarrollo y compilación. |
| `vue-router` | Cambiar de página sin recargar todo el navegador. |
| `axios` | Hacer peticiones HTTP al backend. |
| `express` | Crear el servidor y las rutas de la API. |
| `mongoose` | Definir modelos y hablar con MongoDB. |
| `mongodb` | Herramientas del ecosistema MongoDB. |
| `cors` | Permitir que frontend y backend se comuniquen en puertos distintos. |
| `dotenv` | Leer variables del archivo `.env`. |
| `sweetalert2` | Mostrar avisos y confirmaciones bonitos. |
| `jspdf` | Crear archivos PDF desde el navegador. |
| `concurrently` | Ejecutar frontend y backend con un solo comando. |
| `tailwindcss` | Aplicar estilos mediante clases de utilidad. |

---

## 2. Estructura de carpetas recomendada

Una estructura clara evita mezclar responsabilidades:

```text
mi-aplicacion/
├─ backend/
│  ├─ data/
│  │  ├─ especialidades.json
│  │  └─ municipios.json
│  ├─ modelos/
│  │  ├─ paciente.js
│  │  ├─ doctor.js
│  │  └─ cita.js
│  ├─ rutas/
│  │  ├─ pacientes.rutas.js
│  │  ├─ doctores.rutas.js
│  │  └─ citas.rutas.js
│  └─ server.js
├─ src/
│  ├─ api/
│  │  ├─ pacientes.js
│  │  ├─ doctores.js
│  │  └─ citas.js
│  ├─ components/
│  │  ├─ NavBar.vue
│  │  ├─ FooTer.vue
│  │  ├─ XestionPacientes.vue
│  │  ├─ XestionDoctores.vue
│  │  └─ Citas.vue
│  ├─ router/
│  │  └─ index.js
│  ├─ utils/
│  │  └─ alertas.js
│  ├─ App.vue
│  ├─ main.js
│  └─ style.css
├─ .env
├─ docker-compose.yaml
├─ index.html
└─ package.json
```

### Regla fácil para el examen

- `components`: lo que ve y utiliza el usuario.
- `api`: peticiones HTTP, pero no HTML.
- `backend/rutas`: qué ocurre con cada URL.
- `backend/modelos`: forma de los datos de MongoDB.
- `server.js`: arranque y conexión general.
- `router`: qué componente corresponde a cada dirección.

---

## 3. Preparar MongoDB con Docker

Crea `docker-compose.yaml` en la raíz:

```yaml
services:
  mongodb:
    image: mongo:8.0
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: cambia_esta_clave
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

Arranca MongoDB:

```bash
docker compose up -d
```

Comprueba el contenedor:

```bash
docker ps
```

Para apagarlo sin borrar los datos:

```bash
docker compose stop
```

No uses `docker compose down -v` salvo que quieras borrar también el volumen y
todos los datos.

### Archivo `.env`

En la raíz crea:

```env
PORT=3000
MONGO_URI=mongodb://admin:cambia_esta_clave@localhost:27017/bbdd?authSource=admin
```

El `.env` no debe subirse a Git si contiene contraseñas reales.

En MongoDB Compass, la conexión tendrá esta forma:

```text
mongodb://admin:cambia_esta_clave@localhost:27017/bbdd?authSource=admin
```

La base de datos puede aparecer después de insertar el primer documento.

---

## 4. El servidor Express

`backend/server.js` prepara el servidor, lee el `.env`, permite JSON y registra
las rutas:

```js
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import "dotenv/config";

import pacientesRutas from "./rutas/pacientes.rutas.js";
import doctoresRutas from "./rutas/doctores.rutas.js";
import citasRutas from "./rutas/citas.rutas.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/pacientes", pacientesRutas);
app.use("/api/doctores", doctoresRutas);
app.use("/api/citas", citasRutas);

const puerto = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(puerto, () => {
      console.log(`Servidor en http://localhost:${puerto}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo conectar con MongoDB:", error);
    process.exitCode = 1;
  });
```

### Qué significa cada línea importante

- `cors()`: acepta peticiones del frontend, que normalmente usa el puerto
  `5173`.
- `express.json()`: convierte el cuerpo JSON de una petición en
  `req.body`.
- `app.use("/api/pacientes", ...)`: todas las rutas de ese archivo empiezan
  por `/api/pacientes`.
- `mongoose.connect(...)`: conecta Express con MongoDB.
- `app.listen(...)`: abre el puerto del backend.

El frontend no debe conectarse directamente a MongoDB. Solo debe llamar a
Express.

---

## 5. Crear los modelos de MongoDB

Un modelo dice qué campos tiene cada documento y cuáles son obligatorios.

### Modelo de paciente

```js
import mongoose from "mongoose";

const pacienteSchema = new mongoose.Schema(
  {
    dnipac: { type: String, required: true, unique: true },
    nomepac: { type: String, required: true },
    apelpac: { type: String, required: true },
    nacipac: { type: String },
    mailpac: { type: String },
    movilpac: { type: String, required: true },
    dirpac: { type: String },
    propac: { type: String },
    munipac: { type: String },
    lopdpac: { type: Boolean, required: true },
  },
  { collection: "pacientes" },
);

export default mongoose.model("Paciente", pacienteSchema);
```

### Modelo de doctor

```js
const doctorSchema = new mongoose.Schema({
  iddoc: { type: String, required: true, unique: true },
  nomedoc: { type: String, required: true },
  apeldoc: { type: String, required: true },
  coledoc: { type: String, required: true },
  movildoc: { type: String, required: true },
  maildoc: { type: String },
  espedoc: { type: String, required: true },
});
```

### Modelo de cita

```js
const citaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  data: { type: String, required: true },
  idPaciente: { type: String, required: true },
  idDoctor: { type: String, required: true },
  hora: { type: String, required: true },
  motivo: { type: String, required: true },
  estado: {
    type: String,
    enum: ["Pendiente", "Confirmada", "Cancelada"],
    required: true,
  },
  observacions: { type: String, default: "" },
});
```

`required` evita documentos incompletos. `unique` evita identificadores
repetidos. `enum` limita un campo a unos valores concretos.

---

## 6. Crear una ruta CRUD

Una ruta recibe una petición, consulta el modelo y devuelve JSON.

Ejemplo de `backend/rutas/doctores.rutas.js`:

```js
import express from "express";
import Doctor from "../modelos/doctor.js";

const router = express.Router();

// GET /api/doctores
router.get("/", async (req, res) => {
  try {
    const doctores = await Doctor.find();
    res.json(doctores);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudieron cargar los doctores" });
  }
});

// POST /api/doctores
router.post("/", async (req, res) => {
  try {
    const doctor = await Doctor.create(req.body);
    res.status(201).json(doctor);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: "No se pudo guardar el doctor" });
  }
});

// PUT /api/doctores/:id
router.put("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndUpdate(
      { iddoc: req.params.id },
      req.body,
      { new: true, runValidators: true },
    );

    if (!doctor) {
      return res.status(404).json({ mensaje: "Doctor no encontrado" });
    }

    res.json(doctor);
  } catch (error) {
    console.error(error);
    res.status(400).json({ mensaje: "No se pudo modificar el doctor" });
  }
});

// DELETE /api/doctores/:id
router.delete("/:id", async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndDelete({ iddoc: req.params.id });

    if (!doctor) {
      return res.status(404).json({ mensaje: "Doctor no encontrado" });
    }

    res.json({ mensaje: "Doctor eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "No se pudo eliminar el doctor" });
  }
});

export default router;
```

### Tabla rápida de métodos HTTP

| Método | Significado | Ejemplo |
|---|---|---|
| `GET` | Leer | `GET /api/doctores` |
| `POST` | Crear | `POST /api/doctores` |
| `PUT` | Modificar | `PUT /api/doctores/DOC001` |
| `DELETE` | Borrar | `DELETE /api/doctores/DOC001` |

El error típico es olvidar que `/:id` es un parámetro de la URL y se lee con
`req.params.id`, no con `req.body.id`.

---

## 7. Crear la capa Axios del frontend

La capa API evita llenar el componente `.vue` de URLs y detalles HTTP.

```js
import axios from "axios";

const API_URL = "http://localhost:3000/api/doctores";

export async function getDoctores() {
  const respuesta = await axios.get(API_URL);
  return respuesta.data;
}

export async function saveDoctor(doctor) {
  const respuesta = await axios.post(API_URL, doctor);
  return respuesta.data;
}

export async function modifyDoctor(id, doctor) {
  const respuesta = await axios.put(`${API_URL}/${id}`, doctor);
  return respuesta.data;
}

export async function deleteDoctor(id) {
  const respuesta = await axios.delete(`${API_URL}/${id}`);
  return respuesta.data;
}
```

Después, el componente solo llama a `getDoctores()` o `saveDoctor()`.

---

## 8. Vue desde cero: plantilla, estado y eventos

Un componente Vue suele tener:

```vue
<template>
  <!-- Lo que se ve -->
</template>

<script setup>
  // Estado y funciones
</script>

<style scoped>
  /* Estilos de este componente */
</style>
```

### Estado reactivo

```js
import { reactive, ref } from "vue";

const contador = ref(0);

const formulario = reactive({
  nombre: "",
  correo: "",
});
```

- `ref` es cómodo para un valor simple. Se lee como `contador.value` dentro
  de JavaScript y como `contador` en la plantilla.
- `reactive` es cómodo para un objeto cuyos campos se modifican.
- Vue actualiza la pantalla automáticamente cuando cambia el estado.

### Directivas fundamentales

```vue
<input v-model="formulario.nombre" />
<p>{{ formulario.nombre }}</p>
<button @click="contador++">Sumar</button>
<form @submit.prevent="guardar">...</form>
<p v-if="contador > 0">Hay contador</p>
<li v-for="persona in personas" :key="persona.dni">
  {{ persona.nombre }}
</li>
```

| Directiva | Qué hace |
|---|---|
| `v-model` | Une un input con una variable. |
| `@click` | Ejecuta una función al pulsar. |
| `@submit.prevent` | Ejecuta el guardado y evita recargar la página. |
| `v-if` | Muestra algo solo si se cumple una condición. |
| `v-for` | Repite HTML para cada elemento de una lista. |
| `:class` | Añade clases de forma dinámica. |
| `:disabled` | Desactiva un botón según una condición. |

### Ciclo de vida

Para cargar datos al entrar en una página:

```js
import { onMounted, ref } from "vue";

const doctores = ref([]);

onMounted(async () => {
  doctores.value = await getDoctores();
});
```

`onMounted` ocurre cuando el componente ya está colocado en la página.

---

## 9. Hacer la página de pacientes

La página de pacientes tiene cuatro partes:

1. Formulario.
2. Validación.
3. Tabla.
4. Funciones de cargar, guardar, buscar, editar y borrar.

### Estado inicial

```js
const pacientes = ref([]);
const mensaxeErro = ref("");
const guardando = ref(false);

const novoPaciente = reactive({
  dnipac: "",
  nomepac: "",
  apelpac: "",
  nacipac: "",
  mailpac: "",
  movilpac: "",
  dirpac: "",
  propac: "",
  munipac: "",
  lopdpac: false,
});
```

### Formulario mínimo

```vue
<form @submit.prevent="guardarPaciente">
  <input
    v-model="novoPaciente.dnipac"
    placeholder="DNI/CIF"
    required
  />
  <input
    v-model="novoPaciente.nomepac"
    placeholder="Nombre"
    required
  />
  <input
    v-model="novoPaciente.mailpac"
    type="email"
    placeholder="Correo electrónico"
  />
  <button type="submit" :disabled="guardando">
    Guardar
  </button>
</form>
```

El `.prevent` es importante: si no se pone, el navegador recarga la página y
se pierde el estado.

### Guardar

```js
async function guardarPaciente() {
  try {
    guardando.value = true;
    const paciente = await savePaciente({ ...novoPaciente });
    pacientes.value.push(paciente);
    limpiarFormulario();
    await alertaExito("Paciente guardado");
  } catch (error) {
    console.error("Error guardando paciente:", error);
    const mensaje = error.response?.data?.mensaje ||
      "No se pudo guardar el paciente";
    mensaxeErro.value = mensaje;
    await alertaError(mensaje);
  } finally {
    guardando.value = false;
  }
}
```

Copiar el objeto con `{ ...novoPaciente }` evita enviar el objeto reactivo
directamente y deja claro qué datos se mandan.

### Cargar y pintar la tabla

```js
async function cargarPacientes() {
  try {
    pacientes.value = await getPacientes();
    mensaxeErro.value = "";
  } catch (error) {
    console.error(error);
    mensaxeErro.value = "No se pudieron cargar los pacientes";
  }
}
```

```vue
<table v-if="pacientes.length">
  <tbody>
    <tr v-for="paciente in pacientes" :key="paciente.dnipac">
      <td>{{ paciente.dnipac }}</td>
      <td>{{ paciente.nomepac }}</td>
      <td>{{ paciente.apelpac }}</td>
      <td>
        <button @click="editarPaciente(paciente)">✏️</button>
        <button @click="eliminarPaciente(paciente.dnipac)">🗑️</button>
      </td>
    </tr>
  </tbody>
</table>
<p v-else>No hay pacientes cargados.</p>
```

### Provincias y municipios

Los catálogos pueden guardarse en JSON porque no son datos creados por el
usuario:

```json
[
  { "id": "36", "nm": "Pontevedra" },
  { "id": "15", "nm": "A Coruña" }
]
```

En MongoDB se guarda el código (`"36"`), mientras que el `select` muestra el
nombre:

```vue
<select v-model="novoPaciente.propac" @change="cargarMunicipios">
  <option value="">Selecciona una provincia</option>
  <option
    v-for="provincia in provincias"
    :key="provincia.id"
    :value="provincia.id"
  >
    {{ provincia.nm }}
  </option>
</select>
```

Si en una tabla se quiere mostrar el nombre:

```js
function nombreProvincia(codigo) {
  return provincias.value.find(
    (provincia) => String(provincia.id) === String(codigo),
  )?.nm || codigo;
}
```

Esto evita enseñar `36` cuando el usuario espera ver `Pontevedra`.

### Editar sin perder el identificador original

Para editar un paciente:

1. El usuario escribe el DNI.
2. La lupa hace `GET` o filtra el paciente.
3. El formulario se rellena.
4. El lápiz hace `PUT`.

Guarda el DNI original:

```js
const dniOriginal = ref("");

async function buscarPaciente() {
  const paciente = pacientes.value.find(
    (item) => item.dnipac === novoPaciente.dnipac,
  );

  if (!paciente) {
    await alertaError("Paciente no encontrado");
    return;
  }

  Object.assign(novoPaciente, paciente);
  dniOriginal.value = paciente.dnipac;
}

async function editarPaciente() {
  await modifyPaciente(dniOriginal.value, { ...novoPaciente });
  await cargarPacientes();
  await alertaExito("Paciente modificado");
}
```

Si se permite cambiar el DNI, el backend debe actualizar también las citas que
apuntaban al DNI antiguo. Es una regla de consistencia: no sirve cambiar un
paciente y dejar citas con un identificador que ya no existe.

---

## 10. Hacer la página de doctores

La página de doctores sigue el mismo CRUD, pero añade:

- Especialidad cargada desde un JSON.
- Validación de móvil y correo.
- Radio buttons para colegiado.
- ID automático.
- Botón de PDF.

### ID automático

```js
function siguienteId() {
  const numero = doctores.value.length + 1;
  novoDoctor.iddoc = `DOC${String(numero).padStart(3, "0")}`;
}
```

El ID automático puede mostrarse como `disabled` para que el usuario no lo
modifique:

```vue
<input v-model="novoDoctor.iddoc" placeholder="ID automático" disabled />
```

No confundas `disabled` con `readonly`: ambos impiden escribir, pero un campo
`disabled` no se envía en un formulario HTML tradicional. En este proyecto se
manda el objeto JavaScript, por lo que sí se incluye si está en el objeto.

### Especialidad con tildes

```vue
<select v-model="novoDoctor.espedoc" required>
  <option value="">Selecciona una especialidad</option>
  <option
    v-for="especialidad in especialidades"
    :key="especialidad.id"
    :value="especialidad.nm"
  >
    {{ especialidad.nm }}
  </option>
</select>
```

Usa siempre UTF-8. En `index.html`:

```html
<meta charset="UTF-8" />
<html lang="es">
```

Y no conviertas manualmente los textos a otra codificación. Una especialidad
como `Pediatría` debe conservarse igual en JSON, JavaScript, HTTP y MongoDB.

### Validación con expresiones regulares

Móvil español:

```js
const movilValido = /^[67]\d{8}$/.test(novoDoctor.movildoc);
```

Correo sencillo:

```js
const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
  novoDoctor.maildoc,
);
```

HTML también ayuda:

```vue
<input
  v-model="novoDoctor.movildoc"
  type="tel"
  pattern="[67][0-9]{8}"
  required
/>
```

La validación del frontend mejora la experiencia, pero el backend también debe
validar. El usuario puede llamar a la API sin utilizar la interfaz.

### Radio buttons

```vue
<label>
  <input v-model="novoDoctor.coledoc" type="radio" value="Si" required />
  Sí
</label>
<label>
  <input v-model="novoDoctor.coledoc" type="radio" value="No" />
  No
</label>
```

Todos deben tener el mismo `name` si se usan como formulario HTML clásico.
Con `v-model` Vue mantiene el valor elegido.

### Ordenar la tabla

```js
res.data.sort((a, b) =>
  a.apeldoc.localeCompare(b.apeldoc, "es", { sensitivity: "base" }),
);
```

`localeCompare` respeta mejor el idioma español que una comparación simple.

---

## 11. Hacer la página de citas

Una cita relaciona un paciente con un doctor:

```text
cita.idPaciente → paciente.dnipac
cita.idDoctor   → doctor.iddoc
```

Formulario:

```vue
<form @submit.prevent="guardarCita">
  <input v-model="novaCita.id" placeholder="ID cita" required />
  <input v-model="novaCita.data" type="date" required />
  <input v-model="novaCita.idPaciente" placeholder="ID del paciente" required />
  <input v-model="novaCita.idDoctor" placeholder="ID del doctor" required />
  <input v-model="novaCita.hora" type="time" required />
  <input v-model="novaCita.motivo" placeholder="Motivo" required />

  <select v-model="novaCita.estado" required>
    <option value="">Estado de la cita</option>
    <option value="Pendiente">Pendiente</option>
    <option value="Confirmada">Confirmada</option>
    <option value="Cancelada">Cancelada</option>
  </select>

  <textarea
    v-model="novaCita.observacions"
    placeholder="Observaciones"
  />
  <button type="submit">Guardar</button>
</form>
```

La función de guardado:

```js
async function guardarCita() {
  try {
    const citaGuardada = await saveCita({ ...novaCita });
    citas.value.push(citaGuardada);
    limpiarFormulario();
    await alertaExito("Cita guardada");
  } catch (error) {
    console.error(error);
    await alertaError("No se pudo guardar la cita");
  }
}
```

Antes de guardar, una aplicación más completa comprobaría que existen el
paciente y el doctor indicados. También puede devolver un `400` desde Express
si no existen.

---

## 12. Router y navegación entre páginas

`src/router/index.js` relaciona URLs con componentes:

```js
import { createRouter, createWebHistory } from "vue-router";
import IniCio from "../components/IniCio.vue";
import XestionPacientes from "../components/XestionPacientes.vue";
import XestionDoctores from "../components/XestionDoctores.vue";
import Citas from "../components/Citas.vue";
import NotFound from "../components/NotFound.vue";

const routes = [
  { path: "/", name: "inicio", component: IniCio },
  { path: "/pacientes", name: "pacientes", component: XestionPacientes },
  { path: "/doctores", name: "doctores", component: XestionDoctores },
  { path: "/citas", name: "citas", component: Citas },
  { path: "/:pathMatch(.*)*", component: NotFound },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
```

En `main.js` se activa:

```js
createApp(App).use(router).mount("#app");
```

En `App.vue`, el componente cambia dentro de:

```vue
<router-view />
```

Para enlazar desde el menú:

```vue
<RouterLink to="/pacientes">Pacientes</RouterLink>
<RouterLink to="/doctores">Doctores</RouterLink>
<RouterLink to="/citas">Citas</RouterLink>
```

`RouterLink` evita recargar la aplicación completa.

---

## 13. Estilos y diseño de formularios

Para un formulario limpio:

```css
form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

input,
select,
textarea {
  padding: 0.8rem 1rem;
  border: 1px solid #d5d5d5;
  border-radius: 0.8rem;
  font: inherit;
}

input:focus,
select:focus,
textarea:focus {
  outline: 2px solid #6abf69;
}

button {
  border: 0;
  border-radius: 0.8rem;
  padding: 0.7rem 1rem;
  cursor: pointer;
}
```

Para que un `select` vacío parezca un placeholder:

```vue
<select
  v-model="formulario.estado"
  :class="{ 'campo-vacio': !formulario.estado }"
>
  <option value="">Estado de la cita</option>
  <option value="Pendiente">Pendiente</option>
</select>
```

```css
.campo-vacio {
  color: #999;
}

select:not(.campo-vacio) {
  color: #222;
}
```

Para un input de fecha o hora vacío se puede aplicar la misma clase. No se
debe quitar el `label` accesible sin poner `placeholder` o `aria-label`.

---

## 14. Alertas con SweetAlert2

Crea un helper para no repetir configuración:

```js
import Swal from "sweetalert2";

export function alertaExito(texto) {
  return Swal.fire({
    icon: "success",
    title: "Correcto",
    text: texto,
    confirmButtonColor: "#4caf50",
  });
}

export function alertaError(texto) {
  return Swal.fire({
    icon: "error",
    title: "Error",
    text: texto,
  });
}
```

Uso:

```js
await alertaExito("Paciente guardado correctamente");
await alertaError("No se pudo borrar");
```

Para confirmar un borrado:

```js
const respuesta = await Swal.fire({
  title: "¿Borrar este registro?",
  icon: "warning",
  showCancelButton: true,
  confirmButtonText: "Sí, borrar",
  cancelButtonText: "Cancelar",
});

if (respuesta.isConfirmed) {
  await deletePaciente(dni);
}
```

No muestres un mensaje de éxito antes de que termine `await` de la API.

---

## 15. Crear un informe PDF

Importa `jsPDF`:

```js
import jsPDF from "jspdf";
```

Ejemplo de PDF sencillo:

```js
function descargarInforme() {
  const pdf = new jsPDF();
  let y = 20;

  pdf.setFontSize(16);
  pdf.text("Lista de doctores", 20, y);
  y += 12;

  doctores.value.forEach((doctor) => {
    pdf.setFontSize(10);
    pdf.text(
      `${doctor.iddoc} - ${doctor.nomedoc} ${doctor.apeldoc}`,
      20,
      y,
    );
    y += 7;

    if (y > 280) {
      pdf.addPage();
      y = 20;
    }
  });

  pdf.save("doctores.pdf");
}
```

El botón se coloca junto al de guardar:

```vue
<button type="submit">Guardar</button>
<button
  type="button"
  @click="descargarInforme"
  title="Descargar lista en PDF"
  aria-label="Descargar lista en PDF"
>
  🖨️
</button>
```

El tipo `button` es importante. Si se omite dentro de un `<form>`, puede
comportarse como `submit` y guardar el formulario accidentalmente.

---

## 16. Cargar datos JSON desde Express

Para catálogos que no necesitan MongoDB:

```js
import fs from "fs";

app.get("/api/especialidades", (req, res) => {
  const texto = fs.readFileSync(
    "./backend/data/especialidades.json",
    "utf-8",
  );
  res.json(JSON.parse(texto));
});
```

En el frontend:

```js
export async function obtenerEspecialidades() {
  const respuesta = await axios.get(
    "http://localhost:3000/api/especialidades",
  );
  return respuesta.data;
}
```

No guardes en MongoDB un catálogo fijo si solo necesitas leerlo, salvo que el
ejercicio pida administrarlo.

---

## 17. UTF-8 y tildes

Para que funcionen `García`, `Pediatría` y `A Coruña`:

1. Guarda los archivos como UTF-8.
2. Usa `<meta charset="UTF-8">`.
3. Devuelve JSON con UTF-8.
4. No mezcles conversiones ANSI, Latin-1 y UTF-8.
5. Comprueba los datos ya guardados en MongoDB.

En Express:

```js
res.setHeader("Content-Type", "application/json; charset=utf-8");
```

Si la respuesta contiene `�`, normalmente el dato ya llegó corrupto antes de
guardarse. Cambiar solo el CSS no arregla una codificación rota en la base de
datos.

---

## 18. Arranque completo de la aplicación

Cada vez que vuelvas al proyecto:

### Terminal 1: MongoDB

```bash
docker compose up -d
```

### Terminal 2: frontend y backend

```bash
npm start
```

Direcciones:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
```

Prueba primero el backend:

```text
http://localhost:3000/api/pacientes
http://localhost:3000/api/doctores
http://localhost:3000/api/citas
```

Si devuelve un array JSON, Express y MongoDB están funcionando.

---

## 19. Orden recomendado para hacer el examen

No intentes hacer todo a la vez. Sigue este orden:

1. Crear el proyecto Vue y comprobar que aparece la pantalla.
2. Crear `App.vue`, el menú y el router.
3. Crear una página sencilla con un formulario local.
4. Añadir `ref`, `reactive`, `v-model`, `v-if` y `v-for`.
5. Instalar Axios y crear un archivo `src/api`.
6. Crear Express y comprobar una ruta `GET`.
7. Arrancar MongoDB.
8. Crear el modelo Mongoose.
9. Crear `GET` y `POST`.
10. Conectar la tabla y el botón Guardar.
11. Añadir `PUT` y `DELETE`.
12. Añadir validaciones.
13. Añadir alertas.
14. Aplicar estilos.
15. Añadir PDF.
16. Probar errores, recargar y compilar.

Este orden permite saber exactamente en qué capa está el fallo.

---

## 20. Checklist de una página CRUD

Antes de darla por terminada, comprueba:

- [ ] Tiene un objeto `reactive` con todos los campos.
- [ ] Cada input tiene `v-model`.
- [ ] El formulario usa `@submit.prevent`.
- [ ] Los campos obligatorios tienen `required`.
- [ ] El botón se desactiva mientras guarda.
- [ ] Existe `onMounted` para cargar la tabla.
- [ ] Existe una función `GET`.
- [ ] Existe una función `POST`.
- [ ] Existe una función `PUT` si se edita.
- [ ] Existe una función `DELETE`.
- [ ] La ruta Express está registrada en `server.js`.
- [ ] La ruta usa el modelo correcto.
- [ ] Los errores tienen `try/catch`.
- [ ] La tabla tiene `:key`.
- [ ] Después de guardar o borrar se actualiza la lista.
- [ ] Los datos aparecen realmente en MongoDB.
- [ ] Se puede recargar la página sin perder los datos.

---

## 21. Errores típicos y cómo localizarlos

### `Network Error` o `ERR_CONNECTION_REFUSED`

El backend no está arrancado o el puerto de Axios es incorrecto.

Comprueba:

```text
http://localhost:3000/api/doctores
```

### La pantalla está en blanco

Mira la consola del navegador. Suele ser:

- Import mal escrito.
- Componente no importado en el router.
- Error de sintaxis en `<script setup>`.
- Nombre de variable distinto en template y script.

### Se guarda en la pantalla, pero no en MongoDB

Puede que solo se haya hecho:

```js
lista.value.push(dato);
```

Eso cambia la pantalla, pero no guarda nada. Primero hay que ejecutar
`await saveDato(dato)`.

### Se duplica un registro

Normalmente se está añadiendo manualmente a la lista sin comprobar el resultado
del servidor o se pulsa dos veces. Usa una bandera `guardando` y un índice
único en Mongoose.

### El `select` muestra el código y no el nombre

Es normal guardar el código. Para la tabla hay que buscar el objeto del
catálogo y mostrar su `nm`, como hace `nombreProvincia`.

### Las tildes aparecen como `�`

Revisa UTF-8 en el archivo, la respuesta HTTP y el valor que ya está en
MongoDB. Si el dato está roto en la base de datos, hay que corregirlo allí.

### El botón del PDF guarda el formulario

Dentro de un formulario, añade:

```html
type="button"
```

### El cambio de página funciona, pero al recargar da 404

`createWebHistory()` necesita que el servidor de producción devuelva
`index.html` para las rutas internas. En desarrollo Vite suele resolverlo.

---

## 22. Qué mirar en MongoDB Compass

La aplicación de ejemplo crea:

```text
bbdd
├─ pacientes
├─ doctores
└─ citas
```

Al probar:

1. Guarda un paciente desde la web.
2. Actualiza la colección `pacientes` en Compass.
3. Comprueba que aparece el documento.
4. Modifica el paciente.
5. Comprueba que el mismo documento cambió.
6. Bórralo y comprueba que desapareció.

Haz lo mismo con doctores y citas. Esta comprobación demuestra que no es una
interfaz falsa: existe persistencia real.

---

## 23. Resumen para memorizar

```text
Vue pinta y recoge datos.
v-model une inputs con variables.
Axios manda peticiones.
Express recibe peticiones.
Las rutas deciden la operación.
Mongoose define y valida documentos.
MongoDB guarda los datos.
Router cambia de página.
SweetAlert2 informa al usuario.
jsPDF genera informes.
Docker ejecuta MongoDB.
```

Para crear una página nueva:

```text
1. Modelo
2. Ruta Express
3. Registro en server.js
4. Funciones Axios
5. Componente Vue
6. Ruta del router
7. Enlace del menú
8. Validación
9. Prueba en navegador y MongoDB
```

Si todas esas piezas están conectadas, la página funciona de verdad.
