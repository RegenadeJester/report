<script setup>
import { onMounted, onBeforeUnmount, ref, computed, nextTick, watch } from 'vue'
import { apiGet, API_BASE } from '../lib/api'
import { t, locale } from '../i18n'
import IndonesiaGauge from '../components/IndonesiaGauge.vue'
import IndonesiaMiniChart from '../components/IndonesiaMiniChart.vue'

// ── Chart deps ────────────────────────────────────────────────
import { createChart, CandlestickSeries, LineSeries, BarSeries, HistogramSeries } from 'lightweight-charts'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js'
ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler)

// ── Data refs ─────────────────────────────────────────────────
const loading = ref(true)
const error = ref('')
const data = ref(null)
let pollTimer = null

// Chart refs
const yieldChartEl = ref(null)
const ihsgChartEl = ref(null)
let yieldChart = null
let ihsgChart = null
let yieldSeries = null
let candleSeries = null
let ma20Series = null
let ma50Series = null
let ma200Series = null
let volumeSeries = null

// ── Data sections ─────────────────────────────────────────────
const composite = computed(() => data.value?.composite || null)
const yieldCurve = computed(() => data.value?.yieldCurve || null)
const ihsgData = computed(() => data.value?.ihsg || null)
const macroData = computed(() => data.value?.macro || {})
const cryptoData = computed(() => data.value?.crypto || null)
const fearGreed = computed(() => data.value?.fearGreed || null)
const alerts = ref([])
const signals = ref([])

// ── Sub scores from breakdown ────────────────────────────────
const subScores = computed(() => {
  if (!composite.value?.breakdown) return []
  const b = composite.value.breakdown
  const map = { yield_curve: { key: 'yield_curve', label: 'Yield', labelId: 'yield' }, ihsg: { key: 'ihsg', label: 'IHSG', labelId: 'ihsg' }, macro: { key: 'macro', label: 'Macro', labelId: 'macro' }, crypto: { key: 'crypto', label: 'Crypto', labelId: 'crypto' } }
  return Object.entries(b).map(([k, v]) => map[k] || { key: k, label: k, labelId: k }).map(m => ({ ...m, score: Math.round(b[m.key] || 0) }))
})

// ── Format helpers ────────────────────────────────────────────
function fmtNum(n, d = 2) {
  if (n == null || isNaN(n)) return '—'
  return Number(n).toLocaleString('id-ID', { maximumFractionDigits: d })
}
function fmtIDR(n) {
  if (n == null || isNaN(n)) return '—'
  return 'Rp ' + Number(n).toLocaleString('id-ID', { maximumFractionDigits: 0 })
}
function fmtPct(n) { return (n > 0 ? '+' : '') + fmtNum(n) + '%' }
function changeColor(v) { return v > 0 ? 'var(--green, #22c55e)' : v < 0 ? 'var(--red, #ef4444)' : 'var(--muted, #888)' }
function arrow(val) { return val > 0 ? '▲' : val < 0 ? '▼' : '➤' }

// ── Fear & Greed ─────────────────────────────────────────────
function fgColor(v) {
  if (v < 25) return '#ef4444'
  if (v < 45) return '#f59e0b'
  if (v < 55) return '#888'
  if (v < 75) return '#22c55e'
  return '#06b6d4'
}

// ── Yield curve chart (lightweight-charts line) ─────────────
function buildYieldChart() {
  if (!yieldChartEl.value || !yieldCurve.value?.curve) return
  if (yieldChart) yieldChart.remove()

  const curve = yieldCurve.value.curve
  const tenors = ['1m','3m','6m','1y','2y','3y','5y','10y','15y','20y','30y']
  const data = []
  tenors.forEach((t, i) => {
    if (curve[t] != null) data.push({ time: String(i), value: Number(curve[t]) })
  })

  const colors = yieldCurve.value.inverted
    ? { bg: '#0b0f17', text: '#94a3b8', grid: '#1e293b', line: '#ef4444', crosshair: '#fb7185' }
    : { bg: '#0b0f17', text: '#94a3b8', grid: '#1e293b', line: '#22c55e', crosshair: '#60a5fa' }

  yieldChart = createChart(yieldChartEl.value, {
    width: yieldChartEl.value.clientWidth,
    height: 280,
    layout: { background: { type: 'solid', color: colors.bg }, textColor: colors.text },
    grid: { vertLines: { color: colors.grid }, horzLines: { color: colors.grid } },
    crosshair: { mode: 0, vertLine: { color: colors.crosshair, style: 2 }, horzLine: { color: colors.crosshair, style: 2 } },
    rightPriceScale: { borderColor: '#334155' },
    timeScale: { borderColor: '#334155', visible: false },
    handleScroll: false, handleScale: false,
  })

  yieldSeries = yieldChart.addSeries(LineSeries, {
    color: colors.line, lineWidth: 3, crosshairMarkerVisible: true,
    crosshairMarkerRadius: 4, priceLineVisible: false,
  })
  yieldSeries.setData(data)

  // Inversion zone
  if (yieldCurve.value.inverted) {
    const invStart = tenors.findIndex(t => t === '2y')
    const invEnd = tenors.findIndex(t => t === '10y')
    if (invStart >= 0 && invEnd > invStart) {
      yieldSeries.setMarkers([
        { time: String(invStart), position: 'aboveBar', color: '#ef4444', shape: 'arrowDown', text: '⚠️ INVERSI' },
        { time: String(invEnd), position: 'belowBar', color: '#ef4444', shape: 'arrowUp', text: 'INVERSI ⚠️' },
      ])
    }
  }

  yieldChart.timeScale().fitContent()
}

// ── IHSG candlestick chart ───────────────────────────────────
function buildIhsgChart() {
  if (!ihsgChartEl.value || !ihsgData.value?.candles?.length) return
  if (ihsgChart) ihsgChart.remove()

  ihsgChart = createChart(ihsgChartEl.value, {
    width: ihsgChartEl.value.clientWidth,
    height: 360,
    layout: { background: { type: 'solid', color: '#0b0f17' }, textColor: '#94a3b8' },
    grid: { vertLines: { color: '#1e293b' }, horzLines: { color: '#1e293b' } },
    crosshair: { mode: 0, vertLine: { color: '#60a5fa', style: 2, labelBackgroundColor: '#1e293b' }, horzLine: { color: '#60a5fa', style: 2, labelBackgroundColor: '#1e293b' } },
    rightPriceScale: { borderColor: '#334155', scaleMargins: { top: 0.05, bottom: 0.3 } },
    timeScale: { borderColor: '#334155', timeVisible: true },
    handleScroll: false, handleScale: false,
  })

  const candles = (ihsgData.value.candles || []).map(c => ({
    time: Math.floor(new Date(c.time).getTime() / 1000),
    open: c.open, high: c.high, low: c.low, close: c.close,
  }))

  candleSeries = ihsgChart.addSeries(CandlestickSeries, {
    upColor: '#4ade80', downColor: '#fb7185', borderVisible: false,
    wickUpColor: '#4ade80', wickDownColor: '#fb7185',
  })
  candleSeries.setData(candles)

  // MAs
  const closes = candles.map(c => c.close)
  const calcMA = (period) => {
    const ma = []
    for (let i = period - 1; i < closes.length; i++) {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      ma.push({ time: candles[i].time, value: sum / period })
    }
    return ma
  }

  if (closes.length >= 20) {
    ma20Series = ihsgChart.addSeries(LineSeries, { color: '#f59e0b', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false })
    ma20Series.setData(calcMA(20))
  }
  if (closes.length >= 50) {
    ma50Series = ihsgChart.addSeries(LineSeries, { color: '#60a5fa', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false })
    ma50Series.setData(calcMA(50))
  }
  if (closes.length >= 200) {
    ma200Series = ihsgChart.addSeries(LineSeries, { color: '#a78bfa', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false })
    ma200Series.setData(calcMA(200))
  }

  // Volume bars
  volumeSeries = ihsgChart.addSeries(HistogramSeries, {
    color: '#334155', priceFormat: { type: 'volume' },
    priceScaleId: 'volume', lastValueVisible: false,
  })
  ihsgChart.priceScale('volume').applyOptions({
    scaleMargins: { top: 0.85, bottom: 0 },
  })
  const volData = (ihsgData.value.candles || []).map(c => ({
    time: Math.floor(new Date(c.time).getTime() / 1000),
    value: c.volume || 0,
    color: c.close >= c.open ? '#4ade8060' : '#fb718560',
  }))
  volumeSeries.setData(volData)

  ihsgChart.timeScale().fitContent()
}

// ── RSI gauge ─────────────────────────────────────────────────
const rsiValue = computed(() => ihsgData.value?.rsi ?? null)
const rsiColor = computed(() => {
  if (rsiValue.value == null) return '#888'
  if (rsiValue.value < 30) return '#22c55e'
  if (rsiValue.value < 40) return '#eab308'
  if (rsiValue.value < 60) return '#94a3b8'
  if (rsiValue.value < 70) return '#f59e0b'
  return '#ef4444'
})
const rsiLabel = computed(() => {
  if (rsiValue.value == null) return '—'
  return rsiValue.value < 30 ? t('indonesia.rsi.oversold') : rsiValue.value > 70 ? t('indonesia.rsi.overbought') : t('indonesia.rsi.neutral')
})

// ── Tech status ───────────────────────────────────────────────
const techStatus = computed(() => ihsgData.value?.techStatus || null)
const goldenCross = computed(() => techStatus.value?.goldenCross || false)
const deathCross = computed(() => techStatus.value?.deathCross || false)

// ── Macro indicators with trend ──────────────────────────────
const macroIndicators = computed(() => {
  const m = macroData.value
  const list = [
    { key: 'bi_rate', labelId: 'bi_rate', label: 'BI-Rate', value: m.bi_rate?.value, unit: '%', change: m.bi_rate?.change, trend: m.bi_rate?.change, history: m.bi_rate?.history },
    { key: 'inflation', labelId: 'inflation', label: 'Inflasi', value: m.inflation?.value, unit: '%', change: m.inflation?.change, trend: m.inflation?.change, history: m.inflation?.history },
    { key: 'gdp_growth', labelId: 'gdp_growth', label: 'PDB', value: m.gdp_growth?.value, unit: '%', change: m.gdp_growth?.change, trend: m.gdp_growth?.change, history: m.gdp_growth?.history },
    { key: 'forex_reserves', labelId: 'forex_reserves', label: 'Cadangan Devisa', value: m.forex_reserves?.value, unit: 'B USD', change: m.forex_reserves?.change, trend: m.forex_reserves?.change, history: m.forex_reserves?.history },
    { key: 'idr_usd', labelId: 'idr_usd', label: 'IDR/USD', value: m.idr_usd?.value, unit: '', change: m.idr_usd?.change, trend: m.idr_usd?.trend, history: m.idr_usd?.history },
    { key: 'credit_growth', labelId: 'credit_growth', label: 'Kredit', value: m.credit_growth?.value, unit: '%', change: m.credit_growth?.change, trend: m.credit_growth?.change, history: m.credit_growth?.history },
  ]
  return list.filter(i => i.value != null)
})

// ── Data loading ──────────────────────────────────────────────
async function load() {
  if (document.hidden) return
  try {
    error.value = ''
    const d = await apiGet('/api/indonesia/overview')
    data.value = d
    signals.value = d.signals || []
    alerts.value = d.alerts || []
    await nextTick()
    buildYieldChart()
    buildIhsgChart()
  } catch (e) {
    error.value = String(e.message || e)
  } finally {
    loading.value = false
  }
}

async function loadAlertsHistory() {
  try {
    const d = await apiGet('/api/indonesia/alerts')
    alerts.value = d.alerts || []
  } catch (_) {}
}

async function triggerRefresh() {
  loading.value = true
  try {
    await fetch(`${API_BASE}/api/indonesia/refresh`, { method: 'POST' })
    await load()
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
}

onMounted(() => {
  load()
  pollTimer = setInterval(load, 120_000)
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (yieldChart) { yieldChart.remove(); yieldChart = null }
  if (ihsgChart) { ihsgChart.remove(); ihsgChart = null }
})

// Resize handler
let resizeHandler = null
onMounted(() => {
  resizeHandler = () => {
    if (yieldChartEl.value && yieldChart) yieldChart.applyOptions({ width: yieldChartEl.value.clientWidth })
    if (ihsgChartEl.value && ihsgChart) ihsgChart.applyOptions({ width: ihsgChartEl.value.clientWidth })
  }
  window.addEventListener('resize', resizeHandler)
})
onBeforeUnmount(() => {
  if (resizeHandler) window.removeEventListener('resize', resizeHandler)
})
</script>

<template>
  <div class="indonesia-page">
    <!-- Header -->
    <header class="indo-header">
      <h1>{{ t('indonesia.title') }}</h1>
      <p class="subtitle">{{ t('indonesia.subtitle') }}</p>
      <div class="actions">
        <button class="btn" @click="triggerRefresh" :disabled="loading">
          {{ loading ? '⏳' : '🔄' }} {{ t('common.refresh') }}
        </button>
      </div>
    </header>

    <!-- Loading -->
    <div v-if="loading && !data" class="loading-state">
      <div class="spinner"></div>
      <p>{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="error && !data" class="error-state">
      <p>❌ {{ error }}</p>
      <button class="btn" @click="load">{{ t('common.retry') }}</button>
    </div>

    <template v-else-if="data">
      <!-- ═══ COMPOSITE SCORE HERO ═══ -->
      <section v-if="composite" class="composite-hero">
        <IndonesiaGauge
          :score="composite.compositeScore"
          size="240"
          :label="t('indonesia.composite')"
        />
        <div class="hero-side">
          <div class="hero-spread-info">
            <span v-if="yieldCurve?.inverted" class="badge badge-danger">⚠️ {{ t('indonesia.yield.inverted') }}</span>
            <span v-else class="badge badge-ok">✅ {{ t('indonesia.yield.normal') }}</span>
            <span class="spread-val">{{ t('indonesia.yield.spread') }}: {{ fmtNum(yieldCurve?.spread2y10y) }}%</span>
          </div>
          <div class="hero-timestamp" v-if="data?.fetchedAt">
            {{ t('indonesia.lastUpdate') }}: {{ new Date(data.fetchedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US') }}
          </div>
        </div>
      </section>

      <!-- ═══ SUB-SCORES ROW ═══ -->
      <section v-if="subScores.length" class="sub-scores-row">
        <div v-for="s in subScores" :key="s.key" class="sub-score-card">
          <IndonesiaGauge :score="s.score" :size="100" :thickness="8" :label="s.label" :showTag="false" />
          <div class="sub-score-label">{{ s.score }}</div>
        </div>
      </section>

      <!-- ═══ SIGNALS / ALERTS BAR ═══ -->
      <section v-if="signals.length" class="signals-bar">
        <div v-for="(sig, i) in signals.slice(0, 5)" :key="i" class="signal-chip" :class="'signal-' + (sig.severity || 'info')">
          <span class="signal-icon">{{ sig.icon || '🔔' }}</span>
          <span class="signal-text">{{ sig.text }}</span>
        </div>
      </section>

      <!-- ═══ YIELD CURVE ═══ -->
      <section class="section-card">
        <div class="section-header">
          <h2>📈 {{ t('indonesia.yield.title') }}</h2>
          <div class="section-meta">
            <span class="badge" :class="yieldCurve?.inverted ? 'badge-danger' : 'badge-ok'">
              {{ yieldCurve?.inverted ? t('indonesia.yield.inverted') : t('indonesia.yield.normal') }}
            </span>
            <span class="meta-text">{{ t('indonesia.yield.spread') }}: <strong>{{ fmtNum(yieldCurve?.spread2y10y) }}%</strong></span>
            <span v-if="yieldCurve?.interpretation" class="meta-text">{{ yieldCurve.interpretation }}</span>
          </div>
        </div>
        <div ref="yieldChartEl" class="chart-container"></div>
        <!-- Fallback table if no chart data -->
        <div v-if="!yieldCurve?.curve" class="yield-table-fallback">
          <div class="yt-row yt-header"><span>Tenor</span><span>{{ t('indonesia.yield.yield') }}</span></div>
          <div v-for="tenor in ['1m','3m','6m','1y','2y','5y','10y','20y','30y']" :key="tenor" class="yt-row">
            <span>{{ tenor }}</span>
            <strong>{{ fmtNum(yieldCurve?.curve?.[tenor]) }}%</strong>
          </div>
        </div>
      </section>

      <!-- ═══ IHSG SECTION ═══ -->
      <section class="section-card">
        <div class="section-header">
          <h2>🇮🇩 {{ t('indonesia.ihsg.title') }}</h2>
          <div class="section-meta">
            <span v-if="ihsgData" class="ihsg-price-meta">
              <strong class="price-big">{{ fmtNum(ihsgData.price, 0) }}</strong>
              <span :style="{ color: changeColor(ihsgData.changePercent) }" class="change-big">{{ fmtPct(ihsgData.changePercent) }}</span>
            </span>
            <span v-if="techStatus" :class="goldenCross ? 'badge badge-ok' : deathCross ? 'badge badge-danger' : 'badge badge-info'">
              {{ goldenCross ? '🐂 Golden Cross' : deathCross ? '🐻 Death Cross' : t('indonesia.ihsg.neutral') }}
            </span>
          </div>
        </div>

        <!-- Chart -->
        <div ref="ihsgChartEl" class="chart-container chart-tall"></div>

        <!-- RSI + stats row -->
        <div class="ihsg-stats-row">
          <div class="stat-box rsi-box" :style="{ borderColor: rsiColor }">
            <span class="stat-label">RSI</span>
            <span class="stat-value" :style="{ color: rsiColor }">{{ rsiValue != null ? fmtNum(rsiValue, 0) : '—' }}</span>
            <span class="stat-sub">{{ rsiLabel }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">{{ t('indonesia.ihsg.dayRange') }}</span>
            <span class="stat-value">{{ fmtNum(ihsgData?.dayRange?.low, 0) }} — {{ fmtNum(ihsgData?.dayRange?.high, 0) }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">52{{ t('indonesia.ihsg.weekRange') }}</span>
            <span class="stat-value">{{ fmtNum(ihsgData?.yearRange?.low, 0) }} — {{ fmtNum(ihsgData?.yearRange?.high, 0) }}</span>
          </div>
        </div>
      </section>

      <!-- ═══ MACRO SECTION ═══ -->
      <section class="section-card">
        <div class="section-header">
          <h2>📊 {{ t('indonesia.macro.title') }}</h2>
        </div>
        <div class="macro-grid">
          <div v-for="ind in macroIndicators" :key="ind.key" class="macro-card">
            <div class="macro-card-header">
              <span class="macro-label">{{ ind.label }}</span>
              <span v-if="ind.trend != null" :style="{ color: changeColor(ind.trend) }" class="macro-trend">{{ arrow(ind.trend) }}</span>
            </div>
            <div class="macro-value" :style="{ color: ind.key === 'inflation' && ind.value > 4 ? '#f59e0b' : ind.key === 'current_account' && ind.value < 0 ? '#f59e0b' : 'var(--ink)' }">
              {{ fmtNum(ind.value) }}<span class="macro-unit">{{ ind.unit }}</span>
            </div>
            <div v-if="ind.history && ind.history.length" class="macro-spark">
              <IndonesiaMiniChart :data="ind.history" :color="ind.change > 0 ? '#22c55e' : '#ef4444'" :height="40" />
            </div>
            <div v-else class="macro-nochart">{{ t('indonesia.macro.noHistory') }}</div>
          </div>
        </div>
      </section>

      <!-- ═══ CRYPTO SECTION ═══ -->
      <section class="section-card" v-if="cryptoData || fearGreed">
        <div class="section-header">
          <h2>₿ {{ t('indonesia.crypto.title') }}</h2>
        </div>
        <div class="crypto-grid">
          <!-- Fear & Greed -->
          <div v-if="fearGreed" class="crypto-fg-card">
            <h3>{{ t('indonesia.crypto.fearGreed') }}</h3>
            <svg viewBox="0 0 200 100" class="fg-svg">
              <defs>
                <linearGradient id="fgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#ef4444"/>
                  <stop offset="25%" style="stop-color:#f59e0b"/>
                  <stop offset="50%" style="stop-color:#888"/>
                  <stop offset="75%" style="stop-color:#22c55e"/>
                  <stop offset="100%" style="stop-color:#06b6d4"/>
                </linearGradient>
              </defs>
              <rect x="10" y="70" width="180" height="10" rx="5" fill="url(#fgGrad)" opacity="0.3"/>
              <circle :cx="20 + (fearGreed.value || 50) * 1.6" cy="70" r="7" :fill="fgColor(fearGreed.value)"/>
              <text x="100" y="42" text-anchor="middle" fill="white" font-size="26" font-weight="bold">{{ fearGreed.value }}</text>
              <text x="100" y="58" text-anchor="middle" fill="#aaa" font-size="11">{{ fearGreed.classification }}</text>
            </svg>
          </div>

          <!-- Crypto pairs -->
          <div v-for="p in (cryptoData?.pairs || [])" :key="p.pair" class="crypto-price-card">
            <div class="crypto-pair-name">{{ p.pair }}</div>
            <div class="crypto-price">{{ fmtIDR(p.price) }}</div>
            <div class="crypto-change" :style="{ color: changeColor(p.change24h) }">
              {{ fmtPct(p.change24h) }}
            </div>
            <div v-if="p.history" class="crypto-mini-chart">
              <IndonesiaMiniChart :data="p.history" :color="p.change24h > 0 ? '#22c55e' : '#ef4444'" :height="36" />
            </div>
            <div class="crypto-sr">
              <span>S: {{ fmtIDR(p.support) }}</span>
              <span>R: {{ fmtIDR(p.resistance) }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══ SIGNALS / ALERTS TIMELINE ═══ -->
      <section class="section-card">
        <div class="section-header">
          <h2>🔔 {{ t('indonesia.signals') }}</h2>
          <button class="btn btn-sm" @click="loadAlertsHistory">{{ t('indonesia.loadHistory') }}</button>
        </div>
        <div v-if="alerts.length" class="signal-timeline">
          <div v-for="a in alerts" :key="a.id" class="signal-item" :class="'sev-' + (a.severity || 'info')">
            <div class="signal-marker" :class="'marker-' + (a.severity || 'info')"></div>
            <div class="signal-body">
              <div class="signal-head">
                <span class="signal-title">{{ a.title }}</span>
                <span class="signal-time">{{ a.created_at ? new Date(a.created_at).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US') : '' }}</span>
              </div>
              <div class="signal-msg">{{ a.message }}</div>
              <span v-if="a.suggested_action" class="signal-action">{{ t('indonesia.suggested') }}: {{ a.suggested_action }}</span>
            </div>
          </div>
        </div>
        <div v-else class="muted-state">{{ t('indonesia.noSignals') }}</div>
      </section>
    </template>

    <footer class="indo-footer">
      <p>{{ t('indonesia.lastUpdate') }}: {{ data?.fetchedAt ? new Date(data.fetchedAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US') : '—' }}</p>
    </footer>
  </div>
</template>

<style scoped>
/* ── Layout ────────────────────────────────────────────────── */
.indonesia-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}

.indo-header {
  text-align: center;
  margin-bottom: 2rem;
}
.indo-header h1 { font-size: 2rem; font-weight: 800; margin: 0; }
.subtitle { color: #94a3b8; margin: 0.25rem 0 1rem; font-size: 0.9rem; }
.actions { margin-top: 0.5rem; }

/* ── Buttons ────────────────────────────────────────────────── */
.btn {
  background: #1e293b;
  border: 1px solid #334155;
  color: #e2e8f0;
  padding: 0.5rem 1.2rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
}
.btn:hover { background: #2d3a50; border-color: #475569; }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-sm { padding: 0.3rem 0.8rem; font-size: 0.8rem; }

/* ── Loading / Error ────────────────────────────────────────── */
.loading-state, .error-state { text-align: center; padding: 3rem 1rem; }
.spinner {
  width: 40px; height: 40px; border: 3px solid #1e293b;
  border-top-color: #60a5fa; border-radius: 50%;
  animation: spin 0.8s linear infinite; margin: 0 auto 1rem;
}
@keyframes spin { to { transform: rotate(360deg); } }
.error-state p { color: #ef4444; margin-bottom: 1rem; }

/* ── Section Cards ──────────────────────────────────────────── */
.section-card {
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}
.section-header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.section-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}
.section-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.meta-text {
  color: #94a3b8;
  font-size: 0.85rem;
}

/* ── Composite Hero ─────────────────────────────────────────── */
.composite-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1.5rem;
  padding: 2rem;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 16px;
}
.hero-side {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
}
.hero-spread-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
}
.spread-val {
  font-size: 0.9rem;
  color: #94a3b8;
}
.hero-timestamp {
  font-size: 0.8rem;
  color: #64748b;
}

/* ── Sub-scores ─────────────────────────────────────────────── */
.sub-scores-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.sub-score-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: #111827;
  border: 1px solid #1e293b;
  border-radius: 12px;
  padding: 1rem 0.5rem;
}
.sub-score-label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #94a3b8;
}

/* ── Signals Bar ────────────────────────────────────────────── */
.signals-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.signal-chip {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.7rem;
  border-radius: 6px;
  font-size: 0.8rem;
  border: 1px solid #334155;
  background: #0f172a;
  animation: slidein 0.3s ease-out;
}
@keyframes slidein { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
.signal-icon { font-size: 1rem; }
.signal-text { color: #e2e8f0; }
.signal-critical { border-color: #ef4444; background: rgba(239,68,68,0.08); }
.signal-warning { border-color: #f59e0b; background: rgba(245,158,11,0.08); }
.signal-info { border-color: #60a5fa; background: rgba(96,165,250,0.08); }

/* ── Chart Containers ───────────────────────────────────────── */
.chart-container {
  width: 100%;
  height: 280px;
  border-radius: 8px;
  overflow: hidden;
}
.chart-tall { height: 380px; }

/* ── Yield Table Fallback ───────────────────────────────────── */
.yield-table-fallback {
  margin-top: 1rem;
  font-size: 0.85rem;
}
.yt-row {
  display: grid;
  grid-template-columns: 60px 1fr;
  padding: 0.3rem 0;
  border-bottom: 1px solid #1a1a2e;
}
.yt-header { font-weight: 600; color: #64748b; }

/* ── IHSG Stats ─────────────────────────────────────────────── */
.ihsg-stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}
.stat-box {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  padding: 0.6rem 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-label { font-size: 0.75rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 1rem; font-weight: 700; }
.stat-sub { font-size: 0.75rem; color: #94a3b8; }
.rsi-box { border-left: 3px solid; }
.price-big { font-size: 1.4rem; margin-right: 0.5rem; }
.change-big { font-size: 1.1rem; font-weight: 600; }

/* ── Macro Grid ─────────────────────────────────────────────── */
.macro-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.75rem;
}
.macro-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 1rem;
  transition: all 0.15s;
}
.macro-card:hover {
  border-color: #334155;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}
.macro-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.4rem;
}
.macro-label { font-size: 0.8rem; color: #94a3b8; font-weight: 600; }
.macro-trend { font-size: 0.8rem; }
.macro-value {
  font-size: 1.5rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  margin-bottom: 0.3rem;
}
.macro-unit { font-size: 0.8rem; color: #64748b; font-weight: 400; margin-left: 2px; }
.macro-spark { margin-top: 0.3rem; }
.macro-nochart { font-size: 0.7rem; color: #475569; margin-top: 0.5rem; }

/* ── Crypto Grid ────────────────────────────────────────────── */
.crypto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}
.crypto-price-card, .crypto-fg-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 10px;
  padding: 1rem;
}
.crypto-fg-card h3 { margin: 0 0 0.5rem; font-size: 0.9rem; color: #94a3b8; }
.fg-svg { width: 100%; height: 100px; }
.crypto-pair-name { font-size: 0.85rem; font-weight: 700; color: #60a5fa; }
.crypto-price { font-size: 1.2rem; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 0.25rem; }
.crypto-change { font-size: 0.9rem; font-weight: 600; }
.crypto-mini-chart { margin: 0.5rem 0; }
.crypto-sr {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  color: #64748b;
  margin-top: 0.25rem;
}

/* ── Signal Timeline ────────────────────────────────────────── */
.signal-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.signal-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 8px;
  transition: all 0.15s;
}
.signal-item:hover { border-color: #334155; }
.signal-marker {
  width: 4px;
  border-radius: 2px;
  flex-shrink: 0;
}
.marker-critical { background: #ef4444; }
.marker-warning { background: #f59e0b; }
.marker-info { background: #60a5fa; }
.marker-success { background: #22c55e; }
.signal-body { flex: 1; min-width: 0; }
.signal-head {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.signal-title { font-weight: 600; font-size: 0.9rem; }
.signal-time { font-size: 0.75rem; color: #64748b; white-space: nowrap; }
.signal-msg { font-size: 0.85rem; color: #cbd5e1; }
.signal-action { display: inline-block; margin-top: 0.3rem; font-size: 0.8rem; color: #60a5fa; border: 1px solid #334155; border-radius: 4px; padding: 0.15rem 0.5rem; }
.muted-state { color: #64748b; font-size: 0.85rem; text-align: center; padding: 2rem; }

/* ── Badges ─────────────────────────────────────────────────── */
.badge {
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
}
.badge-danger { background: rgba(239,68,68,0.15); color: #ef4444; }
.badge-ok { background: rgba(34,197,94,0.15); color: #22c55e; }
.badge-warning { background: rgba(245,158,11,0.15); color: #f59e0b; }
.badge-info { background: rgba(96,165,250,0.15); color: #60a5fa; }

/* ── Footer ─────────────────────────────────────────────────── */
.indo-footer {
  text-align: center;
  font-size: 0.8rem;
  color: #475569;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid #1e293b;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 600px) {
  .composite-hero { flex-direction: column; gap: 1rem; }
  .section-header { flex-direction: column; align-items: flex-start; }
  .macro-grid { grid-template-columns: 1fr 1fr; }
  .crypto-grid { grid-template-columns: 1fr; }
}
</style>
