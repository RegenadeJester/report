<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { createChart, CandlestickSeries, LineSeries } from 'lightweight-charts'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps({ candles: { type: Array, default: () => [] }, symbol: { type: String, default: '' } })
const range = ref('1d')
const candleEl = ref(null)
let chart
let candleSeries
let lineSeries

const rangedCandles = computed(() => {
  const all = props.candles || []
  if (range.value === '1d') return all.slice(-12)
  if (range.value === '1w') return all.slice(-24)
  return all.slice(-36)
})

const volumeData = computed(() => ({
  labels: rangedCandles.value.map((c) => c.label),
  datasets: [{
    label: `${props.symbol} Volume`,
    data: rangedCandles.value.map((c) => c.volume || 0),
    backgroundColor: '#f472b6',
    borderRadius: 6,
    maxBarThickness: 22
  }]
}))

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: { legend: { labels: { color: '#dbeafe' } } },
  scales: {
    x: { ticks: { color: '#93c5fd', maxRotation: 0, autoSkip: true, maxTicksLimit: 6 }, grid: { color: 'rgba(148,163,184,0.10)' } },
    y: { ticks: { color: '#93c5fd', maxTicksLimit: 5 }, grid: { color: 'rgba(148,163,184,0.10)' } }
  }
}

function mappedCandleData() {
  return rangedCandles.value.map((c, index) => ({
    time: index + 1,
    open: Number(c.open ?? c.value),
    high: Number(c.high ?? c.value),
    low: Number(c.low ?? c.value),
    close: Number(c.close ?? c.value)
  }))
}

function mappedLineData() {
  return rangedCandles.value.map((c, index) => ({
    time: index + 1,
    value: Number(c.close ?? c.value)
  }))
}

function updateSeries() {
  if (!chart) return
  candleSeries?.setData(mappedCandleData())
  lineSeries?.setData(mappedLineData())
  chart.timeScale().fitContent()
}

function renderChart() {
  if (!candleEl.value) return
  if (chart) chart.remove()
  chart = createChart(candleEl.value, {
    layout: { background: { color: '#0b1424' }, textColor: '#dbeafe' },
    grid: { vertLines: { color: 'rgba(148,163,184,0.10)' }, horzLines: { color: 'rgba(148,163,184,0.10)' } },
    width: candleEl.value.clientWidth,
    height: 250,
    timeScale: { borderColor: '#334155' },
    rightPriceScale: { borderColor: '#334155' },
    crosshair: { mode: 0 }
  })
  candleSeries = chart.addSeries(CandlestickSeries, { upColor: '#4ade80', downColor: '#fb7185', borderVisible: false, wickUpColor: '#4ade80', wickDownColor: '#fb7185' })
  lineSeries = chart.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 2, priceLineVisible: false })
  updateSeries()
}

watch(() => [props.candles, range.value], updateSeries, { deep: true })

function handleResize() {
  if (chart && candleEl.value) chart.applyOptions({ width: candleEl.value.clientWidth })
}

onMounted(() => {
  renderChart()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  if (chart) chart.remove()
})
</script>

<template>
  <section class="charts-shell">
    <div class="charts-head">
      <h3>Realtime market charts</h3>
      <div class="range-switcher">
        <button class="range-btn" :class="{ active: range === '1d' }" @click="range = '1d'">Hari</button>
        <button class="range-btn" :class="{ active: range === '1w' }" @click="range = '1w'">Minggu</button>
        <button class="range-btn" :class="{ active: range === '1m' }" @click="range = '1m'">Bulan</button>
      </div>
    </div>
    <div class="chart-grid responsive-chart-grid two-charts">
      <div class="chart-card compact-chart">
        <h4>TradingView-style realtime chart</h4>
        <div ref="candleEl" class="chart-wrap tv-chart"></div>
        <p class="chart-note">Candlestick dan line overlay sekarang dirender dengan lightweight-charts dan diupdate lebih rapat agar gerakan lebih terlihat.</p>
      </div>
      <div class="chart-card compact-chart">
        <h4>Bar volume</h4>
        <div class="chart-wrap"><Bar :data="volumeData" :options="barOptions" /></div>
        <p class="chart-note">Menunjukkan besar aktivitas transaksi. Volume tinggi biasanya berarti pergerakan lebih valid.</p>
      </div>
    </div>
  </section>
</template>
