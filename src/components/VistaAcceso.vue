<template>
  <div class="mx-auto my-10 grid w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-white shadow-2xl lg:my-16 lg:grid-cols-[1fr_1.05fr]">
      <div class="relative hidden overflow-hidden bg-gradient-to-br from-green-800 via-teal-800 to-slate-900 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div class="absolute -right-20 -top-20 h-64 w-64 rounded-full border-[32px] border-white/5"></div>
        <div class="absolute -bottom-28 -left-20 h-72 w-72 rounded-full border-[40px] border-white/5"></div>
        <div class="relative">
          <div class="mb-10 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <svg viewBox="0 0 24 24" class="h-8 w-8" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path d="M12 21s8-3.8 8-10.2V5.2L12 2 4 5.2v5.6C4 17.2 12 21 12 21Z" />
              <path d="M12 7v7M8.5 10.5h7" />
            </svg>
          </div>
          <p class="text-sm font-bold uppercase tracking-[0.22em] text-green-200">Sanidade Teis</p>
          <h1 class="mt-5 max-w-sm text-4xl font-bold leading-tight tracking-tight">
            A túa saúde, sempre contigo.
          </h1>
          <p class="mt-5 max-w-sm leading-7 text-green-50/80">
            Entra no teu espazo para xestionar citas e coidar de todo o importante de forma sinxela e segura.
          </p>
        </div>
        <div class="relative flex items-center gap-3 text-sm text-green-50/80">
          <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="m5 12 4 4L19 6" />
            </svg>
          </span>
          Acceso seguro e privado
        </div>
      </div>

      <div class="p-6 text-slate-800 sm:p-10">
        <div class="mb-8 lg:hidden">
          <p class="text-sm font-bold uppercase tracking-[0.18em] text-green-700">Sanidade Teis</p>
        </div>
        <div class="mb-8">
          <p class="mb-2 text-sm font-semibold text-green-700">Benvido/a de novo</p>
          <h2 class="text-3xl font-bold tracking-tight text-slate-900">Accede á túa conta</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">Introduce os teus datos para continuar.</p>
        </div>

        <form class="flex w-full flex-col gap-5" @submit.prevent>
          <div class="flex flex-col gap-2">
            <label for="usuario" class="text-sm font-semibold text-slate-700">Usuario</label>
            <div class="relative">
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path d="M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
              </svg>
              <input
                id="usuario"
                v-model="usuario"
                type="text"
                placeholder="DNI/CIF ou correo electrónico"
                autocomplete="username"
                required
                class="box-border w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-4 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10"
              >
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label for="password" class="text-sm font-semibold text-slate-700">Contrasinal</label>
              <a href="#" class="text-xs font-semibold text-green-700 transition hover:text-green-900">Esqueciches o contrasinal?</a>
            </div>
            <div class="relative">
              <svg viewBox="0 0 24 24" class="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <rect x="4" y="10" width="16" height="11" rx="2" />
                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
              </svg>
              <input
                id="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                required
                aria-label="Contrasinal"
                class="box-border w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-12 pr-12 text-sm transition hover:border-slate-300 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10"
              >
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600"
                :aria-label="showPassword ? 'Ocultar contrasinal' : 'Mostrar contrasinal'"
                @click="showPassword = !showPassword"
              >
                <svg v-if="!showPassword" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" />
                </svg>
                <svg v-else viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="m3 3 18 18M10.6 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a18 18 0 0 1-3.2 3.8M6.2 6.8C3.5 8.6 2 12 2 12s3.5 6 10 6a9.5 9.5 0 0 0 3.4-.6" />
                </svg>
              </button>
            </div>
          </div>

          <label class="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
            <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500">
            Lembrarme neste dispositivo
          </label>

          <button type="submit" class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 hover:shadow-green-600/30">
            Acceder á miña conta
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <p class="mt-8 text-center text-sm text-slate-500">
          Aínda non tes unha conta?
          <a href="#" class="font-semibold text-green-700 hover:text-green-900">Solicita acceso</a>
        </p>
      </div>
  </div>
</template>

<script setup>
import { ref } from "vue"

const usuario = ref("")
const password = ref("")
const showPassword = ref(false)
</script>
