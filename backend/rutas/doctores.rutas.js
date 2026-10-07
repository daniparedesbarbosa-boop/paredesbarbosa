import express from "express";
import Doctor from "../modelos/doctor.js";

const router = express.Router();

//Obtener todos los doctores
router.get("/", async (req, res) => {
  try {
    const doctores = await Doctor.find();
    res.json(doctores);
  } catch (error) {
    console.error("Error al obtener doctores:", error);
    res.status(500).json({
      mensaje: "Error al obtener doctores",
    });
  }
});

//Obtener doctores por especialidad
router.get("/:especialidad", async (req, res) => {
  try {
    const doctores = await Doctor.find({
      especialidad: req.params.especialidad,
    });
    res.json(doctores);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al obtener doctores",
    });
  }
});

//Crear
router.post("/", async (req, res) => {
  try {
    const doctorExistente = await Doctor.findOne({
      iddoc: req.body.iddoc,
    });
    if (doctorExistente) {
      return res.status(409).json({
        mensaje: "Ya existe un doctor con ese ID",
      });
    }

    const nuevoDoctor = new Doctor(req.body);

    await nuevoDoctor.save();

    res.status(201).json(nuevoDoctor);
  } catch (error) {
    console.error("Error al crear doctor:", error);
    res.status(500).json({
      mensaje: "Error al crear doctor",
      error,
    });
  }
});

//Eliminar
router.delete("/:iddoc", async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndDelete({
      iddoc: req.params.iddoc,
    });

    if (!doctor) {
      return res.status(404).json({
        mensaje: "Doctor no encontrado",
      });
    }

    const nuevoDoctor = new Doctor(req.body);

    await nuevoDoctor.save();

    res.status(201).json(nuevoDoctor);
  } catch (error) {
    console.error("Error al crear doctor:", error);

    res.status(500).json({
      mensaje: "Error al crear doctor",
      error,
    });
  }
});

//Eliminar
router.delete("/:iddoc", async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndDelete({
      iddoc: req.params.iddoc,
    });

    if (!doctor) {
      return res.status(404).json({
        mensaje: "Doctor no encontrado",
      });
    }

    res.json({
      mensaje: "Doctor eliminado",
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al eliminar doctor",
      error,
    });
  }
});

//Modificar doctor
router.put("/:iddoc", async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndUpdate(
      {
        iddoc: req.params.id,
      },
      req.body,
      { new: true },
    );

    if (!doctor) {
      return res.status(404).json({
        mensaje: "Doctor no encontrado",
      });
    }

    res.json(doctor);
  } catch (error) {
    res.status(500).json({
      mensaje: "Error al modificar doctor",
      error,
    });
  }
});

export default router;
