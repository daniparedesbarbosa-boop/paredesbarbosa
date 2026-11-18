import { slugify } from "./generador/datos.js"
import { relacionMeta } from "./generador/relaciones.js"
import { collectCatalogs } from "./generador/catalogos.js"
import { validateConfiguration } from "./generador/validacion.js"
import {
  generateModel,
  generateRoutes,
  generateApi,
  generateCatalogApi,
} from "./generador/plantillas/backend.js"
import { generateComponent } from "./generador/plantillas/componente.js"
import { generateStore } from "./generador/plantillas/store.js"
import { generateInstructions } from "./generador/plantillas/instrucciones.js"

export { validateConfiguration, slugify }

export function generateFiles(config) {
  const { errors, config: normalized } = validateConfiguration(config)
  if (errors.length) {
    const error = new Error("La configuración no es válida.")
    error.validationErrors = errors
    throw error
  }

  const { singular, plural } = normalized.entity
  const files = {
    "configuracion.json": `${JSON.stringify(normalized, null, 2)}\n`,
  }

  // Catálogos JSON declarados en los campos. Los datos nuevos se guardan en
  // backend/data, junto a los catálogos del proyecto, y el módulo generado en
  // src/api/ importa ese JSON directamente (sin ruta en el backend); el módulo
  // solo se genera cuando la pantalla no reutiliza una función ya existente.
  for (const catalog of collectCatalogs(normalized)) {
    if (catalog.source === "inline") {
      files[`backend/data/${catalog.name}.json`] = catalog.data
    }
    if (!catalog.apiFunction) {
      files[`src/api/${catalog.name}.js`] = generateCatalogApi(catalog)
    }
  }

  if (normalized.source === "existing") {
    files[`src/components/${normalized.screen.component}.vue`] = generateComponent(normalized)
    // La guía se genera al final y recibe los archivos reales: así enumera y
    // muestra el código de cada módulo que de verdad se ha escrito.
    files["INSTRUCCIONES.md"] = generateInstructions(normalized, files)
    return { files, config: normalized, outputSlug: slugify(normalized.screen.component) }
  }

  files[`backend/modelos/${slugify(singular)}.js`] = generateModel(normalized)
  files[`backend/rutas/${slugify(plural)}.rutas.js`] = generateRoutes(normalized)
  files[`src/api/${slugify(plural)}.js`] = generateApi(normalized)
  if (normalized.pinia.enabled) {
    files[`src/store/${slugify(singular)}Store.js`] = generateStore(normalized)
  }
  files[`src/components/${normalized.screen.component}.vue`] = generateComponent(normalized)
  files["INSTRUCCIONES.md"] = generateInstructions(normalized, files)
  return { files, config: normalized, outputSlug: slugify(normalized.screen.component) }
}

// Módulos de catálogo que el componente importa y que ya existen en el proyecto:
// la generación no los duplica, pero la guía y las comprobaciones los necesitan.
export function catalogRequiredFiles(config) {
  return collectCatalogs(config)
    .filter((catalog) => catalog.apiFunction)
    .map((catalog) => `src/api/${catalog.name}.js`)
}

// Archivos del proyecto que las relaciones exigen de verdad. server.js los
// comprueba antes de generar: si falta el módulo de API o el store de Pinia que
// el componente va a importar, la generación se detiene en lugar de producir
// código que fallaría al integrarlo.
export function relationRequiredFiles(config) {
  const required = []
  for (const relation of config.relations ?? []) {
    const meta = relacionMeta(relation)
    if (!meta || meta.catalogOnly) continue
    required.push(...meta.referenceFiles)
    if (relation.selection === "pinia" && meta.store) {
      required.push(`src/store/${meta.store.file}`)
    }
  }
  return [...new Set(required)]
}
