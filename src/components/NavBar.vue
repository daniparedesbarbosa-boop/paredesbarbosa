<template>
  <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur">
    <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8" aria-label="Navegación principal">
      <RouterLink to="/" class="flex items-center gap-3 text-slate-900 no-underline">
        <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 shadow-sm">
          <img :src="cruz" alt="" class="h-7 w-7 object-contain" />
        </span>
        <span class="hidden text-lg font-bold tracking-tight sm:block">Sanidade Teis</span>
      </RouterLink>

      <button
        type="button"
        class="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 md:hidden"
        :aria-expanded="isOpen"
        aria-label="Abrir o menú"
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
            class="block rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-green-50 hover:text-green-700"
            active-class="bg-green-50 text-green-700"
            @click="isOpen = false"
          >
            {{ item.label }}
          </RouterLink>
        </li>
      </ul>

      <div class="group relative ml-2">
        <button
          type="button"
          class="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-slate-600 transition hover:border-green-200 hover:bg-green-50 hover:text-green-700 focus:outline-none focus:ring-2 focus:ring-green-500/30"
          aria-label="Abrir menú de usuario"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20a7 7 0 0 1 14 0" />
          </svg>
        </button>
        <div class="invisible absolute right-0 top-full z-40 mt-2 w-48 translate-y-1 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <RouterLink
            to="/acceso"
            class="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-green-50 hover:text-green-700"
          >
            Iniciar sesión
          </RouterLink>
          <RouterLink
            to="/registro"
            class="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-green-50 hover:text-green-700"
          >
            Registrarse
          </RouterLink>
        </div>
      </div>
    </nav>
  </header>
</template>

<script setup>
import { ref } from "vue";
import cruz from "../assets/img/cruz.png";

const isOpen = ref(false);
const links = [
  { to: "/", label: "Inicio" },
  { to: "/servicios", label: "Servizos" },
  { to: "/pacientes", label: "Pacientes" },
  { to: "/doctores", label: "Profesionais" },
  { to: "/citas", label: "Citas" },
  { to: "/sobrenos", label: "Sobre nós" },
];
</script>
