<template>
  <div class="flex w-full">
    <section class="relative isolate min-h-[calc(100vh-11.5rem)] w-full overflow-hidden rounded-3xl bg-slate-900 shadow-xl">
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
      <div class="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-900/65 to-green-900/20"></div>
      <div class="flex min-h-[calc(100vh-11.5rem)] max-w-2xl flex-col justify-center px-6 py-12 text-white sm:px-12">
        <p class="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-green-300">Sanidade Teis</p>
        <h1 class="text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          A túa saúde, máis preto e mellor atendida
        </h1>
        <p class="mt-6 max-w-xl text-lg leading-8 text-slate-200">
          Xestiona pacientes, profesionais e citas desde un único espazo seguro e sinxelo.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <RouterLink to="/pacientes" class="rounded-xl bg-green-500 px-5 py-3 font-semibold text-white shadow-lg transition hover:bg-green-400">
            Xestionar pacientes
          </RouterLink>
          <RouterLink to="/citas" class="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-semibold text-white backdrop-blur transition hover:bg-white/20">
            Ver citas
          </RouterLink>
        </div>
      </div>
    </section>

  </div>
</template>

<script setup>
import videoSanidad from "../assets/video-sanidad.mp4";

</script>
