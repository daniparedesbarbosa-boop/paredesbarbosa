# Cambios realizados

Este documento explica, de forma sencilla, qué archivos se han cambiado y para qué sirve cada cambio.

## 1. `backend/modelos/cita.js`

**Qué se hizo:** se añadieron tres datos nuevos a cada cita.

**Cambios concretos:**

- `diagnostico`: guarda el diagnóstico escrito por el profesional.
- `tratamento`: guarda el tratamiento indicado.
- `precio`: guarda el precio de la consulta. Si no se indica, empieza en `0`.

**Explicación sencilla:** antes una cita solo podía guardar información básica. Ahora también puede recordar el diagnóstico, el tratamiento y el precio.

**Código añadido:**

```js
diagnostico: {
    type: String,
    default: ""
},
tratamento: {
    type: String,
    default: ""
},
precio: {
    type: Number,
    default: 0
},
```

## 2. `backend/rutas/citas.rutas.js`

**Qué se hizo:** se permitió recibir y guardar los tres datos nuevos.

**Cambios concretos:**

- Se añadió `diagnostico` a la lista de campos aceptados.
- Se añadió `tratamento` a la lista de campos aceptados.
- Se añadió `precio` a la lista de campos aceptados.

**Explicación sencilla:** aunque el formulario envíe diagnóstico, tratamiento y precio, el servidor no los descartará y los guardará en la base de datos.

**Código añadido:**

```js
const camposCita = [
    "pacienteId",
    "doctorId",
    "fecha",
    "hora",
    "motivo",
    "observacions",
    "diagnostico",
    "tratamento",
    "precio",
    "estado"
]
```

## 3. `src/components/Citas.vue`

**Qué se hizo:** se amplió la pantalla de gestión de citas.

**Cambios concretos:**

- Se añadió un campo para escribir el diagnóstico.
- Se añadió un campo para escribir el tratamiento.
- Se añadió un campo para indicar el precio de la consulta.
- Se añadió la casilla **Listar todas** para mostrar todas las citas o solo las del paciente seleccionado.
- La tabla ahora muestra diagnóstico, tratamiento y precio.
- El PDF generado también incluye diagnóstico, tratamiento, precio y estado.
- Los datos nuevos se cargan al editar una cita y se envían al guardar o modificar.

**Explicación sencilla:** esta pantalla ya permite guardar más información sobre una cita y consultar todas las citas si se activa **Listar todas**.

**Campos añadidos al formulario:**

```vue
<label class="form-field rounded-xl border border-slate-200 bg-white p-3">
  <span>Prezo (€)</span>
  <input v-model.number="cita.precio" type="number" min="0" step="0.01" required>
</label>

<label class="form-field form-field--wide rounded-xl border border-slate-200 bg-white p-3">
  <span>Diagnóstico</span>
  <textarea v-model.trim="cita.diagnostico" rows="3" maxlength="1000"></textarea>
</label>

<label class="form-field form-field--wide rounded-xl border border-slate-200 bg-white p-3">
  <span>Tratamento</span>
  <textarea v-model.trim="cita.tratamento" rows="3" maxlength="1000"></textarea>
</label>
```

**Casilla para listar todas las citas:**

```vue
<label class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
  <input v-model="listarTodas" type="checkbox" class="h-4 w-4 accent-green-600">
  Listar todas
</label>
```

**Columna que decide qué citas se muestran:**

```js
const listarTodas = ref(false)

const citasFiltradas = computed(() => {
  if (listarTodas.value) return citas.value
  if (!pacienteStore.idPaciente) return []
  return citas.value.filter(
    (item) => idRelacionado(item.pacienteId) === String(pacienteStore.idPaciente)
  )
})
```

**Valores iniciales añadidos a una cita vacía:**

```js
const citaVacia = () => ({
  _id: "",
  pacienteId: "",
  doctorId: "",
  fecha: "",
  hora: "",
  motivo: "",
  observacions: "",
  diagnostico: "",
  tratamento: "",
  precio: 0,
  estado: "pendente"
})
```

**Datos añadidos al guardar o modificar:**

```js
const datosCita = {
  pacienteId: cita.pacienteId,
  doctorId: cita.doctorId,
  fecha: cita.fecha,
  hora: cita.hora,
  motivo: cita.motivo.trim(),
  observacions: cita.observacions.trim(),
  diagnostico: cita.diagnostico.trim(),
  tratamento: cita.tratamento.trim(),
  precio: Number(cita.precio || 0),
  estado: cita.estado
}
```

**Datos cargados al pulsar Editar:**

```js
function editarCita(item) {
  Object.assign(cita, citaVacia(), item, {
    observacions: item.observacions ?? "",
    diagnostico: item.diagnostico ?? "",
    tratamento: item.tratamento ?? "",
    precio: item.precio ?? 0
  })
  editando.value = true
}
```

**Nuevas columnas de la tabla:**

```vue
<th>Diagnóstico</th>
<th>Tratamento</th>
<th>Prezo</th>
```

```vue
<td>{{ item.diagnostico || "—" }}</td>
<td>{{ item.tratamento || "—" }}</td>
<td>{{ Number(item.precio || 0).toFixed(2) }} €</td>
```

**Nuevas columnas del PDF:**

```js
generarPDF(
  "Listaxe de citas",
  [
    "ID",
    "Paciente",
    "Profesional",
    "Data",
    "Hora",
    "Motivo",
    "Diagnóstico",
    "Tratamento",
    "Prezo",
    "Estado"
  ],
  citasFiltradas.value.map((cita) => [
    cita.id,
    nombrePaciente(cita.pacienteId),
    nombreDoctor(cita.doctorId),
    cita.fecha,
    cita.hora,
    cita.motivo,
    cita.diagnostico || "—",
    cita.tratamento || "—",
    `${Number(cita.precio || 0).toFixed(2)} €`,
    etiquetaEstado(cita.estado),
  ]),
  "listado_citas.pdf",
)
```

## 4. `src/components/NavBar.vue`

**Qué se hizo:** se añadió un enlace llamado **Acceso** al menú superior.

**Cambio concreto:**

- El enlace apunta a `/vista-acceso`.

**Explicación sencilla:** ahora una persona puede abrir la nueva pantalla de acceso desde el menú.

**Código añadido a la lista de enlaces:**

```js
const links = [
  { to: "/", label: "Inicio" },
  { to: "/servicios", label: "Servizos" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/doctores", label: "Profesionais" },
  { to: "/citas", label: "Citas" },
  { to: "/sobrenos", label: "Sobre nós" },
  { to: "/vista-acceso", label: "Acceso" },
]
```

## 5. `src/router/index.js`

**Qué se hizo:** se añadió la dirección web de la nueva pantalla de acceso.

**Cambio concreto:**

- Se creó la ruta `/vista-acceso`.
- Esta ruta carga el componente `VistaAcceso.vue`.

**Explicación sencilla:** cuando el navegador visita `/vista-acceso`, el sistema sabe qué página debe mostrar.

**Código añadido al archivo de rutas:**

```js
import VistaAcceso from "../components/VistaAcceso.vue";
```

```js
{ path: "/vista-acceso", name: "vista-acceso", component: VistaAcceso },
```

## 6. `src/components/VistaAcceso.vue`

**Qué se hizo:** se creó una pantalla nueva para introducir usuario y contraseña.

**Cambios concretos:**

- Incluye un campo para el usuario.
- Incluye un campo para la contraseña.
- Permite mostrar u ocultar la contraseña.
- El botón **Acceder** se deshabilita si uno de los dos campos está vacío.

**Explicación sencilla:** se añadió una pantalla visual de inicio de sesión. Por ahora solo muestra el usuario por consola al pulsar **Acceder**; todavía no comprueba credenciales ni inicia una sesión real.

**Código de los campos de usuario y contraseña:**

```vue
<input
  id="usuario"
  v-model="usuario"
  type="text"
  placeholder="Introduce o teu usuario"
  required
>

<input
  id="password"
  v-model="password"
  :type="showPassword ? 'text' : 'password'"
  placeholder="Introduce o contrasinal"
  required
>
```

**Código para mostrar u ocultar la contraseña:**

```vue
<button
  type="button"
  @click="showPassword = !showPassword"
>
  {{ showPassword ? "Ocultar" : "Ver" }}
</button>
```

**Código del botón Acceder:**

```vue
<button
  type="submit"
  :disabled="usuario.trim() === '' || password.trim() === ''"
>
  Acceder
</button>
```

**Código JavaScript del componente:**

```js
import { ref } from "vue"

const usuario = ref("")
const password = ref("")
const showPassword = ref(false)

function handleLogin() {
  console.log("Iniciando sesión con o usuario:", usuario.value)
}
```
