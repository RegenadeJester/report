<template>
  <div class="tv-widgets-root">
    <!-- Ticker Tape -->
    <div class="ticker-tape-section">
      <div class="section-label">📡 Live Market Ticker</div>
      <div class="ticker-container" v-if="loaded">
        <div :id="'ticker_tape'"></div>
      </div>
      <div v-else class="skeleton-bar"></div>
    </div>

    <!-- Loading skeleton -->
    <div v-if="!loaded" class="loading-grid">
      <div v-for="i in 12" :key="i" class="skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-sub"></div>
        <div class="skeleton-chart"></div>
      </div>
    </div>

    <!-- Widgets Grid -->
    <div v-else class="widgets-grid">
      <!-- IHSG -->
      <div class="widget-card featured">
        <div class="card-header">
          <span class="card-flag">🇮🇩</span>
          <span class="card-title">IHSG (JKSE)</span>
        </div>
        <div :id="'tv_jkse'" class="chart-container"></div>
      </div>

      <!-- US Markets -->
      <div class="widget-card us">
        <div class="card-header">
          <span class="card-flag">🇺🇸</span>
          <span class="card-title">US Markets</span>
        </div>
        <div class="dual-chart">
          <div :id="'tv_spy'" class="chart-half"></div>
          <div :id="'tv_qqq'" class="chart-half"></div>
        </div>
      </div>

      <!-- China -->
      <div class="widget-card china">
        <div class="card-header">
          <span class="card-flag">🇨🇳</span>
          <span class="card-title">Shanghai Composite</span>
        </div>
        <div :id="'tv_shcomp'" class="chart-container"></div>
      </div>

      <!-- Forex -->
      <div class="widget-card forex">
        <div class="card-header">
          <span class="card-flag">💱</span>
          <span class="card-title">Forex</span>
        </div>
        <div class="triple-chart">
          <div :id="'tv_dxy'" class="chart-third"></div>
          <div :id="'tv_eurusd'" class="chart-third"></div>
          <div :id="'tv_gbpusd'" class="chart-third"></div>
        </div>
      </div>

      <!-- Crypto -->
      <div class="widget-card crypto">
        <div class="card-header">
          <span class="card-flag">₿</span>
          <span class="card-title">Crypto</span>
        </div>
        <div class="triple-chart">
          <div :id="'tv_btcusdt'" class="chart-third"></div>
          <div :id="'tv_ethusdt'" class="chart-third"></div>
          <div :id="'tv_solusdt'" class="chart-third"></div>
        </div>
      </div>

      <!-- IDR Pairs -->
      <div class="widget-card idr">
        <div class="card-header">
          <span class="card-flag">🇮🇩</span>
          <span class="card-title">IDR Exchange Rates</span>
        </div>
        <div class="triple-chart">
          <div :id="'tv_usdidr'" class="chart-third"></div>
          <div :id="'tv_sgidr'" class="chart-third"></div>
          <div :id="'tv_myridr'" class="chart-third"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'

const loaded = ref(false)
const scriptEl = ref(null)

/* ── Widget definitions ── */
const miniCharts = [
  { id: 'tv_jkse',     symbol: 'JKSE',      exchange: 'IDX' },
  { id: 'tv_spy',      symbol: 'AMEX:SPY',   exchange: '' },
  { id: 'tv_qqq',      symbol: 'NASDAQ:QQQ', exchange: '' },
  { id: 'tv_shcomp',   symbol: 'SHCOMP',     exchange: 'SSE' },
  { id: 'tv_dxy',      symbol: 'TVC:DXY',    exchange: '' },
  { id: 'tv_eurusd',   symbol: 'FX_IDC:EURUSD', exchange: '' },
  { id: 'tv_gbpusd',   symbol: 'FX_IDC:GBPUSD', exchange: '' },
  { id: 'tv_btcusdt',  symbol: 'BINANCE:BTCUSDT', exchange: '' },
  { id: 'tv_ethusdt',  symbol: 'BINANCE:ETHUSDT', exchange: '' },
  { id: 'tv_solusdt',  symbol: 'BINANCE:SOLUSDT', exchange: '' },
  { id: 'tv_usdidr',   symbol: 'FX_IDC:USDIDR', exchange: '' },
  { id: 'tv_sgidr',    symbol: 'FX_IDC:SGDIDR', exchange: '' },
  { id: 'tv_myridr',   symbol: 'FX_IDC:MYRIDR', exchange: '' },
]

function widgetOpts(containerId, symbol) {
  return {
    autosize: true,
    symbol,
    interval: 'D',
    timezone: 'Asia/Jakarta',
    style: '1',
    locale: 'id_ID',
    theme: 'dark',
    toolbar_bg: '#1a1a2e',
    hide_top_toolbar: true,
    hide_side_toolbar: true,
    hide_legend: true,
    save_image: false,
    enable_publishing: false,
    allow_symbol_change: false,
    details: false,
    hotlist: false,
    calendar: false,
    container_id: containerId,
  }
}

function loadScript() {
  return new Promise((resolve, reject) => {
    if (window.TradingView) { resolve(); return }
    const s = document.createElement('script')
    s.src = 'https://s3.tradingview.com/tv.js'
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
    scriptEl.value = s
  })
}

let widgetInstances = []

function createWidgets() {
  miniCharts.forEach(cfg => {
    try {
      const w = new window.TradingView.widget(widgetOpts(cfg.id, cfg.symbol))
      widgetInstances.push(w)
    } catch (e) {
      console.warn(`TradingView widget init failed: ${cfg.id}`, e)
    }
  })
}

onMounted(async () => {
  try {
    await loadScript()
    await nextTick()
    loaded.value = true
    await nextTick()
    createWidgets()
    initTickerTape()
  } catch (e) {
    console.error('Failed to load TradingView SDK:', e)
  }
})

function initTickerTape() {
  if (!window.TradingView) return
  try {
    new window.TradingView.TickerTape({
      container_id: 'ticker_tape',
      symbols: [
        { proName: 'FOREXCOM:SPXUSD', title: 'S&P 500' },
        { proName: 'FOREXCOM:US30', title: 'Dow 30' },
        { proName: 'NASDAQ:NDX', title: 'Nasdaq 100' },
        { proName: 'AMEX:SPY', title: 'SPY' },
        { proName: 'NASDAQ:QQQ', title: 'QQQ' },
        { proName: 'IDX:JKSE', title: 'IHSG' },
        { proName: 'TVC:DXY', title: 'DXY' },
        { proName: 'FX_IDC:EURUSD', title: 'EUR/USD' },
        { proName: 'FX_IDC:GBPUSD', title: 'GBP/USD' },
        { proName: 'FX_IDC:USDIDR', title: 'USD/IDR' },
        { proName: 'FX_IDC:SGDIDR', title: 'SGD/IDR' },
        { proName: 'FX_IDC:MYRIDR', title: 'MYR/IDR' },
        { proName: 'BINANCE:BTCUSDT', title: 'BTC/USDT' },
        { proName: 'BINANCE:ETHUSDT', title: 'ETH/USDT' },
        { proName: 'BINANCE:SOLUSDT', title: 'SOL/USDT' },
        { proName: 'SHCOMP', title: 'Shanghai Comp' },
      ],
      colorTheme: 'dark',
      isTransparent: true,
      displayMode: 'regular',
      autosize: true,
      width: '100%',
      height: 56,
    })
  } catch (e) {
    console.warn('Ticker tape init failed:', e)
  }
}

onBeforeUnmount(() => {
  widgetInstances = []
})
</script>

<style scoped>
.tv-widgets-root {
  width: 100%;
  color: var(--ink, #e0e0e0);
  font-family: inherit;
}

/* ── Ticker Tape ── */
.ticker-tape-section {
  margin-bottom: 16px;
}
.section-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink, #aaa);
  opacity: 0.6;
  margin-bottom: 6px;
}
.ticker-container {
  border-radius: 8px;
  overflow: hidden;
  background: var(--panel, #1a1a2e);
  height: 56px;
}
.skeleton-bar {
  height: 56px;
  border-radius: 8px;
  background: linear-gradient(90deg, var(--panel, #1a1a2e) 25%, #252540 50%, var(--panel, #1a1a2e) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

/* ── Loading Grid ── */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.skeleton-card {
  border-radius: 10px;
  background: var(--panel, #1a1a2e);
  padding: 12px;
  min-height: 180px;
}
.skeleton-line {
  border-radius: 4px;
  background: linear-gradient(90deg, #252540 25%, #353560 50%, #252540 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
.skeleton-title { height: 14px; width: 60%; margin-bottom: 8px; }
.skeleton-sub { height: 10px; width: 40%; margin-bottom: 12px; }
.skeleton-chart {
  height: 100px;
  border-radius: 6px;
  background: linear-gradient(90deg, #252540 25%, #353560 50%, #252540 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Widgets Grid ── */
.widgets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.widget-card {
  border-radius: 10px;
  background: var(--panel, #1a1a2e);
  overflow: hidden;
  border: 1px solid var(--line, rgba(255,255,255,0.06));
  transition: border-color 0.2s;
}
.widget-card:hover {
  border-color: var(--accent, #6c5ce7);
}
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink, #e0e0e0);
}
.card-flag { font-size: 16px; }
.card-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

/* Chart containers */
.chart-container { height: 190px; }
.chart-half { height: 190px; flex: 1; min-width: 0; }
.chart-third { height: 150px; flex: 1; min-width: 0; }

.dual-chart {
  display: flex;
  gap: 0;
}
.triple-chart {
  display: flex;
  gap: 0;
}

/* Featured card wider */
.widget-card.featured {
  grid-column: span 1;
}

/* Responsive */
@media (max-width: 640px) {
  .widgets-grid {
    grid-template-columns: 1fr;
  }
  .dual-chart, .triple-chart {
    flex-direction: column;
  }
  .chart-half, .chart-third {
    height: 180px;
  }
}
</style>
