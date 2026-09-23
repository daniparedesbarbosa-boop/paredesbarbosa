<template>
  <nav class="navbar">
    <div class="logo">
      <img :src="cruz" alt="" />
      <span>Sanidad Teis</span>
    </div>

    <!-- NUEVO -->
    <button class="hamburger" @click="isOpen = !isOpen">☰</button>

    <!-- MODIFICADO -->
    <ul :class="['menu', { open: isOpen }]">
      <li><RouterLink to="/">Inicio</RouterLink></li>
      <li><RouterLink to="/pacientes">Pacientes</RouterLink></li>
      <li><RouterLink to="/sobrenos">Sobre nós</RouterLink></li>
    </ul>
  </nav>
</template>

<script setup>
import { ref } from "vue"; // será boolean
import cruz from "../assets/img/cruz.png";
const isOpen = ref(false); // actívase cuando fago click
</script>

<style scoped>
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.1rem 6rem;
  background: #004800;
  color: white;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  font-weight: bold;
  font-size: 1rem;
}

.logo img {
  width: 2rem;
  height: 2rem;
  object-fit: contain;
}

.menu {
  display: flex;
  gap: 0.8rem;
  list-style: none;
}

.menu a {
  color: white;
  text-decoration: none;
  font-weight: 500;
}

.menu a.router-link-active {
  border-bottom: 0.2rem solid #ffe66d;
}

/* NUEVO */
.hamburger {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
}

/* NUEVO (responsive) */
@media (max-width: 768px) {
  .hamburger {
    display: block;
  }

  .menu {
    display: none;
    position: absolute;
    top: 50px;
    right: 0;
    flex-direction: column;
    background: #006400#004800;
  }

  .menu.open {
    display: flex;
  }
}
</style>
