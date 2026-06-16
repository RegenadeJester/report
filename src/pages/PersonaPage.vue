<script setup>
import PersonaWidget from '../components/PersonaWidget.vue'
</script>

<template>
  <div class="persona-page">
    <section class="hero brutal-hero">
      <div class="hero-inner">
        <span class="hero-eyebrow">PROFILE</span>
        <h1>🐋 Your Market Orca Profile</h1>
        <p>Define who you are as a trader. Orca uses this to tailor alerts, insights, and reports to your style.</p>
      </div>
    </section>
    <section class="widget-section">
      <PersonaWidget />
    </section>
  </div>
</template>

<style scoped>
.persona-page { max-width: 720px; margin: 0 auto; padding: 0 1rem 3rem; }
.hero { padding: 2rem 0 1.5rem; border-bottom: 3px solid var(--ink, #000); margin-bottom: 2rem; }
.hero-eyebrow {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--muted, #888);
}
.hero h1 { margin: 0.3rem 0; font-size: 1.6rem; }
.hero p { margin: 0; color: var(--muted, #888); font-size: 0.95rem; }
.widget-section { display: flex; justify-content: center; }
</style>
