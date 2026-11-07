import express from "express";
import Doctor from "../modelos/doctor.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json(await Doctor.find());
  } catch (error) {
    console.error("Error al obtener doctores:", error);
    res.status(500).json({ mensaje: "Error al obtener doctores" });
  }
});

router.get("/especialidad/:especialidad", async (req, res) => {
  try {
    res.json(await Doctor.find({ espedoc: req.params.especialidad }));
  } catch (error) {
    console.error("Error al filtrar doctores:", error);
    res.status(500).json({ mensaje: "Error al obtener doctores" });
  }
});

router.post("/", async (req, res) => {
  try {
    const doctorExistente = await Doctor.findOne({ iddoc: req.body.iddoc });
    if (doctorExistente) {
      return res.status(409).json({ mensaje: "Ya existe un doctor con ese ID" });
    }

    res.status(201).json(await Doctor.create(req.body));
  } catch (error) {
    console.error("Error al crear doctor:", error);
    res.status(500).json({ mensaje: "Error al crear doctor" });
  }
});

router.delete("/:iddoc", async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndDelete({ iddoc: req.params.iddoc });
    if (!doctor) return res.status(404).json({ mensaje: "Doctor no encontrado" });
    res.json({ mensaje: "Doctor eliminado" });
  } catch (error) {
    console.error("Error al eliminar doctor:", error);
    res.status(500).json({ mensaje: "Error al eliminar doctor" });
  }
});

router.put("/:iddoc", async (req, res) => {
  try {
    const doctor = await Doctor.findOneAndUpdate(
      { iddoc: req.params.iddoc },
      req.body,
      { new: true, runValidators: true },
    );
    if (!doctor) return res.status(404).json({ mensaje: "Doctor no encontrado" });
    res.json(doctor);
  } catch (error) {
    console.error("Error al modificar doctor:", error);
    res.status(500).json({ mensaje: "Error al modificar doctor" });
  }
});

export default router;
