<template>
  <!-- Estructura común: menú arriba, página elegida en el centro y pie abajo. -->
  <div id="app">
    <NavBar />
    <!-- El router sustituye este contenido por el componente de cada URL. -->
    <main class="flex-1">
      <router-view />
    </main>
    <FooTer />
  </div>
</template>

<script setup>
// Componentes que aparecen en todas las páginas.
import NavBar from './components/NavBar.vue'
import FooTer from './components/FooTer.vue'
</script>

<style>
/* Estilos generales del contenedor principal de la aplicación. */
body {
  margin: 0;
  background: #fff;
}

#app {
  max-width: 80vw;
  background: #fff;
  margin: 0 auto;
  padding-top: 1rem;
  padding-bottom: 1rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

/* En móvil, los elementos preparados con .container se apilan. */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}

</style>
