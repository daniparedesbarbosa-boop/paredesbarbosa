
import mongoose from "mongoose";

// Define los campos y las reglas de validacion que MongoDB aplica a cada cita.
const CitaSchema = new mongoose.Schema(
    {
        // Compatibilidad con el índice único id_1 de la colección existente.
        id: {
            type: String,
            unique: true,
            default: () => new mongoose.Types.ObjectId().toString()
        },
        // Guarda referencias a los documentos reales, no copias de sus datos.
        pacienteId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Paciente",
            required: true
        },
        doctorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Doctor",
            required: true
        },
        // Se guardan como texto porque el formulario envia fecha y hora en formato HTML.
        fecha: { type: String, required: true },
        hora: { type: String, required: true },
        motivo: { type: String, required: true },
        // Las observaciones son opcionales; una cadena vacia simplifica su uso en la interfaz.
        observacions: {
            type: String,
            default: ""
        },
        // Estado inicial utilizado cuando el cliente no indica otro estado.
        estado: {
            type: String,
            default: "pendente"
        }
    },
    {
        collection: "citas"
    }
);

// Registra el esquema y fija la coleccion que utiliza MongoDB.
export default mongoose.model("Cita", CitaSchema);
