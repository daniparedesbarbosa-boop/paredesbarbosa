<template>
  <footer class="border-t border-slate-200 bg-white">
    <div class="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
      <p>© {{ new Date().getFullYear() }} Sanidade Teis</p>
      <RouterLink to="/avisolegal" class="font-medium text-teal-700 transition hover:text-teal-900">
        Aviso Legal
      </RouterLink>
    </div>
  </footer>
</template>
