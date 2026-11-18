// Registro de acciones del modo «modificar pantalla». Añadir una acción nueva es
// añadir una entrada aquí y un módulo que devuelva parches: ni la interfaz ni el
// servidor necesitan cambios para crecer.

import { parchearCampo } from "./campo.js"
import { parchearValidacion } from "./validacion.js"
import { parchearColumnaPdf, parchearPdfNuevo } from "./pdf.js"

export const ACCIONES = [
  {
    id: "campo",
    nombre: "Añadir un campo",
    descripcion: "Campo nuevo en el formulario, la tabla, el modelo y el router. Si la pantalla ya construye el cuerpo a mano, también ahí.",
    tocaBackend: true,
    campos: ["nombre", "etiqueta", "tipoCampo", "requerido", "opciones", "enFormulario", "enTabla", "enPdf"],
  },
  {
    id: "validacion",
    nombre: "Añadir una validación (solo frontend)",
    descripcion: "Comprueba un campo antes de guardar y bloquea el botón. No modifica el backend ni el modelo.",
    tocaBackend: false,
    campos: ["campo", "regla", "patron", "mensaje"],
  },
  {
    id: "pdf",
    nombre: "Informe PDF",
    descripcion: "Añade un campo al informe existente o crea la exportación desde las columnas de la tabla.",
    tocaBackend: false,
    campos: ["modo", "campo", "titulo", "nombreArchivo"],
  },
]

export function accionPorId(id) {
  return ACCIONES.find((accion) => accion.id === id) ?? null
}

export function generarParches(inventario, accion) {
  switch (accion?.tipo) {
    case "campo":
      return parchearCampo(inventario, accion)
    case "validacion":
      return parchearValidacion(inventario, accion)
    case "pdf":
      return accion?.modo === "crear"
        ? parchearPdfNuevo(inventario, accion)
        : parchearColumnaPdf(inventario, accion)
    default:
      throw new Error("Acción no reconocida: usa «campo», «validacion» o «pdf».")
  }
}
