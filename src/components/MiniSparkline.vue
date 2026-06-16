<script setup>
import { computed } from 'vue'

const props = defineProps({
  points: { type: Array, default: () => [] },
  positive: { type: Boolean, default: true }
})

const values = computed(() => (props.points || []).map((p) => Number(p)).filter((v) => Number.isFinite(v)).slice(-28))
const min = computed(() => values.value.length ? Math.min(...values.value) : 0)
const max = computed(() => values.value.length ? Math.max(...values.value) : 1)
const last = computed(() => values.value.at(-1) ?? 0)
const first = computed(() => values.value[0] ?? last.value)
const up = computed(() => last.value >= first.value)
const range = computed(() => Math.max(1e-9, max.value - min.value))
const bars = computed(() => values.value.map((v, i) => {
  const h = 8 + ((v - min.value) / range.value) * 38
  return { x: 4 + i * (172 / Math.max(1, values.value.length)), y: 52 - h, h, w: Math.max(2, 150 / Math.max(10, values.value.length)), up: i === 0 ? up.value : v >= values.value[i-1] }
}))
const polyline = computed(() => values.value.map((value, index) => {
  const x = values.value.length === 1 ? 90 : (index / (values.value.length - 1)) * 176 + 2
  const ratio = (value - min.value) / range.value
  const y = 50 - ratio * 42
  return `${x},${y}`
}).join(' '))
</script>

<template>
  <svg viewBox="0 0 180 60" class="mini-sparkline" preserveAspectRatio="none" role="img" aria-label="realistic open-source style market mini chart">
    <defs>
      <linearGradient id="gridFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#94a3b8" stop-opacity=".22"/><stop offset="1" stop-color="#94a3b8" stop-opacity=".04"/></linearGradient>
      <linearGradient id="bull" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#16a34a" stop-opacity=".45"/></linearGradient>
      <linearGradient id="bear" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fb7185"/><stop offset="1" stop-color="#e11d48" stop-opacity=".45"/></linearGradient>
    </defs>
    <rect x="0" y="0" width="180" height="60" rx="8" fill="#020617" opacity=".92" />
    <path d="M0 15H180M0 30H180M0 45H180" stroke="url(#gridFade)" stroke-width="1" />
    <rect v-for="(b,i) in bars" :key="i" :x="b.x" :y="b.y" :width="b.w" :height="b.h" rx="1.5" :fill="b.up ? 'url(#bull)' : 'url(#bear)'" opacity=".62" />
    <polyline :points="polyline" fill="none" :stroke="positive || up ? '#4ade80' : '#fb7185'" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    <circle v-if="polyline" :cx="176" :cy="bars.at(-1)?.y || 30" r="2.6" :fill="positive || up ? '#86efac' : '#fda4af'" />
  </svg>
</template>

<style scoped>
.mini-sparkline{width:100%;height:62px;border-radius:10px;border:1px solid rgba(148,163,184,.25);box-shadow:inset 0 0 18px rgba(15,23,42,.75),0 6px 14px rgba(2,6,23,.18);background:#020617}
</style>
