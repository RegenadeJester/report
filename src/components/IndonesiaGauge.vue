<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: { type: Number, default: 50 },
  label: { type: String, default: '' },
  size: { type: Number, default: 200 },
  thickness: { type: Number, default: 14 },
  showTag: { type: Boolean, default: true },
})

const clampedScore = computed(() => Math.max(0, Math.min(100, props.score)))

const colorForScore = (s) => {
  if (s < 30) return { fill: '#ef4444', glow: '#ef4444', tag: 'KRISIS', tagClass: 'tag-crisis' }
  if (s < 50) return { fill: '#f59e0b', glow: '#f59e0b', tag: 'WASPADA', tagClass: 'tag-waspada' }
  if (s < 70) return { fill: '#eab308', glow: '#eab308', tag: 'STABIL', tagClass: 'tag-stabil' }
  if (s < 85) return { fill: '#22c55e', glow: '#22c55e', tag: 'TUMBUH', tagClass: 'tag-tumbuh' }
  return { fill: '#fbbf24', glow: '#f59e0b', tag: 'BOOMING', tagClass: 'tag-booming' }
}

const color = computed(() => colorForScore(clampedScore.value))

// SVG arc math — 270° sweep from 135°
const cx = computed(() => props.size / 2)
const cy = computed(() => props.size / 2)
const radius = computed(() => (props.size - props.thickness * 2) / 2)
const startAngle = 135
const sweepAngle = 270

function polarToCartesian(angle) {
  const rad = (angle * Math.PI) / 180
  return {
    x: cx.value + radius.value * Math.cos(rad),
    y: cy.value + radius.value * Math.sin(rad),
  }
}

const arcPath = (start, end) => {
  const s = polarToCartesian(start)
  const e = polarToCartesian(end)
  const largeArc = end - start > 180 ? 1 : 0
  return `M ${s.x} ${s.y} A ${radius.value} ${radius.value} 0 ${largeArc} 1 ${e.x} ${e.y}`
}

const bgArc = computed(() => arcPath(startAngle, startAngle + sweepAngle))
const valueArc = computed(() => {
  const end = startAngle + (clampedScore.value / 100) * sweepAngle
  return arcPath(startAngle, end)
})

// Needle tip
const needleAngle = computed(() => startAngle + (clampedScore.value / 100) * sweepAngle)
const needleTip = computed(() => {
  const r = radius.value - props.thickness - 4
  const rad = (needleAngle.value * Math.PI) / 180
  return {
    x: cx.value + r * Math.cos(rad),
    y: cy.value + r * Math.sin(rad),
  }
})

const glowId = computed(() => `gauge-glow-${Math.random().toString(36).slice(2, 8)}`)
</script>

<template>
  <div class="indonesia-gauge" :style="{ width: size + 'px', height: size + 'px' }">
    <svg :viewBox="`0 0 ${size} ${size}`" class="gauge-svg">
      <defs>
        <filter :id="glowId">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Background arc -->
      <path :d="bgArc" fill="none" stroke="#1e293b" :stroke-width="thickness" stroke-linecap="round" />

      <!-- Value arc -->
      <path
        :d="valueArc"
        fill="none"
        :stroke="color.fill"
        :stroke-width="thickness"
        stroke-linecap="round"
        :filter="`url(#${glowId})`"
        class="value-arc"
      />

      <!-- Tick marks -->
      <template v-for="i in 9" :key="i">
        <line
          :x1="cx + (radius + thickness / 2 + 2) * Math.cos(((startAngle + i * sweepAngle / 9) * Math.PI) / 180)"
          :y1="cy + (radius + thickness / 2 + 2) * Math.sin(((startAngle + i * sweepAngle / 9) * Math.PI) / 180)"
          :x2="cx + (radius + thickness / 2 + 6) * Math.cos(((startAngle + i * sweepAngle / 9) * Math.PI) / 180)"
          :y2="cy + (radius + thickness / 2 + 6) * Math.sin(((startAngle + i * sweepAngle / 9) * Math.PI) / 180)"
          stroke="#334155"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </template>

      <!-- Needle -->
      <line
        :x1="cx"
        :y1="cy"
        :x2="needleTip.x"
        :y2="needleTip.y"
        stroke="#e2e8f0"
        stroke-width="2.5"
        stroke-linecap="round"
        class="needle-line"
      />
      <circle :cx="cx" :cy="cy" r="5" :fill="color.fill" class="needle-center" />

      <!-- Score text -->
      <text
        :x="cx"
        :y="cy + size * 0.18"
        text-anchor="middle"
        class="score-text"
        :fill="color.fill"
      >
        {{ clampedScore }}
      </text>

      <!-- Label -->
      <text v-if="label" :x="cx" :y="cy + size * 0.28" text-anchor="middle" class="gauge-label">
        {{ label }}
      </text>
    </svg>

    <!-- Tag below -->
    <div v-if="showTag" class="gauge-tag" :class="color.tagClass">
      {{ color.tag }}
    </div>
  </div>
</template>

<style scoped>
.indonesia-gauge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.gauge-svg {
  display: block;
  filter: drop-shadow(0 0 20px rgba(0, 0, 0, 0.5));
}
.value-arc {
  transition: d 0.6s ease;
}
.needle-line {
  transition: x2 0.6s ease, y2 0.6s ease;
}
.needle-center {
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.3));
}
.score-text {
  font-size: 32px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  filter: url(#glow);
}
.gauge-label {
  font-size: 11px;
  fill: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 1px;
}
.gauge-tag {
  padding: 4px 16px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 2px;
  text-transform: uppercase;
  border: 1px solid;
}
.tag-crisis { color: #ef4444; border-color: #ef4444; background: rgba(239,68,68,0.12); animation: pulse-crisis 1.5s ease-in-out infinite; }
.tag-waspada { color: #f59e0b; border-color: #f59e0b; background: rgba(245,158,11,0.12); }
.tag-stabil { color: #eab308; border-color: #eab308; background: rgba(234,179,8,0.12); }
.tag-tumbuh { color: #22c55e; border-color: #22c55e; background: rgba(34,197,94,0.12); }
.tag-booming { color: #fbbf24; border-color: #fbbf24; background: rgba(251,191,36,0.12); animation: pulse-boom 2s ease-in-out infinite; }

@keyframes pulse-crisis {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
  50% { box-shadow: 0 0 20px 4px rgba(239,68,68,0.15); }
}
@keyframes pulse-boom {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.3); }
  50% { box-shadow: 0 0 16px 3px rgba(251,191,36,0.12); }
}
</style>
