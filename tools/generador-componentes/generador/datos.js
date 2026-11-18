export const FIELD_TYPES = new Set([
  "text",
  "textarea",
  "email",
  "phone",
  "number",
  "date",
  "time",
  "boolean",
  "radio",
  "select",
  "catalog",
])

// Recursos reales del proyecto que la herramienta puede reutilizar. Cada entrada
// indica el módulo de src/api/ que existe de verdad, las funciones que exporta de
// verdad (revisadas en los archivos), el campo por el que el backend localiza los
// documentos y los archivos de referencia que conviene leer antes de integrar.
export const RESOURCE_LIBRARY = {
  pacientes: {
    apiFile: "pacientes.js",
    label: "Pacientes",
    singular: "Paciente",
    apiPath: "/api/pacientes",
    // El backend de pacientes busca, edita y borra por DNI (dnipac), no por _id.
    idField: "dnipac",
    singularWord: "paciente",
    // Datos para las relaciones: nombre del modelo Mongoose real, campos con los
    // que se muestra cada registro en un selector y store de Pinia existente.
    refModel: "Paciente",
    displayFields: ["nomepac", "apelpac"],
    relationIdField: "dnipac",
    store: {
      file: "pacienteStore.js",
      importName: "usePacienteStore",
      idProp: "idPaciente",
      relationValueProp: "dnipac",
      seleccionar: "seleccionarPaciente",
      limpiar: "limpiarPaciente",
    },
    apiFunctions: {
      list: "getPacientes",
      create: "savePaciente",
      edit: "modifyPaciente",
      delete: "deletePaciente",
    },
    referenceFiles: [
      "src/api/pacientes.js",
      "backend/modelos/paciente.js",
      "backend/rutas/pacientes.rutas.js",
    ],
    notes: "La API identifica a los pacientes por el DNI en dnipac; al crear relaciones con pacientes, se guarda ese DNI como texto y se valida contra Paciente.dnipac. El documento también conserva su _id de MongoDB.",
  },
  doctores: {
    apiFile: "doctores.js",
    label: "Doctores",
    singular: "Doctor",
    apiPath: "/api/doctores",
    idField: "_id",
    singularWord: "doctor",
    refModel: "Doctor",
    displayFields: ["nomedoc", "apeldoc"],
    store: {
      file: "doctorStore.js",
      importName: "useDoctorStore",
      idProp: "idDoctor",
      relationValueProp: "idDoctor",
      seleccionar: "seleccionarDoctor",
      limpiar: "limpiarDoctor",
    },
    apiFunctions: {
      list: "getDoctores",
      create: "saveDoctor",
      edit: "modifyDoctor",
      delete: "deleteDoctor",
    },
    referenceFiles: [
      "src/api/doctores.js",
      "backend/modelos/doctor.js",
      "backend/rutas/doctores.rutas.js",
    ],
    notes: "El backend de doctores localiza los documentos por su _id de MongoDB. La especialidad se guarda en el campo espedoc.",
  },
  citas: {
    apiFile: "citas.js",
    label: "Citas",
    singular: "Cita",
    apiPath: "/api/citas",
    idField: "_id",
    singularWord: "cita",
    refModel: "Cita",
    displayFields: ["fecha", "hora", "motivo"],
    // El proyecto no tiene un store de citas, así que esta API solo admite el
    // modo selector; la validación lo impide pedir la selección por Pinia.
    apiFunctions: {
      list: "getCitas",
      create: "saveCita",
      edit: "updateCita",
      delete: "deleteCita",
    },
    referenceFiles: [
      "src/api/citas.js",
      "backend/modelos/cita.js",
      "backend/rutas/citas.rutas.js",
    ],
    notes: "Las citas guardan pacienteDNI como texto (el DNI del paciente) y doctorId como ObjectId del doctor. El DNI se valida contra Paciente.dnipac.",
  },
  especialidades: {
    apiFile: "especialidades.js",
    label: "Especialidades",
    singular: "Especialidad",
    apiPath: "/api/especialidades",
    idField: "",
    catalogOnly: true,
    apiFunctions: {
      list: "obtenerEspecialidades",
    },
    referenceFiles: [
      "src/api/especialidades.js",
      "backend/data/especialidades.json",
    ],
    notes: "Es un catálogo de solo lectura: solo existe la operación listar, así que sirve para consultar o filtrar, no para crear registros.",
  },
  municipios: {
    apiFile: "municipios.js",
    label: "Municipios",
    singular: "Municipio",
    apiPath: "/api/municipios",
    idField: "",
    catalogOnly: true,
    apiFunctions: {
      list: "obtenerProvincias",
    },
    referenceFiles: [
      "src/api/municipios.js",
      "backend/data/municipios.json",
    ],
    notes: "Es un catálogo de solo lectura: la API devuelve las provincias y, con obtenerMunicipios(provincia), sus municipios. La versión generada solo lista; los selectores dependientes quedan fuera.",
  },
}

export const OPERATIONS = new Set(["list", "create", "edit", "delete"])
export const SCREEN_TYPES = new Set(["CRUD", "Listado", "Detalle", "Formulario", "Relacionado"])
// Tipos que admiten declarar relaciones (campos con ObjectId/ref). Listado y
// Detalle no tienen formulario donde escoger el registro relacionado, así que
// esta versión los deja fuera y la validación lo explica.
export const RELATION_SCREEN_TYPES = new Set(["CRUD", "Relacionado", "Formulario"])
// Modos de escoger el registro relacionado: «api» muestra un selector con la
// lista que devuelve la API real; «pinia» consume la selección compartida del
// store que ya existe en el proyecto (patrón de Citas.vue).
export const RELATION_SELECTIONS = new Set(["api", "pinia"])
export const RESERVED_FIELDS = new Set(["_id", "id", "__proto__", "constructor", "prototype"])

export const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")

export const js = (value) => JSON.stringify(value)

export function isValidIdentifier(value) {
  return /^[a-z][A-Za-z0-9]*$/.test(value) && !RESERVED_FIELDS.has(value)
}

export function isValidPascalCase(value) {
  return /^[A-Z][A-Za-z0-9]*$/.test(value)
}

export function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function isValidTime(value) {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
}

export function slugify(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function parseOptions(value) {
  if (Array.isArray(value)) {
    return value.map(({ value: optionValue, label }) => ({
      value: String(optionValue ?? "").trim(),
      label: String(label ?? "").trim(),
    }))
  }

  if (typeof value !== "string" || value.trim() === "") return []
  return value.split("\n").map((line) => {
    const separator = line.indexOf("|")
    if (separator < 0) return { value: line.trim(), label: "" }
    return {
      value: line.slice(0, separator).trim(),
      label: line.slice(separator + 1).trim(),
    }
  })
}

export function parsePattern(value) {
  const input = String(value ?? "").trim()
  const literal = /^\/([\s\S]*)\/([a-z]*)$/.exec(input)
  return literal
    ? { pattern: literal[1], patternFlags: literal[2] }
    : { pattern: input, patternFlags: "" }
}

export function matchesPattern(value, pattern, flags) {
  const text = String(value)
  const match = new RegExp(pattern, flags).exec(text)
  return match?.index === 0 && match[0].length === text.length
}

export function singularPluralName(singular, plural) {
  const lowerPlural = plural[0].toUpperCase() + plural.slice(1)
  return lowerPlural || `${singular}s`
}
