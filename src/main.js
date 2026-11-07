// Punto de entrada de la aplicación Vue.
// Aquí se conectan los estilos globales, el componente raíz y el router.
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Crea Vue, activa la navegación por rutas y dibuja App dentro de <div id="app">.
createApp(App).use(router).mount('#app')
