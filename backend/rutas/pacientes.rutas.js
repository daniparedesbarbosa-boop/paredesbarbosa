import express from 'express';
import Paciente from '../modelos/paciente.js';

const router = express.Router();

// POST /api/pacientes: normaliza DNI y movil, comprueba duplicados y crea el paciente.
router.post("/", async (req, res) => {
    try {

        console.log("Datos recibidos:", req.body);
        const dni = String(req.body.dnipac || "").trim().toUpperCase();
        const pacienteExistente = await Paciente.findOne({
            dnipac: { $regex: `^${dni}$`, $options: "i" },
        });

        if (pacienteExistente) {
            return res.status(409).json({ message: "El DNI ya está registrado" });
        }

        const paciente = new Paciente({ ...req.body, dnipac: dni });

        const nuevoPaciente = await paciente.save();
        res.status(201).json(nuevoPaciente);

    } catch (error) {
        console.error("Error al crear el paciente:", error);
        res.status(500).json({ message: "Error al guardar el paciente" });
    }
});

// GET /api/pacientes: lista pacientes y mantiene compatibilidad con el campo antiguo nompac.
router.get("/", async (req, res) => {
    try {
        const pacientes = await Paciente.find();

        res.json(pacientes);
    } catch (error) {
        res.status(500).json({ message: ("Error al obtener los pacientes", error) });
    }
});

router.get("/:id", async (req, res) => {
    try {
        const paciente = await Paciente.findOne({
            dnipac: String(req.params.id).trim().toUpperCase(),
        });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }
        res.json(paciente);
    } catch (error) {
        console.error("Error al buscar el paciente:", error);
        res.status(500).json({ message: "Error al buscar el paciente" });
    }
});

router.delete("/:id", async (req, res) => {
    try {
        const dni = String(req.params.id || "").trim().toUpperCase();
        const paciente= await Paciente.findOneAndDelete({
            dnipac: dni
        });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }
        res.json({ message: "Paciente eliminado" });

    } catch (error) {
        res.status(500).json({ message: ("Error al eliminar el paciente",error) });
    }
});

router.put("/:id", async (req, res) => {
    try {
        const dniOriginal = String(req.params.id || "").trim().toUpperCase();
        const datosPaciente = {
            ...req.body,
            dnipac: String(req.body.dnipac || dniOriginal).trim().toUpperCase(),
        };
        const paciente= await Paciente.findOneAndUpdate({
            dnipac: dniOriginal
        }, datosPaciente, { new: true, runValidators: true });
        if (!paciente) {
            return res.status(404).json({ message: "Paciente no encontrado" });
        }
        res.json(paciente);

    } catch (error) {
        res.status(500).json({ message: ("Error al modificar el paciente",error) });
    }
});

export default router;
