import { createRouter, createWebHistory } from "vue-router";
import IniCio from "../components/IniCio.vue";
import XestionPacientes from "../components/XestionPacientes.vue";
import SobreNos from "../components/SobreNos.vue";
import AvisoLegal from "../components/AvisoLegal.vue";
import NotFound from "../components/NotFound.vue";

const routes = [
  { path: "/", name: "inicio", component: IniCio },
  { path: "/pacientes", name: "pacientes", component: XestionPacientes },
  { path: "/sobrenos", name: "sobrenos", component: SobreNos },
  { path: "/avisolegal", name: "avisolegal", component: AvisoLegal },
  { path: "/:pathMatch(.*)*", name: "notfound", component: NotFound },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});



export default router;
