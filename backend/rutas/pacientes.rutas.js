import express from "express";
import Paciente from "../modelos/paciente.js";
import Cita from "../modelos/cita.js";

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
    const dniAnterior = req.params.dni;
    const {
      dnipac,
      nomepac,
      apelpac,
      nacipac,
      mailpac,
      movilpac,
      dirpac,
      propac,
      munipac,
      lopdpac,
    } = req.body;
    const paciente = await Paciente.findOneAndUpdate(
      {
        dnipac: dniAnterior,
      },
      {
        dnipac,
        nomepac,
        apelpac,
        nacipac,
        mailpac,
        movilpac,
        dirpac,
        propac,
        munipac,
        lopdpac,
      },
      { new: true, runValidators: true },
    );

    if (!paciente) {
      return res.status(404).json({
        mensaje: "Paciente no encontrado",
      });
    }

    // Si cambia el DNI, las citas también deben apuntar al nuevo DNI.
    if (dniAnterior !== paciente.dnipac) {
      await Cita.updateMany(
        { idPaciente: dniAnterior },
        { $set: { idPaciente: paciente.dnipac } },
      );
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
