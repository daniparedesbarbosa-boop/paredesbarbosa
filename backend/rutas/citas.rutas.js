import express from "express"
import mongoose from "mongoose"
import Cita from "../modelos/cita.js"
import Doctor from "../modelos/doctor.js"
import Paciente from "../modelos/paciente.js"

// Router independiente: server.js lo monta bajo /api/citas.
const router = express.Router()

// Lista blanca de propiedades que se aceptan al crear o editar una cita.
const camposCita = [
    "pacienteId",
    "doctorId",
    "fecha",
    "hora",
    "motivo",
    "observacions",
    "estado"
]

// Descarta campos no admitidos para evitar guardar propiedades arbitrarias del cliente.
function datosPermitidos(body) {
    // Si la peticion llega sin cuerpo, se procesa como un objeto vacio.
    const datosRecibidos = body ?? {}
    return Object.fromEntries(
        camposCita
            .filter((campo) => datosRecibidos[campo] !== undefined)
            .map((campo) => [campo, datosRecibidos[campo]])
    )
}

// Comprueba que las referencias de paciente y doctor apunten a documentos existentes.
async function validarRelaciones(datos) {
    if (!mongoose.Types.ObjectId.isValid(datos.pacienteId)) {
        return "El paciente seleccionado no tiene un identificador válido"
    }

    if (!mongoose.Types.ObjectId.isValid(datos.doctorId)) {
        return "El doctor seleccionado no tiene un identificador válido"
    }

    if (datos.pacienteId && !(await Paciente.exists({ _id: datos.pacienteId }))) {
        return "El paciente seleccionado no existe"
    }

    if (datos.doctorId && !(await Doctor.exists({ _id: datos.doctorId }))) {
        return "El doctor seleccionado no existe"
    }

    return ""
}

// GET /api/citas: devuelve las citas ordenadas cronologicamente.
router.get("/", async (req, res) => {
    try {
        // lean() devuelve objetos simples y el orden facilita mostrar las proximas citas primero.
        const citas = await Cita.find().sort({ fecha: 1, hora: 1 }).lean()
        res.json(citas)
    } catch (error) {
        console.error("Error al listar las citas:", error)
        res.status(500).json({ mensaje: "Error al listar las citas" })
    }
})

// POST /api/citas: valida las relaciones y guarda una cita nueva.
router.post("/", async (req, res) => {
    try {
        // Normaliza los campos antes de validar referencias o crear el documento.
        const datos = datosPermitidos(req.body)
        // Mensaje vacio indica que ambas referencias apuntan a registros existentes.
        const errorRelacion = await validarRelaciones(datos)

        if (errorRelacion) {
            return res.status(400).json({ mensaje: errorRelacion })
        }

        // Documento que Mongoose valida y persiste antes de devolverlo en la respuesta.
        const cita = await Cita.create(datos)
        res.status(201).json(cita)
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ mensaje: error.message })
        }

        console.error("Error al crear la cita:", error)
        res.status(500).json({ mensaje: "Error al crear la cita" })
    }
})

// PUT /api/citas/:id: actualiza los campos permitidos de una cita existente.
router.put("/:id", async (req, res) => {
    try {
        // Conserva solamente las propiedades de cita admitidas por la lista blanca.
        const datos = datosPermitidos(req.body)
        // Impide que la edicion asigne referencias a registros inexistentes.
        const errorRelacion = await validarRelaciones(datos)

        if (errorRelacion) {
            return res.status(400).json({ mensaje: errorRelacion })
        }

        // Retorna la version actualizada y vuelve a comprobar las reglas del esquema.
        const cita = await Cita.findByIdAndUpdate(
            req.params.id,
            datos,
            { new: true, runValidators: true }
        )

        if (!cita) {
            return res.status(404).json({ mensaje: "Cita no encontrada" })
        }

        res.json(cita)
    } catch (error) {
        if (error.name === "ValidationError" || error.name === "CastError") {
            return res.status(400).json({ mensaje: error.message })
        }

        console.error("Error al modificar la cita:", error)
        res.status(500).json({ mensaje: "Error al modificar la cita" })
    }
})

// DELETE /api/citas/:id: elimina una cita usando el identificador de MongoDB.
router.delete("/:id", async (req, res) => {
    try {
        // El resultado permite responder 404 cuando el identificador no existia.
        const cita = await Cita.findByIdAndDelete(req.params.id)

        if (!cita) {
            return res.status(404).json({ mensaje: "Cita no encontrada" })
        }

        res.json({ mensaje: "Cita eliminada" })
    } catch (error) {
        if (error.name === "CastError") {
            return res.status(400).json({ mensaje: "El ID de la cita no es valido" })
        }

        console.error("Error al eliminar la cita:", error)
        res.status(500).json({ mensaje: "Error al eliminar la cita" })
    }
})

export default router
