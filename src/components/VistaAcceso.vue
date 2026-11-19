<template>
  <div class="mx-auto my-10 box-border w-full max-w-md rounded-lg bg-white p-6 text-gray-800 shadow-md">
    <h4 class="mb-6 rounded bg-green-700 px-4 py-2 text-center text-lg font-semibold text-white shadow-sm">
      Acceso de Usuarios
    </h4>

    <form class="flex w-full flex-col gap-4">
      <div class="flex flex-col gap-1">
        <label for="usuario" class="text-sm font-semibold text-gray-700">Usuario:</label>
        <input
          id="usuario"
          v-model="usuario"
          type="text"
          placeholder="DNI/CIF o Correo Electrónico"
          required
          class="box-border w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1ec9a4]"
        >
      </div>

      <div class="flex flex-col gap-1">
        <label for="password" class="text-sm font-semibold text-gray-700">Contrasinal:</label>
        <div class="relative flex items-center">
          <input
            id="password"
            v-model="password"
            required
            aria-label="Contrasinal"
            class="box-border w-full rounded-xl border border-gray-300 bg-gray-50 px-3 py-2 pr-16 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#1ec9a4]"
          >
          <button
            type="button"
            class="absolute right-2 rounded-lg border border-gray-300 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-200"
          >
          </button>
        </div>
      </div>

      <div class="mt-4 flex w-full items-center justify-center">
        <button
          type="submit"
          class="w-50 cursor-pointer rounded-xl border-2 border-green-700 bg-[#f0f3f7] py-2.5 font-medium text-gray-800 shadow-sm hover:bg-[#c8eacf] disabled:cursor-not-allowed disabled:border-gray-300 disabled:bg-gray-200 disabled:text-gray-400"
        >
          Acceder
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref } from "vue"

const usuario = ref("")
const password = ref("")

</script>
