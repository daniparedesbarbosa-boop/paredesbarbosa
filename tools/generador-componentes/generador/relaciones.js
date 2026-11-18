import { RESOURCE_LIBRARY } from "./datos.js"

// Metadatos efectivos de una relación, sin tocar el disco.
//
// Una relación puede apuntar a una entidad de la biblioteca curada
// (RESOURCE_LIBRARY: pacientes, doctores, citas…) o a una entidad descubierta
// en el proyecto (por ejemplo, una generada antes con su modelo, su módulo de
// API y su store). El servidor y la terminal añaden ese descriptor a la
// relación antes de validar; aquí se combinan ambos para que las plantillas
// lean siempre un único objeto con la misma forma.
export function relacionMeta(relation) {
  if (!relation || typeof relation !== "object") return null
  const library = RESOURCE_LIBRARY[relation.resource] ?? null
  const descriptor = relation.entity && typeof relation.entity === "object" ? relation.entity : null
  if (!library && !descriptor) return null

  const meta = { ...(library ?? {}), ...(descriptor ?? {}) }
  // El store descubierto en src/store/ manda sobre el curado: si el proyecto
  // cambia el estado del store, lo generado tiene que leer el archivo real.
  // Para una entidad de la biblioteca llega en `relation.store`; para una
  // entidad descubierta, dentro de su descriptor.
  const store = relation.store ?? descriptor?.store ?? library?.store ?? null

  return {
    key: relation.resource,
    label: meta.label || relation.resource,
    singularWord: meta.singularWord || "registro",
    refModel: meta.refModel || "",
    relationIdField: meta.relationIdField || "",
    displayFields: Array.isArray(meta.displayFields) ? meta.displayFields : [],
    apiFunctions: meta.apiFunctions ?? {},
    // Nombre del módulo de src/api/ que el componente importa ("recetas.js").
    apiFile: meta.apiFile || "",
    referenceFiles: Array.isArray(meta.referenceFiles) ? meta.referenceFiles : [],
    idField: meta.idField || "_id",
    apiPath: meta.apiPath || "",
    catalogOnly: Boolean(meta.catalogOnly),
    store: store && store.idProp ? store : null,
  }
}

// Store de Pinia que el componente importará para leer la selección compartida.
export function storeDeRelacion(relation) {
  return relacionMeta(relation)?.store ?? null
}
