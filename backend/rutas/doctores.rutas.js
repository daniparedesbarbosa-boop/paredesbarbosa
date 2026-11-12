import express from 'express';
import Doctor from '../modelos/doctor.js';

// Agrupa las operaciones HTTP disponibles para doctores.
const router = express.Router();

// Crea un doctor a partir de los datos enviados por el formulario.
router.post("/", async (req, res) => {
    try {
        // El identificador se genera en MongoDB y no debe aceptarse desde el cliente.
        console.log("Datos recibidos:", req.body);
        const { _id, ...datosDoctor } = req.body || {};
        const doctor = new Doctor(datosDoctor);

        // Documento persistido que se devuelve al cliente con estado HTTP 201.
        const nuevoDoctor = await doctor.save();
        res.status(201).json(nuevoDoctor);

    } catch (error) {
        console.error("Error al crear el doctor:", error);
        const status = error.name === "ValidationError" ? 400 : 500;
        res.status(status).json({ message: "Error al guardar el doctor", error: error.message });
    }
});

// Devuelve todos los doctores almacenados para rellenar el listado.
router.get("/", async (req, res) => {
    try {
        const doctores = await Doctor.find();

        res.json(doctores);
    } catch (error) {
        res.status(500).json({ message: ("Error al obtener los doctores", error) });
    }
});

// Filtra doctores por el nombre exacto de su especialidad.
router.get("/:especialidad", async (req, res) => {
    try {
        const doctores = await Doctor.find({ espedoc: req.params.especialidad });

        res.json(doctores);
    } catch (error) {
        res.status(500).json({ message: ("Error al obtener los doctores", error) });
    }
});

// Elimina el doctor identificado por el identificador de MongoDB.
router.delete("/:id", async (req, res) => {
    try {
        const doctor = await Doctor.findByIdAndDelete(req.params.id);
        if (!doctor) {
            return res.status(404).json({ message: "Doctor no encontrado" });
        }
        res.json({ message: "Doctor eliminado" });

    } catch (error) {
        res.status(500).json({ message: ("Error al eliminar el paciente",error) });
    }
});

// Actualiza los campos enviados y vuelve a aplicar las validaciones del modelo.
router.put("/:id", async (req, res) => {
    try {
        const { _id, ...datosDoctor } = req.body || {};
        const doctor = await Doctor.findByIdAndUpdate(
            req.params.id,
            datosDoctor,
            { new: true, runValidators: true }
        );
        if (!doctor) {
            return res.status(404).json({ message: "Doctor no encontrado" });
        }
        res.json(doctor);

    } catch (error) {
        res.status(500).json({ message: ("Error al modificar el paciente",error) });
    }
});

export default router;
