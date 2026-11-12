<template>
  <div class="home-page">
    <section class="home-hero">
      <video
        class="home-hero__video"
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
      <div class="home-hero__overlay"></div>
      <div class="home-hero__content">
        <p class="home-hero__eyebrow">SaludNexo</p>
        <h1>Tu salud, más cerca y mejor atendida</h1>
        <p class="home-hero__text">Gestiona pacientes, doctores y citas desde un único espacio.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import videoSanidad from "../assets/video-sanidad.mp4"
</script>

<style scoped>
.home-page {
  padding: 2rem;
  background: #fff;
}

.home-hero {
  position: relative;
  display: flex;
  min-height: min(72vh, 42rem);
  overflow: hidden;
  align-items: center;
  border-radius: 0.8rem;
  padding: 2rem 3rem;
  background: #004800;
  color: #fff;
}

.home-hero__video,
.home-hero__overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.home-hero__video {
  pointer-events: none;
  object-fit: cover;
}

.home-hero__overlay {
  background: linear-gradient(90deg, #003300cc 0%, #00640088 48%, #00480026 100%);
}

.home-hero__content {
  position: relative;
  z-index: 1;
  max-width: 38rem;
}

.home-hero h1 {
  max-width: 36rem;
  margin: 0.35rem 0;
  font-size: clamp(1.7rem, 4vw, 2.8rem);
  line-height: 1.1;
}

.home-hero p {
  margin: 0;
}

.home-hero__eyebrow {
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.home-hero__text {
  max-width: 32rem;
  opacity: 0.9;
}

@media (max-width: 600px) {
  .home-page {
    padding: 1rem;
  }

  .home-hero {
    min-height: 70vh;
    padding: 1.5rem;
  }
}
</style>

