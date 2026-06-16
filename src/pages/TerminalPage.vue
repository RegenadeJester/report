<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import { apiGet } from '../lib/api'
import { useRuntimeSettings } from '../stores/useRuntimeSettings'
import MiniSparkline from '../components/MiniSparkline.vue'

const lines = ref([])
const alerts = ref([])
const { dataSaver } = useRuntimeSettings()
let timer = null
let stream = null

const topUp = computed(() => [...lines.value].sort((a, b) => b.change_percent - a.change_percent).slice(0, 6))
const topDown = computed(() => [...lines.value].sort((a, b) => a.change_percent - b.change_percent).slice(0, 6))
const cryptoBoard = computed(() => lines.value.filter((x) => x.market === 'CRYPTO').slice(0, 8))
const idxBoard = computed(() => lines.value.filter((x) => x.market === 'IDX').slice(0, 10))
const indexBoard = computed(() => lines.value.filter((x) => x.category === 'index').slice(0, 8))
const forexBoard = computed(() => lines.value.filter((x) => x.market === 'FOREX').slice(0, 8))

async function load() {
  if (document.hidden) return
  const overview = await apiGet('/api/overview')
  const alertData = await apiGet('/api/alerts/live')
  lines.value = overview.assets || []
  alerts.value = alertData.alerts || []
}

function connectStream() {
  if (stream) stream.close()
  if (document.hidden) return
  if (dataSaver.value) return
  stream = new EventSource(`/api/overview/stream`)
  stream.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (Array.isArray(data.assets)) lines.value = data.assets
    } catch {}
  }
}

function handleVisibility() {
  if (!document.hidden) {
    load()
    connectStream()
  } else if (stream) {
    stream.close()
    stream = null
  }
}

onMounted(async () => {
  await load()
  connectStream()
  timer = setInterval(load, dataSaver.value ? 45000 : 30000)
  document.addEventListener('visibilitychange', handleVisibility)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (stream) stream.close()
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <section class="panel terminal-page bloom-shell">
    <div class="terminal-head bloom-head">
      <div>
        <small class="terminal-kicker">MARKET ORCA TERMINAL</small>
        <h2>Live Market Board</h2>
      </div>
      <button class="refresh-btn bloom-refresh" @click="load">Refresh</button>
    </div>

    <div class="bloom-ribbon">
      <span v-for="item in lines.slice(0, 14)" :key="item.slug" :class="item.change_percent >= 0 ? 'up' : 'down'">
        {{ item.symbol }} {{ item.price }} ({{ item.change_percent }}%)
      </span>
    </div>

    <!-- ═══ TradingView Widget Embed ═════════════════════════ -->
    <div class="panel" role="region" aria-label="TradingView chart widget">
      <h3>📈 TradingView — Market Overview</h3>
      <div class="tv-widget-wrap">
        <iframe
          src="https://s.tradingview.com/widgetembed/?frameElementId=tradingview_abc123&symbol=CRYPTOCAP:BTC&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=%5B%5D&theme=dark&style=1&timezone=Asia%2FJakarta&withdateranges=1&showpopupbutton=1&hotlist=1&hideideas=1&studies_overrides=%7B%7D&locale=en"
          title="TradingView Market Overview"
          allowfullscreen
          loading="lazy"
          referrerpolicy="no-referrer"
          aria-label="TradingView chart — pasar saham, crypto, forex"
        ></iframe>
      </div>
      <p style="color:var(--muted);font-size:11px;margin-top:4px">
        <a href="https://www.tradingview.com/" target="_blank" rel="noopener" style="color:var(--accent)">TradingView</a> —
        Pilih simbol untuk chart interaktif
      </p>
    </div>

    <div class="terminal-stats bloom-stats">
      <div class="panel nested bloom-panel">
        <h3>Top Gainers</h3>
        <article v-for="item in topUp" :key="item.slug" class="terminal-card bloom-card">
          <div class="terminal-row"><strong>{{ item.symbol }}</strong><small>{{ item.market }}</small></div>
          <MiniSparkline :points="item.sparkline || []" :positive="true" />
          <div class="terminal-row"><span>{{ item.name }}</span><b class="up">{{ item.change_percent }}%</b></div>
        </article>
      </div>
      <div class="panel nested bloom-panel">
        <h3>Top Losers</h3>
        <article v-for="item in topDown" :key="item.slug" class="terminal-card bloom-card">
          <div class="terminal-row"><strong>{{ item.symbol }}</strong><small>{{ item.market }}</small></div>
          <MiniSparkline :points="item.sparkline || []" :positive="false" />
          <div class="terminal-row"><span>{{ item.name }}</span><b class="down">{{ item.change_percent }}%</b></div>
        </article>
      </div>
    </div>

    <div class="terminal-split bloom-main">
      <div class="terminal-grid bloom-grid">
        <div class="panel nested bloom-panel">
          <h3>IHSG / IDX Indices</h3>
          <article v-for="item in indexBoard" :key="item.slug" class="terminal-card bloom-card">
            <div class="terminal-row"><strong>{{ item.symbol }}</strong><small>{{ item.provider || 'live' }}</small></div>
            <MiniSparkline :points="item.sparkline || []" :positive="item.change_percent >= 0" />
            <div class="terminal-row"><span>{{ item.name }}</span><b :class="item.change_percent >= 0 ? 'up' : 'down'">{{ item.change_percent }}%</b></div>
            <div class="terminal-row"><code>{{ item.price }}</code><small>{{ item.market }}</small></div>
          </article>
        </div>
        <div class="panel nested bloom-panel">
          <h3>IDX Board</h3>
          <article v-for="item in idxBoard" :key="item.slug" class="terminal-card bloom-card">
            <div class="terminal-row"><strong>{{ item.symbol }}</strong><small>{{ item.provider || 'live' }}</small></div>
            <MiniSparkline :points="item.sparkline || []" :positive="item.change_percent >= 0" />
            <div class="terminal-row"><span>{{ item.name }}</span><b :class="item.change_percent >= 0 ? 'up' : 'down'">{{ item.change_percent }}%</b></div>
            <div class="terminal-row"><code>{{ item.price }}</code><small>{{ item.market }}</small></div>
          </article>
        </div>
        <div class="panel nested bloom-panel">
          <h3>Crypto Board</h3>
          <article v-for="item in cryptoBoard" :key="item.slug" class="terminal-card bloom-card">
            <div class="terminal-row"><strong>{{ item.symbol }}</strong><small>{{ item.provider || 'live' }}</small></div>
            <MiniSparkline :points="item.sparkline || []" :positive="item.change_percent >= 0" />
            <div class="terminal-row"><span>{{ item.name }}</span><b :class="item.change_percent >= 0 ? 'up' : 'down'">{{ item.change_percent }}%</b></div>
            <div class="terminal-row"><code>{{ item.price }}</code><small>{{ item.market }}</small></div>
          </article>
        </div>
        <div class="panel nested bloom-panel">
          <h3>Forex Board (IDR)</h3>
          <article v-for="item in forexBoard" :key="item.slug" class="terminal-card bloom-card">
            <div class="terminal-row"><strong>{{ item.symbol }}</strong><small>{{ item.provider || 'live' }}</small></div>
            <MiniSparkline :points="item.sparkline || []" :positive="item.change_percent >= 0" />
            <div class="terminal-row"><span>{{ item.name }}</span><b :class="item.change_percent >= 0 ? 'up' : 'down'">{{ item.change_percent }}%</b></div>
            <div class="terminal-row"><code>{{ item.price }}</code><small>{{ item.market }}</small></div>
          </article>
        </div>
      </div>
      <div class="terminal-alerts bloom-alerts">
        <h3>Alert Feed</h3>
        <article v-for="alert in alerts" :key="alert.id" class="news-card bloom-alert-card">
          <small>{{ alert.asset_slug }}</small>
          <strong>{{ alert.title }}</strong>
          <p>{{ alert.message }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
