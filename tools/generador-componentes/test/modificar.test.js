// Pruebas del modo «modificar pantalla». Se ejecutan contra los componentes
// reales del proyecto: si alguien cambia Citas.vue o XestionPacientes.vue de
// forma que el analizador deje de entenderlos, estas pruebas lo dicen.

import test from "node:test"
import assert from "node:assert/strict"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { analizarPantalla, resumenPantallas } from "../analizador/inventario.js"
import { generarParches } from "../analizador/parches/registro.js"
import { verificarParches } from "../analizador/verificar.js"

const TOOL_ROOT = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(TOOL_ROOT, "..", "..", "..")
const CITAS = "src/components/Citas.vue"
const PACIENTES = "src/components/XestionPacientes.vue"
const DOCTORES = "src/components/XestionDoctores.vue"

const inventarioDe = (archivo) => analizarPantalla({ projectRoot: PROJECT_ROOT, archivo })

test("analiza Citas: formulario, tabla, estado, envío, validación, PDF y backend", async () => {
  const inventario = await inventarioDe(CITAS)

  assert.equal(inventario.aplicable, true)
  assert.equal(inventario.formulario.existe, true)
  assert.equal(inventario.formulario.objeto, "cita")
  assert.equal(inventario.formulario.manejador, "guardarCita")
  assert.equal(inventario.formulario.campos.length, 5)
  assert.equal(inventario.formulario.claseBase, "campo")

  assert.equal(inventario.tabla.existe, true)
  assert.equal(inventario.tabla.variable, "item")
  assert.equal(inventario.tabla.lista, "citasFiltradas")
  assert.equal(inventario.tabla.columnas.at(-1).titulo, "Accións")

  assert.equal(inventario.estado.existe, true)
  assert.equal(inventario.estado.fabrica.nombre, "citaVacia")
  assert.ok(inventario.estado.propiedades.some((propiedad) => propiedad.nombre === "motivo"))

  assert.equal(inventario.payload.modo, "manual")
  assert.equal(inventario.validacion.tipo, "computed")
  assert.equal(inventario.validacion.nombre, "formularioValido")
  assert.equal(inventario.pdf.existe, true)
  assert.equal(inventario.pdf.funcion, "exportarCitas")

  assert.equal(inventario.backend.api.ruta, "/api/citas")
  assert.equal(inventario.backend.rutas.archivo, "backend/rutas/citas.rutas.js")
  assert.equal(inventario.backend.rutas.listaBlanca.nombre, "camposCita")
  assert.equal(inventario.backend.modelo.archivo, "backend/modelos/cita.js")
  assert.ok(inventario.backend.modelo.propiedades.some((propiedad) => propiedad.nombre === "doctorId" && propiedad.tipo === "ObjectId"))
})

test("analiza Pacientes y Doctores con sus diferencias de envío y validación", async () => {
  const pacientes = await inventarioDe(PACIENTES)
  assert.equal(pacientes.formulario.objeto, "novoPaciente")
  assert.equal(pacientes.payload.modo, "spread")
  assert.equal(pacientes.validacion.tipo, "inline")
  assert.equal(pacientes.backend.rutas.listaBlanca, null)
  assert.equal(pacientes.backend.rutas.usaBodyDirecto, true)
  assert.equal(pacientes.backend.modelo.archivo, "backend/modelos/paciente.js")

  const doctores = await inventarioDe(DOCTORES)
  assert.equal(doctores.formulario.objeto, "novoDoctor")
  assert.equal(doctores.estado.existe, true)
  assert.equal(doctores.estado.objeto, "novoDoctor")
  assert.equal(doctores.payload.modo, "objeto-completo")
  assert.equal(doctores.validacion.tipo, "inline")
  assert.equal(doctores.backend.modelo.archivo, "backend/modelos/doctor.js")
})

test("una pantalla sin formulario ni tabla no se ofrece para modificar", async () => {
  const inventario = await inventarioDe("src/components/NavBar.vue")
  assert.equal(inventario.aplicable, false)
  assert.ok(inventario.motivo.length > 0)
})

test("el resumen de pantallas marca cuáles admiten cambios", async () => {
  const resumenes = await resumenPantallas(PROJECT_ROOT)
  assert.ok(resumenes.length >= 10)
  const citas = resumenes.find((resumen) => resumen.archivo === CITAS)
  assert.equal(citas.aplicable, true)
  assert.equal(citas.tieneTabla, true)
})

test("añadir un campo en Citas toca modelo, router, plantilla, estado, envío y PDF", async () => {
  const inventario = await inventarioDe(CITAS)
  const { parches } = generarParches(inventario, {
    tipo: "campo",
    nombre: "duracion",
    etiqueta: "Duración",
    tipoCampo: "number",
    requerido: true,
    enPdf: true,
  })

  const titulos = parches.map((parche) => `${parche.archivo}|${parche.titulo}`).join("\n")
  assert.match(titulos, /backend\/modelos\/cita\.js\|Modelo Mongoose/)
  assert.match(titulos, /backend\/rutas\/citas\.rutas\.js\|Router/)
  assert.match(titulos, /Citas\.vue\|Plantilla: nueva columna en la cabecera/)
  assert.match(titulos, /Citas\.vue\|Plantilla: nueva columna en la cabecera/)
  assert.match(titulos, /Citas\.vue\|Plantilla: nueva celda en la fila/)
  assert.match(titulos, /Citas\.vue\|Estado:/)
  assert.match(titulos, /Citas\.vue\|Envío:/)
  assert.match(titulos, /Citas\.vue\|Validación:/)
  assert.match(titulos, /Citas\.vue\|PDF: nueva cabecera/)
  assert.match(titulos, /Citas\.vue\|PDF: nuevo valor de cada fila/)

  for (const parche of parches) {
    assert.ok(parche.archivo, "cada parche indica su archivo")
    assert.ok(parche.linea > 0, "cada parche indica su línea")
    assert.ok(parche.codigo.length > 0, "cada parche trae código")
    assert.ok(parche.explicacion.length > 0, "cada parche explica por qué")
  }

  const duracionModelo = parches.find((parche) => parche.archivo.endsWith("cita.js"))
  assert.match(duracionModelo.codigo, /duracion: \{ type: Number, required: true \}/)

  const verificacion = await verificarParches({
    projectRoot: PROJECT_ROOT,
    archivo: CITAS,
    parches,
    esperado: { campo: "duracion", pdf: true, pdfEtiqueta: "Duración" },
  })
  assert.equal(verificacion.ok, true, JSON.stringify(verificacion.comprobaciones.filter((c) => !c.ok)))
  assert.ok(verificacion.comprobaciones.some((c) => c.que.includes("lista blanca") && c.ok))
  assert.ok(verificacion.comprobaciones.some((c) => c.que.includes("tabla") && c.ok))
})

test("en Pacientes no se toca el router porque no filtra el cuerpo", async () => {
  const inventario = await inventarioDe(PACIENTES)
  const { parches, notas } = generarParches(inventario, {
    tipo: "campo",
    nombre: "alergias",
    etiqueta: "Alergias",
    tipoCampo: "textarea",
  })

  assert.ok(!parches.some((parche) => parche.archivo.includes("rutas")), "no debe tocar el router")
  assert.ok(notas.some((nota) => /no filtra el cuerpo/i.test(nota)))
  assert.ok(parches.some((parche) => parche.archivo.endsWith("paciente.js")))

  const verificacion = await verificarParches({
    projectRoot: PROJECT_ROOT,
    archivo: PACIENTES,
    parches,
    esperado: { campo: "alergias" },
  })
  assert.equal(verificacion.ok, true, JSON.stringify(verificacion.comprobaciones.filter((c) => !c.ok)))
})

test("en Doctores el envío es una copia del estado y no necesita parche", async () => {
  const inventario = await inventarioDe(DOCTORES)
  const { parches } = generarParches(inventario, {
    tipo: "campo",
    nombre: "fechaalta",
    etiqueta: "Fecha de alta",
    tipoCampo: "date",
    requerido: true,
  })

  assert.ok(!parches.some((parche) => parche.titulo.startsWith("Envío:")))
  assert.ok(parches.some((parche) => parche.titulo.startsWith("Estado:")))
  assert.ok(parches.some((parche) => parche.archivo.endsWith("doctor.js")))
})

test("la validación de solo frontend añade computed, import y mensaje", async () => {
  const inventario = await inventarioDe(PACIENTES)
  const { parches } = generarParches(inventario, {
    tipo: "validacion",
    campo: "movilpac",
    regla: "patron",
    patron: "^[67]\\d{8}$",
    mensaje: "El móvil debe tener 9 dígitos.",
  })

  const titulos = parches.map((parche) => parche.titulo).join("\n")
  assert.match(titulos, /comprobación de/)
  assert.match(titulos, /bloquear el guardado/)
  assert.match(titulos, /mensaje bajo el campo/)

  const computado = parches.find((parche) => parche.titulo.includes("comprobación de"))
  assert.match(computado.codigo, /const movilpacInvalido = computed/)
  assert.match(computado.codigo, /new RegExp\("\^\[67\]\\\\d\{8\}\$"\)/)

  const verificacion = await verificarParches({
    projectRoot: PROJECT_ROOT,
    archivo: PACIENTES,
    parches,
    esperado: { validacion: "movilpacInvalido" },
  })
  assert.equal(verificacion.ok, true, JSON.stringify(verificacion.comprobaciones.filter((c) => !c.ok)))
})

test("el informe PDF añade cabecera y valor alineados", async () => {
  const inventario = await inventarioDe(CITAS)
  const { parches } = generarParches(inventario, {
    tipo: "pdf",
    modo: "agregar-campo",
    campo: "motivo",
    etiqueta: "Motivo ampliado",
  })

  assert.equal(parches.length, 2)
  assert.match(parches[0].codigo, /"Motivo ampliado"/)
  assert.match(parches[1].codigo, /cita\.motivo \?\? ""/)
  const verificacion = await verificarParches({
    projectRoot: PROJECT_ROOT,
    archivo: CITAS,
    parches,
    esperado: { pdf: true, pdfEtiqueta: "Motivo ampliado" },
  })
  assert.equal(verificacion.ok, true)
})

test("rechaza un campo que ya existe y un nombre técnico inválido", async () => {
  const inventario = await inventarioDe(CITAS)
  assert.throws(
    () => generarParches(inventario, { tipo: "campo", nombre: "motivo", etiqueta: "Motivo" }),
    /ya tiene un campo/i,
  )
  assert.throws(
    () => generarParches(inventario, { tipo: "campo", nombre: "Duracion", etiqueta: "Duración" }),
    /minúscula/i,
  )
  assert.throws(
    () => generarParches(inventario, { tipo: "accion-inventada" }),
    /no reconocida/i,
  )
})
