// Versión serializable del inventario. Los nodos del AST no se envían al
// navegador: solo lo que la interfaz necesita para explicar la pantalla.

import { ACCIONES } from "./parches/registro.js"

export function inventarioPublico(inventario) {
  const { formulario, tabla, estado, payload, validacion, pdf, backend } = inventario

  return {
    archivo: inventario.archivo,
    componente: inventario.componente,
    aplicable: inventario.aplicable,
    motivo: inventario.motivo,
    explicaciones: inventario.explicaciones,
    noReconocido: inventario.noReconocido,
    acciones: ACCIONES,
    formulario: formulario?.existe
      ? {
        existe: true,
        linea: formulario.linea,
        objeto: formulario.objeto,
        manejador: formulario.manejador,
        claseBase: formulario.claseBase,
        campos: (formulario.campos ?? []).map((campo) => ({
          nombre: campo.nombre,
          etiqueta: campo.etiqueta,
          tipo: campo.tipo,
          requerido: campo.requerido,
          soloLectura: campo.soloLectura,
          linea: campo.linea,
        })),
      }
      : { existe: false, linea: null, objeto: null, manejador: null, claseBase: null, campos: [] },
    tabla: tabla?.existe
      ? {
        existe: true,
        linea: tabla.linea,
        variable: tabla.variable,
        lista: tabla.lista,
        columnas: (tabla.columnas ?? []).map((columna) => ({
          titulo: columna.titulo,
          propiedad: columna.propiedad,
          linea: columna.linea,
        })),
      }
      : { existe: false, linea: null, variable: null, lista: null, columnas: [] },
    estado: estado?.existe
      ? {
        existe: true,
        objeto: estado.objeto,
        fabrica: estado.fabrica?.nombre ?? null,
        linea: estado.linea,
        propiedades: (estado.propiedades ?? []).map((propiedad) => propiedad.nombre),
      }
      : { existe: false, objeto: null, fabrica: null, linea: null, propiedades: [] },
    payload: {
      modo: payload?.modo ?? "desconocido",
      linea: payload?.linea ?? null,
      motivo: payload?.motivo ?? "",
      claves: payload?.claves ?? [],
    },
    validacion: {
      tipo: validacion?.tipo ?? "ninguna",
      nombre: validacion?.nombre ?? null,
      linea: validacion?.linea ?? null,
      motivo: validacion?.motivo ?? "",
    },
    pdf: pdf?.existe
      ? {
        existe: true,
        funcion: pdf.funcion,
        columnas: pdf.cabeceras?.valores ?? [],
      }
      : { existe: false, funcion: null, columnas: [] },
    backend: {
      existe: Boolean(backend?.existe),
      api: backend?.api ? { archivo: backend.api.archivo, ruta: backend.api.ruta } : null,
      rutas: backend?.rutas
        ? {
          archivo: backend.rutas.archivo,
          usaBodyDirecto: Boolean(backend.rutas.usaBodyDirecto),
          listaBlanca: backend.rutas.listaBlanca
            ? {
              nombre: backend.rutas.listaBlanca.nombre,
              valores: backend.rutas.listaBlanca.valores,
              linea: backend.rutas.listaBlanca.linea,
            }
            : null,
        }
        : null,
      modelo: backend?.modelo?.existe
        ? {
          archivo: backend.modelo.archivo,
          propiedades: (backend.modelo.propiedades ?? []).map((propiedad) => ({
            nombre: propiedad.nombre,
            tipo: propiedad.tipo,
            requerido: propiedad.requerido,
          })),
        }
        : null,
      motivo: backend?.motivo ?? "",
    },
  }
}
