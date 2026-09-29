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
    res.status(500).json({ mensaje: "Error al obtener pacientes" });
  }
});

//Crear
router.post("/", async (req, res) => {
  try {
    console.log("Datos recibidos:", req.body);
    const nuevoPaciente = new Paciente(req.body);

    await nuevoPaciente.save();

    res.status(201).json(nuevoPaciente);
  } catch (error) {
    console.error("Error al crear paciente:", error);

    res.status(500).json({
      mensaje: "Error al crear paciente",
    });
  }
});

export default router;