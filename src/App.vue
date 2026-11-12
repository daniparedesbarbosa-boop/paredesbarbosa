<template>
  <!-- Estructura común: menú arriba, página elegida en el centro y pie abajo. -->
  <div id="app" class="min-h-screen bg-slate-50 text-slate-800">
    <NavBar />
    <main class="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
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

