<template>
  <section
    class="appointment-page w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8"
  >
    <div
      class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-green-50/50 px-5 py-5"
    >
      <div>
        <p class="text-xs font-bold uppercase tracking-widest text-green-700">
          Xestión clínica
        </p>
        <h1 class="mt-1 text-xl font-bold text-slate-900">
          🗓️ Xestión de citas
        </h1>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="citasFiltradas.length === 0"
        @click="exportarCitas"
      >
        📄 Imprimir citas
      </button>
    </div>

    <div
      class="appointment-layout rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:p-6"
    >
      <form class="appointment-form" @submit.prevent="guardarCita">
        <div class="form-grid">
          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>ID cita</span>
            <input
              :value="cita._id || 'Xérase ao gardar'"
              type="text"
              disabled
            />
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Paciente</span>
            <input
              :value="nombrePacienteFormulario"
              type="text"
              readonly
              :class="{ 'form-field__placeholder': !cita.pacienteId }"
            />
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Profesional</span>
            <input
              :value="nombreDoctorFormulario"
              type="text"
              readonly
              :class="{ 'form-field__placeholder': !cita.doctorId }"
            />
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Data</span>
            <input v-model="cita.fecha" type="date" required />
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Hora</span>
            <input v-model="cita.hora" type="time" required />
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Estado</span>
            <select v-model="cita.estado" required>
              <option value="pendente">Pendente</option>
              <option value="confirmada">Confirmada</option>
              <option value="realizada">Realizada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </label>

          <label
            class="form-field form-field--wide rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Motivo da cita</span>
            <input
              v-model.trim="cita.motivo"
              type="text"
              maxlength="250"
              placeholder="Describe brevemente o motivo"
              required
            />
          </label>

          <label
            class="form-field form-field--wide rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Observacións</span>
            <textarea
              v-model.trim="cita.observacions"
              rows="3"
              maxlength="1000"
              placeholder="Información adicional (opcional)"
            ></textarea>
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Tarifa</span>
            <input
              v-model.number="cita.tarifa"
              type="float"
              min="0"
              step="0.01"
              required
            />
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Diagnóstico</span>
            <textarea
              v-model.trim="cita.diagnostico"
              rows="3"
              maxlength="1000"
            ></textarea>
          </label>

          <label
            class="form-field rounded-xl border border-slate-200 bg-white p-3"
          >
            <span>Tratamento</span>
            <textarea
              v-model.trim="cita.tratamento"
              rows="3"
              maxlength="1000"
            ></textarea>
          </label>
        </div>

        <p v-if="!cita.pacienteId || !cita.doctorId" class="form-hint">
          Selecciona un paciente e un profesional para gardar unha cita.
        </p>
        <p
          v-if="!cargando && !doctores.length"
          class="form-hint form-hint--warning"
        >
          Primeiro debes rexistrar polo menos un profesional.
        </p>

        <div class="form-actions">
          <button
            class="button button--primary !rounded-xl !bg-green-700 shadow-sm hover:!bg-green-800"
            type="submit"
            :disabled="guardando || !formularioValido"
          >
            {{
              guardando ? "Gardando..." : editando ? "Gardar cambios" : "Gardar"
            }}
          </button>
          <button
            class="button button--secondary !rounded-xl !bg-white"
            type="button"
            @click="limpiarFormulario"
          >
            {{ editando ? "Cancelar a edición" : "Limpar" }}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!selectedCita"
            @click="exportarTicket"
          >
            📄 Imprimir ticket da cita
          </button>
        </div>
      </form>
    </div>

    <div
      class="mt-8 flex items-center justify-between border-b border-slate-200 pb-3"
    >
      <h2 class="text-lg font-bold text-slate-900">📋 Listaxe de citas</h2>
      <div class="flex items-center gap-2">
        <label
          class="inline-flex items-center gap-2 text-sm font-semibold text-slate-700"
        >
          <input
            v-model="listarTodas"
            type="checkbox"
            class="h-4 w-4 accent-green-600"
          />
          Listar todas
        </label>
        <div
          v-if="pacienteStore.idPaciente && !listarTodas"
          class="inline-flex items-center gap-2 text-sm"
        >
          <span class="font-semibold">Filtrado por:</span>
          <span
            class="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-green-900"
          >
            <span>Paciente: {{ nombrePacienteSeleccionado }}</span>
            <button
              type="button"
              class="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-base font-bold leading-none text-green-700 transition hover:bg-green-200 hover:text-green-900"
              title="Eliminar filtro"
              aria-label="Eliminar filtro de paciente"
              @click="limpiarFiltroPaciente"
            >
              ×
            </button>
          </span>
        </div>
      </div>
    </div>

    <p v-if="errorCarga" class="form-hint form-hint--warning">
      {{ errorCarga }}
    </p>
    <p v-if="cargando" class="empty-state">A cargar citas...</p>
    <div v-else-if="citasFiltradas.length" class="appointments-table-wrapper">
      <table class="appointments-table">
        <thead>
          <tr>
            <th>Data e hora</th>
            <th>Paciente</th>
            <th>Profesional</th>
            <th>Motivo</th>
            <th>Estado</th>
            <th>Observacións</th>
            <th>Diagnóstico</th>
            <th>Tratamento</th>
            <th>Prezo</th>
            <th>Accións</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in citasFiltradas"
            :key="item._id"
            :class="{ 'appointment-row--selected': selectedCita?._id === item._id }"
            @click="seleccionarCita(item)"
          >
            <td>{{ item.fecha }} · {{ item.hora }}</td>
            <td>{{ nombrePaciente(item.pacienteId) }}</td>
            <td>{{ nombreDoctor(item.doctorId) }}</td>
            <td>{{ item.motivo }}</td>
            <td>
              <span
                class="status-badge"
                :class="`status-badge--${item.estado}`"
                >{{ etiquetaEstado(item.estado) }}</span
              >
            </td>
            <td>{{ item.observacions || "—" }}</td>
            <td>{{ item.diagnostico || "—" }}</td>
            <td>{{ item.tratamento || "—" }}</td>
            <td>{{ Number(item.tarifa || 0).toFixed(2) }} €</td>
            <td class="actions-cell whitespace-nowrap">
              <button
                type="button"
                title="Editar cita"
                @click="editarCita(item)"
              >
                ✏️
              </button>
              <button
                type="button"
                title="Eliminar cita"
                @click="eliminarCita(item)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="empty-state rounded-xl bg-slate-50">
      {{
        pacienteStore.idPaciente
          ? "Non hai citas rexistradas para este paciente."
          : "Non hai citas rexistradas na colección citas."
      }}
    </p>
  </section>
</template>

<script setup>
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import { usePacienteStore } from "../store/pacienteStore.js";
import { useDoctorStore } from "../store/doctorStore.js";
import { deleteCita, getCitas, saveCita, updateCita } from "../api/citas.js";
import { getDoctores } from "../api/doctores.js";
import { getPacientes } from "../api/pacientes.js";
import {
  alertaConfirmacion,
  alertaError,
  alertaExito,
} from "../utils/alertas.js";
import { generarPDF, generarTicketPDF } from "../utils/pdf.js";

const pacienteStore = usePacienteStore();
const doctorStore = useDoctorStore();
const citas = ref([]);
const pacientes = ref([]);
const doctores = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const editando = ref(false);
const listarTodas = ref(false);
const selectedCita = ref(null);
const errorCarga = ref("");
let actualizacionAutomatica;

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
  tarifa: 0,
  estado: "pendente",
});
const cita = reactive(citaVacia());

const formularioValido = computed(() =>
  Boolean(
    cita.fecha &&
    cita.hora &&
    cita.pacienteId &&
    cita.doctorId &&
    cita.motivo.trim() &&
    cita.estado,
  ),
);

const citasFiltradas = computed(() => {
  if (listarTodas.value) return citas.value;
  if (!pacienteStore.idPaciente) return [];
  return citas.value.filter(
    (item) =>
      idRelacionado(item.pacienteId) === String(pacienteStore.idPaciente),
  );
});

const nombrePacienteSeleccionado = computed(() => {
  const nombre =
    `${pacienteStore.nomepac || ""} ${pacienteStore.apelpac || ""}`.trim();
  return nombre || "Paciente seleccionado";
});

const nombrePacienteFormulario = computed(() => {
  if (!cita.pacienteId) return "Selecciona un paciente desde a súa lapela";
  const paciente = pacientes.value.find(
    (item) => String(item._id) === idRelacionado(cita.pacienteId),
  );
  return paciente
    ? `${paciente.nomepac} ${paciente.apelpac}`
    : `${pacienteStore.nomepac || ""} ${pacienteStore.apelpac || ""}`.trim() ||
        "Paciente seleccionado";
});

const nombreDoctorFormulario = computed(() => {
  if (!cita.doctorId) return "Selecciona un profesional desde a súa lapela";
  const doctor = doctores.value.find(
    (item) => String(item._id) === idRelacionado(cita.doctorId),
  );
  return doctor
    ? `${doctor.nomedoc} ${doctor.apeldoc}`
    : `${doctorStore.nomedoc || ""} ${doctorStore.apeldoc || ""}`.trim() ||
        "Profesional seleccionado";
});

onMounted(async () => {
  await cargarDatos();
  // REST no mantiene una suscripción; este refresco mantiene la lista sincronizada.
  actualizacionAutomatica = window.setInterval(cargarDatos, 10000);
});

watch(
  () => [pacienteStore.idPaciente, doctorStore.idDoctor],
  ([idPaciente, idDoctor]) => {
    if (!editando.value) {
      cita.pacienteId = idPaciente || "";
      cita.doctorId = idDoctor || "";
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (actualizacionAutomatica) {
    window.clearInterval(actualizacionAutomatica);
  }
});

async function cargarDatos() {
  if (cargando.value) return;
  cargando.value = true;
  errorCarga.value = "";

  try {
    const [listaCitas, listaPacientes, listaDoctores] = await Promise.all([
      getCitas(),
      getPacientes(),
      getDoctores(),
    ]);
    citas.value = listaCitas;
    if (selectedCita.value) {
      selectedCita.value =
        listaCitas.find((item) => item._id === selectedCita.value._id) || null;
    }
    pacientes.value = listaPacientes;
    doctores.value = listaDoctores;
  } catch (error) {
    errorCarga.value = mensajeError(error, "Non se puideron cargar as citas.");
    alertaError(errorCarga.value);
  } finally {
    cargando.value = false;
  }
}

async function guardarCita() {
  if (!formularioValido.value) return;
  guardando.value = true;
  const datosCita = {
    pacienteId: cita.pacienteId,
    doctorId: cita.doctorId,
    fecha: cita.fecha,
    hora: cita.hora,
    motivo: cita.motivo.trim(),
    observacions: cita.observacions.trim(),
    diagnostico: cita.diagnostico.trim(),
    tratamento: cita.tratamento.trim(),
    tarifa: Number(cita.tarifa || 0),
    estado: cita.estado,
  };

  try {
    if (editando.value) {
      await updateCita(cita._id, datosCita);
    } else {
      await saveCita(datosCita);
    }
    await alertaExito(
      editando.value
        ? "A cita actualizouse correctamente."
        : "A cita gardouse correctamente.",
    );
    limpiarFormulario();
    await cargarDatos();
  } catch (error) {
    alertaError(mensajeError(error, "Non se puido gardar a cita."));
  } finally {
    guardando.value = false;
  }
}

function editarCita(item) {
  seleccionarCita(item);
  Object.assign(cita, citaVacia(), item, {
    observacions: item.observacions ?? "",
    diagnostico: item.diagnostico ?? "",
    tratamento: item.tratamento ?? "",
    tarifa: item.tarifa ?? 0,
  });
  editando.value = true;
}

function seleccionarCita(item) {
  selectedCita.value = item;
}

function exportarCitas() {
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
      "Tarifa",
      "Estado",
    ],
    citasFiltradas.value.map((cita) => [
      cita.id,
      apellidosPacientePaciente(cita.pacienteId),
      nombreDoctor(cita.doctorId),
      cita.fecha,
      cita.hora,
      cita.motivo,
      cita.diagnostico || "—",
      cita.tratamento || "—",
      `${Number(cita.tarifa || 0).toFixed(2)} €`,
      etiquetaEstado(cita.estado),
    ]),
    "listado_citas.pdf",
  );
}

function exportarTicket() {
  if (!selectedCita.value) return;

  const citaSeleccionada = selectedCita.value;
  generarTicketPDF(
    {
      id: citaSeleccionada._id,
      estado: etiquetaEstado(citaSeleccionada.estado),
      fecha: citaSeleccionada.fecha,
      hora: citaSeleccionada.hora,
      paciente: nombrePaciente(citaSeleccionada.pacienteId),
      doctor: nombreDoctor(citaSeleccionada.doctorId),
      especialidad: especialidadDoctor(citaSeleccionada.doctorId),
      motivo: citaSeleccionada.motivo,
      diagnostico: citaSeleccionada.diagnostico,
      tratamento: citaSeleccionada.tratamento,
      observacions: citaSeleccionada.observacions,
      tarifa: Number(citaSeleccionada.tarifa || 0),
    },
    "ticket_cita.pdf",
  );
}

function limpiarFiltroPaciente() {
  pacienteStore.limpiarPaciente();
  if (!editando.value) {
    cita.pacienteId = "";
  }
}

async function eliminarCita(item) {
  const confirmacion = await alertaConfirmacion(
    `Eliminar a cita do ${item.fecha} ás ${item.hora}?`,
    "Eliminar cita",
  );
  if (!confirmacion.isConfirmed) return;
  try {
    await deleteCita(item._id);
    if (cita._id === item._id) limpiarFormulario();
    if (selectedCita.value?._id === item._id) selectedCita.value = null;
    await alertaExito("A cita eliminouse correctamente.");
    await cargarDatos();
  } catch (error) {
    alertaError(mensajeError(error, "Non se puido eliminar a cita."));
  }
}

function limpiarFormulario() {
  Object.assign(cita, citaVacia());
  editando.value = false;
}

function idRelacionado(relacion) {
  return String(relacion?._id ?? relacion ?? "");
}

function nombrePaciente(pacienteId) {
  const paciente = pacientes.value.find(
    (item) => String(item._id) === idRelacionado(pacienteId),
  );
  return paciente
    ? `${paciente.nomepac} ${paciente.apelpac}`
    : "Paciente non dispoñible";
}

function apellidosPaciente(pacienteId) {
  const paciente = pacientes.value.find(
    (item) => String(item._id) === idRelacionado(pacienteId),
  );
  return paciente
    ? `${paciente.apelpac}`
    : "Paciente non dispoñible";
}

function nombreDoctor(doctorId) {
  const doctor = doctores.value.find(
    (item) => String(item._id) === idRelacionado(doctorId),
  );
  return doctor
    ? `${doctor.nomedoc} ${doctor.apeldoc}`
    : "Profesional non dispoñible";
}

function especialidadDoctor(doctorId) {
  const doctor = doctores.value.find(
    (item) => String(item._id) === idRelacionado(doctorId),
  );
  return doctor
    ? `${doctor.espedoc}`
    : "Profesional non dispoñible";
}

function etiquetaEstado(estado) {
  return (
    {
      pendente: "Pendente",
      confirmada: "Confirmada",
      realizada: "Realizada",
      cancelada: "Cancelada",
    }[estado] ?? estado
  );
}

function mensajeError(error, porDefecto) {
  return (
    error.response?.data?.mensaje ||
    error.response?.data?.message ||
    error.message ||
    porDefecto
  );
}
</script>

<style scoped>
.appointment-page {
  padding: 2rem;
  background: #fff;
  color: #233238;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: 3rem;
  margin-bottom: 1.25rem;
  padding: 0.65rem 1rem;
  background: #004800;
  color: #fff;
}

.section-title h1,
.section-title h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.section-title__status {
  font-size: 0.75rem;
  opacity: 0.9;
}

.appointment-layout {
  width: 100%;
}

.appointment-form {
  min-width: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.form-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.84rem;
  font-weight: 600;
}

.form-field--wide {
  grid-column: 1 / -1;
}

.form-field input,
.form-field select,
.form-field textarea {
  box-sizing: border-box;
  width: 100%;
  border: 1px solid #c8d8c8;
  border-radius: 0.6rem;
  padding: 0.7rem 0.8rem;
  background: #fff;
  color: #233238;
  font: inherit;
  font-weight: 400;
  outline: none;
}

.form-field textarea {
  resize: vertical;
}

.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  border-color: #009900;
  box-shadow: 0 0 0 3px #00990026;
}

.form-field input:disabled,
.form-field select:disabled {
  background: #f1f6f4;
  color: #6d7f7b;
}

.form-field__placeholder {
  color: #8a9995 !important;
  font-style: italic;
}

.form-hint {
  margin: 1rem 0 0;
  padding: 0.7rem 0.9rem;
  border-radius: 0.5rem;
  background: #eef8ee;
  color: #286b28;
  font-size: 0.82rem;
}

.form-hint--warning {
  background: #fff7e6;
  color: #9a6a13;
}

.form-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.button {
  border: 0;
  border-radius: 0.6rem;
  padding: 0.65rem 1.5rem;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.button--primary {
  background: #004800;
  color: #fff;
}

.button--primary:disabled {
  background: #64748b;
  opacity: 0.65;
}

.button--primary:hover:not(:disabled) {
  background: #007a00;
}

.button--secondary {
  border: 1px solid #c8d8c8;
  background: #f5f8f7;
  color: #52635f;
}

.section-title--list {
  justify-content: space-between;
  margin-top: 1.75rem;
  margin-bottom: 0;
}

.refresh-button {
  border: 1px solid #fff;
  border-radius: 0.4rem;
  background: #fff;
  color: #004800;
  cursor: pointer;
  font-size: 1.4rem;
  line-height: 1;
}

.refresh-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.appointments-table-wrapper {
  overflow-x: auto;
}

.appointments-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.83rem;
}

.appointments-table th,
.appointments-table td {
  border: 1px solid #cfd9cf;
  padding: 0.7rem;
  text-align: left;
  vertical-align: middle;
}

.appointments-table th {
  background: #eef5ee;
  color: #40514c;
}

.appointments-table tbody tr {
  cursor: pointer;
  transition: background-color 150ms ease;
}

.appointments-table tbody tr:hover,
.appointments-table tbody tr.appointment-row--selected {
  background: #ecf8ee;
}

.status-badge {
  display: inline-block;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  background: #eef1f0;
  font-size: 0.73rem;
  font-weight: 700;
}

.status-badge--confirmada {
  background: #d9f2d9;
  color: #006400;
}

.status-badge--cancelada {
  background: #fde8e8;
  color: #a13d3d;
}

.actions-cell {
  white-space: nowrap;
}

.actions-cell button {
  border: 0;
  border-radius: 0.35rem;
  padding: 0.3rem;
  background: transparent;
  cursor: pointer;
}

.actions-cell button:hover {
  background: #edf4f1;
}

.empty-state {
  margin: 0;
  padding: 1.5rem;
  color: #71817d;
  text-align: center;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }

  .form-field--wide {
    grid-column: auto;
  }
}

@media (max-width: 600px) {
  .appointment-page {
    padding: 1rem;
  }

  .section-title {
    justify-content: space-between;
  }

  .section-title__status {
    display: none;
  }
}
</style>
