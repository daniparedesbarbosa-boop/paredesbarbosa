import mongoose from 'mongoose';

// Esquema de los datos persistidos para cada doctor.
const DoctorSchema = new mongoose.Schema(
    {
    nomedoc: {type: String, required: true},
    apeldoc: {type: String, required: true},
    coledoc: {type: String, required: true},
    maildoc: {type: String, required: false},
    movildoc: {type: String, required: true},
    espedoc: {type: String, required: true},

    },
    {
    collection: "doctores"
    }
);

export default mongoose.model('Doctor', DoctorSchema);
