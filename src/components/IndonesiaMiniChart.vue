<script setup>
import { ref, onMounted, watch, computed } from 'vue'

const props = defineProps({
  data: { type: Array, default: () => [] },
  color: { type: String, default: '#22c55e' },
  height: { type: Number, default: 50 },
  label: { type: String, default: '' },
  showArea: { type: Boolean, default: true },
  showDots: { type: Boolean, default: false },
  smooth: { type: Boolean, default: true },
})

const canvas = ref(null)

const values = computed(() =>
  (props.data || []).map(Number).filter(Number.isFinite).slice(-60)
)

function draw() {
  const c = canvas.value
  if (!c || !values.value.length) return
  const ctx = c.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const rect = c.getBoundingClientRect()
  const w = rect.width
  const h = props.height
  c.width = w * dpr
  c.height = h * dpr
  c.style.height = h + 'px'
  ctx.scale(dpr, dpr)

  const vals = values.value
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const range = Math.max(1e-9, max - min)
  const pad = 4
  const plotH = h - pad * 2
  const plotW = w - pad * 2

  const points = vals.map((v, i) => ({
    x: pad + (i / Math.max(1, vals.length - 1)) * plotW,
    y: pad + plotH - ((v - min) / range) * plotH,
  }))

  // Clear
  ctx.clearRect(0, 0, w, h)

  // Area fill
  if (props.showArea) {
    ctx.beginPath()
    ctx.moveTo(points[0].x, h)
    if (props.smooth && points.length > 2) {
      ctx.lineTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2
        const yc = (points[i].y + points[i + 1].y) / 2
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
      }
      const last = points[points.length - 1]
      const prev = points[points.length - 2]
      ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y)
    } else {
      points.forEach((p) => ctx.lineTo(p.x, p.y))
    }
    ctx.lineTo(points[points.length - 1].x, h)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, props.color + '40')
    grad.addColorStop(1, props.color + '05')
    ctx.fillStyle = grad
    ctx.fill()
  }

  // Line
  ctx.beginPath()
  if (props.smooth && points.length > 2) {
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2
      const yc = (points[i].y + points[i + 1].y) / 2
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
    }
    const last = points[points.length - 1]
    const prev = points[points.length - 2]
    ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y)
  } else {
    points.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  }
  ctx.strokeStyle = props.color
  ctx.lineWidth = 2
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()

  // End dot
  const last = points[points.length - 1]
  ctx.beginPath()
  ctx.arc(last.x, last.y, 3, 0, Math.PI * 2)
  ctx.fillStyle = props.color
  ctx.fill()
  ctx.beginPath()
  ctx.arc(last.x, last.y, 6, 0, Math.PI * 2)
  ctx.fillStyle = props.color + '30'
  ctx.fill()
}

onMounted(draw)
watch(() => [props.data, props.color, props.height], draw, { deep: true })
</script>

<template>
  <div class="mini-chart-wrap" :style="{ height: height + 'px' }">
    <canvas ref="canvas" class="mini-chart-canvas"></canvas>
    <span v-if="label" class="mini-chart-label">{{ label }}</span>
  </div>
</template>

<style scoped>
.mini-chart-wrap {
  position: relative;
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
}
.mini-chart-canvas {
  width: 100%;
  height: 100%;
  display: block;
}
.mini-chart-label {
  position: absolute;
  top: 4px;
  right: 6px;
  font-size: 10px;
  color: #64748b;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
</style>
