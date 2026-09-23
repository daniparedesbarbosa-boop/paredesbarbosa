<template>
  <div id="app">
    <NavBar />
    <!-- Aquí se carga el componente principal DE MOMENTO-->
    <main>
      <router-view />
    </main>
    <FooTer />
  </div>
</template>

<script setup>
import NavBar from './components/NavBar.vue'
import FooTer from './components/FooTer.vue'
</script>

<style>
/* 👇 Estilos globales mínimos */
body {
  margin: 0;               /* quita el margen por defecto del body */
  background: #fff;        /* color de fondo general */
}

#app {
  max-width: 80vw;
  background: #fff;
  margin: 0 auto;          /* centra horizontalmente */
  padding-top: 1rem;       /* 🔹 margen superior pequeño */
  padding-bottom: 1rem;    /* 🔹 espacio para el futuro footer */
  min-height: 100vh;       /* ocupa toda la altura de la pantalla */
  display: flex;
  flex-direction: column;
  justify-content: flex-start; /* el contenido empieza arriba */
}
/* Cuando la pantalla es menor a 768px */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}

</style>
