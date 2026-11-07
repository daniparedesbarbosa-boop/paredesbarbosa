<template>
  <!-- Formulario y tabla local de citas. Actualmente no llama a la API. -->
  <div class="xestion-pacientes">
    <h4>📅 Xestión de Citas 🩺</h4>

    <form @submit.prevent="gardarCita">
      <div class="fila">
        <div class="campo campo-id-cita">
          <input
            v-model="novaCita.id"
            type="text"
            placeholder="ID cita"
            aria-label="ID cita"
            required
          />
        </div>
        <div class="campo campo-data">
          <input
            v-model="novaCita.data"
            type="date"
            aria-label="Data da cita"
            :class="{ 'campo-vacio': !novaCita.data }"
            required
          />
        </div>
        <button
          type="button"
          class="btn-accion"
          title="Limpar formulario"
          aria-label="Limpar formulario"
          @click="limparFormulario"
        >
          🧹
        </button>
        <button type="button" class="btn-buscar" title="Recargar citas" @click="cargarCitas">
          ⟳
        </button>
      </div>

      <div class="fila">
        <div class="campo campo-paciente">
          <input
            v-model="novaCita.idPaciente"
            type="text"
            placeholder="ID do paciente"
            aria-label="ID do paciente"
            class="texto-centrado"
            required
          />
        </div>
        <div class="campo campo-doctor">
          <input
            v-model="novaCita.idDoctor"
            type="text"
            placeholder="ID Doctor"
            aria-label="ID do doctor"
            class="texto-centrado"
            required
          />
        </div>
      </div>

      <div class="fila fila-detalles">
        <div class="campo campo-hora">
          <input
            id="hora-cita"
            v-model="novaCita.hora"
            type="time"
            aria-label="Hora da cita"
            :class="{ 'campo-vacio': !novaCita.hora }"
            required
          />
        </div>
        <div class="campo campo-motivo">
          <input
            v-model="novaCita.motivo"
            type="text"
            placeholder="Motivo da cita"
            aria-label="Motivo da cita"
            required
          />
        </div>
        <div class="campo campo-estado">
          <select
            v-model="novaCita.estado"
            aria-label="Estado da cita"
            :class="{ 'campo-vacio': !novaCita.estado }"
            required
          >
            <option value="">Estado da cita</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Confirmada">Confirmada</option>
            <option value="Cancelada">Cancelada</option>
          </select>
        </div>
      </div>

      <textarea
        v-model="novaCita.observacions"
        placeholder="Observacións adicionais"
        aria-label="Observacións adicionais"
        rows="3"
      ></textarea>

      <button type="submit" class="btn-guardar">Gardar</button>
    </form>

    <p v-if="mensaxeErro" class="mensaxe-erro">{{ mensaxeErro }}</p>

    <div class="listaxe-cabecera">
      <h4>📋 Listaxe de Citas</h4>
      <button
        type="button"
        class="btn-buscar"
        title="Actualizar listaxe"
        aria-label="Actualizar listaxe"
        @click="mostrarListaxe = true"
      >
        ⟳
      </button>
    </div>

    <table v-if="mostrarListaxe && citas.length > 0">
      <thead>
        <tr>
          <th>ID cita</th>
          <th>Data</th>
          <th>Paciente</th>
          <th>Doctor</th>
          <th>Hora</th>
          <th>Estado</th>
          <th>Acciones</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="cita in citas" :key="cita.id">
          <td>{{ cita.id }}</td>
          <td>{{ cita.data }}</td>
          <td>{{ cita.idPaciente }}</td>
          <td>{{ cita.idDoctor }}</td>
          <td>{{ cita.hora }}</td>
          <td>{{ cita.estado }}</td>
          <td><button type="button" @click="borrarCita(cita.id)">🗑️</button></td>
        </tr>
      </tbody>
    </table>
    <p v-else>Non hai citas cargadas ou falla a conexión coa BBDD.</p>
    <button v-if="citas.length" type="button" class="btn-pdf" @click="descargarInforme">
      Descargar informe PDF
    </button>
  </div>
</template>

<script setup>
// reactive guarda el formulario; ref guarda la lista y los mensajes.
import { onMounted, reactive, ref } from "vue";
import { deleteCita, getCitas, saveCita } from "../api/citas.js";
import { alertaError, alertaExito } from "../utils/alertas.js";
import jsPDF from "jspdf";

const citas = ref([]);
const mostrarListaxe = ref(true);
const mensaxeErro = ref("");

async function cargarCitas() {
  try {
    citas.value = await getCitas();
    mensaxeErro.value = "";
  } catch (error) {
    console.error("Error ao cargar citas:", error);
    mensaxeErro.value = error.response?.data?.mensaje ||
      "Non se puideron cargar as citas. Comproba que o backend estea iniciado.";
  }
}

onMounted(async () => {
  await cargarCitas();
});

const novaCita = reactive({
  id: "",
  data: "",
  idPaciente: "",
  idDoctor: "",
  hora: "",
  motivo: "",
  estado: "",
  observacions: "",
});

async function gardarCita() {
  const cita = { ...novaCita };
  try {
    const citaGardada = await saveCita(cita);
    citas.value.push(citaGardada);
    mensaxeErro.value = "";
    limparFormulario();
    await alertaExito("A cita gardouse correctamente.");
  } catch (error) {
    console.error("Error ao gardar cita:", error);
    mensaxeErro.value = error.response?.data?.mensaje || "Non se puido gardar a cita.";
    await alertaError(mensaxeErro.value);
  }
}

async function borrarCita(id) {
  try {
    await deleteCita(id);
    citas.value = citas.value.filter((cita) => cita.id !== id);
    await alertaExito("A cita eliminouse correctamente.");
  } catch (error) {
    console.error("Error ao eliminar cita:", error);
    await alertaError("Non se puido eliminar a cita.");
  }
}

function limparFormulario() {
  // Restablece el formulario para poder introducir otra cita.
  Object.assign(novaCita, {
    id: "",
    data: "",
    idPaciente: "",
    idDoctor: "",
    hora: "",
    motivo: "",
    estado: "",
    observacions: "",
  });
}

function descargarInforme() {
  const documento = new jsPDF();
  documento.text("Informe de citas", 20, 20);
  citas.value.forEach((cita, index) => {
    documento.text(
      `${cita.data} ${cita.hora} - Paciente: ${cita.idPaciente} - Doctor: ${cita.idDoctor} - ${cita.estado}`,
      20,
      35 + index * 8,
    );
  });
  documento.save("informe-citas.pdf");
}
</script>

<style scoped>
.xestion-pacientes {
  width: 100%;
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
  margin-bottom: 1.5rem;
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
  gap: 0.5rem;
  min-width: 0;
}

.campo input,
textarea,
.campo select {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.65rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font: inherit;
  font-size: 0.9rem;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
}

.campo-id-cita input::placeholder,
.campo-paciente input::placeholder,
.campo-doctor input::placeholder,
.campo-motivo input::placeholder,
textarea::placeholder {
  color: #6b6375 !important;
  -webkit-text-fill-color: #6b6375 !important;
  opacity: 1 !important;
}

.campo-id-cita {
  flex: 0 1 165px;
}

.campo-id-cita input {
  text-align: center;
}

.texto-centrado {
  text-align: center;
}

.campo-data input.campo-vacio,
.campo-hora input.campo-vacio {
  color: #6b6375;
  -webkit-text-fill-color: #6b6375;
}

.campo select.campo-vacio {
  color: #6b6375;
  -webkit-text-fill-color: #6b6375;
}

.campo-data {
  flex: 0 1 175px;
}

.campo-paciente,
.campo-doctor {
  flex: 1 1 300px;
}

.campo-hora {
  flex: 0 1 100px;
}

.campo-hora label {
  white-space: nowrap;
  color: #6b6375;
}

.campo-hora input[type="time"]::-webkit-calendar-picker-indicator {
  filter: brightness(0);
  opacity: 1;
}

.campo-data input[type="date"]::-webkit-calendar-picker-indicator {
  filter: brightness(0);
  opacity: 1;
}

.campo-motivo,
.campo-estado {
  flex: 1 1 250px;
}

textarea {
  display: block;
  resize: vertical;
  min-height: 72px;
}

.btn-accion,
.btn-buscar {
  background: #f3f3f3;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1.1rem;
  min-width: 38px;
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
}

.btn-guardar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mensaxe-erro {
  color: #b42323;
  margin-bottom: 1rem;
  text-align: center;
}

.listaxe-cabecera {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.listaxe-cabecera h4 {
  flex: 1;
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
  margin: 0 0 1rem;
  padding: 0.6rem 0.8rem;
  font-weight: 600;
  background-color: #009900;
  color: white;
  border-radius: 4px;
}

@media (max-width: 768px) {
  .xestion-pacientes {
    padding: 1rem;
  }

  .fila {
    flex-direction: column;
    gap: 0.5rem;
  }

  .campo,
  .campo-id-cita,
  .campo-data,
  .campo-paciente,
  .campo-doctor,
  .campo-hora,
  .campo-motivo,
  .campo-estado {
    flex: 1 1 auto;
    width: 100%;
  }

  .btn-accion {
    align-self: flex-start;
  }
}
</style>
