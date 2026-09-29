//Modelo paciente

import mongoose from "mongoose";

const pacienteSchema = new mongoose.Schema(
  {
    dnipac: { type: String, required: true },
    nomepac: { type: String, required: true },
    apelpac: { type: String, required: true },
    nacipac: { type: String, required: true },
    mailpac: { type: String, required: false },
    movilpac: { type: String, required: true },
    dirpac: { type: String, required: false },
    propac: { type: String, required: true },
    munipac: { type: String, required: true }
  },

  {
    collection: "pacientes",
  },
);

export default mongoose.model("pacientes", pacienteSchema);
