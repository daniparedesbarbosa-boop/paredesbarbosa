// El modo «Selección compartida con Pinia» tiene que funcionar con cualquier
// entidad que tenga su store en src/store/, incluidas las que generó antes esta
// herramienta. Estas pruebas usan los stores reales del proyecto y un proyecto
// temporal con una entidad generada (modelo + API + store).

import test from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { PassThrough } from "node:stream"
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc"
import { generateFiles, validateConfiguration } from "../generador.js"
import { runTerminal } from "../terminal.js"
import {
  describeStore,
  discoverProjectEntities,
  enrichRelations,
  listProjectStores,
  parseStore,
} from "../generador/entidades-proyecto.js"

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..")

function baseConfiguration() {
  return {
    screen: { type: "CRUD", title: "Gestión de tareas", component: "GestionTareas", route: "/gestion-tareas", menuLabel: "Tareas" },
    entity: { singular: "Tarea", plural: "tareas", apiPath: "/api/tareas", idField: "_id" },
    fields: [{ name: "titulo", label: "Título", type: "text", required: true, form: true, list: true }],
    operations: ["list", "create", "edit", "delete"],
  }
}

const MODELO_RECETA = `import mongoose from "mongoose";

const RecetaSchema = new mongoose.Schema({
  descripcion: { type: String, trim: true, required: true },
  estado: { type: String, trim: true },
}, { collection: "recetas", timestamps: true });

export default mongoose.model("Receta", RecetaSchema);
`

const API_RECETAS = `const API_URL = "http://localhost:3000/api";

export function getRecetas() {
  return fetch(API_URL + "/recetas").then((respuesta) => respuesta.json());
}

export function saveReceta(datos) {
  return fetch(API_URL + "/recetas", { method: "POST", body: JSON.stringify(datos) });
}
`

const STORE_RECETA = `import { defineStore } from "pinia";

export const useRecetaStore = defineStore("receta", {
  state: () => ({
    idReceta: null,
    descripcion: null,
    estado: null,
  }),
  actions: {
    seleccionarReceta(receta) {
      this.idReceta = receta._id ?? null;
      this.descripcion = receta.descripcion ?? null;
    },
    limpiarReceta() {
      this.idReceta = null;
      this.descripcion = null;
    },
  },
});
`

async function proyectoConReceta() {
  const root = await mkdtemp(path.join(os.tmpdir(), "generador-pinia-"))
  await mkdir(path.join(root, "backend/modelos"), { recursive: true })
  await mkdir(path.join(root, "src/api"), { recursive: true })
  await mkdir(path.join(root, "src/store"), { recursive: true })
  await writeFile(path.join(root, "backend/modelos/receta.js"), MODELO_RECETA)
  await writeFile(path.join(root, "src/api/recetas.js"), API_RECETAS)
  await writeFile(path.join(root, "src/store/recetaStore.js"), STORE_RECETA)
  return root
}

test("lee los stores reales de src/store con sus claves y acciones", async () => {
  const stores = await listProjectStores(PROJECT_ROOT)
  const paciente = stores.find((store) => store.file === "pacienteStore.js")
  const doctor = stores.find((store) => store.file === "doctorStore.js")
  assert.ok(paciente, "debe encontrar pacienteStore.js")
  assert.ok(doctor, "debe encontrar doctorStore.js")
  assert.equal(paciente.importName, "usePacienteStore")
  assert.ok(paciente.stateKeys.includes("dnipac"))
  assert.ok(paciente.actions.includes("seleccionarPaciente"))
  assert.ok(paciente.actions.includes("limpiarPaciente"))

  // En pacientes la referencia que se guarda es el DNI del estado, no el _id.
  const descriptor = describeStore(paciente, "dnipac")
  assert.equal(descriptor.idProp, "idPaciente")
  assert.equal(descriptor.relationValueProp, "dnipac")
  assert.equal(descriptor.seleccionar, "seleccionarPaciente")
  assert.equal(describeStore(doctor, "_id").relationValueProp, "idDoctor")
})

test("parseStore ignora archivos que no definen un store", () => {
  assert.equal(parseStore("export const otro = 1;", "otro.js"), null)
  const store = parseStore(STORE_RECETA, "recetaStore.js")
  assert.equal(store.storeId, "receta")
  assert.deepEqual(store.stateKeys, ["idReceta", "descripcion", "estado"])
  assert.deepEqual(store.actions, ["seleccionarReceta", "limpiarReceta"])
})

test("descubre una entidad generada antes con su modelo, API y store", async () => {
  const root = await proyectoConReceta()
  try {
    const entidades = await discoverProjectEntities(root)
    const receta = entidades.find((entidad) => entidad.key === "receta")
    assert.ok(receta, "debe descubrir la entidad receta")
    assert.equal(receta.refModel, "Receta")
    assert.equal(receta.apiFile, "recetas.js")
    assert.equal(receta.apiFunctions.list, "getRecetas")
    assert.equal(receta.apiPath, "/api/recetas")
    assert.equal(receta.store.file, "recetaStore.js")
    assert.equal(receta.store.relationValueProp, "idReceta")
    assert.deepEqual(receta.displayFields, ["descripcion", "estado"])
    assert.equal(receta.usable, true)
    assert.equal(receta.relationOnly, true)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("completa la relación con la entidad y el store que existen en disco", async () => {
  const root = await proyectoConReceta()
  try {
    const enriquecido = await enrichRelations(root, {
      relations: [{ resource: "receta", fieldName: "recetaId", label: "Receta", selection: "pinia", required: true }],
    })
    const relacion = enriquecido.relations[0]
    assert.equal(relacion.entity.refModel, "Receta")
    assert.equal(relacion.entity.store.file, "recetaStore.js")
    assert.equal(relacion.entity.apiFunctions.list, "getRecetas")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("el modo Pinia genera la lectura del store de una entidad generada", async () => {
  const root = await proyectoConReceta()
  try {
    const config = baseConfiguration()
    config.screen.type = "Relacionado"
    config.relations = [{ resource: "receta", fieldName: "recetaId", label: "Receta", required: true, selection: "pinia" }]
    const enriquecido = await enrichRelations(root, config)
    const { errors, config: normalized } = validateConfiguration(enriquecido)
    assert.deepEqual(errors, [])

    const generated = generateFiles(normalized)
    const component = generated.files["src/components/GestionTareas.vue"]
    assert.match(component, /import \{ useRecetaStore \} from "\.\.\/store\/recetaStore\.js";/)
    assert.match(component, /const recetaStore = useRecetaStore\(\);/)
    assert.match(component, /recetaId: recetaStore\.idReceta \?\? registro\.recetaId/)
    assert.match(component, /faltanRelacionesObligatorias/)
    // En modo Pinia no se carga un desplegable con todos los registros.
    assert.doesNotMatch(component, /getRecetas/)
    assert.doesNotMatch(component, /<select id="campo-recetaId"/)

    const model = generated.files["backend/modelos/tarea.js"]
    assert.match(model, /recetaId: \{ type: mongoose\.Schema\.Types\.ObjectId, ref: "Receta", required: true \}/)
    const routes = generated.files["backend/rutas/tareas.rutas.js"]
    assert.match(routes, /import Receta from "\.\.\/modelos\/Receta\.js";/)
    assert.match(routes, /Receta\.exists\(\{ _id: datos\.recetaId \}\)/)

    const parsed = parse(component, { filename: "GestionTareas.vue" })
    assert.deepEqual(parsed.errors, [])
    assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: "pinia-entidad-generada" }))
    const template = compileTemplate({
      source: parsed.descriptor.template.content,
      filename: "GestionTareas.vue",
      id: "pinia-entidad-generada",
    })
    assert.deepEqual(template.errors, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("sin store no se ofrece Pinia y el error dice qué archivo falta", async () => {
  const root = await proyectoConReceta()
  try {
    await rm(path.join(root, "src/store/recetaStore.js"))
    const enriquecido = await enrichRelations(root, {
      relations: [{ resource: "receta", fieldName: "recetaId", label: "Receta", selection: "pinia" }],
    })
    const config = { ...baseConfiguration(), screen: { ...baseConfiguration().screen, type: "Relacionado" }, relations: enriquecido.relations }
    const { errors } = validateConfiguration(config)
    assert.ok(errors.some((error) => error.includes("no tiene un store de Pinia")))
    assert.ok(errors.some((error) => error.includes("src/store/recetaStore.js")))

    // El selector de la API sigue siendo válido sin store.
    const conSelector = { ...config, relations: [{ ...config.relations[0], selection: "api" }] }
    assert.deepEqual(validateConfiguration(conSelector).errors, [])
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("la terminal ofrece Pinia para una entidad generada y la usa al generar", async () => {
  const root = await proyectoConReceta()
  const output = new PassThrough()
  let transcript = ""
  output.on("data", (chunk) => { transcript += chunk.toString() })
  const preguntas = {
    "Nombre visible de la pantalla": "Gestión de recetas",
    "Nombre técnico del componente (PascalCase)": "GestionRecetas",
    "Ruta del navegador": "/gestion-recetas",
    "Nombre singular de la entidad (PascalCase)": "Preparado",
    "Nombre plural / colección (minúsculas)": "preparados",
    "Nombre técnico del campo": "descripcion",
    "Nombre del campo de relación": "recetaId",
    "Etiqueta visible": "Receta",
  }
  const promptOverrides = {
    ask: async (label, defaultValue = "") => preguntas[label] ?? defaultValue,
    choose: async (label, choices, defaultValue) => {
      if (label === "Tipo de pantalla") return "Relacionado"
      if (label === "Entidad relacionada") return "receta"
      if (label === "Cómo se elige el registro") return "pinia"
      if (label === "Tipo de dato") return "text"
      return choices.some(({ value }) => value === defaultValue) ? defaultValue : choices[0].value
    },
    chooseMany: async (label, choices, defaultValues) => label.startsWith("Selecciona las operaciones")
      ? ["list", "create"]
      : defaultValues,
    confirm: async (label, defaultValue = false) => {
      if (label === "¿La relación es obligatoria?") return true
      return label === "¿Generar estos archivos?" || defaultValue
    },
    count: async (label, { defaultValue }) => defaultValue,
  }
  try {
    const generado = await runTerminal({
      output,
      projectRoot: root,
      outputRoot: path.join(root, "salidas"),
      promptOverrides,
    })
    assert.equal(generado, true, transcript)
    const component = await readFile(
      path.join(root, "salidas", "gestion-recetas", "src", "components", "GestionRecetas.vue"),
      "utf8",
    )
    // La terminal ofreció el modo Pinia para la entidad descubierta y la
    // generación leyó el store en lugar de cargar un desplegable.
    assert.match(component, /useRecetaStore/)
    assert.match(component, /recetaId: recetaStore\.idReceta/)
    assert.doesNotMatch(component, /getRecetas/)
    const config = JSON.parse(await readFile(
      path.join(root, "salidas", "gestion-recetas", "configuracion.json"),
      "utf8",
    ))
    assert.equal(config.relations[0].selection, "pinia")
    assert.equal(config.relations[0].store.file, "recetaStore.js")
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test("rechaza un descriptor de store con una ruta fuera de src/store", async () => {
  const root = await proyectoConReceta()
  try {
    const config = baseConfiguration()
    config.screen.type = "Relacionado"
    config.relations = [{
      resource: "receta",
      fieldName: "recetaId",
      label: "Receta",
      selection: "pinia",
      entity: {
        label: "Recetas",
        singularWord: "receta",
        refModel: "Receta",
        relationIdField: "",
        idField: "_id",
        apiFile: "recetas.js",
        apiFunctions: { list: "getRecetas" },
        displayFields: ["descripcion"],
        store: { file: "../../evil.js", importName: "useRecetaStore", idProp: "idReceta" },
      },
    }]
    const { errors } = validateConfiguration(config)
    assert.ok(errors.some((error) => error.includes("no tiene un store de Pinia")))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
