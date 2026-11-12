import mongoose from 'mongoose';

// Esquema de los campos personales y de contacto que almacena cada paciente.
const PacienteSchema = new mongoose.Schema(
    {
    dnipac: {type: String, required: true},
    nomepac: {type: String, required: true},
    apelpac: {type: String, required: true},
    nacipac: {type: Date, required: false},
    mailpac: {type: String, required: false},
    movilpac: {type: String, required: true},
    dirpac: {type: String, required: false},
    propac: {type: String, required: false},
    munipac: {type: String, required: false},
    lopdpac: {type: Boolean, required: true},

    },
    {
    collection: "pacientes"
    }
);

export default mongoose.model('Paciente', PacienteSchema);
