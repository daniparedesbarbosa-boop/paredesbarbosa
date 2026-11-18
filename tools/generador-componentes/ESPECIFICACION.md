# Especificación del generador local de componentes

## 1. Estado del documento

Este documento recoge el alcance objetivo del generador local. La primera
entrega ya implementa un subconjunto explícito: servidor local, formulario
offline, validación, generación CRUD de entidad nueva, vista previa, escritura
limitada a `salidas/`, copia de archivos y configuración reutilizable. Una
segunda entrega añade el tipo Relacionado para entidades nuevas: relaciones por
DNI de pacientes o por `ObjectId`/`ref` de doctores y citas, validación de
relaciones en el router, selectores alimentados
por la API real, consumo de los stores existentes del proyecto y generación de
stores Pinia propios con botón de compartir selección. Las funciones no
indicadas como implementadas siguen pendientes y la herramienta
debe comunicarlas sin simular que están disponibles.

La herramienta se quiere utilizar como ayuda local durante el examen. No debe
depender de Internet, de IA ni de servicios externos durante su uso.

## 2. Objetivo

Crear una herramienta local que guíe a una persona con poca experiencia para
describir una pantalla nueva y obtener una propuesta de código que siga los
patrones de este repositorio.

La herramienta debe ayudar a contestar estas preguntas:

- ¿Qué tipo de componente/pantalla necesito?
- ¿Qué entidad o recurso manejará?
- ¿Qué campos tiene y qué tipo de dato representa cada uno?
- ¿Cómo se capturan y muestran esos campos?
- ¿Los datos se guardan en una colección nueva de MongoDB o se reutiliza un
  recurso que ya existe?
- ¿Hay relaciones con pacientes, doctores u otras entidades?
- ¿Qué partes debo copiar y en qué archivos del proyecto?
- ¿Qué hace cada archivo y por qué forma parte de la solución?

El resultado es código nuevo que debe encajar con la estructura y las
dependencias del proyecto y funcionar al integrarlo siguiendo las instrucciones.
La herramienta no entiende peticiones libres ni toma decisiones de negocio por
el usuario: genera código mediante plantillas y reglas explícitas a partir de
las respuestas estructuradas del formulario, sin IA.

## 3. Principios obligatorios

1. **Offline:** durante la ejecución no realizar peticiones a Internet ni a
   servicios de IA. Las dependencias necesarias pueden instalarse o descargarse
   previamente (por ejemplo, con `npm install`) y quedar disponibles en local.
2. **Sin servicios externos:** no utilizar servicios remotos; el generador debe
   poder usarse sin conexión una vez instaladas sus dependencias.
3. **Seguro por defecto:** no modificar `src/`, `backend/` ni ningún archivo
   original del proyecto. Las salidas se limitan a la carpeta `salidas/`.
4. **Explicativo:** cada archivo y bloque generado debe explicar qué es, para
   qué sirve y dónde va.
5. **Fiel al repositorio:** generar únicamente patrones fundamentados en los
   componentes, API, modelos, rutas, stores y utilidades existentes.
6. **Honesto ante límites:** si una petición no está soportada, indicarlo
   claramente. No generar una función que parezca implementada pero no funcione.
7. **Copiable:** mostrar todos los códigos generados en la página HTML,
   permitir copiarlos desde allí y guardarlos también en archivos para copiar
   manualmente al proyecto.
8. **Repetible:** guardar las respuestas como configuración para poder revisar
   o regenerar la propuesta más adelante.
9. **Comprensible para principiantes:** usar nombres consistentes y explicar
   expresamente términos como modelo, API, ruta, store, colección y referencia.
10. **Regeneración:** si ya existe una salida con el mismo nombre, la nueva
    generación la sobrescribe. La interfaz debe indicar claramente qué salida
    se reemplazará.

## 4. Ubicación y forma de ejecución

- Carpeta prevista: `tools/generador-componentes/`.
- Interfaz prevista: formulario HTML local.
- Un servidor pequeño de Node.js servirá la página y procesará la solicitud de
  generación. Debe escuchar únicamente en `127.0.0.1` (accesible desde el mismo
  equipo mediante `localhost`); no debe exponerse a la red local ni a Internet.
- El generador puede usar módulos nativos de Node o dependencias instaladas
  localmente. Las dependencias pueden descargarse previamente y con conexión,
  pero durante el uso de la herramienta no se harán solicitudes de red.
- La forma prevista de iniciar el servidor será un comando Node documentado en
  esta carpeta. No se debe cambiar `package.json` de la aplicación sin acordar
  expresamente ese cambio.
- Las salidas irán a
  `tools/generador-componentes/salidas/<nombre-seguro>/`.
- El generador puede leer y revisar los componentes, modelos de backend y demás
  archivos del proyecto, pero no escribir ni modificarlos.
- Para detectar código existente, comparará la configuración con los archivos y
  patrones conocidos del repositorio. Mostrará las coincidencias y pedirá que la
  persona confirme si debe reutilizarlos. Si confirma, generará solo lo que
  falte y advertirá claramente qué piezas ya existen y qué cambios manuales se
  necesitan.
- La generación se basará en plantillas y reglas explícitas; no usará IA ni
  intentará deducir automáticamente requisitos no proporcionados.

La carpeta `salidas/` contendrá resultados de uso, no plantillas fuente del
generador. Las plantillas fuente y la lógica de generación permanecerán en la
carpeta de la herramienta.

## 5. Tipos de componente disponibles

El formulario debe permitir seleccionar uno de estos tipos y, cuando se
detecten, los componentes o patrones existentes que se puedan reutilizar:

| Tipo | Resultado esperado |
|---|---|
| CRUD | Pantalla de gestión de una entidad, con las operaciones que se elijan; puede combinar formulario y listado. |
| Listado | Pantalla que consulta y muestra registros, con búsqueda o filtros opcionales. |
| Detalle | Pantalla que muestra los datos de un registro seleccionado. |
| Formulario | Pantalla de alta o edición sin exigir una tabla de registros. |
| Relacionado | Pantalla que usa una selección o relación con otra entidad; puede apoyarse en Pinia y en referencias MongoDB. |

El generador debe preguntar qué operaciones se necesitan y no asumir que cada
pantalla requiere las cinco.

## 6. Origen de datos

La primera versión debe distinguir estos escenarios:

### 6.1 Entidad nueva con colección MongoDB

Si se selecciona una entidad nueva, la salida podrá incluir:

- modelo Mongoose,
- router Express,
- módulo de API Axios,
- componente Vue,
- store Pinia si se pide compartir una selección.

También debe explicar los cambios manuales necesarios para montar la ruta del
servidor, registrar la ruta del frontend y añadir la navegación.

### 6.2 Recurso existente

Si se elige un recurso que ya existe, el generador preguntará cuál se reutiliza
y qué operación requiere la pantalla. Debe señalar los archivos reales del
repositorio que sirven de ejemplo y evitar crear un modelo o una colección
duplicados cuando baste con consumir la API existente.

Recursos de referencia presentes en el proyecto:

- pacientes,
- doctores,
- citas,
- especialidades,
- municipios/provincias.

La disponibilidad exacta de operaciones se debe comprobar en los módulos
`src/api/` y routers existentes; no se debe deducir que todas las entidades
tengan los mismos endpoints o identificadores.

### 6.3 Fuentes locales o catálogos

Los campos de tipo **catálogo** cargan sus opciones de un archivo JSON, como las
especialidades de los doctores (`backend/data/especialidades.json`) o los
municipios (`backend/data/municipios.json`). Es un tipo de campo, no un tipo de
pantalla, y no sustituye a las opciones fijas del selector ni del radio.

Orígenes admitidos:

- **Proyecto**: un JSON que ya existe en `backend/data`. Se reutiliza la ruta
  `/api/<nombre>` registrada en `backend/server.js` y, cuando
  `src/api/<nombre>.js` exporta una función sin argumentos para esa lista, se
  reutiliza el módulo en lugar de duplicarlo.
- **Datos nuevos**: JSON pegado en el formulario o leído de un archivo. Se
  genera `backend/data/<nombre>.json`, en la misma carpeta que los catálogos del
  proyecto, y el módulo Axios `src/api/<nombre>.js`, que pide la lista a
  `/api/<nombre>`. La guía incluye la ruta GET que lee ese JSON y que hay que
  registrar una sola vez en `backend/server.js`. El catálogo no depende de
  MongoDB, pero la pantalla necesita el backend en marcha para cargarlo.

El generador analiza la estructura de los datos para proponer la lista
(`rootKey`), el campo visible (`labelField`), el valor que se guarda
(`valueField`, por defecto el visible) y el identificador (`idField`). Admite
arrays en la raíz, objetos con varias listas y listas de valores simples. El
valor elegido se guarda como texto en Mongoose, igual que `espedoc` en
`backend/modelos/doctor.js`.

Un campo catálogo puede declarar un `parentField` para filtrarse por otro campo
catálogo del formulario (provincia → municipio). El componente busca el
registro padre por su valor guardado, filtra el hijo con `startsWith` sobre los
identificadores y vacía la selección dependiente al cambiar el padre.

Límites: solo lectura (no se generan altas ni borrados de opciones), el filtro
dependiente necesita identificadores que compartan prefijo, no se valida en el
backend que el valor enviado exista en el JSON y la lista se carga completa, sin
paginación ni búsqueda.

## 7. Preguntas del formulario

El formulario se organizará en pasos. Debe explicar cada término junto a la
pregunta, mostrar ejemplos cortos y permitir volver atrás sin perder las
respuestas.

### Paso 1: identificar la pantalla

Preguntar:

- tipo de componente,
- nombre visible de la pantalla,
- nombre técnico del archivo/componente,
- ruta del navegador,
- texto del enlace del menú, si se necesita.

El generador debe normalizar nombres de archivo y rutas, y mostrar el resultado
normalizado antes de generar.

### Paso 2: describir la entidad o recurso

Para una entidad nueva, preguntar:

- nombre singular (por ejemplo, `Tarea`),
- nombre plural/colección (por ejemplo, `tareas`),
- ruta REST (por ejemplo, `/api/tareas`),
- identificador que se utilizará para actualizar/borrar.

Por defecto, una entidad Mongoose nueva usa `_id`. Si se quiere un identificador
de negocio, debe indicarse explícitamente y debe quedar consistente entre
backend, API y componente.

Para un recurso existente, presentar las opciones conocidas y explicar qué
archivos mirar para confirmar sus nombres de campos, operaciones e
identificador. Si la herramienta encuentra un modelo, componente, API, ruta o
store que coincida con lo solicitado, debe mostrar la coincidencia y pedir
confirmación antes de considerarla reutilizable. Tras la confirmación, debe
generar únicamente las piezas que falten y documentar las piezas existentes y
cualquier modificación manual requerida. No modificará automáticamente esos
archivos.

### Paso 3: definir campos

Se podrá añadir cualquier cantidad de campos. Para cada campo, preguntar:

| Propiedad | Significado |
|---|---|
| Nombre técnico | Clave estable usada en MongoDB, JSON, API y el estado Vue; por ejemplo `titulo`. |
| Etiqueta | Texto comprensible que se verá junto al control; por ejemplo `Título`. |
| Tipo | Tipo de dato y control visual que representa. |
| Obligatorio | Si el formulario debe exigir el valor y Mongoose debe requerirlo. |
| Valor inicial | Valor sugerido para el formulario y, si corresponde, valor por defecto en el esquema. |
| Validación | Restricciones configurables y adecuadas al tipo del campo. |
| Formulario | Si aparece como control para crear/editar. |
| Listado/tabla | Si se muestra como columna o dato de la lista. |
| Búsqueda | Si se incluye en el texto/localizador de búsqueda. |

Tipos iniciales que debe poder describir:

- texto,
- texto largo/textarea,
- email,
- teléfono,
- número,
- fecha,
- hora,
- booleano/checkbox,
- radio con opciones fijas,
- selector con opciones fijas,
- selector alimentado por un catálogo/API.

En el formulario inicial se podrán configurar las restricciones aplicables a
cada campo. Como mínimo:

- texto, texto largo y teléfono: longitud mínima y máxima, reglas sencillas de
  formato y, opcionalmente, expresión regular avanzada con mensaje;
- email: formato automático y longitud mínima y máxima;
- número: valor mínimo y máximo, e incremento opcional;
- fecha y hora: valor mínimo y máximo;
- selectores y radio: opciones fijas y valor inicial permitido;
- booleanos: valor inicial true/false y posibilidad de exigir la casilla activa.

Las reglas de formato habituales deben poder elegirse sin escribir una
expresión regular. La configuración avanzada acepta patrones sin delimitadores
o la notación JavaScript `/.../flags`; solo se aplica a texto, texto largo,
correo y teléfono. Números, fechas y horas usan las restricciones propias del
tipo (límites e incremento para números), por lo que no se pide una expresión
regular para ellos.

El generador aplicará las restricciones compatibles tanto en el formulario como
en el esquema o las rutas del backend que genere. Si una restricción no se puede
representar de forma equivalente en una capa, debe indicarlo en el resultado y
en `INSTRUCCIONES.md`. Debe validar la configuración de estas reglas antes de
generar (por ejemplo, que el mínimo no supere al máximo y que la expresión
regular tenga un formato válido).

No se incluirá subida real de archivos en esta versión. La plantilla existente
solo muestra cómo detectar un fichero elegido; no hay una ruta backend de subida
y persistencia en este repositorio.

### Paso 4: configurar selectores y catálogos

Para un selector, preguntar si sus opciones son:

- fijas, introducidas como pares de valor y etiqueta;
- de un catálogo/API existente;
- de una ruta de API que se ha generado para la nueva entidad.

Para catálogos existentes, el generador debe ofrecer solo los módulos que haya
comprobado en el repositorio y explicar sus funciones de acceso. Para un
selector dependiente (por ejemplo, provincia → municipio) debe solicitar qué
campo controla la selección y qué lista se carga al cambiarlo.

No debe inventar la forma de respuesta de una API desconocida. Debe pedir el
formato de respuesta o limitarse a generar instrucciones explícitas para
adaptarlo.

### Paso 5: definir relaciones y estado compartido

Para cada relación, preguntar:

- entidad relacionada;
- campo que guarda su identificador;
- si la relación es obligatoria;
- cómo se escoge el registro relacionado (selector/catálogo);
- si se guarda la referencia en MongoDB;
- si debe compartirse una selección entre pantallas usando Pinia;
- qué datos mínimos deben estar disponibles en el store (identificador y, si
  hace falta para mostrarlo, nombre/apellidos u otros campos).

Patrones permitidos inicialmente:

- relación con pacientes por DNI (`dnipac` como texto) o con doctores/citas por
  `ObjectId` y `ref` de Mongoose;
- comprobar en backend que el documento relacionado existe;
- seleccionar datos en un componente y compartirlos con otro usando un store
  Pinia;
- consultar y filtrar registros usando los identificadores compartidos.

Los ejemplos locales para estudiar estos patrones son las citas relacionadas
con pacientes mediante DNI (`pacienteDNI`) y con doctores mediante `ObjectId`
(`doctorId`). La versión inicial no pretende generar relaciones
arbitrarias muchos-a-muchos, transacciones ni un sistema de permisos.

Estado de implementación de este paso: disponible para entidades nuevas y
pantallas CRUD, Relacionado o Formulario, con estas limitaciones declaradas:

- Las entidades relacionadas son los recursos reales del proyecto con
  documentos en MongoDB (pacientes, doctores y citas); los catálogos de solo
  lectura no pueden relacionarse.
- El consumo por Pinia usa los stores que ya existen (`pacienteStore` y
  `doctorStore`); no se generan stores de entidades relacionadas.
- El store propio se genera para la entidad de la pantalla, no para las
  relacionadas.
- No se generan relaciones con entidades creadas en ejecuciones anteriores ni
  `watch` sobre los stores. Los selectores dependientes sí se generan, pero solo
  entre campos de tipo catálogo (ver 6.3).

### Paso 6: operaciones y funciones opcionales

Operaciones CRUD seleccionables:

- listar,
- crear,
- editar,
- borrar,
- buscar/filtrar.

Funciones opcionales seleccionables, si son aplicables al tipo de pantalla:

- validación de campos,
- filtros y ordenación,
- catálogos y selectores dependientes,
- selección compartida mediante Pinia,
- confirmaciones, mensajes de éxito y errores con las utilidades existentes,
- exportación a PDF con la utilidad existente.

Estas funciones son opcionales por pantalla; no se deben añadir todas
automáticamente. Si una función no es compatible con los datos configurados, el
generador debe explicarlo y no producir código ficticio.

## 8. Convenciones del código generado

El generador debe seguir el ecosistema y los patrones locales:

- Vue 3 con `<script setup>`,
- Composition API (`ref`, `reactive`, `computed`, `onMounted`, y `watch` cuando
  haga falta),
- Vue Router,
- Pinia para estado compartido,
- Axios desde `src/api/`,
- Express para rutas HTTP,
- Mongoose para modelos y MongoDB,
- clases Tailwind en el template, como hacen las pantallas del proyecto,
- mensajes de carga y error visibles cuando hay peticiones asíncronas,
- `:key` estable para cada elemento de `v-for`,
- botones de acción que no envían el formulario con `type="button"`,
- uso consistente del identificador real (`_id` u otro que use el recurso).

Los nombres de campos deben permanecer iguales en esquema, request/response,
módulo API y estado del componente, salvo que el generador documente
explícitamente una transformación.

La capa API debe separar Axios del componente. El componente debe llamar a las
funciones API y mostrar los errores de manera visible, siguiendo las utilidades
del repositorio cuando la generación use alertas.

Los ejemplos existentes no son completamente uniformes en todos sus detalles.
Antes de programar cada plantilla, se deberá contrastar el patrón con los
archivos reales y elegir una forma coherente, sin copiar fallos conocidos ni
afirmar que un endpoint tiene una capacidad que no posee.

## 9. Archivos de salida

La salida tendrá esta estructura orientativa; solo incluirá los archivos que
correspondan a las opciones seleccionadas:

```text
tools/generador-componentes/salidas/<nombre-seguro>/
  configuracion.json
  INSTRUCCIONES.md
  backend/
    modelos/<Entidad>.js
    rutas/<recurso>.rutas.js
  src/
    api/<recurso>.js
    components/<Componente>.vue
    store/<entidad>Store.js
```

`configuracion.json` conservará los datos del formulario en JSON válido, sin
comentarios. El store solo se genera si se ha solicitado compartir datos con
Pinia. Los modelos y routers solo se generan para una entidad nueva. Los demás
archivos dependen del tipo de componente y de su origen de datos.

La página HTML debe mostrar el contenido completo de cada archivo generado en
bloques diferenciados y copiables, además de guardarlo en los archivos de la
carpeta de salida. Debe quedar claro qué archivos son nuevos, cuáles se
reutilizan y qué fragmentos se añaden manualmente a archivos existentes.
Al regenerar una salida con el mismo nombre, se reemplazará su contenido; la
interfaz debe indicar cuál es la carpeta que se sobrescribirá. Esta escritura
se limita siempre a `tools/generador-componentes/salidas/`.

## 10. Contenido de `INSTRUCCIONES.md`

Cada resultado debe incluir una guía propia, en lenguaje sencillo, que empiece
por lo que hay que hacer y deje el material de consulta al final:

1. Frase breve de lo que se ha generado y aviso de que no se integra solo.
2. Orden recomendado para copiar/crear los archivos, en pasos numerados y con
   un enlace al archivo de cada paso.
3. Lista de archivos creados y propósito de cada uno.
4. Significado de modelo, colección, router, endpoint, API Axios, componente y
   store, aplicado al ejemplo generado.
5. Fragmento exacto para importar y montar una ruta nueva en
   `backend/server.js`, si se generó backend.
6. Fragmento exacto para importar y registrar la pantalla en
   `src/router/index.js`, si se generó una pantalla nueva.
7. Fragmento exacto para añadir un enlace a `src/components/NavBar.vue`, si se
   solicita navegación.
8. Instrucciones para conectar un store Pinia con el componente que establece
   una selección, si se generan relaciones compartidas.
9. Qué probar manualmente: listar, crear, editar, borrar, buscar y relaciones,
   según las opciones elegidas.
10. Comando de validación disponible en el proyecto (`npm run build`) y qué
    comprueba/no comprueba.
11. Límites conocidos y adaptaciones pendientes.

Los fragmentos para archivos existentes serán instrucciones de inserción, no
versiones completas que puedan borrar código del proyecto.

## 11. Límites de ejecución y escritura

- Aceptar solo nombres/path seguros; no permitir que una respuesta del formulario
  escriba fuera de `salidas/<nombre-seguro>/`.
- El servidor solo escuchará en `127.0.0.1`, para uso desde el mismo equipo. No
  se requiere autenticación ni protección para un servicio expuesto a otros
  equipos, ya que no debe exponerse a la red.
- Validar que nombres técnicos, rutas, opciones y campos no estén vacíos ni
  tengan formatos incompatibles con el código que se va a generar.
- Mostrar errores de validación junto a la pregunta correspondiente.
- Si la configuración no permite una salida completa, detener la generación y
  explicar qué falta.
- No tratar una salida incompleta como éxito.
- Si ya existe una salida con el mismo nombre, sobrescribirla e informar de ello
  claramente antes de completar la generación.
- Mantener las salidas de práctica separadas del código activo de la aplicación.
- No ejecutar automáticamente código generado.
- No insertar datos personales o credenciales reales en ejemplos.
- Las rutas del proyecto y de `salidas/` se resolverán con respecto a la
  ubicación de la herramienta, no al directorio desde el que se inicia Node.

## 12. Criterios de aceptación del futuro generador

La herramienta estará lista para una primera entrega cuando:

1. Se pueda utilizar sin conexión a Internet, una vez instaladas o descargadas
   localmente las dependencias necesarias.
2. El formulario permita crear una configuración de componente completa y
   comprensible.
3. Se pueda generar al menos un CRUD de entidad nueva con modelo, rutas, API,
   componente e instrucciones coherentes.
4. Se pueda elegir un recurso existente sin generar por accidente una colección
   duplicada.
5. Se puedan definir campos y decidir si aparecen en formulario, listado y
   búsqueda.
6. Las operaciones y funciones opcionales dependan de las elecciones del
   usuario.
7. Las relaciones soportadas usen los patrones locales documentados de MongoDB
   y Pinia.
8. El resultado incluya el código completo y copiable en la página HTML, además
   de los archivos correspondientes en la carpeta de salida.
9. La guía generada explique qué copiar, dónde y por qué.
10. Se validen las entradas, se informe cuando se sobrescriba una salida y no
    se escriba fuera de la carpeta de salida.
11. Las salidas y las instrucciones sean suficientemente coherentes con el
    proyecto para que, al copiar manualmente los archivos y fragmentos
    indicados, la persona pueda levantar la aplicación sin tener que corregir
    errores generados por incompatibilidades del generador.
12. Las partes no soportadas queden señaladas con claridad, sin producir una
    implementación que finja funcionar.

La validación de la integración será manual: la persona copiará el código al
proyecto y tratará de levantarlo y probar las funciones solicitadas. El
generador no ejecutará `npm run build`, pruebas automatizadas ni el código
generado. Las instrucciones deben recomendar las comprobaciones manuales
pertinentes y distinguirlas de lo que comprueba `npm run build`.

## 13. Plan recomendado para implementarlo después de aprobar la especificación

1. Revisar una última vez los patrones reales que utilizará cada plantilla.
2. Implementar el servidor Node local y una página HTML mínima.
3. Implementar el formulario y validación de la configuración.
4. Implementar primero el generador CRUD de entidad nueva.
5. Añadir guía explicativa y fragmentos manuales de registro.
6. Revisar manualmente una generación de ejemplo, copiarla siguiendo las
   instrucciones a un proyecto de prueba y levantar/probar la aplicación.
7. Añadir el uso de recursos existentes.
8. Añadir los tipos restantes de pantalla.
9. Añadir, uno por uno, catálogos, Pinia, alertas, filtros y PDF.
10. Actualizar esta especificación cuando cambie el alcance o se descubran
    límites en los patrones existentes.

La autorización para usar la herramienta durante el examen depende de las
normas del centro. Aunque sea local y no use IA, se debe confirmar que está
permitido ejecutar scripts o herramientas propias. La herramienta también
servirá para practicar antes del examen.

## 14. Archivos del repositorio que fundamentan estos patrones

- `src/components/PlantillaComponente.vue`: catálogo visual de campos, tabla,
  filtro, estados y acciones locales.
- `src/components/XestionPacientes.vue` y `src/api/pacientes.js`: pantalla y API
  existentes para pacientes.
- `src/components/XestionDoctores.vue` y `src/api/doctores.js`: CRUD, catálogo y
  selección de doctores.
- `src/components/Citas.vue` y `src/api/citas.js`: pantalla relacionada con
  varias entidades.
- `src/store/doctorStore.js` y `src/store/pacienteStore.js`: estado compartido
  con Pinia.
- `backend/server.js`: conexión y registro de routers.
- `backend/modelos/`: esquemas Mongoose de las entidades existentes.
- `backend/rutas/citas.rutas.js`: validación de referencias entre documentos.
- `src/utils/alertas.js` y `src/utils/pdf.js`: utilidades reutilizables para
  mensajes y exportación.
