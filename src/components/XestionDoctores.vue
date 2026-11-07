<template>
  <!-- Pantalla CRUD de doctores: el formulario escribe en la API y la tabla lee su resultado. -->
  <div class="xestion-doctores">
    <h4>🩺 Xestión de doctores</h4>
    <form @submit.prevent="gardarDoctor">
      <div class="fila">
        <div class="campo campo-id">
          <div class="id-control">
            <input v-model="novoDoctor.iddoc" type="text" placeholder="ID automático" aria-label="ID do doctor" disabled />
            <button
              type="button"
              @click="limpiaFormdoc"
              style="font-size: 20px"
            >
              🧹
            </button>
          </div>
        </div>
        <div class="campo campo-nome">
          <input
            id="nome"
            v-model="novoDoctor.nomedoc"
            type="text"
            placeholder="Nome"
            aria-label="Nome"
            required
            @blur="normalizarNome('nomedoc')"
          />
        </div>
        <div class="campo campo-apelidos">
          <input
            id="apellido"
            v-model="novoDoctor.apeldoc"
            type="text"
            placeholder="Apelidos"
            aria-label="Apelidos"
            required
            @blur="normalizarNome('apeldoc')"
          />
        </div>
      </div>
      <div class="fila">
        
        <div class="campo movil">
          <input
            v-model="novoDoctor.movildoc"
            type="tel"
            placeholder="Móbil"
            aria-label="Móbil"
            size="20"
            required
            pattern="[67][0-9]{8}"
            @input="mobilComprobado = false"
            @blur="comprobarMobil"
            :class="{ 'mobil-invalido': mobilComprobado && mobilInvalido }"
            :aria-invalid="mobilComprobado && mobilInvalido"
          />
        </div>
        <div class="campo campo-correo">
          <input
            v-model="novoDoctor.maildoc"
            type="email"
            placeholder="Correo electrónico"
            aria-label="Correo electrónico"
            required
            @input="correoComprobado = false"
            @blur="comprobarCorreo"
            :class="{ 'correo-invalido': correoComprobado && correoInvalido }"
            :aria-invalid="correoComprobado && correoInvalido"
          />
        </div>

        <div class="campo especialidad">
          <select
            id="especialidade"
            v-model="novoDoctor.espedoc"
            aria-label="Especialidad"
            :class="{ 'campo-vacio': !novoDoctor.espedoc }"
            required
          >
            <option value="">Selecciona una especialidad:</option>
            <option
              v-for="especialidad in especialidades"
              :key="especialidad.id"
              :value="especialidad.nm"
            >
              {{ especialidad.nm }}
            </option>
          </select>
        </div>
      </div>

      <div class="fila fila-colegiado">
        <div class="campo colegiado">
          <label>Colegiado:</label>
          <label>
            <input
              v-model="novoDoctor.coledoc"
              type="radio"
              name="colegiado"
              value="Si"
              required
            />
            Si
          </label>
          <label>
            <input
              v-model="novoDoctor.coledoc"
              type="radio"
              name="colegiado"
              value="No"
            />
            No
          </label>
        </div>
      </div>

      <div class="botones-formulario">
        <button
          type="submit"
          class="btn-guardar"
          :disabled="
            novoDoctor.nomedoc === '' ||
            novoDoctor.apeldoc === '' ||
            novoDoctor.coledoc === '' ||
            novoDoctor.movildoc === '' ||
            novoDoctor.maildoc === '' ||
            guardando ||
            mobilInvalido ||
            correoInvalido
          "
        >
          Gardar
        </button>
        <button
          type="button"
          class="btn-pdf"
          @click="descargarInforme"
          title="Descargar lista de doctores en PDF"
          aria-label="Descargar lista de doctores en PDF"
        >
          🖨️
        </button>
      </div>
    </form>
    <p v-if="mensaxeErro" class="mensaxe-erro">{{ mensaxeErro }}</p>
    <div class="listaxe-cabecera">
      <h4>📋 Listaxe de doctores</h4>
      <button type="button" class="btn-buscar" @click="cargarDoctores" title="Actualizar listaxe">
        ⟳
      </button>
    </div>
    <table v-if="doctores.length > 0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Código</th>
          <th>Apelidos</th>
          <th>Nome</th>
          <th>Movil</th>
          <th>Especialidad</th>
          <th>Accións</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(u, index) in doctores" :key="index">
          <td style="text-align: center;">{{ index + 1 }}</td>
          <td style="text-align: center">{{ u.iddoc }}</td>
          <td>{{ u.apeldoc }}</td>
          <td>{{ u.nomedoc }}</td>
          <td>{{ u.movildoc }}</td>
          <td style="text-align: center">{{ u.espedoc }}</td>
          <td style="text-align: center">
            <button @click="editarDoctor(index)" title="Editar">✏️</button>
            <button @click="eliminarDoctor(index)" title="Eliminar">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>Non hai doctores cargados.</p>
  </div>
</template>

<script setup>
// ref/reactive mantienen el estado que usa la plantilla; onMounted carga datos al entrar.
import { computed, ref, reactive, onMounted } from "vue";
// Estas funciones son el puente con Express: Express es quien persiste en MongoDB.
import { obtenerEspecialidades } from "../api/especialidades.js";
import { saveDoctor, getDoctores, getDoctorByEspecialidad, modifyDoctor, deleteDoctor } from "../api/doctores.js";
import { alertaError, alertaExito } from "../utils/alertas.js";
import jsPDF from "jspdf";

// Lista visible y datos auxiliares del formulario.
const doctores = ref([]);
const especialidades = ref([]);
const mobilComprobado = ref(false);
const correoComprobado = ref(false);
const guardando = ref(false);
const mensaxeErro = ref("");
const editando = ref(false);
const novoDoctor = reactive({
  iddoc: "",
  nomedoc: "",
  apeldoc: "",
  maildoc: "",
  movildoc: "",
  coledoc: "",
  espedoc: "",
});

const mobilInvalido = computed(() => {
  return (
    novoDoctor.movildoc !== "" &&
    !/^[67]\d{8}$/.test(novoDoctor.movildoc)
  );
});

const correoInvalido = computed(() => {
  return (
    novoDoctor.maildoc !== "" &&
    !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(
      novoDoctor.maildoc,
    )
  );
});

async function cargarDoctores() {
  try {
    doctores.value = await getDoctores();
  } catch (error) {
    console.error("Error ao cargar doctores:", error);
    mensaxeErro.value = error.response?.data?.mensaje ||
      "Non se puideron cargar os doctores. Comproba que o backend estea iniciado.";
  }
}

// Al abrir la pantalla se cargan doctores y especialidades desde el backend.
onMounted(async () => {
  await cargarDoctores();
  try {
    especialidades.value = await obtenerEspecialidades();
  } catch (error) {
    console.error("Error ao cargar especialidades:", error);
    mensaxeErro.value =
      "Non se puideron cargar as especialidades. Comproba a conexión co servidor.";
  }
});

function descargarInforme() {
  if (doctores.value.length === 0) {
    mensaxeErro.value = "Non hai doctores cargados para crear o informe.";
    return;
  }

  const documento = new jsPDF();
  documento.setFontSize(16);
  documento.text("Lista de doctores", 20, 20);
  documento.setFontSize(10);
  let y = 32;

  doctores.value.forEach((doctor, index) => {
    const linea = `${index + 1}. ${doctor.nomedoc} ${doctor.apeldoc} | ID: ${doctor.iddoc} | ${doctor.espedoc} | ${doctor.movildoc}`;
    documento.text(linea, 20, y);
    y += 8;
    if (y > 280 && index < doctores.value.length - 1) {
      documento.addPage();
      y = 20;
    }
  });

  documento.save("lista-doctores.pdf");
}

// Funciones de limpieza y validación ejecutadas por los eventos del formulario.

function normalizarNome(campo) {
  novoDoctor[campo] = novoDoctor[campo]
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function comprobarMobil() {
  novoDoctor.movildoc = novoDoctor.movildoc.trim();
  mobilComprobado.value = true;
}

function comprobarCorreo() {
  novoDoctor.maildoc = novoDoctor.maildoc.trim();
  correoComprobado.value = true;
}

function limpiaFormdoc() {
  Object.assign(novoDoctor, {
    iddoc: "",
    nomedoc: "",
    apeldoc: "",
    maildoc: "",
    movildoc: "",
    coledoc: "",
    espedoc: "",
  });
  mobilComprobado.value = false;
  correoComprobado.value = false;
  mensaxeErro.value = "";
  editando.value = false;
}

function nuevoIdDoctor() {
  const numeros = doctores.value
    .map((doctor) => Number(doctor.iddoc))
    .filter((id) => Number.isInteger(id));
  return String((numeros.length ? Math.max(...numeros) : 0) + 1);
}

async function gardarDoctor() {
  guardando.value = true;
  mensaxeErro.value = "";
  try {
    if (!editando.value) novoDoctor.iddoc = nuevoIdDoctor();
    const datos = { ...novoDoctor };
    const doctor = editando.value
      ? await modifyDoctor(novoDoctor.iddoc, datos)
      : await saveDoctor(datos);
    const posicion = doctores.value.findIndex((item) => item.iddoc === doctor.iddoc);
    if (posicion === -1) doctores.value.push(doctor);
    else doctores.value[posicion] = doctor;
    await alertaExito(editando.value ? "Doctor modificado." : "Doctor guardado.");
    limpiaFormdoc();
  } catch (error) {
    console.error("Error ao gardar doctor:", error);
    mensaxeErro.value = error.response?.data?.mensaje || "Non se puido gardar o doctor.";
    await alertaError(mensaxeErro.value);
  } finally {
    guardando.value = false;
  }
}

function editarDoctor(index) {
  Object.assign(novoDoctor, doctores.value[index]);
  editando.value = true;
}

async function eliminarDoctor(index) {
  const doctor = doctores.value[index];
  try {
    await deleteDoctor(doctor.iddoc);
    doctores.value.splice(index, 1);
    await alertaExito("Doctor eliminado.");
  } catch (error) {
    console.error("Error ao eliminar doctor:", error);
    await alertaError("Non se puido eliminar o doctor.");
  }
}

</script>

<style scoped>
/* Maquetación del formulario y de la tabla; no cambia la comunicación con la BBDD. */
.xestion-doctores {
  width: 100%;
  /* opcional para que no crezca demasiado en pantallas muy grandes */
  background: white;
  padding: 2rem;
  overflow: visible;
  border-radius: 2px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.fila {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}

.campo {
  display: flex;
  align-items: center;
  /* label e input en la misma línea */
  gap: 0.5rem;
  border-radius: 0px;
  min-width: 0;
  flex: 1 1 0;
}

.campo-id {
  flex: 0 0 auto;
  min-width: 0;
  border-radius: 0px;
}

.id-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.id-control input {
  flex: 0 0 180px;
  width: 180px;
  min-width: 180px;
  text-align: center;
}

.id-control button {
  flex: 0 0 auto;
  padding: 0.25rem 0.45rem;
}

.campo-nome {
  flex: 1.5 1 0;
  border-radius: 0px;
}

.campo-apelidos {
  flex: 2 1 0;
}

.colegiado {
  flex: 0 0 190px;
  min-width: 190px;
  justify-content: center;
  white-space: nowrap;
}

.fila-colegiado {
  justify-content: center;
}

.colegiado input[type="radio"] {
  flex: 0 0 auto;
  width: auto;
  margin: 0;
  transform: scale(1.35);
}

.fecha-nacimiento {
  flex: 1.6 1 0;
  min-width: 230px;
}

.campo-correo {
  flex: 1 1 0;
  border-radius: 0px;
}

.campo-correo input.correo-invalido {
  border-color: #e58b8b;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
  box-shadow: 0 0 0 2px rgba(229, 139, 139, 0.15);
}

.movil {
  flex: 0 0 auto;
}

.movil input {
  flex: 0 0 20ch;
  width: 20ch;
  text-align: center;
}

.movil input.mobil-invalido {
  border-color: #e58b8b;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
  box-shadow: 0 0 0 2px rgba(229, 139, 139, 0.15);
}

.campo select {
  flex: 1;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 0px;
  width: 100%;
}

.especialidad {
  flex: 1 1 0;
  min-width: 0;
}

.especialidad select,
.especialidad option {
  color: #000;
  -webkit-text-fill-color: #000;
}

.especialidad select {
  color-scheme: light;
}

.campo-provincia {
  flex: 1;
  /* ocupa menos espacio */
  border-radius: 0px;
}

.campo-provincia select,
.campo-provincia option {
  color: #000;
}

.campo-municipio select,
.campo-municipio option {
  color: #000;
}

.campo label {
  min-width: 70px;
  font-weight: 500;
  font-size: 0.85rem;
}

.campo input {
  flex: 1;
  padding: 0.65rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  font: inherit;
  font-size: 0.9rem;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
}

.campo input::placeholder {
  color: #6b6375;
  -webkit-text-fill-color: #6b6375;
  opacity: 1;
}

.campo select {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  font: inherit;
  font-size: 0.9rem;
  background-color: #fff;
  border-radius: 6px;
}

.campo select.campo-vacio {
  color: #6b6375;
  -webkit-text-fill-color: #6b6375;
}

.fecha-nacimiento input {
  min-width: 145px;
}

.btn-guardar {
  background-color: #fff;
  color: #009900;
  border: 2px solid #009900;
  padding: 0.5rem 1.7rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  margin: 0 auto;
  display: block;
}

.botones-formulario {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.6rem;
}

.botones-formulario .btn-guardar {
  margin: 0;
}

.btn-pdf {
  border: 2px solid #009900;
  border-radius: 8px;
  background: #fff;
  color: #009900;
  padding: 0.45rem 0.7rem;
  font-size: 1.2rem;
  cursor: pointer;
}

.btn-pdf:hover {
  background: #009900;
  color: #fff;
}

.btn-guardar:hover {
  background-color: #009900;
  color: #fff;
  border-radius: 8px;
}

.button {
  background: none;
  border: 2px solid #ddd;
  cursor: pointer;
  font-size: 1rem;
}

table {
  width: 100%;
  border-collapse: separate;
  margin-top: 1rem;
  font-size: 0.8rem;
  border: 1px solid #ddd;
}

th,
td {
  border: 1px solid #ddd;
  padding: 0.7rem;
  text-align: left;
}

th {
  text-align: center;
  background-color: #f8f9fa;
}

h4 {
  margin-bottom: 1rem;
  font-weight: 600;
  background-color: #009900;
  color: white;
}

@media (max-width: 768px) {
  .xestion-pacientes {
    padding: 1rem;
    /* reducir el padding en pantallas pequeñas */
  }

  .fila {
    flex-direction: column;
    /* apila los campos verticalmente en móviles */
    gap: 0.5rem;
    /* opcional: un pequeño espacio entre ellos */
  }

  .campo-id {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  }

  .colegiado {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  }

  .id-control {
    flex-wrap: wrap;
  }
}
</style>
