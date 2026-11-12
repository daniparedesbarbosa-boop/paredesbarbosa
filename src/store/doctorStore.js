import { defineStore } from "pinia";

// Guarda en Pinia el doctor elegido para reutilizarlo en la pantalla de citas.
export const useDoctorStore = defineStore("doctor", {
  state: () => ({
    idDoctor: null,
    nomedoc: null,
    apeldoc: null,
    espedoc: null,
  }),
  actions: {
    // Copia al store los datos del doctor que se mostraran en citas.
    seleccionarDoctor(doctor) {
      this.idDoctor = doctor._id ?? null;
      this.nomedoc = doctor.nomedoc;
      this.apeldoc = doctor.apeldoc;
      this.espedoc = doctor.espedoc;
    },
    // Elimina el doctor seleccionado.
    limpiarDoctor() {
      this.idDoctor = null;
      this.nomedoc = null;
      this.apeldoc = null;
      this.espedoc = null;
    },
  },
});
