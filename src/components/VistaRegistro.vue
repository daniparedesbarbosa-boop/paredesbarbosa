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
          Comeza a coidarte hoxe.
        </h1>
        <p class="mt-5 max-w-sm leading-7 text-green-50/80">
          Crea a túa conta e ten as túas citas e información sempre ao teu alcance.
        </p>
      </div>
      <div class="relative flex items-center gap-3 text-sm text-green-50/80">
        <span class="flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="m5 12 4 4L19 6" />
          </svg>
        </span>
        Rexistro rápido e seguro
      </div>
    </div>

    <div class="p-6 text-slate-800 sm:p-10">
      <div class="mb-8 lg:hidden">
        <p class="text-sm font-bold uppercase tracking-[0.18em] text-green-700">Sanidade Teis</p>
      </div>
      <div class="mb-8">
        <p class="mb-2 text-sm font-semibold text-green-700">Un paso máis</p>
        <h2 class="text-3xl font-bold tracking-tight text-slate-900">Crea a túa conta</h2>
        <p class="mt-2 text-sm leading-6 text-slate-500">Completa os teus datos para comezar.</p>
      </div>

      <form class="flex w-full flex-col gap-4" @submit.prevent>
        <div class="flex flex-col gap-2">
          <label for="dni" class="text-sm font-semibold text-slate-700">DNI</label>
          <input id="dni" type="text" autocomplete="off" required placeholder="12345678A" class="box-border w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm uppercase transition placeholder:text-slate-400 placeholder:normal-case hover:border-slate-300 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10">
        </div>

        <div class="flex flex-col gap-2">
          <label for="correo" class="text-sm font-semibold text-slate-700">Correo electrónico</label>
          <input id="correo" type="email" autocomplete="email" required placeholder="nome@exemplo.com" class="box-border w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10">
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="flex flex-col gap-2">
            <label for="novo-password" class="text-sm font-semibold text-slate-700">Contrasinal</label>
            <input id="novo-password" type="password" autocomplete="new-password" required placeholder="Mínimo 8 caracteres" class="box-border w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10">
          </div>
          <div class="flex flex-col gap-2">
            <label for="confirmar-password" class="text-sm font-semibold text-slate-700">Repetir contrasinal</label>
            <input id="confirmar-password" type="password" autocomplete="new-password" required placeholder="Repíteo" class="box-border w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm transition placeholder:text-slate-400 hover:border-slate-300 focus:border-green-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-green-500/10">
          </div>
        </div>

        <button type="submit" class="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700 hover:shadow-green-600/30">
          Crear a miña conta
          <span aria-hidden="true">→</span>
        </button>
      </form>

      <p class="mt-8 text-center text-sm text-slate-500">
        Xa tes unha conta?
        <RouterLink to="/acceso" class="font-semibold text-green-700 hover:text-green-900">Iniciar sesión</RouterLink>
      </p>
    </div>
  </div>
</template>
