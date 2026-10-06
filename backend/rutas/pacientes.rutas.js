import express from "express";
import Paciente from "../modelos/paciente.js";

const router = express.Router();

//Obtener todos los pacientes
router.get("/", async (req, res) => {
  try {
    const pacientes = await Paciente.find();
    res.json(pacientes);
  } catch (error) {
    console.error("Error al obtener pacientes:", error);
    res.status(500).json({
      mensaje: "Error al obtener pacientes",
    });
  }
});

//Crear
router.post("/", async (req, res) => {
  try {
    const pacienteExistente = await Paciente.findOne({
      dnipac: req.body.dnipac,
    });
    if (pacienteExistente) {
      return res.status(409).json({
        mensaje: "Ya existe un paciente con ese DNI",
      });
    }

    const nuevoPaciente = new Paciente(req.body);

    await nuevoPaciente.save();

    res.status(201).json(nuevoPaciente);
  } catch (error) {
    console.error("Error al crear paciente:", error);

    res.status(500).json({
      mensaje: "Error al crear paciente",
      error,
    });
  }
});

//Eliminar
router.delete("/:dni", async (req, res) => {
  try {
    const paciente = await Paciente.findOneAndDelete({
      dnipac: req.params.dni,
    });

    if (!paciente) {
      return res.status(404).json({
        mensaje: "Paciente no encontrado",
      });
    }

    res.json({
      mensaje: "Paciente eliminado",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar paciente",
      error,
    });
  }
});

//Modificar paciente
router.put("/:dni", async (req, res) => {
  try {
    const paciente = await Paciente.findOneAndUpdate(
      {
        dnipac: req.params.dni,
      },
      req.body,
      { new: true },
    );

    if (!paciente) {
      return res.status(404).json({
        mensaje: "Paciente no encontrado",
      });
    }

    res.json(paciente);

  } catch (error) {
    res.status(500).json({
      mensaje: "Error al modificar paciente",
      error,
    });
  }
});

export default router;
