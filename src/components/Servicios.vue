<template>
  <section class="space-y-8">
    <header class="mx-auto max-w-3xl text-center">
      <p class="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-teal-700">
        Atención integral
      </p>
      <h1 class="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
        Nuestros servicios
      </h1>
      <p class="mt-3 text-base leading-7 text-slate-500">
        Especialidades y cuidados para acompañarte en cada etapa.
      </p>
    </header>

    <section
      class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Servicios médicos"
    >
      <article
        v-for="servicio in servicios"
        :key="servicio.nombre"
        class="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-teal-200 hover:shadow-lg"
      >
        <img
          class="h-52 w-full object-cover transition duration-300 group-hover:scale-105"
          :src="servicio.imagen"
          :alt="servicio.alt"
          loading="lazy"
        >
        <div class="relative bg-white p-5">
          <h2 class="text-xl font-bold text-slate-900">{{ servicio.nombre }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-500">{{ servicio.descripcion }}</p>
        </div>
      </article>
    </section>
  </section>
</template>

<script setup>
import cardiologiaImage from '../assets/servicios/cardiologia.jpg'
import dermatologiaImage from '../assets/servicios/dermatologia.jpg'
import neurologiaImage from '../assets/servicios/neurologia.jpg'
import patologiaImage from '../assets/servicios/patologia.jpg'
import pediatriaImage from '../assets/servicios/pediatria.jpg'
import traumatologiaImage from '../assets/servicios/traumatologia.jpg'

const servicios = [
  {
    nombre: 'Cardiología',
    descripcion: 'Prevención, diagnóstico y tratamiento de las enfermedades del corazón y del sistema circulatorio.',
    imagen: cardiologiaImage,
    alt: 'Atención de cardiología',
  },
  {
    nombre: 'Patología',
    descripcion: 'Análisis clínicos y estudios especializados para conocer el origen de cada enfermedad.',
    imagen: patologiaImage,
    alt: 'Estudio de patología',
  },
  {
    nombre: 'Pediatría',
    descripcion: 'Atención médica para acompañar el crecimiento y desarrollo saludable de niños y adolescentes.',
    imagen: pediatriaImage,
    alt: 'Atención pediátrica',
  },
  {
    nombre: 'Dermatología',
    descripcion: 'Cuidado, diagnóstico y tratamiento de la piel, el cabello y las uñas.',
    imagen: dermatologiaImage,
    alt: 'Consulta de dermatología',
  },
  {
    nombre: 'Neurología',
    descripcion: 'Evaluación y tratamiento de las enfermedades del cerebro y del sistema nervioso.',
    imagen: neurologiaImage,
    alt: 'Consulta de neurología',
  },
  {
    nombre: 'Traumatología',
    descripcion: 'Diagnóstico y recuperación de lesiones de huesos, músculos y articulaciones.',
    imagen: traumatologiaImage,
    alt: 'Consulta de traumatología',
  },
]
</script>
