import express from "express";
import Cita from "../modelos/cita.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    res.json(await Cita.find().sort({ data: 1, hora: 1 }));
  } catch (error) {
    console.error("Error al obtener citas:", error);
    res.status(500).json({ mensaje: "Error al obtener citas" });
  }
});

router.post("/", async (req, res) => {
  try {
    const cita = await Cita.create(req.body);
    res.status(201).json(cita);
  } catch (error) {
    console.error("Error al crear cita:", error);
    res.status(error.code === 11000 ? 409 : 500).json({
      mensaje: error.code === 11000 ? "Ya existe una cita con ese ID" : "Error al crear cita",
    });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const cita = await Cita.findOneAndDelete({ id: req.params.id });
    if (!cita) return res.status(404).json({ mensaje: "Cita no encontrada" });
    res.json({ mensaje: "Cita eliminada" });
  } catch (error) {
    console.error("Error al eliminar cita:", error);
    res.status(500).json({ mensaje: "Error al eliminar cita" });
  }
});

export default router;
