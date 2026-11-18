import { js, slugify } from "../datos.js"

export function generateStore(config) {
  const { singular } = config.entity
  const { component } = config.screen
  const fields = config.pinia.fields
  const storeId = slugify(singular)
  return `// Dónde va: src/store/${storeId}Store.js
// Qué es: un store de Pinia, el estado compartido entre pantallas. defineStore crea
// un almacén global: cualquier componente que llame a use${singular}Store() lee y
// cambia el mismo estado. Sigue el patrón de src/store/doctorStore.js del proyecto;
// lo genera a petición de ${component}.vue.
import { defineStore } from "pinia";

export const use${singular}Store = defineStore(${js(storeId)}, {
  // El estado guarda el identificador del registro seleccionado y los datos
  // mínimos que se pidieron en el formulario del generador.
  state: () => ({
    id${singular}: null,
${fields.map((field) => `    ${field}: null,`).join("\n")}
  }),
  // Las acciones son funciones que modifican el estado compartido.
  actions: {
    // Copia al store los datos del registro que comparte la pantalla ${component}.
    seleccionar${singular}(registro) {
      this.id${singular} = registro._id ?? null;
${fields.map((field) => `      this.${field} = registro.${field} ?? null;`).join("\n")}
    },
    // Limpia la selección cuando ya no debe estar activa.
    limpiar${singular}() {
      this.id${singular} = null;
${fields.map((field) => `      this.${field} = null;`).join("\n")}
    },
  },
});
`
}