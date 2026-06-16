<script setup>
import { locale, setLocale, t } from '../i18n'

function toggleLang() {
  setLocale(locale.value === 'id' ? 'en' : 'id')
}
</script>

<template>
  <button class="lang-toggle brutal-btn" @click="toggleLang" :aria-label="`Switch language to ${locale === 'id' ? 'English' : 'Bahasa Indonesia'}`">
    <span :class="{ active: locale === 'id' }">{{ t('lang.id') }}</span>
    <span class="sep">|</span>
    <span :class="{ active: locale === 'en' }">{{ t('lang.en') }}</span>
  </button>
</template>

<style scoped>
.lang-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: var(--card-bg, #16213e);
  border: 1px solid var(--ink, #4a5568);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: inherit;
  color: var(--text, #e2e8f0);
  transition: background 0.15s;
}
.lang-toggle:hover {
  background: var(--hover, #1a2744);
}
.lang-toggle .sep {
  color: var(--ink, #4a5568);
  font-size: 0.75rem;
}
.lang-toggle .active {
  font-weight: 700;
  color: var(--accent, #63b3ed);
  text-decoration: underline;
}
</style>
