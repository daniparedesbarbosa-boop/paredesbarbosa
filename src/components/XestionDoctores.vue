<template>
  <div class="w-full overflow-visible bg-white p-8 shadow-md max-md:p-4 [&_form]:mb-8 [&_form]:flex [&_form]:w-full [&_form]:flex-col [&_form]:gap-4 [&_.campo]:flex [&_.campo]:flex-1 [&_.campo]:items-center [&_.campo]:gap-2 [&_.campo_label]:min-w-20 [&_.id-wrapper]:flex [&_.id-wrapper]:w-full [&_input]:box-border [&_input]:flex-1 [&_input]:rounded-md [&_input]:border [&_input]:border-slate-300 [&_input]:p-2 [&_input]:outline-none [&_input]:focus:border-blue-500 [&_select]:w-full [&_select]:rounded-md [&_select]:border [&_select]:border-slate-300 [&_select]:p-2 [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:border [&_table]:border-slate-300 [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-50 [&_th]:p-3 [&_td]:border [&_td]:border-slate-300 [&_td]:p-3">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 bg-[#009900] px-4 py-3">
      <h4 class="font-semibold text-white">👥 Xestión de doctores</h4>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#004800] shadow-sm transition hover:bg-[#eef8ee] disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="doctores.length === 0"
        @click="exportarDoctores"
      >
        📄 Exportar PDF
      </button>
    </div>
    <!-- El submit llama a guardarDoctor(); editando determina si crea o modifica. -->
    <form @submit.prevent="guardarDoctor">
      <div class="flex w-full flex-col gap-2 md:flex-row md:gap-4">
        <div class="flex flex-1 items-center gap-2">
          <label>ID</label>
          <div class="id-wrapper">
            <input
              v-model="novoDoctor._id"
              type="text"
              disabled
              class="text-center"
            />
          </div>
        </div>
        <div class="flex-[4] items-center gap-2 md:flex">
          <label>Nome:</label>
          <input
            v-model="novoDoctor.nomedoc"
            type="text"
            required
            @input="capitalizarNombre"
          />
        </div>
        <div class="flex-[4] items-center gap-2 md:flex">
          <label>Apelidos:</label>
          <input
            v-model="novoDoctor.apeldoc"
            type="text"
            required
            @input="capitalizarApellidos"
          />
        </div>
      </div>
      <div class="flex w-full flex-col gap-2 md:flex-row md:gap-4">
        <div class="flex-1 items-center gap-2 md:flex">
          <label>Movil:</label>
          <input
            v-model="novoDoctor.movildoc"
            type="tel"
            required
            inputmode="numeric"
            class="text-center"
            :class="{ 'border-2 border-red-500 shadow-[0_0_0_1px_rgba(220,53,69,0.15)]': movilInvalido }"
            @input="validarMovilEnEntrada"
            @blur="borrarMovilSeInvalido"
          />
        </div>
        <div class="flex-[2] items-center gap-2 md:flex">
          <label>Correo:</label>
          <input
            v-model="novoDoctor.maildoc"
            type="email"
            :class="{ 'border-2 border-red-500 shadow-[0_0_0_1px_rgba(220,53,69,0.15)]': correoInvalido }"
            @blur="borrarCorreoSeInvalido"
          />
        </div>
      </div>
      <div class="flex w-full flex-col gap-2 md:flex-row md:gap-4">
        <div class="flex flex-1 items-center gap-2">
          <label class="campo-label">¿Es colegiado?</label>
          <label>
            <input
              v-model="novoDoctor.coledoc"
              type="radio"
              name="colegiado"
              value="si"
              required
            />
            Sí
          </label>
          <label>
            <input v-model="novoDoctor.coledoc" type="radio" name="colegiado" value="no" />
            No
          </label>
        </div>
        <div class="flex-1 items-center gap-2 md:flex">
          <label>Especialidad:</label>
          <select v-model="novoDoctor.espedoc" required>
            <option value="" disabled>Selecciona unha especialidad</option>
            <option
              v-for="(especialidad, index) in especialidades"
              :key="index"
              :value="especialidad.nm"
            >
              {{ especialidad.nm }}
            </option>
          </select>
        </div>
      </div>
      <div class="flex justify-center gap-3">
        <button
          type="submit"
          class="rounded-lg border-0 bg-[#009900] px-6 py-2 font-bold text-white transition hover:bg-[#007a00] disabled:cursor-not-allowed disabled:bg-slate-500 disabled:opacity-65"
          :disabled="
            novoDoctor.nomedoc === '' ||
            novoDoctor.apeldoc === '' ||
            novoDoctor.movildoc === '' ||
            novoDoctor.coledoc === '' ||
            novoDoctor.espedoc === ''
          "
        >
          Gardar
        </button>
        <button
          type="button"
          class="rounded-lg border border-slate-300 bg-slate-100 px-6 py-2 text-slate-700 transition hover:bg-slate-200"
          @click="limpiaFormdoc"
        >
          Limpar
        </button>
      </div>
    </form>
    <h4 class="mb-4 bg-[#009900] font-semibold text-white">📋 Listaxe de docotres</h4>
    <table v-if="doctores.length > 0">
      <thead>
        <tr>
          <th>#</th>
          <th>ID</th>
          <th>Nome</th>
          <th>Apelidos</th>
          <th>Movil</th>
          <th>Especialidad</th>
          <th>Accións</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(u, index) in doctores" :key="index">
          <td class="text-center">{{ index + 1 }}</td>
          <td class="text-center">{{ u._id }}</td>
          <td>{{ u.nomedoc }}</td>
          <td>{{ u.apeldoc }}</td>
          <td>{{ u.movildoc }}</td>
          <td class="text-center">{{ u.espedoc }}</td>
          <td class="text-center">
            <button @click="seleccionarDoctor(u)" title="Seleccionar para una cita">📅</button>
            <button @click="editarDoctor(index)" title="Editar">✏️</button>
            <button @click="eliminarDoctor(index)" title="Eliminar">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>Non hai usuarios cargados.</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from "vue";
// Catalogo que alimenta el selector de especialidades.
import { obtenerEspecialidades } from "../api/especialidades.js";
// Operaciones HTTP sobre la coleccion de doctores.
import {
  saveDoctor,
  getDoctores,
  deleteDoctor,
  modifyDoctor,
} from "../api/doctores.js";
// Dialogos reutilizables para confirmar acciones y comunicar resultados.
import {
  alertaConfirmacion,
  alertaError,
  alertaExito,
} from "../utils/alertas.js";
import { generarPDF } from "../utils/pdf.js";
import { useDoctorStore } from "../store/doctorStore.js";

// Listas reactivas usadas por la tabla y los selectores de la pantalla.
const doctores = ref([]);
const especialidades = ref([]);
const novoDoctor = reactive({
  _id: "",
  nomedoc: "",
  apeldoc: "",
  coledoc: "",
  movildoc: "",
  maildoc: "",
  espedoc: "",
});
// Indica si el submit debe crear un doctor o actualizar el seleccionado.
const editando = ref(false);
const doctorStore = useDoctorStore();

// Guarda en Pinia el doctor que se usara para consultar sus citas.
function seleccionarDoctor(doctor) {
  doctorStore.seleccionarDoctor(doctor);
}

function exportarDoctores() {
  generarPDF(
    "Listado de doctores",
    ["ID", "Apellidos", "Nombre", "Móvil", "Especialidad"],
    doctores.value.map((doctor) => [
      doctor._id,
      doctor.apeldoc,
      doctor.nomedoc,
      doctor.movildoc,
      doctor.espedoc,
    ]),
    "listado_doctores.pdf",
  );
}

// Carga los doctores y las especialidades cuando Vue termina de montar la pantalla.
onMounted(async () => {
  try {
    [doctores.value, especialidades.value] = await Promise.all([
      getDoctores(),
      obtenerEspecialidades(),
    ]);
  } catch (error) {
    console.error("Error al cargar los doctores y especialidades:", error);
    await alertaError("No se pudieron cargar los datos.");
  }
});

const movilInvalido = computed(() => {
  const valor = novoDoctor.movildoc.trim();
  return valor !== "" && !/^[67]\d{8}$/.test(valor);
});

const correoInvalido = computed(() => {
  const valor = novoDoctor.maildoc.trim();
  return valor !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
});

function capitalizarNombre(event) {
  const valor = event.target.value;
  const formatado = valor
    .toLowerCase()
    .replace(/(^|\s)[\p{L}]/gu, (letra) => letra.toUpperCase());
  novoDoctor.nomedoc = formatado;
}

function capitalizarApellidos(event) {
  const valor = event.target.value;
  const formatado = valor
    .toLowerCase()
    .replace(/(^|\s)[\p{L}]/gu, (letra) => letra.toUpperCase());
  novoDoctor.apeldoc = formatado;
}

function validarMovilEnEntrada() {
  novoDoctor.movildoc = novoDoctor.movildoc.replace(/\D/g, "");
}

function borrarMovilSeInvalido() {
  if (movilInvalido.value) novoDoctor.movildoc = "";
}

function borrarCorreoSeInvalido() {
  if (correoInvalido.value) novoDoctor.maildoc = "";
}

// Valida, confirma y crea o actualiza el doctor segun el modo actual del formulario.
async function guardarDoctor() {
  if (movilInvalido.value || correoInvalido.value) {
    await alertaError("Revisa el móvil y el correo electrónico.", "Datos no válidos");
    return;
  }

  const estabaEditando = editando.value;
  // La peticion solo se envia despues de que el usuario confirme la operacion.
  const confirmacion = await alertaConfirmacion(
    estabaEditando ? "¿Quieres guardar los cambios de este doctor?" : "¿Quieres guardar este doctor?",
    estabaEditando ? "Confirmar cambios" : "Confirmar alta",
  );
  if (!confirmacion.isConfirmed) return;

  try {
    if (editando.value) {
      const doctorModificado = await modifyDoctor(novoDoctor._id, novoDoctor);
      const index = doctores.value.findIndex(
        (doctor) => String(doctor._id) === String(novoDoctor._id)
      );

      if (index !== -1) doctores.value[index] = doctorModificado;
    } else {
      const doctorGuardado = await saveDoctor(novoDoctor);
      doctores.value.push(doctorGuardado);
    }

    limpiaFormdoc();
    await alertaExito(
      estabaEditando ? "El doctor se actualizó correctamente." : "El doctor se guardó correctamente.",
    );
  } catch (error) {
    console.error("Error al guardar el doctor:", error);
    await alertaError("No se pudo guardar el doctor.");
  }
}

async function eliminarDoctor(index) {
  const doctor = doctores.value[index];

  try {
  // La respuesta determina si se continua o se cancela la eliminacion.
    const confirmacion = await alertaConfirmacion(
      `¿Quieres eliminar a ${doctor.nomedoc} ${doctor.apeldoc}?`,
      "Confirmar eliminación",
    );
    if (!confirmacion.isConfirmed) return;
    await deleteDoctor(doctor._id);
    doctores.value.splice(index, 1);
    await alertaExito("El doctor se eliminó correctamente.");
  } catch (error) {
    console.error("Error al eliminar el doctor:", error);
    await alertaError("No se pudo eliminar el doctor.");
  }
}

function editarDoctor(index) {
  const doctor = doctores.value[index];
  Object.assign(novoDoctor, doctor);
  seleccionarDoctor(doctor);
  editando.value = true;
}

function limpiaFormdoc() {
  Object.keys(novoDoctor).forEach((key) => {
    if (typeof novoDoctor[key] === "boolean") {
      novoDoctor[key] = false;
    } else {
      novoDoctor[key] = "";
    }
  });

  editando.value = false;
}
</script>

