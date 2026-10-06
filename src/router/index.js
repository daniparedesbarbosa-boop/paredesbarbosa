import { createRouter, createWebHistory } from "vue-router";
import IniCio from "../components/IniCio.vue";
import XestionPacientes from "../components/XestionPacientes.vue";
import XestionDoctores from "../components/XestionDoctores.vue";
import SobreNos from "../components/SobreNos.vue";
import AvisoLegal from "../components/AvisoLegal.vue";
import PoliticaPrivacidad from "../components/PoliticaPrivacidad.vue";
import NotFound from "../components/NotFound.vue";

const routes = [
  { path: "/", name: "inicio", component: IniCio },
  { path: "/pacientes", name: "pacientes", component: XestionPacientes },
  { path: "/doctores", name: "doctores", component: XestionDoctores },
  { path: "/sobrenos", name: "sobrenos", component: SobreNos },
  { path: "/avisolegal", name: "avisolegal", component: AvisoLegal },
  { path: "/politica-privacidad", name: "PoliticaPrivacidad", component: PoliticaPrivacidad },
  { path: "/:pathMatch(.*)*", name: "notfound", component: NotFound },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});



export default router;
