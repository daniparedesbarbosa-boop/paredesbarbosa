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

/* Cuando la pantalla es menor a 768px */
@media (max-width: 768px) {
  .container {
    flex-direction: column;
  }
}

</style>
