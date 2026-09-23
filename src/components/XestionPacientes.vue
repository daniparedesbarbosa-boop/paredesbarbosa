<template>
  <div class="xestion-pacientes">
    <h4>👥 Xestión de pacientes</h4>
    <form @submit.prevent="gardarUsuario">
      <div class="fila">
        <div class="campo campo-dni">
          <label>DNI/CIF:</label>
          <div class="dni-control">
            <input
              v-model="novoUsuario.dni"
              type="text"
              required
              autocomplete="off"
              style="text-align: center"
              @input="dniComprobado = false"
              @blur="normalizarDni"
              :class="{
                'dni-invalido': dniInvalido,
                'dni-correcto': dniComprobado && !dniInvalido,
              }"
              :aria-invalid="dniInvalido"
            />
            <small v-if="dniInvalido" class="mensaxe-dni">DNI inválido</small>
          </div>
        </div>
        <div class="campo campo-nome">
          <label>Nome:</label>
          <input
            v-model="novoUsuario.nome"
            type="text"
            required
            @blur="normalizarNome('nome')"
          />
        </div>
        <div class="campo campo-apelidos">
          <label>Apelidos:</label>
          <input
            v-model="novoUsuario.apelidos"
            type="text"
            required
            @blur="normalizarNome('apelidos')"
          />
        </div>
      </div>
      <div class="fila">
        <div class="campo fecha-nacimiento">
          <label>Fecha de nacemento:</label>
          <input v-model="novoUsuario.fechaNacimiento" type="date" required />
        </div>
        <div class="campo campo-correo">
          <label>Correo:</label>
          <input
            v-model="novoUsuario.correo"
            type="email"
            required
            @input="correoComprobado = false"
            @blur="comprobarCorreo"
            :class="{ 'correo-invalido': correoComprobado && correoInvalido }"
            :aria-invalid="correoComprobado && correoInvalido"
          />
        </div>
        <div class="campo movil">
          <label>Móbil:</label>
          <input
            v-model="novoUsuario.movil"
            type="tel"
            size="20"
            required
            pattern="[67][0-9]{8}"
            @input="mobilComprobado = false"
            @blur="comprobarMobil"
            :class="{ 'mobil-invalido': mobilComprobado && mobilInvalido }"
            :aria-invalid="mobilComprobado && mobilInvalido"
          />
        </div>
      </div>

      <div class="fila">
        <div class="campo direccion">
          <label>Dirección:</label>
          <input v-model="novoUsuario.direccion" type="text" required />
        </div>
        <div class="campo campo-provincia">
          <label>Provincia:</label>
          <select
            v-model="novoUsuario.provincia"
            @change="novoUsuario.municipio = ''"
          >
            <option value="">-- Escolle unha provincia --</option>
            <option>A Coruña</option>
            <option>Lugo</option>
            <option>Ourense</option>
            <option>Pontevedra</option>
          </select>
        </div>
        <div class="campo campo-municipio">
          <label>Municipio:</label>
          <select v-model="novoUsuario.municipio">
            <option value="">-- Escolle un municipio --</option>
            <option
              v-for="municipio in municipiosVisibles"
              :key="municipio"
              :value="municipio"
            >
              {{ municipio }}
            </option>
          </select>
        </div>
      </div>
      <div class="fila fila-centrada">
        <div class="campo inline-activo">
          <label>Activo:</label>
          <div class="inline-control">
            <input v-model="novoUsuario.activo" type="checkbox" />
            <span>Activo</span>
          </div>
        </div>
        <div class="campo inline-cuenta">
          <label>Tipo de conta:</label>
          <div class="inline-control radios">
            <label>
              <input
                v-model="novoUsuario.tipoCuenta"
                type="radio"
                value="particular"
              />
              <span>Particular</span>
            </label>
            <label>
              <input
                v-model="novoUsuario.tipoCuenta"
                type="radio"
                value="empresa"
              />
              <span>Empresa</span>
            </label>
          </div>
        </div>
      </div>
      <button
        type="submit"
        class="btn-guardar"
        :disabled="
          novoUsuario.dni === '' ||
          novoUsuario.nome === '' ||
          dniInvalido ||
          mobilInvalido ||
          correoInvalido
        "
      >
        Gardar
      </button>
    </form>
    <h4>📋 Listaxe de pacientes</h4>
    <table v-if="pacientes.length > 0">
      <thead>
        <tr>
          <th>#</th>
          <th>DNI/CIF</th>
          <th>Nome</th>
          <th>Correo</th>
          <th>Provincia</th>
          <th>Activo</th>
          <th>Tipo de conta</th>
          <th>Accións</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(u, index) in pacientes" :key="index">
          <td>{{ index + 1 }}</td>
          <td style="text-align: center">{{ u.dni }}</td>
          <td>{{ u.nome }}</td>
          <td>{{ u.correo }}</td>
          <td>{{ u.provincia }}</td>
          <td style="text-align: center">{{ u.activo ? "✅" : "❌" }}</td>
          <td>{{ u.tipoCuenta }}</td>
          <td style="text-align: center">
            <button @click="editarUsuario(index)" title="Editar">✏️</button>
            <button @click="eliminarUsuario(index)" title="Eliminar">🗑️</button>
          </td>
        </tr>
      </tbody>
    </table>

    <p v-else>Non hai pacientes cargados.</p>
  </div>
</template>

<script setup>
/// Zona de declaracións
import { ref, reactive, computed, onMounted } from "vue";

const pacientes = ref([]); //almacena la lista de pacientes e os seus cambios
const dniComprobado = ref(false);
const mobilComprobado = ref(false);
const correoComprobado = ref(false);

const municipiosPorProvincia = reactive({
  "A Coruña": [
    "A Baña",
    "A Capela",
    "A Coruña",
    "A Laracha",
    "A Pobra do Caramiñal",
    "A Pobra do Caramiñal",
    "Ames",
    "Aranga",
    "Ares",
    "Arteixo",
    "Arzúa",
    "As Pontes de García Rodríguez",
    "Bergondo",
    "Betanzos",
    "Boimorto",
    "Boiro",
    "Boqueixón",
    "Brión",
    "Cabana de Bergantiños",
    "Cabanas",
    "Camariñas",
    "Cambre",
    "Carballo",
    "Cariño",
    "Cedeira",
    "Cee",
    "Cerceda",
    "Cerdido",
    "Coirós",
    "Corcubión",
    "Coristanco",
    "Culleredo",
    "Curtis",
    "Dodro",
    "Dumbría",
    "Fene",
    "Ferrol",
    "Fisterra",
    "Frades",
    "Irixoa",
    "Laxe",
    "Lousame",
    "Malpica de Bergantiños",
    "Mañón",
    "Mazaricos",
    "Melide",
    "Mesía",
    "Miño",
    "Moeche",
    "Monfero",
    "Mugardos",
    "Muros",
    "Muxía",
    "Narón",
    "Neda",
    "Negreira",
    "Noia",
    "Oleiros",
    "Ordes",
    "Oroso",
    "Ortigueira",
    "Outes",
    "Oza-Cesuras",
    "Paderne",
    "Padrón",
    "Ponteceso",
    "Pontedeume",
    "Porto do Son",
    "Rianxo",
    "Ribeira",
    "Rois",
    "Sada",
    "San Sadurniño",
    "Santa Comba",
    "Santiago de Compostela",
    "Santiso",
    "Sobrado",
    "Somozas",
    "Teo",
    "Toques",
    "Tordoia",
    "Touro",
    "Trazo",
    "Val do Dubra",
    "Valdoviño",
    "Vedra",
    "Vimianzo",
    "Vilarmaior",
    "Vilasantar",
    "Zas",
  ],
  Lugo: [
    "Abadín",
    "Alfoz",
    "Antas de Ulla",
    "A Pastoriza",
    "A Pobra do Brollón",
    "As Nogais",
    "Baleira",
    "Baralla",
    "Barreiros",
    "Becerreá",
    "Begonte",
    "Bóveda",
    "Burela",
    "Carballedo",
    "Castro de Rei",
    "Castroverde",
    "Cervantes",
    "Cervo",
    "Chantada",
    "Cospeito",
    "Folgoso do Courel",
    "Fonsagrada",
    "Foz",
    "Friol",
    "Guitiriz",
    "Guntín",
    "Incio",
    "Láncara",
    "Lourenzá",
    "Lugo",
    "Meira",
    "Mondoñedo",
    "Monforte de Lemos",
    "Monterroso",
    "Muras",
    "Navia de Suarna",
    "Negueira de Muñiz",
    "O Corgo",
    "O Incio",
    "O Páramo",
    "O Saviñao",
    "O Valadouro",
    "O Vicedo",
    "Ourol",
    "Outeiro de Rei",
    "Palas de Rei",
    "Pantón",
    "Paradela",
    "Pedrafita do Cebreiro",
    "Pol",
    "Portomarín",
    "Quiroga",
    "Rábade",
    "Ribadeo",
    "Ribas de Sil",
    "Ribeira de Piquín",
    "Riotorto",
    "Samos",
    "Sarria",
    "Sober",
    "Taboada",
    "Trabada",
    "Triacastela",
    "Valadouro",
    "Viveiro",
    "Xermade",
    "Xove",
  ],
  Ourense: [
    "Allariz",
    "A Arnoia",
    "Avión",
    "Baltar",
    "Bande",
    "Baños de Molgas",
    "Barbadás",
    "Barco de Valdeorras",
    "Beade",
    "Beariz",
    "Boborás",
    "Bola",
    "Bolo",
    "Calvos de Randín",
    "Carballeda",
    "Carballeda de Avia",
    "Carballiño",
    "Cartelle",
    "Castrelo de Miño",
    "Castrelo do Val",
    "Castro Caldelas",
    "Celanova",
    "Cenlle",
    "Chandrexa de Queixa",
    "Coles",
    "Cortegada",
    "Cualedro",
    "Entrimo",
    "Esgos",
    "Gomesende",
    "Gudiña",
    "Irixo",
    "Larouco",
    "Laza",
    "Leiro",
    "Lobeira",
    "Lobios",
    "Maceda",
    "Manzaneda",
    "Maside",
    "Melón",
    "Merca",
    "Mezquita",
    "Montederramo",
    "Monterrei",
    "Muíños",
    "Nogueira de Ramuín",
    "O Barco de Valdeorras",
    "O Bolo",
    "O Carballiño",
    "O Irixo",
    "O Pereiro de Aguiar",
    "Oímbra",
    "Ourense",
    "Paderne de Allariz",
    "Padrenda",
    "Parada de Sil",
    "Pereiro de Aguiar",
    "Peroxa",
    "Petín",
    "Piñor",
    "Pontedeva",
    "Porqueira",
    "Punxín",
    "Quintela de Leirado",
    "Rairiz de Veiga",
    "Ramirás",
    "Ribadavia",
    "Riós",
    "Rúa",
    "Rubiá",
    "San Amaro",
    "San Cibrao das Viñas",
    "San Cristovo de Cea",
    "San Xoán de Río",
    "Sandiás",
    "Sarreaus",
    "Taboadela",
    "Teixeira",
    "Toén",
    "Trasmiras",
    "Veiga",
    "Verea",
    "Verín",
    "Viana do Bolo",
    "Vilamarín",
    "Vilamartín de Valdeorras",
    "Vilar de Barrio",
    "Vilar de Santos",
    "Vilardevós",
    "Vilariño de Conso",
    "Xinzo de Limia",
    "Xunqueira de Ambía",
    "Xunqueira de Espadanedo",
  ],
  Pontevedra: [
    "A Cañiza",
    "A Estrada",
    "A Guarda",
    "A Illa de Arousa",
    "A Lama",
    "Arbo",
    "Baiona",
    "Barro",
    "Bueu",
    "Caldas de Reis",
    "Cambados",
    "Campo Lameiro",
    "Cangas",
    "Catoira",
    "Cerdedo-Cotobade",
    "Covelo",
    "Crecente",
    "Cuntis",
    "Dozón",
    "Forcarei",
    "Fornelos de Montes",
    "Gondomar",
    "Marín",
    "Meaño",
    "Meis",
    "Moaña",
    "Mondariz",
    "Mondariz-Balneario",
    "Moraña",
    "Mos",
    "As Neves",
    "Nigrán",
    "O Grove",
    "Oia",
    "Pazos de Borbén",
    "Poio",
    "Ponte Caldelas",
    "Ponteareas",
    "Pontecesures",
    "Pontevedra",
    "Porriño",
    "Portas",
    "Redondela",
    "Ribadumia",
    "Rodeiro",
    "Salceda de Caselas",
    "Salvaterra de Miño",
    "Sanxenxo",
    "Silleda",
    "Soutomaior",
    "Tomiño",
    "Tui",
    "Valga",
    "Vigo",
    "Vilaboa",
    "Vila de Cruces",
    "Vilagarcía de Arousa",
    "Vilanova de Arousa",
  ],
});

const novoUsuario = reactive({
  dni: "",
  nome: "",
  apelidos: "",
  correo: "",
  provincia: "",
  municipio: "",
  activo: false,
  tipoCuenta: "",
});

const dniInvalido = computed(() => {
  const dni = novoUsuario.dni.toUpperCase();

  if (dni.length === 0) {
    return false;
  }

  if (!/^\d{8}[A-Z]$/.test(dni)) {
    return true;
  }

  const letras = "TRWAGMYFPDXBNJZSQVHLCKE";
  return letras[Number(dni.slice(0, 8)) % 23] !== dni.at(-1);
});

const mobilInvalido = computed(() => {
  return novoUsuario.movil !== "" && !/^[67]\d{8}$/.test(novoUsuario.movil);
});

const correoInvalido = computed(() => {
  return (
    novoUsuario.correo !== "" &&
    !/^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+)*@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i.test(
      novoUsuario.correo,
    )
  );
});

const municipiosVisibles = computed(() => {
  const municipios = novoUsuario.provincia
    ? municipiosPorProvincia[novoUsuario.provincia] || []
    : Object.values(municipiosPorProvincia).flat();
  const texto = novoUsuario.municipio.trim().toLocaleLowerCase("gl");

  return [...new Set(municipios)]
    .filter((municipio) => municipio.toLocaleLowerCase("gl").includes(texto))
    .sort((a, b) => a.localeCompare(b, "gl"));
});

/// Zona de ciclo de vida

onMounted(async () => {
  try {
    const respuesta = await fetch("http://localhost:3000/api/municipios");
    if (!respuesta.ok) {
      throw new Error("No se pudieron cargar los municipios");
    }

    const datos = await respuesta.json();
    const nombresProvincias = Object.fromEntries(
      datos.provincias.map((provincia) => [provincia.id, provincia.nm]),
    );
    const municipiosCargados = {};

    datos.municipios.forEach((municipio) => {
      const nombreProvincia = nombresProvincias[municipio.id.slice(0, 2)];
      if (!nombreProvincia) {
        return;
      }

      if (!municipiosCargados[nombreProvincia]) {
        municipiosCargados[nombreProvincia] = [];
      }
      municipiosCargados[nombreProvincia].push(municipio.nm);
    });

    Object.keys(municipiosPorProvincia).forEach((provincia) => {
      delete municipiosPorProvincia[provincia];
    });
    Object.assign(municipiosPorProvincia, municipiosCargados);
  } catch (error) {
    console.error("Error al cargar los municipios:", error);
  }

  //sempre se cargan estos pacientes de exemplo ao iniciar o componente
  pacientes.value = [
    {
      dni: "A000000C",
      nome: "Soldaduras SL",
      correo: "soldadura@email.com",
      provincia: "A Coruña",
      activo: true,
      tipoCuenta: "empresa",
    },
    {
      dni: "0000000C",
      nome: "María Pérez",
      correo: "maria@email.com",
      provincia: "Lugo",
      activo: false,
      tipoCuenta: "particular",
    },
    {
      dni: "B1234567D",
      nome: "Xosé López",
      correo: "xose@email.com",
      provincia: "Ourense",
      activo: true,
      tipoCuenta: "particular",
    },
    {
      dni: "C9876543E",
      nome: "Construcións Modernas",
      correo: "construcion@email.com",
      provincia: "Pontevedra",
      activo: true,
      tipoCuenta: "empresa",
    },
  ];
});

/// Zona de métodos ou funcións

function normalizarDni() {
  novoUsuario.dni = novoUsuario.dni.trim().toUpperCase();
  dniComprobado.value = novoUsuario.dni !== "";
}

function normalizarNome(campo) {
  novoUsuario[campo] = novoUsuario[campo]
    .trim()
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function comprobarMobil() {
  novoUsuario.movil = novoUsuario.movil.trim();
  mobilComprobado.value = true;
}

function comprobarCorreo() {
  novoUsuario.correo = novoUsuario.correo.trim();
  correoComprobado.value = true;
}

function gardarUsuario() {
  if (dniInvalido.value) {
    return;
  }

  pacientes.value.push({ ...novoUsuario }); //engade o novo usuario á lista (copia do obxecto)
  Object.assign(novoUsuario, {
    dni: "",
    nome: "",
    apelidos: "",
    correo: "",
    provincia: "",
    municipio: "",
    activo: false,
    tipoCuenta: "",
  }); //reinicia o formulario
  dniComprobado.value = false;
  mobilComprobado.value = false;
  correoComprobado.value = false;
}

function eliminarUsuario(index) {
  pacientes.value.splice(index, 1); //elimina o usuario da lista
}

function editarUsuario(index) {
  const usuario = pacientes.value[index]; //carga os datos do usuario elixido no formulario
  Object.assign(novoUsuario, usuario); // carga os datos do usuario no formulario recorda v-model do formulario é novoUsuario
  dniComprobado.value = false;
  mobilComprobado.value = false;
  correoComprobado.value = false;
}
</script>

<style scoped>
.xestion-pacientes {
  width: 100%;
  /* opcional para que no crezca demasiado en pantallas muy grandes */
  background: white;
  padding: 2rem;
  overflow: visible;
  border-radius: 2px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  box-sizing: border-box;
}

form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.fila {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  width: 100%;
  min-width: 0;
}

.fila-centrada {
  justify-content: center;
  align-items: center;
  column-gap: 3rem;
}

.fila-centrada .campo {
  flex: 0 1 auto;
  justify-content: center;
}

.campo {
  display: flex;
  align-items: center;
  /* label e input en la misma línea */
  gap: 0.5rem;
  border-radius: 0px;
  min-width: 0;
  flex: 1 1 0;
}

.campo-dni {
  flex: 0 1 250px;
  min-width: 250px;
  border-radius: 0px;
}

.dni-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.dni-control input {
  flex: 0 0 100px;
  width: 100px;
  min-width: 100px;
}

.dni-control input.dni-invalido {
  border-color: #e58b8b;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
  box-shadow: 0 0 0 2px rgba(229, 139, 139, 0.15);
}

.dni-control input.dni-correcto {
  border-color: #1cca88;
  box-shadow: 0 0 0 2px rgba(28, 202, 136, 0.15);
}

.mensaxe-dni {
  display: block;
  flex: 0 0 auto;
  color: #b42323;
  font-size: 0.55rem;
  white-space: nowrap;
}

.campo-nome {
  flex: 1.5 1 0;
  border-radius: 0px;
}

.campo-apelidos {
  flex: 2.5 1 0;
}

.fecha-nacimiento {
  flex: 1.6 1 0;
  min-width: 230px;
}

.campo-correo {
  flex: 2.4 1 0;
  border-radius: 0px;
}

.campo-correo input.correo-invalido {
  border-color: #e58b8b;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
  box-shadow: 0 0 0 2px rgba(229, 139, 139, 0.15);
}

.movil {
  flex: 0 0 auto;
}

.movil input {
  flex: 0 0 20ch;
  width: 20ch;
  text-align: center;
}

.movil input.mobil-invalido {
  border-color: #e58b8b;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
  box-shadow: 0 0 0 2px rgba(229, 139, 139, 0.15);
}

.campo select {
  flex: 1;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 0px;
  width: 100%;
}

.campo-provincia {
  flex: 1;
  /* ocupa menos espacio */
  border-radius: 0px;
}

.campo-provincia select,
.campo-provincia option {
  color: #000;
}

.campo-municipio select,
.campo-municipio option {
  color: #000;
}

.campo label {
  min-width: 70px;
  font-weight: 500;
  font-size: 0.85rem;
}

.campo input {
  flex: 1;
  /* ocupa todo el espacio restante */
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 0px;
  box-sizing: border-box;
  min-width: 0;
  max-width: 100%;
  font-size: 0.85rem;
  background-color: #fff;
  color: #000;
  -webkit-text-fill-color: #000;
}

.campo select {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  font-size: 0.85rem;
  background-color: #fff;
}

.fecha-nacimiento input {
  min-width: 145px;
}

.btn-guardar {
  background-color: #fff;
  color: #009900;
  border: 2px solid #009900;
  padding: 0.5rem 1.7rem;
  font-size: 1rem;
  border-radius: 8px;
  cursor: pointer;
  margin: 0 auto;
  display: block;
}

.btn-guardar:hover {
  background-color: #009900;
  color: #fff;
  border-radius: 8px;
}

.button {
  background: none;
  border: 2px solid #ddd;
  cursor: pointer;
  font-size: 1rem;
}

.inline-control {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding-right: 0;
  font-size: 0.85rem;
}

.radios {
  flex-wrap: nowrap;
  gap: 0.9rem;
}

.radios label {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  white-space: nowrap;
}

.radios input {
  flex: 0 0 auto;
}

table {
  width: 100%;
  border-collapse: separate;
  margin-top: 1rem;
  font-size: 0.8rem;
  border: 1px solid #ddd;
}

th,
td {
  border: 1px solid #ddd;
  padding: 0.7rem;
  text-align: left;
}

th {
  text-align: center;
  background-color: #f8f9fa;
}

h4 {
  margin-bottom: 1rem;
  font-weight: 600;
  background-color: #009900;
  color: white;
}

@media (max-width: 768px) {
  .xestion-pacientes {
    padding: 1rem;
    /* reducir el padding en pantallas pequeñas */
  }

  .fila {
    flex-direction: column;
    /* apila los campos verticalmente en móviles */
    gap: 0.5rem;
    /* opcional: un pequeño espacio entre ellos */
  }

  .campo-dni {
    flex: 1 1 auto;
    min-width: 0;
    width: 100%;
  }

  .dni-control {
    flex-wrap: wrap;
  }
}
</style>
