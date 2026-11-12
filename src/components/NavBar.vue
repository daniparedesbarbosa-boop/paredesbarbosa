<template>
  <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
    <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Navegación principal">
      <RouterLink to="/" class="flex items-center gap-3 text-slate-900 no-underline">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 shadow-sm">
          <img :src="cruz" alt="" class="h-7 w-7 object-contain" />
        </span>
        <span class="hidden text-lg font-bold tracking-tight sm:block">Sanidade Teis</span>
      </RouterLink>

      <button
        type="button"
        class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
        :aria-expanded="isOpen"
        aria-label="Abrir menú"
        @click="isOpen = !isOpen"
      >
        <span class="text-xl">☰</span>
      </button>

      <ul
        :class="[
          'absolute left-0 right-0 top-full flex-col border-b border-slate-200 bg-white px-4 py-3 shadow-lg md:static md:flex md:flex-row md:items-center md:gap-1 md:border-0 md:p-0 md:shadow-none',
          isOpen ? 'flex' : 'hidden',
        ]"
      >
        <li v-for="item in links" :key="item.to">
          <RouterLink
            :to="item.to"
            class="block rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-teal-50 hover:text-teal-700"
            active-class="bg-teal-50 text-teal-700"
            @click="isOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>
    </nav>
  </header>
</template>

<script setup>
import { ref } from "vue";
import cruz from "../assets/img/cruz.png";

const isOpen = ref(false);
const links = [
  { to: "/", label: "Inicio" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/doctores", label: "Doctores" },
  { to: "/citas", label: "Citas" },
  { to: "/sobrenos", label: "Sobre nós" },
];
</script>
