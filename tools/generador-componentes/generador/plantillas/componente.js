import { RESOURCE_LIBRARY, escapeHtml, js, singularPluralName, slugify } from "../datos.js"
import { relacionMeta } from "../relaciones.js"
import { catalogApiFunctionName, propertyAccess } from "../catalogos.js"

const pascalCase = (value) => {
  const text = String(value ?? "")
  return text ? text[0].toUpperCase() + text.slice(1) : ""
}

function defaultValue(field) {
  if (field.defaultValue === "") return field.type === "boolean" ? false : field.type === "number" ? "" : ""
  if (field.type === "boolean") return field.defaultValue === "true"
  if (field.type === "number") return Number(field.defaultValue)
  return field.defaultValue
}

function fieldControl(field, context = {}) {
  const id = `campo-${field.name}`
  const required = field.required ? " required" : ""
  const pattern = field.pattern || (field.type === "email" ? "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$" : "")
  const nativeRangeType = ["number", "date", "time"].includes(field.type)
  const min = field.min === null ? "" : ` ${nativeRangeType ? "min" : "minlength"}="${escapeHtml(field.min)}"`
  const max = field.max === null ? "" : ` ${nativeRangeType ? "max" : "maxlength"}="${escapeHtml(field.max)}"`
  const step = field.type === "number" ? ` step="${escapeHtml(field.step ?? "any")}"` : ""
  const nativePatternSupported = ["text", "email", "phone"].includes(field.type)
  const centered = ["phone", "number", "date", "time"].includes(field.type) ||
    /(?:id|dni|codigo|code|postal|zip)$/i.test(field.name)
  const inputClasses = `rounded border border-gray-300 p-2${centered ? " text-center" : ""}`
  const patternAttribute = pattern && nativePatternSupported && !field.patternFlags
    ? ` pattern="${escapeHtml(pattern)}"`
    : ""
  if (field.type === "boolean") {
    return `      <label class="flex items-center gap-2">
        <input id="${id}" v-model="registro.${field.name}" type="checkbox"${required}>
        ${escapeHtml(field.label)}
      </label>`
  }
  if (field.type === "radio") {
    return `      <fieldset class="grid gap-2">
        <legend>${escapeHtml(field.label)}${field.required ? " *" : ""}</legend>
${field.options.map((option) => `        <label class="flex items-center gap-2">
          <input v-model="registro.${field.name}" type="radio" value="${escapeHtml(option.value)}"${required}>
          ${escapeHtml(option.label)}
        </label>`).join("\n")}
      </fieldset>`
  }
  if (field.type === "select") {
    return `      <div class="grid gap-2">
        <label for="${id}">${escapeHtml(field.label)}${field.required ? " *" : ""}</label>
        <select id="${id}" v-model="registro.${field.name}" class="rounded border border-gray-300 bg-white p-2"${required}>
          <option value="">Selecciona una opción</option>
${field.options.map((option) => `          <option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join("\n")}
        </select>
      </div>`
  }
  if (field.type === "catalog") {
    const catalog = field.catalog
    const variable = context.catalogVar ?? `catalogo${pascalCase(field.name)}`
    const list = context.listExpression ?? variable
    const keyExpression = catalog.idField ? propertyAccess("item", catalog.idField) : "item"
    const valueExpression = catalog.valueField ? propertyAccess("item", catalog.valueField) : "item"
    const textExpression = catalog.labelField ? `{{ ${propertyAccess("item", catalog.labelField)} }}` : "{{ item }}"
    const onChange = context.onChange ? ` @change="${context.onChange}"` : ""
    return `      <div class="grid gap-2">
        <label for="${id}">${escapeHtml(field.label)}${field.required ? " *" : ""}</label>
        <select id="${id}" v-model="registro.${field.name}" class="rounded border border-gray-300 bg-white p-2"${required}${onChange} :disabled="${list}.length === 0">
          <option value="">Selecciona ${escapeHtml(field.label.toLowerCase())}</option>
          <option v-for="item in ${list}" :key="${keyExpression}" :value="${valueExpression}">${textExpression}</option>
        </select>
        <small v-if="${list}.length === 0" class="text-sm text-gray-600">El catálogo ${escapeHtml(catalog.name)} está vacío o no se pudo cargar.</small>
      </div>`
  }
  if (field.type === "textarea") {
    return `      <div class="grid gap-2">
        <label for="${id}">${escapeHtml(field.label)}${field.required ? " *" : ""}</label>
        <textarea id="${id}" v-model.trim="registro.${field.name}" class="rounded border border-gray-300 p-2" rows="3"${required}${min}${max}${patternAttribute}></textarea>
      </div>`
  }
  const inputType = field.type === "phone" ? "tel" : field.type
  const numberModifier = field.type === "number" ? ".number" : ["text", "email", "phone"].includes(field.type) ? ".trim" : ""
  return `      <div class="grid gap-2">
        <label for="${id}">${escapeHtml(field.label)}${field.required ? " *" : ""}</label>
        <input id="${id}" v-model${numberModifier}="registro.${field.name}" class="${inputClasses}" type="${inputType}"${required}${min}${max}${step}${patternAttribute}>
      </div>`
}

export function generateComponent(config) {
  const { singular, plural } = config.entity
  const { component, title, type } = config.screen
  const operations = new Set(config.operations)
  const resourceDetails = getResourceApiDetails(config)
  const idField = resourceDetails.idField || "_id"
  const relations = config.relations
  const apiRelations = relations.filter((relation) => relation.selection === "api")
  const piniaRelations = relations.filter((relation) => relation.selection === "pinia")
  const listRelations = relations
  // Los stores reales del proyecto (pacienteStore, doctorStore) se importan con
  // el nombre exacto que existe en src/store/; se calcula también el nombre de
  // la variable local que usará el componente.
  const storeVars = new Map()
  for (const relation of piniaRelations) {
    // La metadata sale de la biblioteca curada o de la entidad descubierta en
    // el proyecto; en ambos casos el store trae su archivo y sus propiedades.
    const meta = relacionMeta(relation)
    const variable = meta.store.importName.replace(/^use/, "").replace(/^([A-Z])/, (letter) => letter.toLowerCase())
    storeVars.set(relation.fieldName, { meta, store: meta.store, variable })
  }
  const ownStore = config.pinia.enabled
    ? {
        file: `${slugify(singular)}Store.js`,
        importName: `use${singular}Store`,
        variable: `${singular[0].toLowerCase()}${singular.slice(1)}Store`,
        idProp: `id${singular}`,
        seleccionar: `seleccionar${singular}`,
        limpiar: `limpiar${singular}`,
        fields: config.pinia.fields,
      }
    : null
  const apiImports = []
  const hasForm = (operations.has("create") || operations.has("edit")) && type !== "Detalle"
  const hasList = operations.has("list")
  const showActions = ((operations.has("edit") || operations.has("delete")) && type !== "Detalle") || Boolean(ownStore && hasList)
  const editingOnly = operations.has("edit") && !operations.has("create")
  if (operations.has("list")) apiImports.push(resourceDetails.apiFunctions.list || `get${singularPluralName(singular, plural)}`)
  if (hasForm && operations.has("create")) apiImports.push(resourceDetails.apiFunctions.create || `create${singular}`)
  if (hasForm && operations.has("edit")) apiImports.push(resourceDetails.apiFunctions.edit || `update${singular}`)
  if (operations.has("delete")) apiImports.push(resourceDetails.apiFunctions.delete || `delete${singular}`)
  const fieldsInForm = config.fields.filter((field) => field.form)
  const listFields = config.fields.filter((field) => field.list)
  // Catálogos JSON: cada campo catálogo tiene su lista y, si se pidió, se filtra
  // por otro campo catálogo del mismo formulario.
  const formCatalogFields = hasForm
    ? config.fields.filter((field) => field.form && field.type === "catalog")
    : []
  const dependentCatalogFields = formCatalogFields.filter((field) => field.catalog.parentField)
  const catalogChildren = new Map()
  for (const field of dependentCatalogFields) {
    const children = catalogChildren.get(field.catalog.parentField) ?? []
    children.push(field)
    catalogChildren.set(field.catalog.parentField, children)
  }
  function fieldContext(field) {
    if (field.type !== "catalog") return {}
    const variable = `catalogo${pascalCase(field.name)}`
    return {
      catalogVar: variable,
      listExpression: field.catalog.parentField ? `${variable}Visibles` : variable,
      onChange: catalogChildren.has(field.name) ? `cambiar${pascalCase(field.name)}` : "",
    }
  }
  const initialValues = Object.fromEntries([
    ...config.fields.map((field) => [field.name, defaultValue(field)]),
    ...relations.map((relation) => [relation.fieldName, ""]),
  ])
  const scriptImports = ["ref"]
  if (hasForm) scriptImports.push("reactive")
  const needsComputed = hasList ||
    apiRelations.length > 0 ||
    piniaRelations.some((relation) => relation.required) ||
    dependentCatalogFields.length > 0
  if (needsComputed) scriptImports.push("computed")
  if (hasList || apiRelations.length || formCatalogFields.length) scriptImports.push("onMounted")
  const alertImports = ["alertaError"]
  if (hasForm || operations.has("delete")) alertImports.push("alertaExito")
  if (operations.has("delete")) alertImports.push("alertaConfirmacion")
  const recordOptions = resourceDetails.catalogOnly ? "registroActual, index" : "registroActual"
  const keyExpression = resourceDetails.catalogOnly ? "index" : `registroActual.${idField}`
  const templatePurpose = [
    hasForm ? "El bloque <form> crea y edita registros a través de la capa de API." : "",
    hasList ? "La tabla muestra los registros que devuelve el backend." : "",
  ].filter(Boolean).join(" ")
  const componentTemplate = [
    "<template>",
    `  <!--
    Dónde va: src/components/${component}.vue
    Qué es: pantalla ${type} para ${title}. ${templatePurpose}
    La lógica está en el bloque <script setup> de abajo, comentado paso a paso.
    Los pasos para copiar e integrar este archivo están en INSTRUCCIONES.md.
  -->`,
    '  <section class="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-8">',
    `    <h1 class="mb-6 rounded-xl border-b border-slate-200 bg-gradient-to-r from-slate-50 to-green-50/50 px-5 py-5 text-xl font-bold text-slate-900">${escapeHtml(title)}</h1>`,
  ]

  if (hasForm) {
    const showWhenEditing = editingOnly
    const submitLabel = "Guardar"
    const piniaRequiredMissing = piniaRelations.some((relation) => relation.required)
    // Control por relación: «api» renderiza un <select> con la lista real del
    // recurso; «pinia» muestra la selección compartida. El valor enviado depende
    // del identificador del recurso (por ejemplo, pacienteStore.dnipac).
    const relationFormControl = (relation) => {
      const meta = relacionMeta(relation)
      const singularLabel = meta.singularWord
      const pascal = relation.fieldName[0].toUpperCase() + relation.fieldName.slice(1)
      if (relation.selection === "api") {
        return `      <div class="grid gap-2">
        <label for="campo-${relation.fieldName}">${escapeHtml(relation.label)}${relation.required ? " *" : ""}</label>
        <select id="campo-${relation.fieldName}" v-model="registro.${relation.fieldName}" class="rounded border border-gray-300 bg-white p-2"${relation.required ? " required" : ""}>
          <option value="">Selecciona ${singularLabel}</option>
          <option v-for="item in relacion${pascal}" :key="item.${meta.relationIdField || "_id"}" :value="item.${meta.relationIdField || "_id"}">{{ etiqueta${pascal}(item) }}</option>
        </select>
      </div>`
      }
      const storeVar = storeVars.get(relation.fieldName).variable
      return `      <div class="grid gap-2 rounded border border-gray-200 bg-gray-50 p-3">
        <span class="font-medium">${escapeHtml(relation.label)}${relation.required ? " *" : ""}</span>
        <p v-if="${storeVar}.${meta.store.relationValueProp || meta.store.idProp}" class="text-sm text-gray-700">
          Usando la selección compartida con Pinia: {{ texto${pascal}(${storeVar}.${meta.store.relationValueProp || meta.store.idProp}) }}
        </p>
        <p v-else class="text-sm text-red-700">
          Todavía no hay ${singularLabel} seleccionado en la pantalla que comparte el store de Pinia. Selecciónalo allí y vuelve, o cambia esta relación al modo selector de la API.
        </p>
      </div>`
    }
    componentTemplate.push(
      showWhenEditing
        ? '    <form v-if="editingId" class="mb-8 grid gap-4" @submit.prevent="guardar">'
        : '    <form class="mb-8 grid gap-4" @submit.prevent="guardar">',
      ...relations.map((relation) => relationFormControl(relation)),
      ...fieldsInForm.map((field) => fieldControl(field, fieldContext(field))),
      '      <div class="flex flex-wrap gap-3">',
      `        <button type="submit"${showWhenEditing ? ' v-if="editingId"' : ""} class="rounded-lg border-0 bg-green-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-65" :disabled="saving${piniaRequiredMissing ? " || faltanRelacionesObligatorias" : ""}">${submitLabel}</button>`,
      operations.has("edit") && hasList
      ? '        <button v-if="editingId" type="button" class="rounded border px-4 py-2" @click="limpiar">Cancelar</button>'
        : "",
      '      </div>',
      '    </form>'
    )
  }
  if (hasList) {
    if (type === "Detalle") {
      componentTemplate.push(
        '    <!-- El detalle muestra el registro marcado con el botón «Ver»; si no se ha',
        '         marcado ninguno, usa el primero de la lista. Si la pantalla debe recibir',
        '         el identificador por la ruta, adapta este bloque y el <script setup>. -->',
        '    <div v-if="!loading && (registroDetalle || registrosVisibles[0])" class="mb-4 rounded border border-gray-200 bg-gray-50 p-4">',
        '      <h2 class="mb-2 font-semibold">Detalle del registro</h2>',
        '      <dl class="grid gap-2">',
        '        <template v-for="campo in Object.keys(registroDetalle || registrosVisibles[0])" :key="campo">',
        "          <div class=\"flex gap-2\" v-if=\"campo !== '_id'\">",
        '            <dt class="font-medium text-gray-700">{{ campo }}</dt>',
        '            <dd>{{ (registroDetalle || registrosVisibles[0])[campo] }}</dd>',
        '          </div>',
        '        </template>',
        '      </dl>',
        '    </div>'
      )
    }
    componentTemplate.push(
      '    <p v-if="loading" class="py-4 text-gray-600" role="status">Cargando registros...</p>',
      ...(listFields.length ? [
        '    <!-- Buscador local: filtra la lista ya cargada por el texto de las columnas. -->',
        '    <div v-if="!loading" class="mb-4">',
        '      <label for="buscador-registros" class="sr-only">Buscar registros</label>',
        '      <input id="buscador-registros" v-model.trim="busqueda" type="search" class="w-full rounded border border-gray-300 p-2" placeholder="Buscar en la tabla...">',
        '    </div>',
      ] : []),
      '    <div v-if="!loading" class="overflow-x-auto">',
      '      <table class="w-full border-collapse text-left">',
      '        <thead><tr class="border-b bg-gray-50">',
      ...listFields.map((field) => `          <th class="p-3">${escapeHtml(field.label)}</th>`),
      ...listRelations.map((relation) => `          <th class="p-3">${escapeHtml(relation.label)}</th>`),
      (showActions || type === "Detalle") ? '          <th class="p-3">Acciones</th>' : "",
      '        </tr></thead>',
      '        <tbody>',
      `          <tr v-for="${recordOptions} in registrosVisibles" :key="${keyExpression}" class="border-b">`,
      ...listFields.map((field) => `            <td class="p-3">{{ registroActual.${field.name} }}</td>`),
      ...listRelations.map((relation) => {
        const pascal = relation.fieldName[0].toUpperCase() + relation.fieldName.slice(1)
        return `            <td class="p-3">{{ texto${pascal}(registroActual.${relation.fieldName}) }}</td>`
      }),
      type === "Detalle"
        ? '            <td class="p-3"><button type="button" class="mx-1 rounded border px-3 py-2" @click="ver(registroActual)">Ver</button></td>'
        : showActions
          ? `            <td class="p-3 text-center">
${ownStore ? `              <button type="button" class="mx-1 rounded border px-3 py-2" :aria-pressed="${ownStore.variable}.${ownStore.idProp} === registroActual._id" title="Compartir" @click="compartir(registroActual)">Compartir</button>` : ""}
${operations.has("edit") ? '              <button type="button" class="mx-1 rounded border px-3 py-2" @click="editar(registroActual)">Editar</button>' : ""}
${operations.has("delete") ? '              <button type="button" class="mx-1 rounded border border-red-300 px-3 py-2 text-red-700" @click="eliminar(registroActual)">Eliminar</button>' : ""}
            </td>`
          : "",
      '          </tr>',
      '          <tr v-if="registrosVisibles.length === 0"><td class="p-4 text-gray-600" :colspan="columnCount">No hay registros para mostrar.</td></tr>',
      '        </tbody>',
      '      </table>',
      '    </div>'
    )
  }
  componentTemplate.push('  </section>', '</template>')

  const relatedApiImports = []
  for (const relation of apiRelations) {
    const meta = relacionMeta(relation)
    const listFunction = meta.apiFunctions.list
    let group = relatedApiImports.find((entry) => entry.module === `../api/${meta.apiFile}`)
    if (!group) {
      group = { module: `../api/${meta.apiFile}`, functions: [] }
      relatedApiImports.push(group)
    }
    if (!group.functions.includes(listFunction)) group.functions.push(listFunction)
  }
  // Módulos de API de los catálogos usados por el formulario. Se agrupan por
  // archivo para no repetir imports del mismo catálogo.
  const catalogImports = new Map()
  for (const field of formCatalogFields) {
    const modulePath = `../api/${field.catalog.name}.js`
    const functions = catalogImports.get(modulePath) ?? new Set()
    functions.add(field.catalog.apiFunction || catalogApiFunctionName(field.catalog.name))
    catalogImports.set(modulePath, functions)
  }
  const script = [
    "<script setup>",
    `// Dónde va: src/components/${component}.vue, continuando el bloque <template> de arriba.`,
    "// Patrón del proyecto: el estado vive en ref y reactive, las peticiones salen por la",
    `// capa de API (${resourceDetails.modulePath.replace("../", "src/")}) y los avisos usan`,
    "// src/utils/alertas.js (SweetAlert2), la utilidad que comparten todas las pantallas.",
    `import { ${scriptImports.join(", ")} } from "vue";`,
    `import { ${apiImports.join(", ")} } from "${resourceDetails.modulePath}";`,
    ...relatedApiImports.map((group) => `import { ${group.functions.join(", ")} } from "${group.module}";`),
    ...[...catalogImports].map(([modulePath, functions]) => `import { ${[...functions].join(", ")} } from "${modulePath}";`),
    ...[...storeVars.values()].map(({ store }) => `import { ${store.importName} } from "../store/${store.file}";`),
    ...(ownStore ? [`import { ${ownStore.importName} } from "../store/${ownStore.file}";`] : []),
    `import { ${alertImports.join(", ")} } from "../utils/alertas.js";`,
    "",
  ]
  for (const { meta, store, variable } of storeVars.values()) {
    script.push(
      `// Acceso al store real del proyecto: guarda la selección de ${meta.label.toLowerCase()} entre pantallas.`,
      `const ${variable} = ${store.importName}();`,
      "",
    )
  }
  if (ownStore) {
    script.push(
      `// Store propio de esta pantalla: guarda la selección que se comparte con otras pantallas.`,
      `const ${ownStore.variable} = ${ownStore.importName}();`,
      "",
    )
  }
  if (hasForm) {
    script.push(
      "// Valores con los que arranca el formulario; limpiar() vuelve a ellos al cancelar.",
      `const initialValues = ${js(initialValues)};`,
      "// reactive guarda los valores del formulario; cada control los edita con v-model=\"registro.campo\".",
      "const registro = reactive({ ...initialValues });",
      "// editingId distingue «crear» de «editar»: guarda el identificador de la fila que se edita.",
      "const editingId = ref(null);",
      "// saving desactiva el botón de guardar mientras la petición está en curso.",
      "const saving = ref(false);",
      "",
    )
  }
  if (hasList) {
    script.push(
      "// registros guarda la lista completa del backend; la tabla muestra registrosVisibles (abajo).",
      "const registros = ref([]);",
      "// loading muestra el mensaje «Cargando registros...» mientras la petición está en curso.",
      "const loading = ref(false);",
      "",
    )
  }
  const pascalName = (fieldName) => fieldName[0].toUpperCase() + fieldName.slice(1)
  if (apiRelations.length) {
    script.push(
      "// Cada ref guarda la lista de registros de la entidad relacionada; la carga la",
      "// API real del proyecto y alimenta el selector del formulario.",
      ...apiRelations.map((relation) =>
        `const relacion${pascalName(relation.fieldName)} = ref([]);`),
      "",
    )
    for (const relation of apiRelations) {
      const pascal = pascalName(relation.fieldName)
      const meta = relacionMeta(relation)
      script.push(
        `// Etiqueta visible de un registro de ${meta.label.toLowerCase()} en el selector y la tabla.`,
        `function etiqueta${pascal}(item) {`,
        `  return ${js(meta.displayFields)}`,
        "    .map((campo) => item[campo])",
        '    .filter(Boolean)',
        '    .join(" ") || "Registro sin etiqueta";',
        "}",
        "",
        `// Mapa identificador → etiqueta, recalculado cuando cambia la lista cargada.`,
        `const mapa${pascal} = computed(() =>`,
        `  new Map(relacion${pascal}.value.map((item) => [String(item.${meta.relationIdField || "_id"}), etiqueta${pascal}(item)])));`,
        "",
        `// Convierte el identificador guardado en la referencia en su etiqueta visible.`,
        `function texto${pascal}(id) {`,
        '  const valor = String(id ?? "");',
        '  if (!valor) return "—";',
        ...(() => {
          const storeInfo = storeVars.get(relation.fieldName)
          if (!storeInfo) return []
          return [
            `  if (String(${storeInfo.variable}.${storeInfo.store.relationValueProp || storeInfo.store.idProp}) === valor) {`,
            `    const desdeStore = ${js(meta.displayFields)}`,
            `      .map((campo) => ${storeInfo.variable}[campo])`,
            "      .filter(Boolean)",
            '      .join(" ");',
            "    if (desdeStore) return desdeStore;",
            "  }",
          ]
        })(),
        `  return mapa${pascal}.value.get(valor) ?? valor;`,
        "}",
        "",
      )
    }
  }
  if (piniaRelations.length) {
    for (const relation of piniaRelations) {
      const pascal = pascalName(relation.fieldName)
      const { meta, variable } = storeVars.get(relation.fieldName)
      script.push(
        `// Sin lista cargada, resuelve la etiqueta con los datos del store compartido.`,
        `function texto${pascal}(id) {`,
        '  const valor = String(id ?? "");',
        '  if (!valor) return "—";',
        `  const desdeStore = ${js(meta.displayFields)}`,
        `    .map((campo) => ${variable}[campo])`,
        "    .filter(Boolean)",
        '    .join(" ");',
        "  if (desdeStore) return desdeStore;",
        "  return valor;",
        "}",
        "",
      )
    }
  }
  if (piniaRelations.some((relation) => relation.required)) {
    script.push(
      "// computed que desactiva el botón Guardar mientras falte una relación",
      "// obligatoria en el modo selección compartida de Pinia.",
      "const faltanRelacionesObligatorias = computed(() =>",
      `  ${piniaRelations
        .filter((relation) => relation.required)
        .map((relation) => {
          const { store, variable } = storeVars.get(relation.fieldName)
          return `!${variable}.${store.relationValueProp || store.idProp}`
        })
        .join(" || ")});`,
      "",
    )
  }
  if (formCatalogFields.length) {
    script.push(
      "// Catálogos JSON: cada ref guarda la lista que devuelve su módulo de",
      "// src/api/; los <select> del formulario recorren estas listas.",
      ...formCatalogFields.map((field) => `const catalogo${pascalCase(field.name)} = ref([]);`),
      "",
    )
    for (const field of dependentCatalogFields) {
      const parent = config.fields.find((item) => item.name === field.catalog.parentField)
      const variable = `catalogo${pascalCase(field.name)}`
      const parentVariable = `catalogo${pascalCase(parent.name)}`
      const parentValue = propertyAccess("item", parent.catalog.valueField || parent.catalog.idField)
      const parentId = propertyAccess("padre", parent.catalog.idField)
      const childId = propertyAccess("item", field.catalog.idField)
      script.push(
        `// ${field.label} se filtra por ${parent.label}: el identificador del catálogo hijo`,
        "// empieza por el identificador del registro elegido en «" + parent.label +
          "» (patrón provincia → municipio de XestionPacientes.vue).",
        `const ${variable}Visibles = computed(() => {`,
        `  const padre = ${parentVariable}.value.find((item) => String(${parentValue}) === String(registro.${parent.name}));`,
        "  if (!padre) return [];",
        `  const prefijo = String(${parentId} ?? "");`,
        `  return ${variable}.value.filter((item) => String(${childId} ?? "").startsWith(prefijo));`,
        "});",
        "",
      )
    }
    for (const [parentName, children] of catalogChildren) {
      const parent = config.fields.find((item) => item.name === parentName)
      script.push(
        `// Al cambiar ${parent.label} se vacía la selección dependiente para no guardar`,
        "// un valor que pertenece a otra lista del catálogo.",
        `function cambiar${pascalCase(parentName)}() {`,
        ...children.map((child) => `  registro.${child.name} = "";`),
        "}",
        "",
      )
    }
    script.push(
      "// Carga los catálogos de los selectores; cada función viene de su módulo de",
      "// src/api/ y su JSON vive en backend/data, servido por la ruta /api/.",
      "async function cargarCatalogos() {",
      ...formCatalogFields.flatMap((field) => {
        const loadFunction = field.catalog.apiFunction || catalogApiFunctionName(field.catalog.name)
        return [
          "  try {",
          `    catalogo${pascalCase(field.name)}.value = await ${loadFunction}();`,
          "  } catch (requestError) {",
          `    alertaError(mensajeDeError(requestError, "No se pudo cargar el catálogo «${field.catalog.name}»."), "Error al cargar");`,
          "  }",
        ]
      }),
      "}",
      "",
    )
  }
  if (type === "Detalle") {
    script.push(
      "// registroDetalle guarda el registro marcado con el botón «Ver» para el bloque de detalle.",
      "const registroDetalle = ref(null);",
      "",
    )
  }
  if (hasList) {
    const searchableValues = listFields.length
      ? listFields.map((field) => `registro.${field.name}`).join(", ")
      : ""
    script.push(
      "",
      "// busqueda guarda el texto del buscador de la tabla.",
      "const busqueda = ref(\"\");",
      "",
      "// registrosVisibles filtra la lista cargada: sin texto muestra todos los",
      "// registros y, con texto, los que contienen esa cadena en alguna columna.",
      "const registrosVisibles = computed(() => {",
      "  const texto = busqueda.value.toLowerCase();",
      "  if (!texto) return registros.value;",
      searchableValues
        ? `  return registros.value.filter((registro) => [${searchableValues}]`
        : "  return registros.value.filter((registro) => Object.values(registro)",
      '    .some((valor) => String(valor ?? "").toLowerCase().includes(texto)));',
      "});",
      "",
      "// columnCount hace que la fila «No hay registros» ocupe el ancho de toda la tabla.",
      `const columnCount = ${listFields.length + listRelations.length + ((showActions || type === "Detalle") ? 1 : 0)};`,
    )
  }
  script.push(
    "",
    "// La API puede devolver el mensaje de error en «mensaje» o «message»; si no incluye",
    "// ninguno se muestra el texto por defecto (mismo patrón que las pantallas del proyecto).",
    "    function mensajeDeError(requestError, porDefecto) {",
    "  return requestError.response?.data?.mensaje || requestError.response?.data?.message || porDefecto;",
    "}",
  )
  if (hasList) {
    const listFunction = resourceDetails.apiFunctions.list || `get${singularPluralName(singular, plural)}`
    script.push(
      "",
      "// Trae la lista completa desde la capa API; onMounted(cargar) (al final del archivo)",
      "// la ejecuta automáticamente al abrir la pantalla.",
      "async function cargar() {",
      "  loading.value = true;",
      "  try {",
      `    registros.value = await ${listFunction}();`,
      "  } catch (requestError) {",
      '    alertaError(mensajeDeError(requestError, "No se pudieron cargar los registros."), "Error al cargar");',
      "  } finally {",
      "    // finally se ejecuta siempre: la pantalla deja de mostrar «Cargando...» aunque falle.",
      "    loading.value = false;",
      "  }",
      "}",
    )
  }
  if (relations.length && apiRelations.length) {
    script.push(
      "",
      "// Carga las listas de las entidades relacionadas para los selectores; se",
      "// ejecuta en el onMounted de abajo, junto con (o en lugar de) la tabla.",
      "async function cargarRelaciones() {",
      ...apiRelations.map((relation) => {
        const pascal = pascalName(relation.fieldName)
        const meta = relacionMeta(relation)
        return [
          "  try {",
          `    relacion${pascal}.value = await ${meta.apiFunctions.list}();`,
          "  } catch (requestError) {",
          `    alertaError(mensajeDeError(requestError, "No se pudieron cargar los ${meta.label.toLowerCase()} del selector."), "Error al cargar");`,
          "  }",
        ].join("\n")
      }),
      "}",
    )
  }
  if (type === "Detalle") {
    script.push(
      "",
      "function ver(item) {",
      "  // Copia el registro elegido al bloque de detalle del <template>.",
      "  registroDetalle.value = item;",
      "}",
    )
  }
  if (ownStore) {
    script.push(
      "",
      "// Comparte esta selección con otras pantallas a través del store Pinia;",
      "// el botón Compartir de la tabla llama a esta función.",
      "function compartir(item) {",
      `  ${ownStore.variable}.${ownStore.seleccionar}(item);`,
      "}",
    )
  }
  if (hasForm) {
    script.push(
      "",
      "// Devuelve el formulario a sus valores iniciales y sale del modo edición.",
      "function limpiar() {",
      "  Object.assign(registro, initialValues);",
      "  editingId.value = null;",
      "}",
    )
  }
  if (operations.has("edit")) {
    script.push(
      "",
      "// Copia los datos de la fila pulsada al formulario para poder cambiarlos.",
      idField === "_id"
        ? "// editingId toma item._id, el identificador que MongoDB genera para cada documento."
        : `// editingId toma item.${idField}: es el valor que la API real usa para localizar el registro.`,
      "function editar(item) {",
      "  Object.assign(registro, initialValues, item);",
      `  editingId.value = item.${idField};`,
      "}",
    )
  }
  if (hasForm) {
    const createFunction = resourceDetails.apiFunctions.create || `create${singular}`
    const updateFunction = resourceDetails.apiFunctions.edit || `update${singular}`
    const patternedFields = fieldsInForm.filter((field) => field.pattern)
    const guardarBranch = operations.has("edit") && operations.has("create")
      ?       `    let guardado;\n    if (editingId.value) guardado = await ${updateFunction}(editingId.value, datos);\n    else guardado = await ${createFunction}(datos);`
      : operations.has("edit")
        ? `    const guardado = await ${updateFunction}(editingId.value, datos);`
        : `    const guardado = await ${createFunction}(datos);`
    script.push(
      "",
      "// Envía los datos del formulario a la capa API: crea un registro nuevo o guarda",
      "// los cambios del que se está editando. El backend valida de nuevo todas las reglas.",
      "async function guardar() {",
      ...(patternedFields.length ? [
        "  const campoConFormatoInvalido = [",
        ...patternedFields.map((field) =>
          `    { etiqueta: ${js(field.label)}, valor: registro.${field.name}, patron: ${js(field.pattern)}, flags: ${js(field.patternFlags)}, mensaje: ${js(field.patternMessage || "no cumple el formato indicado")} },`),
        "  ].find(({ valor, patron, flags }) => {",
        "    if (valor == null || valor === \"\") return false;",
        "    const coincidencia = new RegExp(patron, flags).exec(String(valor));",
        "    return !coincidencia || coincidencia.index !== 0 || coincidencia[0].length !== String(valor).length;",
        "  });",
        "  if (campoConFormatoInvalido) {",
        '    await alertaError(`El campo "${campoConFormatoInvalido.etiqueta}" ${campoConFormatoInvalido.mensaje}.`, "Validación");',
        "    return;",
        "  }",
      ] : []),
      "  saving.value = true;",
      "  try {",
      `    const datos = { ${[
        ...fieldsInForm.map((field) => `${field.name}: registro.${field.name}`),
        ...relations.map((relation) => {
          if (relation.selection === "pinia") {
            const { store, variable } = storeVars.get(relation.fieldName)
            return `${relation.fieldName}: ${variable}.${store.relationValueProp || store.idProp} ?? registro.${relation.fieldName}`
          }
          return `${relation.fieldName}: registro.${relation.fieldName}`
        }),
      ].join(", ")} };`,
      guardarBranch,
      "    Object.assign(registro, initialValues, guardado);",
      operations.has("create") && operations.has("edit")
        ? `    editingId.value = guardado.${idField};`
        : "",
      hasList ? "    await cargar();" : "",
      '    await alertaExito("Registro guardado.");',
      "  } catch (requestError) {",
      '    alertaError(mensajeDeError(requestError, "No se pudo guardar el registro."), "Error al guardar");',
      "  } finally {",
      "    saving.value = false;",
      "  }",
      "}",
    )
  }
  if (operations.has("delete")) {
    const deleteFunction = resourceDetails.apiFunctions.delete || `delete${singular}`
    script.push(
      "",
      "// Pide confirmación con la utilidad compartida del proyecto antes de borrar.",
      idField === "_id"
        ? "// Se envía item._id, el identificador del documento en MongoDB."
        : `// Se envía item.${idField}, el identificador real del recurso (no _id).`,
      "async function eliminar(item) {",
      `  const confirmacion = await alertaConfirmacion("¿Quieres borrar este registro de ${plural}?");`,
      "  if (!confirmacion.isConfirmed) return;",
      "  try {",
      `    await ${deleteFunction}(item.${idField});`,
      "    await cargar();",
      '    await alertaExito("Registro eliminado.");',
      "  } catch (requestError) {",
      '    alertaError(mensajeDeError(requestError, "No se pudo borrar el registro."), "Error al borrar");',
      "  }",
      "}",
    )
  }
  const mountedCalls = [
    hasList ? "cargar" : "",
    apiRelations.length ? "cargarRelaciones" : "",
    formCatalogFields.length ? "cargarCatalogos" : "",
  ].filter(Boolean)
  if (mountedCalls.length === 1) {
    script.push("", `onMounted(${mountedCalls[0]});`)
  } else if (mountedCalls.length > 1) {
    script.push("", "onMounted(() => {", ...mountedCalls.map((call) => `  ${call}();`), "});")
  }
  script.push("</script>", "")
  return `${componentTemplate.filter(Boolean).join("\n")}\n\n${script.filter(Boolean).join("\n")}`
}

function getResourceApiDetails(config) {
  if (config.source === "existing" && config.existingResource && RESOURCE_LIBRARY[config.existingResource]) {
    const resourceMeta = RESOURCE_LIBRARY[config.existingResource]
    return {
      modulePath: `../api/${resourceMeta.apiFile}`,
      apiFunctions: resourceMeta.apiFunctions,
      idField: resourceMeta.idField || "_id",
      catalogOnly: Boolean(resourceMeta.catalogOnly),
    }
  }
  return {
    modulePath: `../api/${slugify(config.entity.plural)}.js`,
    apiFunctions: {},
    idField: config.entity.idField || "_id",
    catalogOnly: false,
  }
}
