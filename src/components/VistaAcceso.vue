<template>
  <div class="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm max-md:p-4 md:p-8 [&_form]:mb-8 [&_form]:flex [&_form]:w-full [&_form]:flex-col [&_form]:gap-5 [&_.campo]:flex [&_.campo]:min-w-0 [&_.campo]:flex-1 [&_.campo]:flex-col [&_.campo]:items-stretch [&_.campo]:gap-2 [&_.campo>label]:text-sm [&_.campo>label]:font-semibold [&_.dni-wrapper]:flex [&_.dni-wrapper]:w-full [&_.dni-wrapper]:flex-wrap [&_.dni-wrapper]:items-center [&_.dni-wrapper]:gap-2 [&_input]:box-border [&_input]:min-h-11 [&_input]:flex-1 [&_input]:rounded-lg [&_input]:border [&_input]:border-slate-300 [&_input]:bg-white [&_input]:p-3 [&_input]:text-slate-800 [&_input]:outline-none [&_input]:transition [&_input]:focus:border-green-500 [&_input]:focus:ring-4 [&_input]:focus:ring-green-500/10 [&_select]:min-h-11 [&_select]:w-full [&_select]:rounded-lg [&_select]:border [&_select]:border-slate-300 [&_select]:bg-white [&_select]:p-3 [&_select]:text-slate-800 [&_select]:outline-none [&_select]:focus:border-green-500 [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_table]:overflow-hidden [&_table]:border [&_table]:border-slate-200 [&_th]:border-b [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-3 [&_th]:text-left [&_th]:text-xs [&_th]:font-bold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_td]:border-b [&_td]:border-slate-100 [&_td]:p-3 [&_td]:text-sm [&_td]:text-slate-600 [&_tbody_tr:hover]:bg-green-50/40">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-green-50/50 px-5 py-5">
      <div>
        <h1 class="mt-1 text-xl font-bold text-slate-900">Acceso de Usuarios</h1>
      </div>
    </div>
    <form>
      <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-[minmax(16rem,1.2fr)_minmax(0,2fr)_minmax(0,2fr)]">
        <div class="campo campo-usuario min-w-0">
          <label>Usuario: </label>
          <div class="usuario-wrapper">
            <input
              type="text"
              required
              class="!min-w-0 !flex-[1_1_8rem] text-center"
            />
          </div>
        </div>
      </div>
      <div class="grid w-full grid-cols-1 gap-4 md:grid-cols-[minmax(16rem,1.2fr)_minmax(0,2fr)_minmax(0,2fr)]">
        <div class="campo campo-contrasenha min-w-0">
          <label>Contrasinal: </label>
          <div class="contrasenha-wrapper">
            <input
              type="text"
              required
              class="!min-w-0 !flex-[1_1_8rem] text-center"
            />
          </div>
        </div>
      </div>
      <div class="flex justify-center gap-3">
        <button
          type="submit"
          required
          class="rounded-lg border-0 bg-green-700 px-6 py-3 font-bold text-white shadow-sm transition hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-65"
        >
          Acceder
        </button>
      </div>
    </form>
  </div>
</template>

