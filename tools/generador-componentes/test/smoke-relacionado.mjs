// Prueba de humo del tipo Relacionado: compila el .vue generado con el
// compilador real de Vue e importa los archivos backend con Node real.
import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc"
import { mkdtemp, writeFile, mkdir, copyFile, rm } from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { generateFiles } from "../generador.js"

const config = {
  screen: { type: "Relacionado", title: "Gestión de recetas", component: "GestionRecetas", route: "/gestion-recetas", menuLabel: "Recetas" },
  entity: { singular: "Receta", plural: "recetas", apiPath: "/api/recetas", idField: "_id" },
  fields: [
    { name: "descripcion", label: "Descripción", type: "text", required: true, form: true, list: true, search: true, max: "120" },
    { name: "estado", label: "Estado", type: "select", options: "borrador|Borrador\npublicada|Publicada", defaultValue: "borrador", form: true, list: true },
  ],
  operations: ["list", "create", "edit", "delete", "search"],
  relations: [
    { resource: "pacientes", fieldName: "pacienteDNI", label: "Paciente", required: true, selection: "api", filterable: true },
    { resource: "doctores", fieldName: "doctorId", label: "Doctor", required: true, selection: "pinia", filterable: false },
  ],
  pinia: { enabled: true, fields: ["descripcion", "estado"] },
}

const { errors, config: normalized } = await import("../generador.js").then((m) => m.validateConfiguration(config))
if (errors.length) {
  console.error("Errores de validación:", errors)
  process.exit(1)
}
const { files } = generateFiles(normalized)

// 1. El componente Vue se analiza, compila (script setup) y su plantilla compila.
const vueSource = files["src/components/GestionRecetas.vue"]
const parsed = parse(vueSource, { filename: "GestionRecetas.vue" })
if (parsed.errors.length) {
  console.error("Errores al analizar el .vue:", parsed.errors)
  process.exit(1)
}
compileScript(parsed.descriptor, { id: "smoke-relacionado" })
const template = compileTemplate({
  source: parsed.descriptor.template.content,
  filename: "GestionRecetas.vue",
  id: "smoke-relacionado",
})
if (template.errors.length) {
  console.error("Errores de plantilla:", template.errors)
  process.exit(1)
}
console.log("✔ GestionRecetas.vue compila con @vue/compiler-sfc")

// 2. Los archivos backend se escriben en una carpeta temporal dentro del
//    proyecto y se importan de verdad: si mongoose/express fallan o el esquema
//    es inválido, la importación lanza.
const tempDir = await mkdtemp(path.join(process.cwd(), ".smoke-relacionado-"))
try {
  for (const [relativePath, contents] of Object.entries(files)) {
    if (!relativePath.startsWith("backend/")) continue
    const destination = path.join(tempDir, relativePath)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, contents)
  }
  // El router generado importa los modelos reales referenciados; se copian al
  // temporal para que la importación se parezca a la del proyecto de verdad.
  await mkdir(path.join(tempDir, "backend/modelos"), { recursive: true })
  for (const model of ["Paciente.js", "Doctor.js"]) {
    await copyFile(path.join(process.cwd(), "backend/modelos", model), path.join(tempDir, "backend/modelos", model))
  }
  await import(pathToFileURL(path.join(tempDir, "backend/modelos/Receta.js")).href)
  console.log("✔ backend/modelos/Receta.js se importa y registra el esquema con ObjectId/ref")
  await import(pathToFileURL(path.join(tempDir, "backend/rutas/recetas.rutas.js")).href)
  console.log("✔ backend/rutas/recetas.rutas.js se importa y monta el router Express")
} finally {
  await rm(tempDir, { recursive: true, force: true })
}
