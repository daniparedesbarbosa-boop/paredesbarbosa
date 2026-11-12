import { defineStore } from 'pinia'

export const usePacienteStore = defineStore('paciente', {
  state: () => ({
    pacientes: [],
    idPaciente: null,
    dnipac: null,
    nomepac: null,
    apelpac: null,
  }),

  actions: {
    seleccionarPaciente(paciente) {
        this.idPaciente = paciente?._id ?? null;
        this.dnipac = paciente.dnipac;
        this.nomepac = paciente.nomepac;
        this.apelpac = paciente.apelpac;
    },

    limpiarPaciente() {
        this.idPaciente = null;
        this.dnipac = null;
        this.nomepac = null;
        this.apelpac = null;
    }
  }   
});