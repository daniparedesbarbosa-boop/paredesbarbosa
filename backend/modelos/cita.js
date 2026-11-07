import mongoose from "mongoose";

const citaSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    data: { type: String, required: true },
    idPaciente: { type: String, required: true },
    idDoctor: { type: String, required: true },
    hora: { type: String, required: true },
    motivo: { type: String, required: true },
    estado: { type: String, enum: ["Pendiente", "Confirmada", "Cancelada"], required: true },
    observacions: { type: String, default: "" },
  },
  { collection: "citas" },
);

export default mongoose.model("cita", citaSchema);
