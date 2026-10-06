<template>
  <div class="xestion-pacientes">
    <h4>👥 Xestión de pacientes</h4>
    <form @submit.prevent="gardarUsuario">
      <div class="fila">
        <div class="campo campo-dni">
          <label>DNI/CIF:</label>
          <div class="dni-control">
            <input
              v-model="novoPaciente.dnipac"
              type="text"
              required
              autocomplete="off"
              style="text-align: center"
              @input="dniComprobado = false"
              @blur="normalizarDni"
              :class="{
                'dni-invalido': dniComprobado && dniInvalido,
                'dni-correcto': dniComprobado && !dniInvalido,
              }"
              :aria-invalid="dniComprobado && dniInvalido"
            />
            <small v-if="dniComprobado && dniInvalido" class="mensaxe-dni">
              DNI inválido
            </small>
            <button type="button" @click="buscarPaciente" style="font-size: 20px;">🔍</button>
            <button type="button" @click="editarPaciente" style="font-size: 20px;">✏️</button>
          </div>
        </div>
        <div class="campo campo-nome">
          <label>Nome:</label>
          <input
            v-model="novoPaciente.nomepac"
            type="text"
            required
            @blur="normalizarNome('nomepac')"
          />
        </div>
        <div class="campo campo-apelidos">
          <label>Apelidos:</label>
          <input
            v-model="novoPaciente.apelpac"
            type="text"
            required
            @blur="normalizarNome('apelpac')"
          />
        </div>
      </div>
      <div class="fila">
        <div class="campo fecha-nacimiento">
          <label>Fecha de nacemento:</label>
          <input v-model="novoPaciente.nacipac" type="date" required />
        </div>
        <div class="campo campo-correo">
          <label>Correo:</label>
          <input
            v-model="novoPaciente.mailpac"
            type="email"
            required
            @input="correoComprobado = false"
            @blur="comprobarCorreo"
            :class="{ 'correo-invalido': correoComprobado && correoInvalido }"
            :aria-invalid="correoComprobado && correoInvalido"
          />
        </div>
        <div class="campo movil">
          <label>Móbil:</label>
          <input
            v-model="novoPaciente.movilpac"
            type="tel"
            size="20"
            required
            pattern="[67][0-9]{8}"
            @input="mobilComprobado = false"
            @blur="comprobarMobil"
            :class="{ 'mobil-invalido': mobilComprobado && mobilInvalido }"
            :aria-invalid="mobilComprobado && mobilInvalido"
          />
        </div>
      </div>

      <div class="fila">
        <div class="campo direccion">
          <label>Dirección:</label>
          <input v-model="novoPaciente.dirpac" type="text" required />
        </div>
        <div class="campo campo-provincia">
          <label>Provincia:</label>
          <select
            v-model="novoPaciente.propac"
            @change="cargarMunicipios"
            required
          >
          <option value="">-- Escolle unha provincia --</option>
            <option v-for="provincia in provincias" :key="provincia.id" :value="provincia.id">
              {{ provincia.nm }}
            </option>
          </select>
        </div>
        <div class="campo campo-municipio">
          <label>Municipio:</label>
            <select id="municipio" v-model="novoPaciente.munipac" required>
            <option value="">-- Escolle un municipio --</option>
            <option
              v-for="municipio in municipios"
              :key="municipio.id"
              :value="municipio.id"
            >
              {{ municipio.nm }}
            </option>
          </select>
        </div>
      </div>

      <div class="campo-condicions">
        <label>
          <input v-model="novoPaciente.lopdpac" type="checkbox" /> Aceptar la
          <a
            :href="$router.resolve({ name: 'PoliticaPrivacidad' }).href"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidad y Confidencialidad
          </a>
        </label>
      </div>

      <button
        type="submit"
        class="btn-guardar"
        :disabled="
          novoPaciente.dnipac === '' ||
          novoPaciente.nomepac === '' ||
          novoPaciente.apelpac === '' ||
          novoPaciente.movilpac === '' ||
          !novoPaciente.lopdpac ||
          guardando ||
          dniInvalido ||
          mobilInvalido ||
          correoInvalido
        "
      >
        Gardar
      </button>
    </form>
    <p v-if="mensaxeErro" class="mensaxe-erro">{{ mensaxeErro }}</p>
    <h4>📋 Listaxe de pacientes</h4>
    <table v-if="pacientes.length > 0">
      <thead>
        <tr>
          <th>#</th>
          <th>DNI/CIF</th>
          <th>Nome</th>
          <th>Correo</th>
          <th>Provincia</th>
          <th>Accións</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(u, index) in pacientes" :key="index">
          <td>{{ index + 1 }}</td>
          <td style="text-align: center">{{ u.dnipac }}</td>
          <td>{{ u.nomepac }}</td>
          <td>{{ u.mailpac }}</td>
          <td>{{ u.propac }}</td>
          <td style="text-align: center">
            <button @click="editarUsuario(index)" title="Editar">✏️</button>
            <button @click="eliminarPaciente(index)" title="Eliminar">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>Non hai pacientes cargados.</p>
  </div>
</template>

<script setup>
/// Zona de declaracións
import { ref, reactive, computed, onMounted } from "vue";
import { obtenerMunicipios,obtenerProvincias } from "../api/municipios.js";
import {
  getPacientes,
  savePaciente,
  deletePaciente,
  modifyPaciente,
} from "../api/pacientes.js";

const pacientes = ref([]); //almacena la lista de pacientes e os seus cambios
const editando = ref(false); //indica se estamos editando un paciente existente
const dniComprobado = ref(false);
const mobilComprobado = ref(false);
const correoComprobado = ref(false);
const municipios = ref([]);
const guardando = ref(false);
const mensaxeErro = ref("");

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

const dniInvalido = computed(() => {
  const dni = novoPaciente.dnipac.toUpperCase();

  if (dni.length === 0) {
    return false;
  }

  if (!/^\d{8}[A-Z]$/.test(dni)) {
    return true;
  }

  const letras = "TRWAGMYFPDXBNJZSQVHLCKE";
  return letras[Number(dni.slice(0, 8)) % 23] !== dni.at(-1);
});

const mobilInvalido = computed(() => {
  return novoPaciente.movilpac !== "" && !/^[67]\d{8}$/.test(novoPaciente.movilpac);
});

const correoInvalido = computed(() => {
  return (
    novoPaciente.mailpac !== "" &&
    !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(
      novoPaciente.mailpac,
    )
  );
});

const provincias = ref([]);

onMounted(async () => {
  try {
    pacientes.value = await getPacientes();
  } catch (error) {
    console.error("Error ao cargar pacientes:", error);
  }

  try {
    provincias.value = await obtenerProvincias();
  } catch (error) {
    console.error("Error ao cargar provincias:", error);
  }
});

/// Zona de métodos ou funcións

async function cargarMunicipios() {
  if (novoPaciente.propac === "") {
    municipios.value = [];
    return;
  }

  municipios.value = await obtenerMunicipios(novoPaciente.propac);
}

function normalizarDni() {
  novoPaciente.dnipac = novoPaciente.dnipac.trim().toUpperCase();
  dniComprobado.value = novoPaciente.dnipac !== "";
}

function normalizarNome(campo) {
  novoPaciente[campo] = novoPaciente[campo]
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function comprobarMobil() {
  novoPaciente.movilpac = novoPaciente.movilpac.trim();
  mobilComprobado.value = true;
}

function comprobarCorreo() {
  novoPaciente.mailpac = novoPaciente.mailpac.trim();
  correoComprobado.value = true;
}

async function gardarUsuario() {
  if (dniInvalido.value) {
    return;
  }

  guardando.value = true;
  mensaxeErro.value = "";

  try {
    const pacienteGardado = await savePaciente({ ...novoPaciente });
    pacientes.value.push(pacienteGardado);
    Object.assign(novoPaciente, {
      dnipac: "",
      nomepac: "",
      apelpac: "",
      nacipac: "",
      mailpac: "",
      movilpac: "",
      dirpac: "",
      propac: "",
      munipac: "",
    }); //reinicia o formulario
    municipios.value = [];
    dniComprobado.value = false;
    mobilComprobado.value = false;
    correoComprobado.value = false;
  } catch (error) {
    console.error("Error ao gardar paciente:", error);
    mensaxeErro.value = "Non se puido gardar o paciente. Comproba a conexión con MongoDB.";
  } finally {
    guardando.value = false;
  }
}

async function eliminarPaciente(index) {
  try {
    await deletePaciente(pacientes.value[index].dnipac);
    pacientes.value.splice(index, 1); //elimina o usuario da lista
  } catch (error) {
    console.error("Error ao eliminar paciente:", error);
  }
}

function editarUsuario(index) {
  const usuario = pacientes.value[index]; //carga os datos do usuario elixido no formulario
  Object.assign(novoPaciente, usuario); // carga os datos do usuario no formulario recorda v-model do formulario é novoPaciente
  dniComprobado.value = false;
  mobilComprobado.value = false;
  correoComprobado.value = false;
}

async function buscarPaciente() {
  try {
    const dni = novoPaciente.dnipac.trim();

    if (!dni) {
      mensaxeErro.value = "Introduce un DNI.";
      return;
    }

    const pacientesCargados = await getPacientes();
    const paciente = pacientesCargados.find(
      (pacienteActual) => pacienteActual.dnipac?.toUpperCase() === dni.toUpperCase(),
    );

    if (!paciente) {
      mensaxeErro.value = "Non se atopou ningún paciente con ese DNI.";
      return;
    }

    Object.assign(novoPaciente, paciente);
    await cargarMunicipios();
    dniComprobado.value = true;
    mobilComprobado.value = true;
    correoComprobado.value = true;
    mensaxeErro.value = "";
  } catch (error) {
    console.error("Error ao buscar paciente:", error);
    mensaxeErro.value = "Ocorreu un erro ao buscar o paciente. Comproba a conexión con MongoDB.";
  }
}

async function editarPaciente() {
  await buscarPaciente();
}

</script>

<style scoped>
.xestion-pacientes {
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

.campo-dni {
  flex: 0 1 310px;
  min-width: 310px;
  border-radius: 0px;
}

.dni-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.dni-control input {
  flex: 0 0 125px;
  width: 125px;
  min-width: 125px;
}

.dni-control input.dni-invalido {
  border-color: #e58b8b;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
  box-shadow: 0 0 0 2px rgba(229, 139, 139, 0.15);
}

.dni-control input.dni-correcto {
  border-color: #1cca88;
  box-shadow: 0 0 0 2px rgba(28, 202, 136, 0.15);
}

.mensaxe-dni {
  display: block;
  flex: 0 0 auto;
  color: #b42323;
  font-size: 0.55rem;
  white-space: nowrap;
}

.campo-nome {
  flex: 1.5 1 0;
  border-radius: 0px;
}

.campo-apelidos {
  flex: 2 1 0;
}

.fecha-nacimiento {
  flex: 1.6 1 0;
  min-width: 230px;
}

.campo-correo {
  flex: 2.4 1 0;
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
  /* ocupa todo el espacio restante */
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0px;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  font-size: 0.85rem;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
}

.campo select {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  font-size: 0.85rem;
  background-color: #fff;
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

  .campo-dni {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  }

  .dni-control {
    flex-wrap: wrap;
  }
}
</style>
