<template>
  <div class="w-full overflow-visible bg-white p-8 shadow-md max-md:p-4 [&_form]:mb-8 [&_form]:flex [&_form]:w-full [&_form]:flex-col [&_form]:gap-4 [&_.campo]:flex [&_.campo]:flex-1 [&_.campo]:items-center [&_.campo]:gap-2 [&_.campo_label]:min-w-20 [&_.dni-wrapper]:flex [&_.dni-wrapper]:w-full [&_.dni-wrapper]:items-center [&_.dni-wrapper]:gap-2 [&_input]:box-border [&_input]:flex-1 [&_input]:rounded-md [&_input]:border [&_input]:border-slate-300 [&_input]:p-2 [&_input]:outline-none [&_input]:focus:border-blue-500 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-slate-300 [&_select]:p-2 [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:p-3 [&_td]:border [&_td]:border-slate-300 [&_td]:p-3">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#009900] px-4 py-3">
      <h4 class="font-semibold text-white">👥 Xestión de usuarios</h4>
        <!-- :disabled impide enviar mientras falten los datos minimos o el consentimiento. -->
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#004800] shadow-sm transition hover:bg-[#eef8ee] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="usuarios.length === 0"
        @click="exportarPacientes"
      >
        📄 Exportar PDF
      </button>
    </div>
    <form @submit.prevent="modificarPaciente">
      <div class="flex w-full flex-col gap-2 md:flex-row md:gap-4">
        <div class="campo campo-dni">
          <label>DNI/CIF:</label>
          <div class="dni-wrapper">
            <input
              ref="dniInput"
              v-model="novoPaciente.dnipac"
              type="text"
              required
              class="text-center"
              :class="{ 'border-2 border-red-500 shadow-[0_0_0_1px_rgba(220,53,69,0.15)]': dniInvalido || errorDniServidor }"
              @input="normalizarDni"
              @blur="borrarDniSeInvalido"
            />
            <button type="button" title="Buscar paciente" @click="buscarPaciente">🔎</button>
            <button type="button" title="Limpar formulario" @click="limpiaFormpac">🧹</button>
            <small v-if="dniInvalido" class="whitespace-nowrap text-xs font-semibold text-red-600">DNI incorrecto</small>
            <small v-if="dniDuplicado" class="whitespace-nowrap text-xs font-semibold text-red-600">Este DNI ya está registrado</small>
          </div>
        </div>
        <div class="flex-[4] items-center gap-2 md:flex">
          <label>Nome:</label>
          <input
            v-model="novoPaciente.nomepac"
            type="text"
            required
            @input="capitalizarNombre"
          />
        </div>
        <div class="flex-[4] items-center gap-2 md:flex">
          <label>Apelidos:</label>
          <input
            v-model="novoPaciente.apelpac"
            type="text"
            required
            @input="capitalizarApellidos"
          />
        </div>
      </div>
      <div class="flex w-full flex-col gap-2 md:flex-row md:gap-4">
        <div class="campo campo-nacimiento">
          <label>Fecha de Nacimiento</label>
          <input v-model="novoPaciente.nacipac" type="date" required />
        </div>
        <div class="campo campo-direccion">
          <label>Dirección:</label>
          <input v-model="novoPaciente.dirpac" type="text" required />
        </div>
      </div>
      <div class="flex w-full flex-col gap-2 md:flex-row md:gap-4">
        <div class="campo campo-movil">
          <label>Movil:</label>
          <input
            v-model="novoPaciente.movilpac"
            type="tel"
            required
            inputmode="numeric"
            class="text-center"
            :class="{ 'border-2 border-red-500 shadow-[0_0_0_1px_rgba(220,53,69,0.15)]': movilInvalido }"
            @input="validarMovilEnEntrada"
            @blur="borrarMovilSeInvalido"
          />
        </div>
        <div class="campo campo-provincia">
          <label>Provincia:</label>
          <select
            id="provincia"
            v-model="novoPaciente.propac"
            required
            @change="cargarMunicipios"
          >
            <option disabled value="">Selecciona unha provincia</option>
            <option
              v-for="provincia in provincias"
              :key="provincia.id"
              :value="provincia.nm"
            >
              {{ provincia.nm }}
            </option>
          </select>
        </div>
        <div class="campo campo-municipio">
          <label>Municipio:</label>
          <select
            id="municipio"
            v-model="novoPaciente.munipac"
            required
            :disabled="!novoPaciente.propac"
          >
            <option disabled value="">Selecciona un municipio</option>
            <option
              v-for="municipio in municipios"
              :key="municipio.id"
              :value="municipio.nm"
            >
              {{ municipio.nm }}
            </option>
          </select>
        </div>
      </div>
      <div class="flex w-full flex-col gap-2 md:flex-row md:gap-4">
        <div class="campo campo-correo">
          <label>Correo:</label>
          <input
            v-model="novoPaciente.mailpac"
            type="email"
            required
            :class="{ 'border-2 border-red-500 shadow-[0_0_0_1px_rgba(220,53,69,0.15)]': correoInvalido }"
            @blur="borrarCorreoSeInvalido"
          />
        </div>
      </div>
      <div class="campo campo-condicions">
        <label>
          <input v-model="novoPaciente.lopdpac" type="checkbox" required />
          Acepto as condicións da
          <a
            :href="$router.resolve({ name: 'politica-privacidad' }).href"
            target="_blank"
            rel="noopener noreferrer"
          >
            Política de Privacidade e condicións de uso
          </a>
        </label>
      </div>
      <div class="flex justify-center gap-3">
        <button
          type="submit"
          class="rounded-lg border-0 bg-[#009900] px-6 py-2 font-bold text-white transition hover:bg-[#007a00] disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-65"
          :disabled="
            novoPaciente.dnipac === '' ||
            novoPaciente.nomepac === '' ||
            novoPaciente.apelpac === '' ||
            novoPaciente.movilpac === '' ||
            !novoPaciente.lopdpac
          "
        >
          Gardar
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-slate-100 px-6 py-2 text-slate-700 transition hover:bg-slate-200"
          @click="limpiaFormpac"
        >
          Limpar
        </button>
      </div>
    </form>
    <h4 class="mb-4 bg-[#009900] font-semibold text-white">📋 Listaxe de usuarios</h4>
    <table v-if="usuarios.length > 0">
      <thead>
        <tr>
          <th>#</th>
          <th>DNI/CIF</th>
          <th>Nome</th>
          <th>Apelidos</th>
          <th>Correo</th>
          <th>Provincia</th>
          <th>Municipio</th>
          <th>Accións</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(u, index) in usuarios" :key="index">
          <td class="text-center">{{ index + 1 }}</td>
          <td class="text-center">{{ u.dnipac }}</td>
          <td>{{ u.nomepac }}</td>
          <td>{{ u.apelpac }}</td>
          <td>{{ u.mailpac }}</td>
          <td>{{ u.propac }}</td>
          <td>{{ u.munipac }}</td>
          <td class="text-center">
            <button @click="seleccionarPaciente(u)" title="Seleccionar para una cita">📅</button>
            <button @click="editarUsuario(index)" title="Editar">✏️</button>
            <button @click="eliminarPaciente(index)" title="Eliminar">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>Non hai usuarios cargados.</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
// Catalogo de provincias/municipios que alimenta los selectores de ubicacion.
import { obtenerProvincias, obtenerMunicipios } from "../api/municipios.js";
import { usePacienteStore } from "../store/pacienteStore.js"
// Operaciones de lectura y escritura de pacientes en el backend.
import {
  savePaciente,
  getPacientes,
  deletePaciente,
  modifyPaciente,
} from "../api/pacientes.js";
// Dialogos comunes usados para confirmar acciones o informar de sus resultados.
import {
  alertaConfirmacion,
  alertaError,
  alertaExito,
  alertaInfo,
} from "../utils/alertas.js";
import { generarPDF } from "../utils/pdf.js";

const usuarios = ref([]);
const letrasDni = "TRWAGMYFPDXBNJZSQVHLCKE";
// Catalogos independientes: provincia elegida y municipios que le corresponden.
const provincias = ref([]);
const municipios = ref([]);
// Distingue la creacion de un registro de la edicion de uno existente.
const editando = ref(false);
const dniOriginal = ref("");
// Referencia al input DNI para devolverle el foco cuando sea necesario corregirlo.
const dniInput = ref(null);
// Fuerza la indicacion visual cuando la API rechaza el DNI del formulario.
const errorDniServidor = ref(false);

function exportarPacientes() {
  generarPDF(
    "Listado de pacientes",
    ["DNI", "Apellidos", "Nombre", "Móvil", "Correo", "Provincia", "Municipio"],
    usuarios.value.map((paciente) => [
      paciente.dnipac,
      paciente.apelpac,
      paciente.nomepac,
      paciente.movilpac,
      paciente.mailpac,
      paciente.propac,
      paciente.munipac,
    ]),
    "listado_pacientes.pdf",
  );
}

const dniInvalido = computed(() => {
  const valor = novoPaciente.dnipac.trim();
  return valor !== "" && !validarDni(valor);
});

const dniDuplicado = computed(() => {
  const valor = novoPaciente.dnipac.trim().toUpperCase();
  return valor !== "" && usuarios.value.some(
    (usuario) =>
      String(usuario.dnipac).trim().toUpperCase() === valor &&
      (!editando.value ||
        String(usuario.dnipac).trim().toUpperCase() !== dniOriginal.value)
  );
});

const movilInvalido = computed(() => {
  const valor = novoPaciente.movilpac.trim();
  return valor !== "" && !/^[67]\d{8}$/.test(valor);
});

const correoInvalido = computed(() => {
  const valor = novoPaciente.mailpac.trim();
  return valor !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
});

function normalizarDni() {
  novoPaciente.dnipac = novoPaciente.dnipac.toUpperCase();
}

function borrarDniSeInvalido() {
  if (dniInvalido.value) novoPaciente.dnipac = "";
}

function borrarMovilSeInvalido() {
  if (movilInvalido.value) novoPaciente.movilpac = "";
}

function borrarCorreoSeInvalido() {
  if (correoInvalido.value) novoPaciente.mailpac = "";
}

function validarMovilEnEntrada() {
  novoPaciente.movilpac = novoPaciente.movilpac.replace(/\D/g, "");
}

function capitalizarNombre(event) {
  const valor = event.target.value;
  const formatado = valor
    .toLowerCase()
    .replace(/(^|\s)[\p{L}]/gu, (letra) => letra.toUpperCase());
  novoPaciente.nomepac = formatado;
}

function capitalizarApellidos(event) {
  const valor = event.target.value;
  const formatado = valor
    .toLowerCase()
    .replace(/(^|\s)[\p{L}]/gu, (letra) => letra.toUpperCase());
  novoPaciente.apelpac = formatado;
}

// Objeto reactivo enlazado campo a campo con v-model en la plantilla.
// Sus propiedades deben coincidir con los nombres que espera la API.
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

function ordenarUsuarios() {
  usuarios.value.sort((usuarioA, usuarioB) => {
    const apellidosA = String(usuarioA.apelpac || "").trim();
    const apellidosB = String(usuarioB.apelpac || "").trim();
    const comparacionApellidos = apellidosA.localeCompare(apellidosB, "es", {
      sensitivity: "base",
    });

    if (comparacionApellidos !== 0) return comparacionApellidos;

    return String(usuarioA.nomepac || "").localeCompare(
      String(usuarioB.nomepac || ""),
      "es",
      { sensitivity: "base" }
    );
  });
}


// onMounted es el punto de entrada para pedir los datos iniciales.
// Promise.allSettled permite recibir ambas respuestas aunque falle una de las peticiones.
onMounted(async () => {
  try {
    [provincias.value, usuarios.value] = await Promise.all([
      obtenerProvincias(),
      getPacientes(),
    ]);
    ordenarUsuarios();
  } catch (error) {
    console.error("Error al cargar pacientes y provincias:", error);
    await alertaError("No se pudieron cargar los datos.");
  }
});

// Comparte el paciente seleccionado con otras pantallas mediante el store de Pinia.
function seleccionarPaciente(paciente) {
  const pacienteStore = usePacienteStore();
  pacienteStore.seleccionarPaciente(paciente);
}
async function cargarMunicipios(){
  municipios.value = [];

  if (!novoPaciente.propac) {
    return;
  }
  const provincia = provincias.value.find(
    (p) => p.nm === novoPaciente.propac
  );

  if (!provincia) {
    return;
  }

  try {
    municipios.value = await obtenerMunicipios(provincia.id);
  } catch (error) {
    console.error("Error al cargar municipios:", error);
    await alertaError("No se pudieron cargar los municipios.");
  }
}
async function modificarPaciente(){
  errorDniServidor.value = false;
  if (dniInvalido.value || dniDuplicado.value || movilInvalido.value || correoInvalido.value) {
    await alertaError("Revisa los datos introducidos.", "Datos no válidos");
    return;
  }

  const estabaEditando = editando.value;
  // La promesa de confirmacion devuelve isConfirmed; si se cancela, no se escribe nada.
  const confirmacion = await alertaConfirmacion(
    estabaEditando ? "¿Quieres guardar los cambios de este paciente?" : "¿Quieres guardar este paciente?",
    estabaEditando ? "Confirmar cambios" : "Confirmar alta",
  );
  if (!confirmacion.isConfirmed) return;

  try{
    let pacientePersistido;
    if (estabaEditando) {
      const pacienteModificado = await modifyPaciente(dniOriginal.value, { ...novoPaciente });
      pacientePersistido = pacienteModificado;

      const index = usuarios.value.findIndex(
        (usuario) =>
          String(usuario.dnipac).trim().toUpperCase() === dniOriginal.value
      );

      if (index !== -1) {
        usuarios.value[index] = pacienteModificado;
        ordenarUsuarios();
      }
      await alertaExito("El paciente se actualizó correctamente.");
    } else{
      const pacienteGuardado = await savePaciente({ ...novoPaciente });
      pacientePersistido = pacienteGuardado;
      usuarios.value.push(pacienteGuardado);
      ordenarUsuarios();
      await alertaExito("El paciente se guardó correctamente.");
    }
    editando.value = false;
    dniOriginal.value = "";
    errorDniServidor.value = false;
    seleccionarPaciente(pacientePersistido);
  }catch (error) {
    console.error("Error al modificar paciente:", error);
    errorDniServidor.value = error.response?.status === 409;
    await alertaError(
      errorDniServidor.value ? "Este DNI ya está registrado." : "No se pudo guardar el paciente.",
    );
  }
}

// Primero confirma la accion, luego elimina en el servidor y solo si funciona
// quita la misma fila de la lista reactiva.
async function eliminarPaciente(index) {
  try{
    const paciente = usuarios.value[index];
  // La promesa devuelve isConfirmed para decidir si se elimina o se cancela.
    const confirmacion = await alertaConfirmacion(
      `¿Quieres eliminar a ${paciente.nomepac} ${paciente.apelpac}?`,
      "Confirmar eliminación",
    );
    if (!confirmacion.isConfirmed) return;
    await deletePaciente(paciente.dnipac);
    usuarios.value.splice(index, 1);
    ordenarUsuarios();
    await alertaExito("El paciente se eliminó correctamente.");
  } catch (error) {
    console.error("Error ao eliminar paciente:", error);
    await alertaError("No se pudo eliminar el paciente.");
  }
}

async function editarUsuario(index) {
  const paciente = usuarios.value[index];
  Object.assign(novoPaciente, {
    ...paciente,
    nacipac: formatearFechaParaInput(paciente.nacipac),
  });
  delete novoPaciente._id;
  editando.value = true;
  seleccionarPaciente(paciente);
  dniOriginal.value = String(paciente.dnipac).trim().toUpperCase();
  await cargarMunicipios();
}

// Consulta un paciente por DNI y, si existe, copia sus datos al formulario
// para editarlo. Los errores 404 se muestran como "no encontrado".
async function buscarPaciente() {
  // DNI normalizado para comparar sin depender de mayusculas o espacios.
  const dni = novoPaciente.dnipac.trim().toUpperCase();
  if (!validarDni(dni)) {
    await alertaError("Introduce un DNI/NIE válido.", "Datos no válidos");
    dniInput.value?.focus();
    return;
  }

  try {
    const paciente = usuarios.value.find(
      (usuario) => String(usuario.dnipac).trim().toUpperCase() === dni
    );

    if (!paciente) {
      await alertaInfo("No existe ningún paciente con ese DNI.");
      return;
    }

    Object.assign(novoPaciente, {
      ...paciente,
      nacipac: formatearFechaParaInput(paciente.nacipac),
    });
    delete novoPaciente._id;
    editando.value = true;
    dniOriginal.value = dni;
    errorDniServidor.value = false;
    seleccionarPaciente(paciente);
    await cargarMunicipios();
  } catch (error) {
    console.error("Error al buscar paciente:", error);
    await alertaError("No se pudo buscar el paciente.");
  }
}

function formatearFechaParaInput(fecha) {
  if (!fecha) return "";

  if (typeof fecha === "string") {
    return fecha.slice(0, 10);
  }

  if (fecha instanceof Date && !Number.isNaN(fecha.getTime())) {
    return fecha.toISOString().slice(0, 10);
  }

  return "";
}


const validarDni = (dni) => {
  if (!dni) return true;

  const valor = dni.trim();

  if (/^\d{8}[A-Z]$/.test(valor)) {
    const numero = Number.parseInt(valor.slice(0, 8), 10);
    const letra = valor[8];
    return letrasDni[numero % 23] === letra;
  }

  if (/^[XYZ]\d{7}[A-Z]$/.test(valor)) {
    const numero = Number.parseInt(valor.slice(1), 10);
    const letra = valor[8];
    return letrasDni[numero % 23] === letra;
  }

  if (/^[A-HJ-NP-SUVW]\d{7}[0-9A-J]$/.test(valor)) {
    return true;
  }
  return false;
};

// Vacía el formulario conservando el tipo de cada propiedad (por ejemplo,
// lopdpac debe seguir siendo booleano) y vuelve al modo de alta.
function limpiaFormpac() {
  Object.keys(novoPaciente).forEach((key) => {
    if (typeof novoPaciente[key] === "boolean") {
      novoPaciente[key] = false;
    } else {
      novoPaciente[key] = "";
    }
  });

  editando.value = false;
  dniOriginal.value = "";
  errorDniServidor.value = false;
  municipios.value = [];
}
</script>

