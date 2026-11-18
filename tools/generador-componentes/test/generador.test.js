import test from "node:test"
import assert from "node:assert/strict"
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { PassThrough } from "node:stream"
import { spawnSync } from "node:child_process"
import { compileScript, compileTemplate, parse } from "@vue/compiler-sfc"
import { generateFiles, validateConfiguration } from "../generador.js"
import { runTerminal } from "../terminal.js"
import { RESOURCE_LIBRARY } from "../generador/datos.js"

function validConfiguration() {
  return {
    screen: {
      type: "CRUD",
      title: "Gestión de tareas",
      component: "GestionTareas",
      route: "/gestion-tareas",
      menuLabel: "Tareas",
    },
    entity: {
      singular: "Tarea",
      plural: "tareas",
      apiPath: "/api/tareas",
      idField: "_id",
    },
    fields: [
      {
        name: "titulo",
        label: "Título",
        type: "text",
        required: true,
        defaultValue: "",
        min: "",
        max: "80",
        pattern: "",
        options: "",
        form: true,
        list: true,
        search: true,
      },
    ],
    operations: ["list", "create", "edit", "delete", "search"],
  }
}

test("genera las piezas CRUD y una ruta de salida segura", () => {
  const generated = generateFiles(validConfiguration())
  assert.equal(generated.outputSlug, "gestion-tareas")
  assert.deepEqual(Object.keys(generated.files).sort(), [
    "INSTRUCCIONES.md",
    "backend/modelos/tarea.js",
    "backend/rutas/tareas.rutas.js",
    "configuracion.json",
    "src/api/tareas.js",
    "src/components/GestionTareas.vue",
  ])
  assert.match(generated.files["backend/modelos/tarea.js"], /collection: "tareas"/)
  assert.match(generated.files["backend/rutas/tareas.rutas.js"], /findByIdAndUpdate/)
  assert.match(generated.files["src/api/tareas.js"], /encodeURIComponent\(id\)/)
  assert.match(generated.files["src/components/GestionTareas.vue"], /titulo: registro\.titulo/)
  assert.match(generated.files["src/components/GestionTareas.vue"], /:key="registroActual\._id"/)
  assert.match(generated.files["src/components/GestionTareas.vue"], />Guardar<\/button>/)
  assert.match(generated.files["src/components/GestionTareas.vue"], /Object\.assign\(registro, initialValues, guardado\)/)
  assert.match(generated.files["src/components/GestionTareas.vue"], /editingId\.value = guardado\._id/)
  assert.doesNotMatch(generated.files["src/components/GestionTareas.vue"], / limpiar\(\);/)
  assert.match(generated.files["INSTRUCCIONES.md"], /backend\/server\.js/)
})

test("el asistente de terminal genera archivos usando el mismo validador", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "generador-terminal-test-"))
  const output = new PassThrough()
  let transcript = ""
  output.on("data", (chunk) => { transcript += chunk.toString() })
  const answers = {
    "Nombre visible de la pantalla": "Pruebas",
    "Nombre técnico del componente (PascalCase)": "GestionPruebas",
    "Ruta del navegador": "/pruebas",
    "Texto del menú (opcional)": "",
    "Nombre singular de la entidad (PascalCase)": "Prueba",
    "Nombre plural / colección (minúsculas)": "pruebas",
    "Nombre técnico": "nombre",
    "Etiqueta visible": "Nombre",
  }
  const promptOverrides = {
    ask: async (label, defaultValue = "") => answers[label] ?? defaultValue,
    choose: async (label, choices, defaultValue) => {
      if (label === "Tipo de dato") return "text"
      return choices.some(({ value }) => value === defaultValue) ? defaultValue : choices[0].value
    },
    chooseMany: async (label, choices, defaultValues) => label.startsWith("Selecciona las operaciones")
      ? ["list", "create"]
      : defaultValues,
    confirm: async (label, defaultValue = false) => label === "¿Generar estos archivos?" || defaultValue,
    count: async (label, { defaultValue }) => defaultValue,
  }
  try {
    const generated = await runTerminal({
      output,
      projectRoot: temporary,
      outputRoot: path.join(temporary, "salidas"),
      promptOverrides,
    })
    assert.equal(generated, true)
    const outputFolders = await readdir(path.join(temporary, "salidas"))
    assert.deepEqual(outputFolders, ["gestion-pruebas"], transcript)
    const outputDirectory = path.join(temporary, "salidas", "gestion-pruebas")
    const files = await readdir(outputDirectory)
    assert.ok(files.includes("INSTRUCCIONES.md"))
    assert.ok(files.includes("configuracion.json"))
    assert.ok(files.includes("backend"))
    assert.ok(files.includes("src"))
    const config = JSON.parse(await readFile(path.join(outputDirectory, "configuracion.json"), "utf8"))
    assert.equal(config.entity.apiPath, "/api/pruebas")
    assert.deepEqual(config.operations, ["list", "create"])
    assert.match(transcript, /Generación completada/)
    assert.match(transcript, /INSTRUCCIONES\.md/)
  } finally {
    output.destroy()
    await rm(temporary, { recursive: true, force: true })
  }
})

test("deriva los recursos del proyecto desde src/api/ y detecta funciones que faltan", async () => {
  const { describeProjectResources, inspectExistingResource, resourceEntries } = await import("../generador/recursos-proyecto.js")
  const temporary = await mkdtemp(path.join(os.tmpdir(), "generador-recursos-"))
  try {
    await mkdir(path.join(temporary, "src", "api"), { recursive: true })
    await writeFile(path.join(temporary, "src", "api", "pacientes.js"), [
      "export async function getPacientes() { return []; }",
      "export async function savePaciente(paciente) { return paciente; }",
      "export async function modifyPaciente(dni, paciente) { return paciente; }",
    ].join("\n"))

    // La lista de recursos ya no se repite fuera de datos.js.
    assert.deepEqual(resourceEntries().map((entry) => entry.key).sort(), Object.keys(RESOURCE_LIBRARY).sort())

    const resources = await describeProjectResources(temporary)
    const pacientes = resources.find((resource) => resource.key === "pacientes")
    assert.equal(pacientes.apiFile, "src/api/pacientes.js")
    assert.equal(pacientes.apiExists, true)
    assert.deepEqual(pacientes.exportedFunctions.sort(), ["getPacientes", "modifyPaciente", "savePaciente"])
    assert.deepEqual(pacientes.missingFunctions, [{ operation: "delete", name: "deletePaciente" }])
    assert.equal(pacientes.usable, false)

    const inspection = await inspectExistingResource(temporary, {
      source: "existing",
      existingResource: "pacientes",
      operations: ["list", "delete"],
    })
    assert.ok(inspection.files.includes("backend/modelos/paciente.js"))
    assert.deepEqual(inspection.functions, [{ operation: "delete", name: "deletePaciente" }])
    assert.deepEqual(inspection.available.sort(), ["getPacientes", "modifyPaciente", "savePaciente"])
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
})

test("propone funciones por nombre para explicar qué exporta cada módulo", async () => {
  const { proposeApiFunctions } = await import("../generador/recursos-proyecto.js")
  assert.deepEqual(
    proposeApiFunctions([
      { name: "getCitas", params: 0 },
      { name: "saveCita", params: 1 },
      { name: "updateCita", params: 2 },
      { name: "deleteCita", params: 1 },
    ]),
    { list: "getCitas", create: "saveCita", edit: "updateCita", delete: "deleteCita" },
  )
  // La lista se llama sin argumentos: obtenerMunicipios(idProvincia) no sirve.
  assert.deepEqual(
    proposeApiFunctions([
      { name: "obtenerMunicipios", params: 1 },
      { name: "obtenerProvincias", params: 0 },
    ]),
    { list: "obtenerProvincias" },
  )
})

test("el asistente permite volver a una pregunta, editarla y conservar las respuestas posteriores", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "generador-terminal-navegacion-"))
  const input = new PassThrough()
  const output = new PassThrough()
  let transcript = ""
  output.on("data", (chunk) => { transcript += chunk.toString() })
  const answers = [
    ...new Array(21).fill(""),
    ":atras",
    ...new Array(10).fill(":atras"),
    "Nombre actualizado",
    "",
  ]
  let answerIndex = 0
  output.on("data", (chunk) => {
    if (chunk.toString().endsWith(": ")) {
      input.write(`${answers[answerIndex++] ?? ""}\n`)
    }
  })
  try {
    const generated = await runTerminal({
      input,
      output,
      projectRoot: temporary,
      outputRoot: path.join(temporary, "salidas"),
    })
    assert.equal(generated, true, transcript)
    const config = JSON.parse(await readFile(
      path.join(temporary, "salidas", "gestion-tareas", "configuracion.json"),
      "utf8"
    ))
    assert.equal(config.fields[0].label, "Nombre actualizado")
    assert.match(transcript, /Generación completada/)
  } finally {
    input.destroy()
    output.destroy()
    await rm(temporary, { recursive: true, force: true })
  }
})

test("mantiene sincronizados el router generado, su import y el prefijo REST", () => {
  const config = validConfiguration()
  config.entity.singular = "Medicamento"
  config.entity.plural = "medicamentos"
  config.entity.apiPath = "/api/medicamentos"
  config.fields[0].pattern = ""
  config.fields[0].max = ""

  const generated = generateFiles(config)
  const routerPath = "backend/rutas/medicamentos.rutas.js"
  assert.ok(generated.files[routerPath])
  assert.ok(generated.files["src/api/medicamentos.js"])
  assert.match(generated.files["INSTRUCCIONES.md"], /import MedicamentoRutas from "\.\/rutas\/medicamentos\.rutas\.js"/)
  assert.match(generated.files["INSTRUCCIONES.md"], /app\.use\("\/api\/medicamentos", requireDatabase, MedicamentoRutas\)/)
  assert.match(generated.files["src/api/medicamentos.js"], /http:\/\/localhost:3000\/api\/medicamentos/)

  for (const [filename, source] of Object.entries(generated.files)) {
    if (!filename.endsWith(".js")) continue
    const checked = spawnSync(process.execPath, ["--check", "--input-type=module"], {
      input: source,
      encoding: "utf8",
    })
    assert.equal(checked.status, 0, `${filename}: ${checked.stderr}`)
  }
})

test("mantiene centrados los campos de identificación y usa acciones breves con espaciado uniforme", () => {
  const config = validConfiguration()
  config.fields = [
    { name: "dni", label: "DNI", type: "text", required: true, defaultValue: "", form: true, list: true, search: false },
    { name: "fecha", label: "Fecha", type: "date", required: true, defaultValue: "", form: true, list: true, search: false },
  ]
  config.operations = ["list", "create", "edit", "delete"]
  const component = generateFiles(config).files["src/components/GestionTareas.vue"]
  assert.match(component, /registro\.dni" class="rounded border border-gray-300 p-2 text-center"/)
  assert.match(component, /registro\.fecha" class="rounded border border-gray-300 p-2 text-center"/)
  assert.match(component, /Cancelar<\/button>/)
  assert.match(component, /class="mx-1 rounded border px-3 py-2"[^>]*>Editar<\/button>/)
  assert.match(component, />Eliminar<\/button>/)
  assert.doesNotMatch(component, /Cancelar edición|Guardar cambios|Borrar<\/button>/)
})

test("rechaza configuraciones que podrían generar rutas inconsistentes", () => {
  const config = validConfiguration()
  config.entity.apiPath = "/api/../../src"
  config.operations = ["search"]
  const { errors } = validateConfiguration(config)
  assert.ok(errors.some((error) => error.includes("ruta REST")))
  assert.ok(errors.some((error) => error.includes("listar")))
})

test("valida opciones, campos repetidos y expresiones regulares", () => {
  const config = validConfiguration()
  config.fields.push({
    name: "titulo",
    label: "Estado",
    type: "select",
    required: false,
    pattern: "[",
    options: "",
    form: true,
    list: false,
    search: false,
  })
  const { errors } = validateConfiguration(config)
  assert.ok(errors.some((error) => error.includes("está repetido")))
  assert.ok(errors.some((error) => error.includes("opciones")))
  assert.ok(errors.some((error) => error.includes("expresión regular")))
})

test("puede generar solo listado sin crear endpoints de escritura", () => {
  const config = validConfiguration()
  config.operations = ["list"]
  config.fields[0].form = false
  config.fields[0].search = false
  const generated = generateFiles(config)
  assert.match(generated.files["backend/rutas/tareas.rutas.js"], /router\.get/)
  assert.doesNotMatch(generated.files["backend/rutas/tareas.rutas.js"], /router\.post|router\.put|router\.delete/)
  assert.doesNotMatch(generated.files["src/components/GestionTareas.vue"], /<form/)
})

test("el componente Vue generado se puede analizar y compilar", () => {
  const generated = generateFiles(validConfiguration())
  const filename = "GestionTareas.vue"
  const source = generated.files[`src/components/${filename}`]
  const parsed = parse(source, { filename })
  assert.deepEqual(parsed.errors, [])
  assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: "generator-test" }))
  const template = compileTemplate({
    source: parsed.descriptor.template.content,
    filename,
    id: "generator-test",
  })
  assert.deepEqual(template.errors, [])
})

test("genera controles y validaciones para los tipos de campo admitidos", () => {
  const config = validConfiguration()
  config.fields = [
    { name: "correo", label: "Correo", type: "email", required: true, form: true, list: true, search: true },
    { name: "cantidad", label: "Cantidad", type: "number", min: "1", max: "5", defaultValue: "2", form: true, list: true, search: true },
    { name: "activo", label: "Activo", type: "boolean", defaultValue: "false", form: true, list: true, search: false },
    { name: "estado", label: "Estado", type: "select", options: "pendiente|Pendiente\nhecha|Hecha", defaultValue: "pendiente", form: true, list: true, search: true },
    { name: "descripcion", label: "Descripción", type: "textarea", min: "2", max: "100", pattern: "^[A-Za-z ]+$", form: true, list: true, search: false },
  ]
  const generated = generateFiles(config)
  const filename = "GestionTareas.vue"
  const source = generated.files[`src/components/${filename}`]
  const parsed = parse(source, { filename })
  assert.deepEqual(parsed.errors, [])
  assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: "generator-field-types" }))
  const template = compileTemplate({
    source: parsed.descriptor.template.content,
    filename,
    id: "generator-field-types",
  })
  assert.deepEqual(template.errors, [])
  const model = generated.files["backend/modelos/tarea.js"]
  assert.match(model, /type: Number/)
  assert.match(model, /type: Boolean/)
  assert.match(model, /enum: \["pendiente","hecha",""\]/)
  assert.match(model, /new RegExp/)
  assert.match(model, /value === ""/)
})

test("normaliza regex de texto y genera restricciones tipadas para número y fecha", () => {
  const config = validConfiguration()
  config.fields = [
    { name: "codigo", label: "Código", type: "text", required: true, defaultValue: "ABC", pattern: "/^[A-Z]{3}$/", form: true, list: true, search: false },
    { name: "detalle", label: "Detalle", type: "textarea", required: false, defaultValue: "", pattern: "/^[A-Z]{3}$/", form: true, list: true, search: false },
    { name: "cantidad", label: "Cantidad", type: "number", required: true, defaultValue: "12", min: "10", max: "99", form: true, list: true, search: false },
    { name: "fecha", label: "Fecha", type: "date", required: true, defaultValue: "2026-02-28", min: "2026-01-01", max: "2026-12-31", form: true, list: true, search: false },
  ]
  config.operations = ["list", "create"]

  const generated = generateFiles(config)
  const normalized = JSON.parse(generated.files["configuracion.json"])
  assert.equal(normalized.fields[0].pattern, "^[A-Z]{3}$")
  assert.equal(normalized.fields[0].patternFlags, "")

  const model = generated.files["backend/modelos/tarea.js"]
  assert.match(model, /new RegExp\("\^\[A-Z\]\{3\}\$", ""\)/)
  assert.match(model, /cantidad: \{ type: Number, required: true, min: 10, max: 99/)
  assert.match(model, /value >= "2026-01-01"/)
  assert.doesNotMatch(model, /cantidad: \{[^}]*match:/)

  const component = generated.files["src/components/GestionTareas.vue"]
  assert.match(component, /type="text" required[^>]*pattern="\^\[A-Z\]\{3\}\$"/)
  assert.match(component, /type="date" required min="2026-01-01" max="2026-12-31"/)
  assert.match(component, /<textarea[^>]*><\/textarea>/)
  assert.doesNotMatch(component, /<textarea[^>]*pattern=/)
  assert.doesNotMatch(component, /type="number"[^>]*pattern=/)
  assert.match(component, /campoConFormatoInvalido/)
  assert.match(component, /new RegExp\(patron, flags\)\.exec\(String\(valor\)\)/)
  const parsed = parse(component, { filename: "GestionTareas.vue" })
  assert.deepEqual(parsed.errors, [])
  assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: "generator-regex-patterns" }))
  const template = compileTemplate({
    source: parsed.descriptor.template.content,
    filename: "GestionTareas.vue",
    id: "generator-regex-patterns",
  })
  assert.deepEqual(template.errors, [])
})

test("recomienda límites tipados para número y fecha en vez de expresiones regulares", () => {
  const config = validConfiguration()
  config.fields = [
    { name: "fecha", label: "Fecha", type: "date", pattern: "^\\d{4}-\\d{2}-\\d{2}$", form: true, list: true },
  ]
  const { errors } = validateConfiguration(config)
  assert.ok(errors.some((error) => error.includes("usa las restricciones propias para número, fecha y hora")))
})

test("omite límites de fecha y hora que no se configuraron", () => {
  const config = validConfiguration()
  config.operations = ["list", "create", "edit", "delete"]
  config.fields = [
    { name: "fechaVacia", label: "Fecha sin límites", type: "date", form: true, list: true },
    { name: "fechaDesde", label: "Fecha desde", type: "date", min: "2026-01-01", form: true, list: true },
    { name: "fechaHasta", label: "Fecha hasta", type: "date", max: "2026-12-31", form: true, list: true },
    { name: "horaDesde", label: "Hora desde", type: "time", min: "09:00", form: true, list: true },
    { name: "horaHasta", label: "Hora hasta", type: "time", max: "17:00", form: true, list: true },
  ]
  const model = generateFiles(config).files["backend/modelos/tarea.js"]
  assert.doesNotMatch(model, /(?:<=|>=) null|null === null/)
  assert.match(model, /fechaDesde:[\s\S]*?value >= "2026-01-01"/)
  assert.match(model, /fechaHasta:[\s\S]*?value <= "2026-12-31"/)
  assert.match(model, /horaDesde:[\s\S]*?value >= "09:00"/)
  assert.match(model, /horaHasta:[\s\S]*?value <= "17:00"/)
  const checked = spawnSync(process.execPath, ["--check", "--input-type=module"], {
    input: model,
    encoding: "utf8",
  })
  assert.equal(checked.status, 0, checked.stderr)
})

test("compila los formularios cuando solo se solicita crear o editar", () => {
  for (const operations of [["create"], ["list", "edit"]]) {
    const config = validConfiguration()
    config.operations = operations
    config.fields[0].search = false
    config.fields[0].list = operations.includes("list")
    const generated = generateFiles(config)
    const filename = "GestionTareas.vue"
    const parsed = parse(generated.files[`src/components/${filename}`], { filename })
    assert.deepEqual(parsed.errors, [])
    assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: `generator-${operations.join("-")}` }))
    const template = compileTemplate({
      source: parsed.descriptor.template.content,
      filename,
      id: `generator-${operations.join("-")}`,
    })
    assert.deepEqual(template.errors, [])
  }
})

test("permite generar tipos de pantalla distintos de CRUD en la misma plantilla", () => {
  const listConfig = validConfiguration()
  listConfig.screen.type = "Listado"
  listConfig.operations = ["list", "search"]
  listConfig.fields[0].form = false
  const listResult = validateConfiguration(listConfig)
  assert.equal(listResult.errors.length, 0)
  const listGenerated = generateFiles(listConfig)
  assert.match(listGenerated.files["src/components/GestionTareas.vue"], /v-for="registroActual in registrosVisibles"/)
  assert.doesNotMatch(listGenerated.files["src/components/GestionTareas.vue"], /<form/)

  const formConfig = validConfiguration()
  formConfig.screen.type = "Formulario"
  formConfig.operations = ["create"]
  formConfig.fields[0].list = false
  formConfig.fields[0].search = false
  formConfig.fields[0].form = true
  const formResult = validateConfiguration(formConfig)
  assert.equal(formResult.errors.length, 0)
  const formGenerated = generateFiles(formConfig)
  assert.match(formGenerated.files["src/components/GestionTareas.vue"], /@submit.prevent="guardar"/)
})

test("indica claramente que la salida no se registra automáticamente en la app real", () => {
  const generated = generateFiles(validConfiguration())
  assert.match(generated.files["INSTRUCCIONES.md"], /no se monta ni se registra automáticamente/i)
  assert.match(generated.files["INSTRUCCIONES.md"], /src\/router\/index\.js/i)
})

test("permite generar una pantalla que reutiliza un recurso existente sin duplicar backend", () => {
  const config = validConfiguration()
  config.source = "existing"
  config.existingResource = "doctores"
  config.entity.singular = ""
  config.entity.plural = ""
  config.entity.apiPath = ""
  config.screen.component = "SeleccionDoctor"
  config.screen.route = "/seleccion-doctor"
  config.screen.title = "Selección de doctor"
  config.operations = ["list"]
  config.fields = [{
    name: "apeldoc",
    label: "Apellidos",
    type: "text",
    required: true,
    defaultValue: "",
    min: "",
    max: "",
    pattern: "",
    options: "",
    form: false,
    list: true,
    search: true,
  }]

  const validation = validateConfiguration(config)
  assert.deepEqual(validation.errors, [])
  assert.equal(validation.config.entity.apiPath, "/api/doctores")

  const generated = generateFiles(config)
  assert.deepEqual(Object.keys(generated.files).sort(), [
    "INSTRUCCIONES.md",
    "configuracion.json",
    "src/components/SeleccionDoctor.vue",
  ])
  assert.match(generated.files["INSTRUCCIONES.md"], /reutiliza el recurso existente/i)
  assert.match(generated.files["src/components/SeleccionDoctor.vue"], /getDoctores/)
  assert.doesNotMatch(generated.files["src/components/SeleccionDoctor.vue"], /mongoose/i)
})

test("rechaza campos obligatorios fuera del formulario sin valor inicial", () => {
  const config = validConfiguration()
  config.fields[0].form = false
  const { errors } = validateConfiguration(config)
  assert.ok(errors.some((error) => error.includes("necesita un valor inicial")))
})

test("valida fechas y horas y genera límites de fecha también en Mongoose", () => {
  const config = validConfiguration()
  config.fields = [
    { name: "fecha", label: "Fecha", type: "date", required: true, defaultValue: "2026-02-28", min: "2026-01-01", max: "2026-12-31", form: true, list: true, search: false },
    { name: "hora", label: "Hora", type: "time", required: false, defaultValue: "09:30", form: true, list: true, search: false },
  ]
  config.operations = ["list", "create"]
  const generated = generateFiles(config)
  const model = generated.files["backend/modelos/tarea.js"]
  assert.match(model, /toISOString\(\)\.slice\(0, 10\)/)
  assert.match(model, /value >= "2026-01-01"/)
  assert.match(model, /value <= "2026-12-31"/)
  assert.match(model, /\[01\]\\d/)

  config.fields[0].min = "2026-02-31"
  assert.ok(validateConfiguration(config).errors.some((error) => error.includes("fechas válidas")))
  config.fields[0].min = "2026-01-01"
  config.fields[1].defaultValue = "25:61"
  assert.ok(validateConfiguration(config).errors.some((error) => error.includes("formato HH:MM")))
})

test("el tipo Relacionado usa DNI para pacientes y ObjectId para doctores", () => {
  const config = validConfiguration()
  config.screen.type = "Relacionado"
  config.screen.component = "GestionRecetas"
  config.screen.route = "/gestion-recetas"
  config.screen.title = "Gestión de recetas"
  config.entity.singular = "Receta"
  config.entity.plural = "recetas"
  config.entity.apiPath = "/api/recetas"
  config.relations = [
    { resource: "pacientes", fieldName: "pacienteDNI", label: "Paciente", required: true, selection: "api", filterable: true },
    { resource: "doctores", fieldName: "doctorId", label: "Doctor", required: true, selection: "pinia" },
  ]
  config.pinia = { enabled: true, fields: ["titulo"] }

  const generated = generateFiles(config)
  assert.deepEqual(Object.keys(generated.files).sort(), [
    "INSTRUCCIONES.md",
    "backend/modelos/receta.js",
    "backend/rutas/recetas.rutas.js",
    "configuracion.json",
    "src/api/recetas.js",
    "src/components/GestionRecetas.vue",
    "src/store/recetaStore.js",
  ])
  const model = generated.files["backend/modelos/receta.js"]
  assert.match(model, /pacienteDNI: \{ type: String, trim: true, required: true \}/)
  assert.match(model, /doctorId: \{ type: mongoose\.Schema\.Types\.ObjectId, ref: "Doctor", required: true \}/)
  assert.doesNotMatch(model, /pacienteDNI: \{[^}]*ObjectId/)
  assert.match(model, /type: mongoose\.Schema\.Types\.ObjectId/)
  const routes = generated.files["backend/rutas/recetas.rutas.js"]
  assert.match(routes, /validarRelaciones/)
  assert.match(routes, /Paciente\.exists\(\{ dnipac: datos\.pacienteDNI \}\)/)
  assert.match(routes, /\.find\(\)\.lean\(\)/)
  assert.doesNotMatch(routes, /req\.query|const filtros|find\(filtros\)/)
  const component = generated.files["src/components/GestionRecetas.vue"]
  assert.match(component, /getPacientes/)
  assert.match(component, /:value="item\.dnipac"/)
  assert.match(component, /new Map\(relacionPacienteDNI\.value\.map\(\(item\) => \[String\(item\.dnipac\)/)
  assert.match(component, /useDoctorStore/)
  assert.match(component, /etiquetaPacienteDNI\(item\)/)
  assert.match(component, /compartir\(registroActual\)/)
  const parsed = parse(component, { filename: "GestionRecetas.vue" })
  assert.deepEqual(parsed.errors, [])
  assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: "generator-relacionado" }))
  const template = compileTemplate({
    source: parsed.descriptor.template.content,
    filename: "GestionRecetas.vue",
    id: "generator-relacionado",
  })
  assert.deepEqual(template.errors, [])
  assert.match(generated.files["INSTRUCCIONES.md"], /validarRelaciones/)
  assert.match(generated.files["INSTRUCCIONES.md"], /seleccionarReceta/)
})

test("la relación Pinia con pacientes guarda el DNI seleccionado", () => {
  const config = validConfiguration()
  config.screen.type = "Relacionado"
  config.relations = [
    { resource: "pacientes", fieldName: "pacienteDNI", label: "Paciente", required: true, selection: "pinia" },
  ]
  const generated = generateFiles(config)
  const component = generated.files["src/components/GestionTareas.vue"]
  const model = generated.files["backend/modelos/tarea.js"]
  assert.match(component, /pacienteStore\.dnipac/)
  assert.match(component, /pacienteDNI: pacienteStore\.dnipac \?\? registro\.pacienteDNI/)
  assert.match(model, /pacienteDNI: \{ type: String, trim: true, required: true \}/)
})

test("rechaza configuraciones de relación incoherentes", () => {
  const config = validConfiguration()
  config.screen.type = "Relacionado"
  config.relations = [{ resource: "citas", fieldName: "citaId", label: "Cita", selection: "pinia" }]
  let result = validateConfiguration(config)
  assert.ok(result.errors.some((error) => error.includes("no tiene un store de Pinia")))

  config.relations = []
  result = validateConfiguration(config)
  assert.ok(result.errors.some((error) => error.includes("al menos una relación")))

  config.screen.type = "Listado"
  config.relations = [{ resource: "pacientes", fieldName: "pacienteDNI", label: "Paciente", selection: "api" }]
  result = validateConfiguration(config)
  assert.ok(result.errors.some((error) => error.includes("CRUD, Relacionado y Formulario")))

  config.screen.type = "Relacionado"
  config.source = "existing"
  config.existingResource = "pacientes"
  config.entity.apiPath = ""
  result = validateConfiguration(config)
  assert.ok(result.errors.some((error) => error.includes("solo están disponibles para entidades nuevas")))
})

test("genera la lista completa con un buscador local de las columnas", () => {
  const config = validConfiguration()
  config.entity.singular = "Medicamento"
  config.entity.plural = "medicamentos"
  config.entity.apiPath = "/api/medicamentos"
  config.screen.component = "Medicamentos"
  config.screen.route = "/medicamentos"
  config.screen.title = "Medicamentos"
  config.operations = ["list", "create", "edit", "delete"]
  config.fields = [
    { name: "nombre", label: "Nombre", type: "text", required: true, defaultValue: "", form: true, list: true, search: false },
    { name: "principioAct", label: "Principio activo", type: "text", required: true, defaultValue: "", form: true, list: false, search: false },
  ]

  const generated = generateFiles(config)
  const component = generated.files["src/components/Medicamentos.vue"]
  assert.match(component, /const busqueda = ref\(""\);/)
  assert.match(component, /const registrosVisibles = computed\(\(\) => \{/)
  assert.match(component, /\[registro\.nombre\]/)
  assert.match(component, /v-model\.trim="busqueda"/)
  assert.doesNotMatch(component, /searchTerm|config\.operations\.includes\("search"\)/)
  assert.match(generated.files["src/api/medicamentos.js"], /\/api\/medicamentos/)
  assert.match(generated.files["backend/rutas/medicamentos.rutas.js"], /Medicamento\.find\(\)\.lean\(\)/)
})

test("aplica restricciones por tipo en formulario, modelo y valores iniciales", () => {
  const config = validConfiguration()
  config.fields = [
    {
      name: "nombre",
      label: "Nombre",
      type: "text",
      required: false,
      defaultValue: "Ana",
      min: "2",
      max: "20",
      pattern: "^[A-Za-z]+$",
      patternMessage: "Usa solo letras",
      options: "",
      form: true,
      list: true,
      search: false,
    },
    {
      name: "precio",
      label: "Precio",
      type: "number",
      required: true,
      defaultValue: "1.5",
      min: "0.5",
      max: "10",
      step: "0.5",
      options: "",
      form: true,
      list: false,
      search: false,
    },
    {
      name: "hora",
      label: "Hora",
      type: "time",
      required: false,
      defaultValue: "10:30",
      min: "09:00",
      max: "18:00",
      options: "",
      form: true,
      list: false,
      search: false,
    },
  ]
  const { errors } = validateConfiguration(config)
  assert.deepEqual(errors, [])
  const generated = generateFiles(config).files
  assert.match(generated["src/components/GestionTareas.vue"], /type="text"[^>]*minlength="2"[^>]*maxlength="20"/)
  assert.match(generated["src/components/GestionTareas.vue"], /type="number"[^>]*min="0\.5"[^>]*max="10"[^>]*step="0\.5"/)
  assert.match(generated["src/components/GestionTareas.vue"], /type="time"[^>]*min="09:00"[^>]*max="18:00"/)
  assert.match(generated["src/components/GestionTareas.vue"], /Usa solo letras/)
  assert.match(generated["backend/modelos/tarea.js"], /value\.length >= 2/)
  assert.match(generated["backend/modelos/tarea.js"], /maxlength: 20/)
  assert.match(generated["backend/modelos/tarea.js"], /El número no respeta el incremento permitido/)
  assert.match(generated["backend/modelos/tarea.js"], /value >= "09:00"/)

  config.fields[1].defaultValue = "1.6"
  assert.ok(validateConfiguration(config).errors.some((error) => error.includes("incremento configurado")))
  config.fields[1].defaultValue = "1.5"
  config.fields[2].defaultValue = "08:59"
  assert.ok(validateConfiguration(config).errors.some((error) => error.includes("hora mínima")))
  config.fields[2].defaultValue = "10:30"
  config.fields[2].max = "08:00"
  assert.ok(validateConfiguration(config).errors.some((error) => error.includes("mínimo no puede ser mayor")))
})

test("analiza la estructura de un catálogo JSON y detecta la lista y sus campos", async () => {
  const { analyzeCatalog } = await import("../generador/catalogos.js")

  const rootList = analyzeCatalog(JSON.stringify([
    { codigo: "A1", descripcion: "Uno" },
    { codigo: "A2", descripcion: "Dos" },
  ]))
  assert.equal(rootList.ok, true)
  assert.equal(rootList.rootKey, "")
  assert.equal(rootList.idField, "codigo")
  assert.equal(rootList.labelField, "descripcion")
  assert.equal(rootList.count, 2)

  const wrapped = analyzeCatalog(JSON.stringify({
    provincias: [{ id: "01", nm: "Álava" }],
    municipios: [{ id: "01001", nm: "Alegría" }, { id: "01002", nm: "Amurrio" }],
  }), { name: "municipios" })
  assert.equal(wrapped.rootKey, "municipios")
  assert.equal(wrapped.valueField, "nm")
  assert.ok(wrapped.notes.some((note) => note.includes("provincias")))

  const repeated = analyzeCatalog(JSON.stringify([{ id: 1, nm: "Igual" }, { id: 2, nm: "Igual" }]))
  assert.equal(repeated.valueField, "id")
  assert.equal(repeated.duplicateLabels, true)

  const broken = analyzeCatalog("{\"datos\": 3}")
  assert.equal(broken.ok, false)
})

test("genera un catálogo nuevo desde los datos pegados y lo integra en el formulario", () => {
  const config = validConfiguration()
  config.operations = ["list", "create"]
  config.fields = [
    {
      name: "provincia",
      label: "Provincia",
      type: "catalog",
      required: true,
      form: true,
      list: true,
      catalog: {
        source: "inline",
        name: "provincias",
        data: JSON.stringify({ provincias: [{ id: "01", nm: "Álava" }, { id: "02", nm: "Albacete" }] }),
      },
    },
  ]

  const validation = validateConfiguration(config)
  assert.deepEqual(validation.errors, [])
  const catalog = validation.config.fields[0].catalog
  assert.equal(catalog.labelField, "nm")
  assert.equal(catalog.valueField, "nm")
  assert.equal(catalog.idField, "id")
  assert.equal(catalog.count, 2)

  const generated = generateFiles(config)
  // El JSON vive en backend/data, junto a los catálogos del proyecto.
  assert.ok(generated.files["backend/data/provincias.json"])
  assert.equal(generated.files["src/data/provincias.json"], undefined)
  assert.ok(generated.files["src/api/provincias.js"])
  // El módulo importa el JSON generado: no necesita ruta ni Axios.
  assert.match(generated.files["src/api/provincias.js"], /import catalogo from "\.\.\/\.\.\/backend\/data\/provincias\.json"/)
  assert.match(generated.files["src/api/provincias.js"], /return catalogo\.provincias/)
  assert.doesNotMatch(generated.files["src/api/provincias.js"], /axios/)
  assert.match(generated.files["src/components/GestionTareas.vue"], /catalogoProvincia\.value = await obtenerProvincias\(\)/)
  assert.match(generated.files["backend/modelos/tarea.js"], /provincia: \{ type: String, required: true, trim: true \}/)
  const component = generated.files["src/components/GestionTareas.vue"]
  assert.match(component, /import \{ obtenerProvincias \} from "\.\.\/api\/provincias\.js"/)
  assert.match(component, /v-for="item in catalogoProvincia"/)
  assert.match(component, /:value="item\.nm"/)
  assert.match(component, /cargarCatalogos\(\)/)
  const instructions = generated.files["INSTRUCCIONES.md"]
  assert.match(instructions, /backend\/data\/provincias\.json/)
  assert.doesNotMatch(instructions, /src\/data\//)
  // El catálogo nuevo se importa desde el frontend: la guía no pide rutas.
  assert.doesNotMatch(instructions, /app\.get\("\/api\/provincias"/)
  assert.match(instructions, /No añadas ninguna ruta en `backend\/server\.js`/)

  const filename = "GestionTareas.vue"
  const parsed = parse(component, { filename })
  assert.deepEqual(parsed.errors, [])
  assert.doesNotThrow(() => compileScript(parsed.descriptor, { id: "generator-catalog" }))
  const template = compileTemplate({ source: parsed.descriptor.template.content, filename, id: "generator-catalog" })
  assert.deepEqual(template.errors, [])
})

test("las instrucciones incluyen el código y los enlaces de todas las APIs generadas", () => {
  const config = validConfiguration()
  config.entity.singular = "Medicamento"
  config.entity.plural = "medicamentos"
  config.entity.apiPath = "/api/medicamentos"
  config.screen.component = "Medicamentos"
  config.screen.route = "/medicamentos"
  config.screen.title = "Medicamentos"
  config.operations = ["list", "create"]
  config.fields = [
    { name: "nombre", label: "Nombre", type: "text", required: true, defaultValue: "", form: true, list: true, search: false },
    {
      name: "laboratorio",
      label: "Laboratorio",
      type: "catalog",
      required: true,
      form: true,
      list: true,
      catalog: { source: "inline", name: "laboratorios", data: JSON.stringify([{ id: 1, nombre: "Bayer" }, { id: 2, nombre: "Cinfa" }]) },
    },
  ]

  const instructions = generateFiles(config).files["INSTRUCCIONES.md"]
  // Una entrada por API generada, con su enlace y su código completo.
  for (const apiFile of ["src/api/medicamentos.js", "src/api/laboratorios.js"]) {
    assert.ok(instructions.includes("[`" + apiFile + "`](./" + apiFile + ")"), "falta el enlace a " + apiFile)
    assert.ok(instructions.includes("### `" + apiFile + "`"), "falta la sección de " + apiFile)
  }
  assert.match(instructions, /export async function getMedicamentos/)
  assert.match(instructions, /export async function obtenerLaboratorios/)
  assert.match(instructions, /app\.use\("\/api\/medicamentos", requireDatabase, MedicamentoRutas\)/)
  assert.doesNotMatch(instructions, /app\.get\("\/api\/laboratorios"/)
  assert.match(instructions, /import catalogo from "\.\.\/\.\.\/backend\/data\/laboratorios\.json"/)
  assert.match(instructions, /Copia las capas de API de catálogo/)
  assert.match(instructions, /backend\/data\/laboratorios\.json/)
  assert.doesNotMatch(instructions, /src\/data\/laboratorios\.json/)
  // El orden es explícito y las rutas del repositorio coinciden con las de salida.
  assert.match(instructions, /## Pasos\n\n1\. Copia/)
  assert.ok(instructions.indexOf("Copia las capas de API de catálogo") < instructions.indexOf("Copia [`src/components/Medicamentos.vue`]"))
})

test("reutiliza la API de un catálogo existente sin duplicar backend", () => {
  const config = validConfiguration()
  config.fields = [
    {
      name: "espedoc",
      label: "Especialidad",
      type: "catalog",
      required: true,
      form: true,
      list: true,
      catalog: {
        source: "project",
        name: "especialidades",
        file: "backend/data/especialidades.json",
        rootKey: "especialidades",
        idField: "id",
        labelField: "nm",
        valueField: "nm",
        apiFunction: "obtenerEspecialidades",
        routeExists: true,
      },
    },
  ]

  assert.deepEqual(validateConfiguration(config).errors, [])
  const generated = generateFiles(config)
  assert.equal(generated.files["src/api/especialidades.js"], undefined)
  assert.equal(generated.files["backend/data/especialidades.json"], undefined)
  const component = generated.files["src/components/GestionTareas.vue"]
  assert.match(component, /import \{ obtenerEspecialidades \} from "\.\.\/api\/especialidades\.js"/)
  assert.match(component, /catalogoEspedoc\.value = await obtenerEspecialidades\(\)/)
  assert.match(generated.files["INSTRUCCIONES.md"], /se reutiliza la función/)
  assert.match(generated.files["INSTRUCCIONES.md"], /ya está registrada en/)
})

test("filtra un catálogo por otro selector y rechaza dependencias incoherentes", () => {
  const config = validConfiguration()
  config.fields = [
    {
      name: "provincia",
      label: "Provincia",
      type: "catalog",
      required: true,
      form: true,
      list: true,
      catalog: { source: "inline", name: "provincias", data: JSON.stringify({ provincias: [{ id: "01", nm: "Álava" }] }) },
    },
    {
      name: "municipio",
      label: "Municipio",
      type: "catalog",
      required: false,
      form: true,
      list: true,
      catalog: {
        source: "inline",
        name: "municipios",
        data: JSON.stringify({ municipios: [{ id: "01001", nm: "Alegría" }] }),
        parentField: "provincia",
      },
    },
  ]
  assert.deepEqual(validateConfiguration(config).errors, [])
  const component = generateFiles(config).files["src/components/GestionTareas.vue"]
  assert.match(component, /const catalogoMunicipioVisibles = computed/)
  assert.match(component, /String\(item\.id \?\? ""\)\.startsWith\(prefijo\)/)
  assert.match(component, /@change="cambiarProvincia"/)
  assert.match(component, /function cambiarProvincia\(\)/)
  assert.match(component, /registro\.municipio = ""/)

  const wrongParent = structuredClone(config)
  wrongParent.fields[1].catalog.parentField = "titulo"
  assert.ok(validateConfiguration(wrongParent).errors.some((error) => error.includes("debe ser otro campo catálogo")))

  const duplicatedCatalog = structuredClone(config)
  duplicatedCatalog.fields[1].catalog.name = "provincias"
  duplicatedCatalog.fields[1].catalog.data = JSON.stringify({ municipios: [{ id: "01001", nm: "Alegría" }] })
  assert.ok(validateConfiguration(duplicatedCatalog).errors.some((error) => error.includes("configuraciones distintas")))
})

test("el asistente de terminal genera un campo catálogo reutilizando la API del proyecto", async () => {
  const temporary = await mkdtemp(path.join(os.tmpdir(), "generador-terminal-catalogo-"))
  const output = new PassThrough()
  let transcript = ""
  output.on("data", (chunk) => { transcript += chunk.toString() })
  await mkdir(path.join(temporary, "backend", "data"), { recursive: true })
  await mkdir(path.join(temporary, "src", "api"), { recursive: true })
  await writeFile(
    path.join(temporary, "backend", "data", "especialidades.json"),
    JSON.stringify({ especialidades: [{ id: 1, nm: "Cardiología" }, { id: 2, nm: "Pediatría" }] }),
  )
  await writeFile(
    path.join(temporary, "src", "api", "especialidades.js"),
    "export async function obtenerEspecialidades() { return []; }\n",
  )
  await writeFile(
    path.join(temporary, "backend", "server.js"),
    "app.get(\"/api/especialidades\", (req, res) => res.json({ especialidades: [] }));\n",
  )
  const answers = {
    "Nombre visible de la pantalla": "Pruebas catálogo",
    "Nombre técnico del componente (PascalCase)": "GestionCatalogo",
    "Ruta del navegador": "/gestion-catalogo",
    "Texto del menú (opcional)": "",
    "Nombre singular de la entidad (PascalCase)": "Prueba",
    "Nombre plural / colección (minúsculas)": "pruebas",
    "Nombre técnico": "espedoc",
    "Etiqueta visible": "Especialidad",
  }
  const promptOverrides = {
    ask: async (label, defaultValue = "") => answers[label] ?? defaultValue,
    choose: async (label, choices, defaultValue) => {
      if (label === "Tipo de dato") return "catalog"
      if (label === "Origen del catálogo") return "project"
      return choices.some(({ value }) => value === defaultValue) ? defaultValue : choices[0].value
    },
    chooseMany: async (label, choices, defaultValues) => label.startsWith("Selecciona las operaciones")
      ? ["list", "create"]
      : defaultValues,
    confirm: async (label, defaultValue = false) => label === "¿Generar estos archivos?" || defaultValue,
    count: async (label, { defaultValue }) => defaultValue,
  }
  try {
    const generated = await runTerminal({
      output,
      projectRoot: temporary,
      outputRoot: path.join(temporary, "salidas"),
      promptOverrides,
    })
    assert.equal(generated, true, transcript)
    const outputDirectory = path.join(temporary, "salidas", "gestion-catalogo")
    const config = JSON.parse(await readFile(path.join(outputDirectory, "configuracion.json"), "utf8"))
    assert.equal(config.fields[0].catalog.apiFunction, "obtenerEspecialidades")
    assert.equal(config.fields[0].catalog.labelField, "nm")
    const component = await readFile(path.join(outputDirectory, "src", "components", "GestionCatalogo.vue"), "utf8")
    assert.match(component, /obtenerEspecialidades/)
    const apiFiles = await readdir(path.join(outputDirectory, "src", "api"))
    assert.deepEqual(apiFiles, ["pruebas.js"])
    assert.match(transcript, /Detectado: lista «especialidades» con 2 elementos/)
  } finally {
    output.destroy()
    await rm(temporary, { recursive: true, force: true })
  }
})
