<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, computed } from 'vue'
import { apiGet, apiPost } from '../lib/api'

// ── State ─────────────────────────────────────────────────────
const market = ref('crypto')
const timeframe = ref('D')
const symbol = ref('BTCUSDT')
const symbolInput = ref('BTCUSDT')
const loading = ref(true)
const chartLoading = ref(false)
const techLoading = ref(false)

// Screener
const screener = ref(null)
const screenerSort = ref('market_cap_basic')
const screenerOrder = ref('desc')

// Chart
const chartData = ref(null)
const chartContainer = ref(null)
let chart = null
let candleSeries = null
let volumeSeries = null

// Technical
const technical = ref(null)
const techExpanded = ref(true)

// News
const newsData = ref(null)
const newsLoading = ref(false)

// Watchlist
const watchlist = ref([])

// ── Market tabs ──────────────────────────────────────────────
const markets = [
  { key: 'crypto', label: 'Crypto', icon: '₿' },
  { key: 'america', label: 'US Stocks', icon: '🇺🇸' },
  { key: 'forex', label: 'Forex', icon: '💱' },
  { key: 'indonesia', label: 'Indonesia', icon: '🇮🇩' }
]
const timeframes = [
  { key: '1', label: '1m' },
  { key: '5', label: '5m' },
  { key: '15', label: '15m' },
  { key: '60', label: '1h' },
  { key: '240', label: '4h' },
  { key: 'D', label: '1D' },
  { key: 'W', label: '1W' },
  { key: 'M', label: '1M' }
]

// ── Computed ─────────────────────────────────────────────────
const rsiColor = computed(() => {
  const r = technical.value?.indicators?.rsi
  if (r == null) return 'var(--muted)'
  if (r > 70) return '#fb7185'
  if (r < 30) return '#4ade80'
  return '#fafafa'
})

const recClass = computed(() => {
  const r = technical.value?.recommendation
  if (r === 'BUY') return 'rec-buy'
  if (r === 'SELL') return 'rec-sell'
  return 'rec-neutral'
})

// ── Load functions ───────────────────────────────────────────
async function loadScreener() {
  try {
    screener.value = await apiGet(`/api/tradingview/screener?market=${market.value}&sortBy=${screenerSort.value}&sortOrder=${screenerOrder.value}&limit=40`)
  } catch (e) { console.error('screener', e) }
}

async function loadChart() {
  chartLoading.value = true
  try {
    const data = await apiGet(`/api/tradingview/chart/${encodeURIComponent(symbol.value)}?timeframe=${timeframe.value}`)
    chartData.value = data
    await nextTick()
    renderChart(data.bars || [])
  } catch (e) { console.error('chart', e) }
  chartLoading.value = false
}

async function loadTechnical() {
  techLoading.value = true
  try {
    technical.value = await apiGet(`/api/tradingview/technical/${encodeURIComponent(symbol.value)}?timeframe=${timeframe.value}`)
  } catch (e) { console.error('technical', e) }
  techLoading.value = false
}

async function loadNews() {
  newsLoading.value = true
  try {
    newsData.value = await apiGet(`/api/tradingview/news/${encodeURIComponent(symbol.value)}?limit=12`)
  } catch (e) { console.error('news', e) }
  newsLoading.value = false
}

async function loadWatchlist() {
  try {
    const data = await apiGet('/api/watchlist')
    watchlist.value = data.items || []
  } catch {}
}

async function loadAll() {
  loading.value = true
  await Promise.all([loadScreener(), loadChart(), loadTechnical(), loadNews(), loadWatchlist()])
  loading.value = false
}

function searchSymbol() {
  if (!symbolInput.value.trim()) return
  symbol.value = symbolInput.value.trim().toUpperCase()
  loadChart()
  loadTechnical()
  loadNews()
}

function selectSymbol(s) {
  symbol.value = s
  symbolInput.value = s
  loadChart()
  loadTechnical()
  loadNews()
}

// ── Lightweight-charts renderer ──────────────────────────────
function renderChart(bars) {
  if (!chartContainer.value || !bars?.length) return

  // Destroy existing
  if (chart) {
    try { chart.remove() } catch {}
    chart = null
  }

  import('lightweight-charts').then(({ createChart, CandlestickSeries, HistogramSeries }) => {
    if (!chartContainer.value) return
    chart = createChart(chartContainer.value, {
      width: chartContainer.value.clientWidth,
      height: chartContainer.value.clientHeight || 420,
      layout: { background: { color: '#18181b' }, textColor: '#a1a1aa', fontFamily: 'Inter, system-ui, sans-serif' },
      grid: { vertLines: { color: '#27272a' }, horzLines: { color: '#27272a' } },
      crosshair: { mode: 0 },
      rightPriceScale: { borderColor: '#3f3f46' },
      timeScale: { borderColor: '#3f3f46', timeVisible: timeframe.value !== 'D' && timeframe.value !== 'W' && timeframe.value !== 'M' },
    })

    candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#4ade80', downColor: '#fb7185', borderDownColor: '#fb7185', borderUpColor: '#4ade80',
      wickDownColor: '#fb7185', wickUpColor: '#4ade80'
    })

    const candleData = bars.map(b => ({
      time: b.time,
      open: b.open,
      high: b.high,
      low: b.low,
      close: b.close
    }))
    candleSeries.setData(candleData)

    volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol'
    })
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })
    const volData = bars.map(b => ({
      time: b.time,
      value: b.volume || 0,
      color: b.close >= b.open ? 'rgba(74,222,128,0.3)' : 'rgba(251,113,133,0.3)'
    }))
    volumeSeries.setData(volData)

    chart.timeScale().fitContent()

    // Handle resize
    const ro = new ResizeObserver(() => {
      if (chartContainer.value && chart) {
        chart.applyOptions({ width: chartContainer.value.clientWidth, height: chartContainer.value.clientHeight || 420 })
      }
    })
    ro.observe(chartContainer.value)
    chart._ro = ro
  }).catch(e => console.error('chart-init', e))
}

function formatNum(n, dec = 2) {
  if (n == null || isNaN(n)) return '-'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return Number(n).toFixed(dec)
}

function formatPct(n) {
  if (n == null || isNaN(n)) return '-'
  return (n >= 0 ? '+' : '') + Number(n).toFixed(2) + '%'
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(() => { loadAll() })
onBeforeUnmount(() => { if (chart) { try { chart._ro?.disconnect(); chart.remove() } catch {} } })

// Re-load on market change
watch(market, () => { loadScreener() })
</script>

<template>
  <main class="tv-page">
    <!-- ── Top Bar ─────────────────────────────────────────── -->
    <header class="tv-header">
      <div class="tv-header-left">
        <span class="tv-logo">📊 TradingView</span>
        <span class="tv-subtitle">Market Scanner + Charts + Technicals</span>
      </div>
      <div class="tv-search">
        <input v-model="symbolInput"
               @keyup.enter="searchSymbol"
               placeholder="BTCUSDT, AAPL, EURUSD, ^JKSE, MYRIDR=X..."
               class="tv-search-input" />
        <button @click="searchSymbol" class="tv-btn-accent">Analyze</button>
      </div>
    </header>

    <!-- ── Market Tabs ─────────────────────────────────────── -->
    <nav class="tv-tabs">
      <button v-for="m in markets"
              :key="m.key"
              :class="['tv-tab', market === m.key && 'active']"
              @click="market = m.key">
        <span>{{ m.icon }}</span> {{ m.label }}
      </button>
      <div class="tv-tabs-right">
        <span class="tv-tf-label">Timeframe:</span>
        <button v-for="tf in timeframes"
                :key="tf.key"
                :class="['tv-tf-btn', timeframe === tf.key && 'active']"
                @click="timeframe = tf.key; loadChart(); loadTechnical()">
          {{ tf.label }}
        </button>
      </div>
    </nav>

    <!-- ── Main Grid ───────────────────────────────────────── -->
    <div class="tv-grid">

      <!-- Watchlist Sidebar -->
      <aside class="tv-watchlist">
        <div class="tv-panel-header">⭐ Watchlist</div>
        <div v-if="watchlist.length === 0" class="tv-empty">No watchlist items</div>
        <div v-for="item in watchlist" :key="item.slug"
             class="tv-wl-item"
             @click="selectSymbol(item.symbol)">
          <div class="tv-wl-sym">{{ item.symbol }}</div>
          <div class="tv-wl-name">{{ item.name }}</div>
          <div class="tv-wl-price" :class="(item.change_percent||0)>=0?'up':'down'">
            {{ item.price ?? '-' }}
            <span>{{ formatPct(item.change_percent) }}</span>
          </div>
        </div>

        <!-- Quick Market: IHSG & IDR Forex -->
        <div class="tv-panel-header" style="margin-top:16px">🇮🇩 Market Watch</div>
        <div class="tv-quick-grid">
          <button class="tv-quick-btn active-ihsg" @click="selectSymbol('^JKSE')">
            <span class="tv-quick-sym">^JKSE</span><span class="tv-quick-name">IHSG</span>
          </button>
          <button class="tv-quick-btn" @click="selectSymbol('IDR=X')">
            <span class="tv-quick-sym">USD/IDR</span><span class="tv-quick-name">Rupiah</span>
          </button>
          <button class="tv-quick-btn" @click="selectSymbol('MYRIDR=X')">
            <span class="tv-quick-sym">MYR/IDR</span><span class="tv-quick-name">Ringgit</span>
          </button>
          <button class="tv-quick-btn" @click="selectSymbol('SGDIDR=X')">
            <span class="tv-quick-sym">SGD/IDR</span><span class="tv-quick-name">SingDollar</span>
          </button>
        </div>

        <!-- Quick Screener -->
        <div class="tv-panel-header" style="margin-top:16px">🔥 Top {{ market === 'crypto' ? 'Crypto' : market === 'america' ? 'US' : market === 'indonesia' ? 'Indonesia' : 'Forex' }}</div>
        <div v-if="screener?.data" class="tv-wl-list">
          <div v-for="row in (screener.data || []).slice(0, 20)" :key="row.name || row.description"
               class="tv-wl-item"
               @click="selectSymbol(row.name)">
            <div class="tv-wl-sym">{{ row.description || row.name }}</div>
            <div class="tv-wl-price" :class="(row.change||0)>=0?'up':'down'">
              {{ row.close != null ? formatNum(row.close) : '-' }}
              <span>{{ formatPct(row.change) }}</span>
            </div>
          </div>
        </div>
        <div v-else class="tv-empty">Loading screener...</div>
      </aside>

      <!-- Center: Chart + Technicals -->
      <div class="tv-center">
        <!-- Chart -->
        <div class="tv-chart-box">
          <div class="tv-chart-header">
            <div>
              <span class="tv-chart-sym">{{ symbol }}</span>
              <span v-if="chartData?.bars?.length"
                    class="tv-chart-price"
                    :class="(chartData.bars.at(-1)?.close - chartData.bars.at(-2)?.close)>=0?'up':'down'">
                {{ formatNum(chartData.bars.at(-1)?.close) }}
                <small>{{ formatPct(((chartData.bars.at(-1)?.close - chartData.bars.at(-2)?.close) / (chartData.bars.at(-2)?.close || 1)) * 100) }}</small>
              </span>
            </div>
            <div class="tv-chart-info">
              <span v-if="chartData">Source: {{ chartData.source }} · {{ chartData.count }} bars</span>
              <span v-if="chartLoading" class="tv-loading-dot">Loading...</span>
            </div>
          </div>
          <div ref="chartContainer" class="tv-chart-canvas"></div>
          <div v-if="chartLoading" class="tv-chart-overlay">Fetching chart data...</div>
        </div>

        <!-- Technical Analysis Panel -->
        <div class="tv-tech-panel">
          <div class="tv-panel-header tv-panel-row" @click="techExpanded = !techExpanded">
            <span>📈 Technical Analysis</span>
            <span v-if="technical" :class="['tv-rec-badge', recClass]">
              {{ technical.recommendation }}
            </span>
            <span class="tv-chevron" :class="techExpanded && 'open'">▼</span>
          </div>
          <div v-if="techExpanded && technical?.indicators" class="tv-tech-grid">
            <div class="tv-tech-card">
              <div class="tv-tech-label">RSI (14)</div>
              <div class="tv-tech-value" :style="{ color: rsiColor }">
                {{ technical.indicators.rsi != null ? technical.indicators.rsi.toFixed(1) : '-' }}
              </div>
              <div class="tv-tech-sub">30 oversold · 70 overbought</div>
              <div class="tv-rsi-bar">
                <div class="tv-rsi-fill" :style="{ width: Math.min(100, (technical.indicators.rsi||50)) + '%' }"
                     :class="(technical.indicators.rsi||50) > 70 ? 'overbought' : (technical.indicators.rsi||50) < 30 ? 'oversold' : 'neutral'">
                </div>
                <div class="tv-rsi-markers">
                  <span>0</span><span>30</span><span>70</span><span>100</span>
                </div>
              </div>
            </div>
            <div class="tv-tech-card">
              <div class="tv-tech-label">MACD</div>
              <div class="tv-tech-value">{{ technical.indicators.macd != null ? technical.indicators.macd.toFixed(4) : '-' }}</div>
              <div class="tv-tech-sub">Signal: {{ technical.indicators.macd_signal != null ? technical.indicators.macd_signal.toFixed(4) : '-' }}</div>
              <div :class="technical.indicators.macd > technical.indicators.macd_signal ? 'tv-dot-bull' : 'tv-dot-bear'">
                {{ technical.indicators.macd > technical.indicators.macd_signal ? '▲ Bullish Cross' : '▼ Bearish Cross' }}
              </div>
            </div>
            <div class="tv-tech-card">
              <div class="tv-tech-label">SMA 20 / 50 / 200</div>
              <div class="tv-tech-row">
                <span class="tv-sma-20">20: {{ formatNum(technical.indicators.sma_20) }}</span>
                <span class="tv-sma-50">50: {{ formatNum(technical.indicators.sma_50) }}</span>
                <span class="tv-sma-200">200: {{ formatNum(technical.indicators.sma_200) }}</span>
              </div>
            </div>
            <div class="tv-tech-card">
              <div class="tv-tech-label">Bollinger Bands</div>
              <div class="tv-tech-row">
                <span class="tv-up">Upper: {{ formatNum(technical.indicators.bollinger_upper) }}</span>
                <span class="tv-mid">Mid: {{ formatNum(technical.indicators.bollinger_middle) }}</span>
                <span class="tv-down">Lower: {{ formatNum(technical.indicators.bollinger_lower) }}</span>
              </div>
            </div>
            <div class="tv-tech-card">
              <div class="tv-tech-label">ATR (14)</div>
              <div class="tv-tech-value">{{ technical.indicators.atr_14 != null ? formatNum(technical.indicators.atr_14) : '-' }}</div>
              <div class="tv-tech-sub">Volatility measure</div>
            </div>
            <div class="tv-tech-card">
              <div class="tv-tech-label">VWAP</div>
              <div class="tv-tech-value">{{ technical.indicators.vwap != null ? formatNum(technical.indicators.vwap) : '-' }}</div>
              <div class="tv-tech-sub">Volume-weighted avg</div>
            </div>
          </div>

          <!-- Signals -->
          <div v-if="techExpanded && technical?.signals?.length" class="tv-signals">
            <div class="tv-panel-subheader">⚡ Signals</div>
            <div class="tv-signals-grid">
              <div v-for="(sig, idx) in technical.signals" :key="idx"
                   :class="['tv-signal',
                     ['BULLISH','OVERSOLD','ABOVE','LOWER_BAND','BUY'].includes(sig.signal) ? 'bull' :
                     ['BEARISH','OVERBOUGHT','BELOW','UPPER_BAND','SELL'].includes(sig.signal) ? 'bear' : 'neutral']">
                <span class="tv-sig-ind">{{ sig.indicator }}</span>
                <span class="tv-sig-sig">{{ sig.signal }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Screener Table -->
      <div class="tv-screener">
        <div class="tv-panel-header tv-panel-row">
          <span>🔍 Market Screener — {{ market }}</span>
          <button class="tv-btn-sm" @click="loadScreener">↻ Refresh</button>
        </div>
        <div v-if="screener?.data" class="tv-table-wrap">
          <table class="tv-table">
            <thead>
              <tr>
                <th @click="screenerSort='name'; screenerOrder=screenerOrder==='asc'?'desc':'asc'; loadScreener()" class="sortable">Name</th>
                <th @click="screenerSort='close'; screenerOrder=screenerOrder==='asc'?'desc':'asc'; loadScreener()" class="sortable">Price</th>
                <th @click="screenerSort='change'; screenerOrder=screenerOrder==='asc'?'desc':'asc'; loadScreener()" class="sortable">Change</th>
                <th @click="screenerSort='volume'; screenerOrder=screenerOrder==='asc'?'desc':'asc'; loadScreener()" class="sortable">Volume</th>
                <th @click="screenerSort='market_cap_basic'; screenerOrder=screenerOrder==='asc'?'desc':'asc'; loadScreener()" class="sortable">Mkt Cap</th>
                <th @click="screenerSort='Perf.1M'; screenerOrder=screenerOrder==='asc'?'desc':'asc'; loadScreener()" class="sortable">1M</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, idx) in (screener.data || [])" :key="idx"
                  @click="selectSymbol(row.name)"
                  :class="symbol === row.name && 'selected'">
                <td class="tv-td-name">
                  <div class="tv-td-sym">{{ row.description || row.name }}</div>
                  <div class="tv-td-sub">{{ row.name }}</div>
                </td>
                <td>{{ row.close != null ? formatNum(row.close) : '-' }}</td>
                <td :class="(row.change||0)>=0?'up':'down'">{{ formatPct(row.change) }}</td>
                <td>{{ row.volume != null ? formatNum(row.volume) : '-' }}</td>
                <td>{{ row.market_cap_basic != null ? formatNum(row.market_cap_basic, 0) : '-' }}</td>
                <td :class="(row['Perf.1M']||0)>=0?'up':'down'">{{ formatPct(row['Perf.1M']) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="tv-empty tv-screener-loading">
          <span v-if="loading">Loading market data...</span>
          <span v-else>No data available</span>
        </div>
      </div>
    </div>

    <!-- ── News Feed ───────────────────────────────────────── -->
    <section class="tv-news">
      <div class="tv-panel-header tv-panel-row">
        <span>📰 Latest News — {{ symbol }}</span>
        <button class="tv-btn-sm" @click="loadNews">↻ Refresh</button>
      </div>
      <div v-if="newsData?.items?.length" class="tv-news-grid">
        <a v-for="(item, idx) in newsData.items" :key="idx"
           :href="item.url"
           target="_blank"
           rel="noopener"
           class="tv-news-card">
          <img v-if="item.image" :src="item.image" alt="" class="tv-news-img" loading="lazy" />
          <div class="tv-news-body">
            <span class="tv-news-source">{{ item.source }} · {{ timeAgo(item.publishedAt) }}</span>
            <h4>{{ item.title }}</h4>
            <p v-if="item.body">{{ item.body }}</p>
          </div>
        </a>
      </div>
      <div v-else class="tv-empty">
        <span v-if="newsLoading">Loading news...</span>
        <span v-else>No news available</span>
      </div>
    </section>
  </main>
</template>

<style scoped>
/* ── Page Layout ─────────────────────────────────────────────── */
.tv-page {
  min-height: 100vh;
  background: #18181b;
  color: #fafafa;
  padding: 0 0 40px;
  font-family: 'Inter', 'SF Pro', system-ui, sans-serif;
}

/* ── Header ──────────────────────────────────────────────────── */
.tv-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #0f0f12;
  border-bottom: 1px solid #27272a;
  gap: 16px;
  flex-wrap: wrap;
}
.tv-header-left { display: flex; align-items: center; gap: 12px }
.tv-logo { font-size: 18px; font-weight: 800; color: #f97316; letter-spacing: -0.02em }
.tv-subtitle { color: #71717a; font-size: 13px }
.tv-search { display: flex; gap: 8px }
.tv-search-input {
  background: #27272a;
  border: 1px solid #3f3f46;
  color: #fafafa;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  width: 220px;
  outline: none;
  transition: border-color 0.15s;
}
.tv-search-input:focus { border-color: #f97316 }
.tv-search-input::placeholder { color: #71717a }
.tv-btn-accent {
  background: #f97316;
  color: #fff;
  border: none;
  padding: 8px 18px;
  border-radius: 6px;
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.15s;
}
.tv-btn-accent:hover { background: #ea580c }

/* ── Tabs ────────────────────────────────────────────────────── */
.tv-tabs {
  display: flex;
  align-items: center;
  padding: 6px 20px;
  background: #18181b;
  border-bottom: 1px solid #27272a;
  gap: 4px;
  flex-wrap: wrap;
}
.tv-tab {
  background: transparent;
  border: 1px solid transparent;
  color: #a1a1aa;
  padding: 7px 14px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s;
}
.tv-tab:hover { background: #27272a; color: #fafafa }
.tv-tab.active { background: #27272a; border-color: #f97316; color: #f97316 }
.tv-tabs-right { margin-left: auto; display: flex; align-items: center; gap: 4px }
.tv-tf-label { color: #71717a; font-size: 12px; font-weight: 600; margin-right: 6px }
.tv-tf-btn {
  background: transparent;
  border: 1px solid transparent;
  color: #71717a;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.12s;
}
.tv-tf-btn:hover { color: #fafafa; background: #27272a }
.tv-tf-btn.active { color: #f97316; border-color: #f97316; background: #1c1917 }

/* ── Grid ────────────────────────────────────────────────────── */
.tv-grid {
  display: grid;
  grid-template-columns: 260px 1fr;
  grid-template-rows: auto auto;
  gap: 0;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 16px;
}

/* ── Watchlist Sidebar ───────────────────────────────────────── */
.tv-watchlist {
  grid-row: 1 / 3;
  background: #0f0f12;
  border: 1px solid #27272a;
  border-radius: 0 0 0 10px;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
  padding: 0 0 12px;
}
.tv-panel-header {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #a1a1aa;
  border-bottom: 1px solid #27272a;
  position: sticky;
  top: 0;
  background: #0f0f12;
  z-index: 2;
}
.tv-panel-row { display: flex; justify-content: space-between; align-items: center; cursor: pointer }
.tv-wl-item {
  padding: 8px 14px;
  cursor: pointer;
  border-bottom: 1px solid #1f1f23;
  transition: background 0.1s;
}
.tv-wl-item:hover { background: #1a1a1e }
.tv-wl-sym { font-size: 13px; font-weight: 700; color: #fafafa }
.tv-wl-name { font-size: 11px; color: #71717a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px }
.tv-wl-price { font-size: 13px; font-weight: 600; margin-top: 2px }
.tv-wl-list { padding: 0 }
.tv-empty { padding: 20px 14px; color: #52525b; font-size: 13px; text-align: center }

/* ── Chart ───────────────────────────────────────────────────── */
.tv-center { min-width: 0; display: flex; flex-direction: column }
.tv-chart-box {
  position: relative;
  background: #0f0f12;
  border: 1px solid #27272a;
  border-radius: 0 0 0 0;
}
.tv-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #27272a;
}
.tv-chart-sym { font-size: 20px; font-weight: 800; color: #fafafa; margin-right: 12px }
.tv-chart-price { font-size: 20px; font-weight: 700 }
.tv-chart-price small { font-size: 13px; font-weight: 600; margin-left: 6px }
.tv-chart-info { font-size: 11px; color: #52525b }
.tv-chart-canvas { width: 100%; height: 420px }
.tv-chart-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15,15,18,0.8);
  color: #a1a1aa;
  font-size: 14px;
  font-weight: 600;
  pointer-events: none;
}

/* ── Technical Panel ─────────────────────────────────────────── */
.tv-tech-panel {
  background: #0f0f12;
  border: 1px solid #27272a;
  border-top: none;
  margin-bottom: 0;
}
.tv-rec-badge {
  padding: 3px 10px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.05em;
}
.rec-buy { background: rgba(74,222,128,0.15); color: #4ade80 }
.rec-sell { background: rgba(251,113,133,0.15); color: #fb7185 }
.rec-neutral { background: rgba(161,161,170,0.15); color: #a1a1aa }
.tv-chevron { font-size: 10px; transition: transform 0.15s; margin-left: 8px }
.tv-chevron.open { transform: rotate(0deg) }
.tv-tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1px;
  padding: 0;
}
.tv-tech-card {
  padding: 14px;
  background: #18181b;
  border-right: 1px solid #27272a;
  border-bottom: 1px solid #27272a;
}
.tv-tech-label { font-size: 11px; color: #71717a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em }
.tv-tech-value { font-size: 22px; font-weight: 800; margin: 4px 0 2px; font-variant-numeric: tabular-nums }
.tv-tech-sub { font-size: 11px; color: #52525b }
.tv-tech-row { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap }
.tv-tech-row span { font-size: 13px; font-weight: 600 }
.tv-sma-20 { color: #60a5fa }
.tv-sma-50 { color: #f59e0b }
.tv-sma-200 { color: #a78bfa }
.tv-up { color: #4ade80 }
.tv-mid { color: #a1a1aa }
.tv-down { color: #fb7185 }
.tv-dot-bull { color: #4ade80; font-size: 12px; font-weight: 700; margin-top: 6px }
.tv-dot-bear { color: #fb7185; font-size: 12px; font-weight: 700; margin-top: 6px }

/* RSI bar */
.tv-rsi-bar { margin-top: 8px; position: relative }
.tv-rsi-fill { height: 6px; border-radius: 3px; transition: width 0.3s }
.tv-rsi-fill.overbought { background: #fb7185 }
.tv-rsi-fill.oversold { background: #4ade80 }
.tv-rsi-fill.neutral { background: #a1a1aa }
.tv-rsi-markers { display: flex; justify-content: space-between; font-size: 9px; color: #52525b; margin-top: 2px }

/* ── Signals ─────────────────────────────────────────────────── */
.tv-signals { border-top: 1px solid #27272a; padding: 10px 14px }
.tv-panel-subheader { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #71717a; margin-bottom: 8px }
.tv-signals-grid { display: flex; gap: 8px; flex-wrap: wrap }
.tv-signal {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 80px;
}
.tv-signal.bull { background: rgba(74,222,128,0.12); color: #4ade80; border: 1px solid rgba(74,222,128,0.25) }
.tv-signal.bear { background: rgba(251,113,133,0.12); color: #fb7185; border: 1px solid rgba(251,113,133,0.25) }
.tv-signal.neutral { background: rgba(161,161,170,0.08); color: #a1a1aa; border: 1px solid rgba(161,161,170,0.15) }
.tv-sig-ind { font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.7 }
.tv-sig-sig { font-size: 12px; font-weight: 800 }

/* ── Screener Table ──────────────────────────────────────────── */
.tv-screener {
  grid-column: 2;
  grid-row: 1 / 3;
  background: #0f0f12;
  border: 1px solid #27272a;
  border-radius: 0 0 10px 0;
  margin-left: 0;
  max-height: calc(100vh - 140px);
  overflow-y: auto;
}
.tv-table-wrap { overflow-x: auto }
.tv-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.tv-table th {
  text-align: left;
  padding: 10px 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #71717a;
  border-bottom: 1px solid #27272a;
  position: sticky;
  top: 40px;
  background: #0f0f12;
  z-index: 1;
  white-space: nowrap;
}
.tv-table th.sortable { cursor: pointer; user-select: none }
.tv-table th.sortable:hover { color: #f97316 }
.tv-table td {
  padding: 9px 12px;
  border-bottom: 1px solid #1f1f23;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.tv-table tr { cursor: pointer; transition: background 0.1s }
.tv-table tr:hover { background: #1a1a1e }
.tv-table tr.selected { background: rgba(249,115,22,0.1); outline: 1px solid rgba(249,115,22,0.3) }
.tv-td-name { min-width: 120px }
.tv-td-sym { font-weight: 700; color: #fafafa }
.tv-td-sub { font-size: 11px; color: #52525b }
.tv-screener-loading { padding: 40px; text-align: center }

/* ── News ────────────────────────────────────────────────────── */
.tv-news {
  max-width: 1600px;
  margin: 16px auto 0;
  padding: 0 16px;
  background: #0f0f12;
  border: 1px solid #27272a;
  border-radius: 10px;
}
.tv-news-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1px;
}
.tv-news-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-bottom: 1px solid #1f1f23;
  color: inherit;
  text-decoration: none;
  transition: background 0.1s;
}
.tv-news-card:hover { background: #1a1a1e }
.tv-news-img {
  width: 80px;
  height: 60px;
  object-fit: cover;
  border-radius: 6px;
  flex-shrink: 0;
  background: #27272a;
}
.tv-news-body { min-width: 0 }
.tv-news-source { font-size: 10px; color: #f97316; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em }
.tv-news-body h4 {
  font-size: 13px;
  font-weight: 700;
  margin: 4px 0 2px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tv-news-body p {
  font-size: 12px;
  color: #71717a;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* ── Shared helpers ──────────────────────────────────────────── */
.up { color: #4ade80 }
.down { color: #fb7185 }
.tv-btn-sm {
  background: #27272a;
  color: #a1a1aa;
  border: 1px solid #3f3f46;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.12s;
}
.tv-btn-sm:hover { background: #3f3f46; color: #fafafa }
.tv-loading-dot {
  animation: pulse 1.5s infinite;
}
@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }

/* ── Quick Market Grid ─────────────────────────────────────── */
.tv-quick-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 8px 14px;
}
.tv-quick-btn {
  background: #1c1917;
  border: 1px solid #3f3f46;
  color: #fafafa;
  padding: 8px 6px;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition: all 0.12s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
}
.tv-quick-btn:hover { background: #27272a; border-color: #f97316 }
.tv-quick-sym { font-size: 12px; font-weight: 800; color: #f97316; line-height: 1.2 }
.tv-quick-name { font-size: 10px; color: #71717a }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .tv-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }
  .tv-watchlist { grid-row: auto; max-height: none; display: flex; flex-wrap: wrap; gap: 0 }
  .tv-watchlist .tv-panel-header { width: 100% }
  .tv-wl-item { flex: 0 0 50% }
  .tv-screener { grid-column: 1; grid-row: auto; max-height: none; margin-left: 0; border-radius: 0 0 10px 10px }
  .tv-center { min-width: 100% }
}
@media (max-width: 640px) {
  .tv-header { flex-direction: column; align-items: flex-start }
  .tv-search { width: 100% }
  .tv-search-input { flex: 1; width: auto }
  .tv-chart-canvas { height: 300px }
  .tv-wl-item { flex: 0 0 100% }
  .tv-tech-grid { grid-template-columns: 1fr }
  .tv-news-grid { grid-template-columns: 1fr }
}
</style>
