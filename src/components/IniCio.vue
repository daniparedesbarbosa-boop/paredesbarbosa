<template>
  <div class="space-y-8">
    <section class="relative isolate min-h-[30rem] overflow-hidden rounded-3xl bg-slate-900 shadow-xl">
      <video
        class="absolute inset-0 -z-20 h-full w-full object-cover"
        autoplay
        loop
        muted
        playsinline
        preload="metadata"
        poster="/favicon.svg"
        aria-hidden="true"
      >
        <source :src="videoSanidad" type="video/mp4">
      </video>
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-900/65 to-teal-900/20"></div>
      <div class="flex min-h-[30rem] max-w-2xl flex-col justify-center px-6 py-12 text-white sm:px-12">
        <p class="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-teal-300">Sanidade Teis</p>
        <h1 class="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Tu salud, más cerca y mejor atendida
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-8 text-slate-200">
          Gestiona pacientes, doctores y citas desde un único espacio seguro y sencillo.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <RouterLink to="/pacientes" class="rounded-xl bg-teal-500 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-teal-400">
            Gestionar pacientes
          </RouterLink>
          <RouterLink to="/citas" class="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20">
            Ver citas
          </RouterLink>
        </div>
      </div>
    </section>

    <section class="grid gap-4 sm:grid-cols-3">
      <RouterLink v-for="card in cards" :key="card.to" :to="card.to" class="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-md">
        <span class="text-2xl">{{ card.icon }}</span>
        <h2 class="mt-3 text-lg font-bold text-slate-900">{{ card.title }}</h2>
        <p class="mt-1 text-sm leading-6 text-slate-500">{{ card.text }}</p>
      </RouterLink>
    </section>
  </div>
</template>

<script setup>
import videoSanidad from "../assets/video-sanidad.mp4";

const cards = [
  { to: "/pacientes", icon: "👥", title: "Pacientes", text: "Consulta y gestiona la información de cada paciente." },
  { to: "/doctores", icon: "🩺", title: "Doctores", text: "Mantén actualizado el equipo médico y sus especialidades." },
  { to: "/citas", icon: "🗓️", title: "Citas", text: "Organiza las citas y consulta su estado en un vistazo." },
];
</script>
