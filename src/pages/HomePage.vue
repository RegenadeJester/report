<script setup>
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { apiGet, apiPost, API_BASE } from '../lib/api'
import { usePreferences, loadFavorites } from '../stores/usePreferences'
import { useRuntimeSettings } from '../stores/useRuntimeSettings'
import { useSymbolSearch } from '../composables/useSymbolSearch'
import MiniSparkline from '../components/MiniSparkline.vue'
import AlertSummaryWidget from '../components/AlertSummaryWidget.vue'
import MarketStatusBar from '../components/MarketStatusBar.vue'

const router = useRouter()
const { favorites, toggleFavorite } = usePreferences()
const { dataSaver } = useRuntimeSettings()
const { results: searchResults, loading: searchLoading, search } = useSymbolSearch()
const assets = ref([])
const news = ref([])
const insights = ref(null)
const q = ref('')
const market = ref('')
const category = ref('')
const focusMode = ref('all')
const selectedSlug = ref('')
const loading = ref(true)
const importing = ref('')
const importSuccess = ref('')
let timer = null
let focusStream = null
let overviewStream = null

// Report history
const recentReports = ref([])
const reportsLoading = ref(true)

// Marquee data
const marqueeItems = ref([])
const marqueeLoaded = ref(false)

// Market watch search
const mwQuery = ref('')
const mwResults = ref([])
const mwLoading = ref(false)
const mwOpen = ref(false)
const mwSelectedIdx = ref(-1)
let mwTimer = null
const mwInputRef = ref(null)

const proxyImage = (url) => url ? `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}` : ''
watch(q, (value) => search(value))

const filtered = computed(() => {
  let rows = assets.value.filter((a) => {
    const matchQ = !q.value || [a.name, a.symbol, a.slug].some((v) => v.toLowerCase().includes(q.value.toLowerCase()))
    const matchM = !market.value || a.market === market.value
    const matchC = !category.value || a.category === category.value
    return matchQ && matchM && matchC
  })
  if (focusMode.value === 'single' && selectedSlug.value) rows = rows.filter((a) => a.slug === selectedSlug.value)
  if (focusMode.value === 'favorites') rows = rows.filter((a) => favorites.value.includes(a.slug))
  return rows
})

const focusAsset = computed(() => assets.value.find((a) => a.slug === selectedSlug.value) || null)

async function load() {
  if (document.hidden) return
  loading.value = true
  const data = await apiGet('/api/overview')
  assets.value = data.assets || []
  news.value = data.latestNews || []
  apiGet('/api/watchlist/insights').then(d => { insights.value = d }).catch(() => {})
  if (!selectedSlug.value && assets.value.length) selectedSlug.value = assets.value[0].slug
  buildMarquee(data.assets || [])
  loading.value = false
  loadReports()
}

async function loadReports() {
  try {
    const data = await apiGet('/api/reports?metadata=true')
    recentReports.value = Array.isArray(data) ? data.slice(0, 7) : []
  } catch {}
  reportsLoading.value = false
}

function buildMarquee(allAssets) {
  const want = ['IHSG','BTC-USD','ETH-USD','IDR=X','XAUUSD','SOL-USD','BBCA.JK','BBRI.JK']
  const items = allAssets.filter(a => want.includes(a.symbol) || want.includes(a.slug))
  if (!items.length) {
    marqueeItems.value = [
      { symbol:'IHSG', slug:'ihsg', name:'Indonesia Index', price:'--', change_percent:0 },
      { symbol:'BTC-USD', slug:'btc-usd', name:'Bitcoin', price:'--', change_percent:0 },
      { symbol:'ETH-USD', slug:'eth-usd', name:'Ethereum', price:'--', change_percent:0 },
      { symbol:'IDR=X', slug:'idr=x', name:'IDR/USD', price:'--', change_percent:0 },
      { symbol:'XAUUSD', slug:'xauusd', name:'Gold', price:'--', change_percent:0 },
    ]
  } else {
    marqueeItems.value = items
  }
  marqueeLoaded.value = true
}

function connectHomeStream() {
  if (focusStream) focusStream.close()
  if (document.hidden) return
  if (dataSaver.value) return
  focusStream = new EventSource(`/api/assets/${selectedSlug.value || 'btc-usd'}/stream`)
  focusStream.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (!data.asset) return
      assets.value = assets.value.map((item) => item.slug === data.asset.slug ? { ...item, ...data.asset, sparkline: (data.candles || []).slice(-12).map((c) => c.close ?? c.value) } : item)
    } catch {}
  }
}

function connectOverviewStream() {
  if (overviewStream) overviewStream.close()
  if (document.hidden) return
  if (dataSaver.value) return
  overviewStream = new EventSource(`/api/overview/stream`)
  overviewStream.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (Array.isArray(data.assets)) {
        assets.value = data.assets
        buildMarquee(data.assets)
      }
    } catch {}
  }
}

function restartStreams() {
  if (focusStream) { focusStream.close(); focusStream = null }
  if (overviewStream) { overviewStream.close(); overviewStream = null }
  if (!document.hidden) {
    if (selectedSlug.value) connectHomeStream()
    connectOverviewStream()
  }
}

function handleVisibility() {
  if (!document.hidden) load()
  restartStreams()
}

watch(selectedSlug, () => { if (selectedSlug.value && !document.hidden) connectHomeStream() })
function goFocusAsset() { if (selectedSlug.value) router.push(`/asset/${selectedSlug.value}`) }

// ── Market Watch Search ──────────────────────────────────────
function onMwInput(val) {
  mwQuery.value = val
  mwSelectedIdx.value = -1
  clearTimeout(mwTimer)
  if (!val || val.trim().length < 2) {
    mwResults.value = []
    mwOpen.value = false
    return
  }
  mwLoading.value = true
  mwOpen.value = true
  mwTimer = setTimeout(async () => {
    try {
      const data = await apiGet(`/api/search?q=${encodeURIComponent(val)}`)
      mwResults.value = (data.results || []).slice(0, 10)
    } catch { mwResults.value = [] }
    mwLoading.value = false
  }, 200)
}

function onMwKeydown(e) {
  const len = mwResults.value.length
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    mwSelectedIdx.value = (mwSelectedIdx.value + 1) % len
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    mwSelectedIdx.value = (mwSelectedIdx.value - 1 + len) % len
  } else if (e.key === 'Enter' && mwSelectedIdx.value >= 0) {
    e.preventDefault()
    mwImportResult(mwResults.value[mwSelectedIdx.value])
  } else if (e.key === 'Escape') {
    mwOpen.value = false
    mwSelectedIdx.value = -1
  }
}

function mwSelectResult(item) {
  mwQuery.value = item.symbol
  mwOpen.value = false
  router.push(`/asset/${(item.symbol || '').toLowerCase().replace(/[^a-z0-9]/g, '-')}`)
}

async function mwImportResult(item) {
  mwOpen.value = false
  mwQuery.value = ''
  try {
    const res = await apiPost('/api/assets/import', item)
    if (res.asset?.slug) {
      await toggleFavorite(res.asset.slug)
      await load()
      selectedSlug.value = res.asset.slug
    }
  } catch {}
}

function closeMw(e) {
  if (!e?.target?.closest('.market-search-wrap')) {
    mwOpen.value = false
  }
}

// ── Stale news filter ────────────────────────────────────────
const FRESH_NEWS = computed(() => {
  const now = Date.now()
  return news.value.filter(n => {
    if (!n.freshness_ts) return true
    const age = now - n.freshness_ts
    return age < 86400000 * 2 // 48h max
  })
})

// ── Tag badge helper ─────────────────────────────────────────
function newsTagClass(tag) {
  const map = { red_flag:'tag-red_flag', worth_knowing:'tag-worth_knowing', model_wars:'tag-model_wars', breaking:'tag-breaking' }
  return map[tag] || 'tag-neutral'
}

async function importFromSearch(item) {
  importing.value = item.symbol
  importSuccess.value = ''
  try {
    const res = await apiPost('/api/assets/import', item)
    if (res.asset?.slug) {
      await toggleFavorite(res.asset.slug)
      await load()
      selectedSlug.value = res.asset.slug
      importSuccess.value = `${res.asset.symbol} berhasil ditambahkan ke watchlist`
      setTimeout(() => { if (importSuccess.value.startsWith(res.asset.symbol)) importSuccess.value = '' }, 3000)
    }
  } finally {
    importing.value = ''
  }
}

onMounted(async () => {
  document.addEventListener('click', closeMw)
  await loadFavorites(); await load(); restartStreams();
  timer = setInterval(load, dataSaver.value ? 45000 : 30000)
  document.addEventListener('visibilitychange', handleVisibility)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeMw)
  if (timer) clearInterval(timer)
  if (focusStream) focusStream.close()
  if (overviewStream) overviewStream.close()
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <!-- ═══ Stock Marquee ═══════════════════════════════════════ -->
  <div class="marquee-wrap" role="marquee" aria-label="Harga aset live">
    <div class="marquee-track" aria-hidden="true">
      <template v-for="(item, idx) in [...marqueeItems, ...marqueeItems]" :key="'m'+idx">
        <span class="marquee-item" @click="router.push(`/asset/${item.slug}`)" tabindex="0" role="link" :aria-label="`${item.symbol}: ${item.price}, ${item.change_percent}%`">
          <span class="m-sym">{{ item.symbol }}</span>
          <span class="m-price">{{ item.price }}</span>
          <span class="m-chg" :class="item.change_percent >= 0 ? 'up' : 'down'">
            {{ item.change_percent >= 0 ? '▲' : '▼' }} {{ Math.abs(item.change_percent) }}%
          </span>
        </span>
      </template>
    </div>
  </div>

  <!-- ═══ Market Status Bar ═══════════════════════════════════ -->
  <MarketStatusBar />

  <!-- ═══ Market Watch Search ═════════════════════════════════ -->
  <div class="panel" role="search" aria-label="Market watch search">
    <h2>🔍 Market Watch</h2>
    <div class="market-search-wrap" ref="mwInputRef">
      <input
        class="market-search-input"
        type="search"
        placeholder="Cari saham, crypto, forex, komoditas, futures…  mis. NVDA, BTC, Emas, IHSG"
        :value="mwQuery"
        @input="onMwInput($event.target.value)"
        @keydown="onMwKeydown"
        @focus="mwResults.length && (mwOpen = true)"
        role="combobox"
        aria-expanded="mwOpen"
        aria-haspopup="listbox"
        aria-autocomplete="list"
        aria-label="Cari aset, saham, atau instrumen keuangan"
      />
      <div v-if="mwOpen && (mwResults.length || mwLoading)" class="search-autocomplete" role="listbox" aria-label="Hasil pencarian">
        <div v-if="mwLoading" style="padding:10px 14px;color:var(--muted);font-size:12px" aria-live="polite">Mencari...</div>
        <div v-for="(item, idx) in mwResults" :key="item.symbol + item.exchange"
             class="search-autocomplete-item"
             role="option"
             :aria-selected="idx === mwSelectedIdx"
             :aria-label="`${item.symbol} — ${item.name}, ${item.type}, ${item.market}`"
             @click="mwSelectResult(item)"
             @keydown.enter.prevent="mwImportResult(item)">
          <div class="sa-left">
            <strong>{{ item.symbol }} — {{ item.name }}</strong>
            <span>{{ item.fullName || item.name }}</span>
            <small>{{ item.exchange }} · {{ item.type }} · {{ item.market }} · {{ item.category }}</small>
          </div>
          <button class="sa-btn" @click.stop="mwImportResult(item)" :aria-label="`Tambah ${item.symbol} ke watchlist`">
            {{ importing === item.symbol ? '...' : '+ Tambah' }}
          </button>
        </div>
        <div v-if="importSuccess" style="padding:6px 14px;color:var(--green);font-size:12px" aria-live="polite">{{ importSuccess }}</div>
      </div>
    </div>
  </div>

  <section class="hero-grid">
    <div class="panel">
      <h2>Berita terbaru market</h2>
      <div class="news-list" role="feed" aria-label="Berita terbaru">
        <article v-for="item in FRESH_NEWS" :key="`${item.slug}-${item.title}`"
                 class="news-card rich-news-card"
                 :aria-label="`${item.title}, sumber ${item.source || 'news'}, ${item.freshness || ''}`">
          <div class="news-thumb news-thumb-media">
            <img v-if="item.image" :src="proxyImage(item.image)" alt="thumbnail berita" loading="lazy" referrerpolicy="no-referrer" />
            <span v-else>{{ item.thumbnail || '📰' }}</span>
          </div>
          <div>
            <small>{{ item.symbol }} • {{ item.name }} • {{ item.sentiment }} • {{ item.source || 'news' }} • {{ item.freshness || 'freshness unknown' }}</small>
            <!-- Color-coded tag badges -->
            <span v-if="item.tag" class="tag-badge" :class="newsTagClass(item.tag)" role="status">{{ item.tag.replace(/_/g, ' ') }}</span>
            <h3 class="news-full-title">{{ item.title }}</h3>
            <p>{{ item.summary }}</p>
            <div class="news-actions">
              <RouterLink :to="`/asset/${item.slug}`" :aria-label="`Buka detail ${item.title}`">Buka detail</RouterLink>
              <a v-if="item.link" :href="item.link" target="_blank" rel="noreferrer" :aria-label="`Buka sumber ${item.source}`">Sumber</a>
            </div>
          </div>
        </article>
      </div>
    </div>
    <div class="panel filters filters-panel">
      <h2>Filter market</h2>
      <div class="filter-grid" role="search" aria-label="Filter market">
        <label class="sr-only" for="market-search">Cari asset</label>
        <input id="market-search" class="filter-span-2" v-model="q" placeholder="Cari nama perusahaan atau kode saham, mis. nvidia / NVDA / bank central asia" />
        <div v-if="q && (searchResults.length || searchLoading)" class="search-box filter-span-2">
          <small v-if="searchLoading" aria-live="polite">mencari symbol live...</small>
          <small v-if="importSuccess" class="success-note" aria-live="polite">{{ importSuccess }}</small>
          <article v-for="item in searchResults.slice(0, 8)" :key="`${item.symbol}-${item.exchange}`" class="search-item search-item-action">
            <div>
              <strong>{{ item.symbol }} — {{ item.name }}</strong>
              <span>{{ item.fullName || item.name }}</span>
              <small>{{ item.exchange }} • {{ item.type }} • {{ item.market }} • {{ item.category }}</small>
            </div>
            <button class="refresh-btn" @click="importFromSearch(item)">{{ importing === item.symbol ? 'Menambahkan...' : 'Tambah ke watchlist' }}</button>
          </article>
        </div>
        <select v-model="market" aria-label="Pilih market">
          <option value="">Semua market</option>
          <option>IDX</option><option>US</option><option>CRYPTO</option><option>FOREX</option><option>COMMODITY</option>
        </select>
        <select v-model="category" aria-label="Pilih kategori">
          <option value="">Semua kategori</option>
          <option value="stock">Stock</option><option value="crypto">Crypto</option><option value="forex">Forex</option><option value="commodity">Commodity</option><option value="index">Index</option>
        </select>
        <select v-model="focusMode" aria-label="Mode tampilan">
          <option value="all">Pantau semua market</option>
          <option value="single">Fokus satu asset</option>
          <option value="favorites">Favorit saja</option>
        </select>
        <select v-if="focusMode === 'single'" v-model="selectedSlug" aria-label="Pilih asset fokus">
          <option v-for="asset in assets" :key="asset.slug" :value="asset.slug">{{ asset.symbol }} — {{ asset.name }}</option>
        </select>
        <button class="refresh-btn" @click="load">Refresh</button>
        <button v-if="focusMode === 'single' && focusAsset" class="refresh-btn" @click="goFocusAsset">Buka asset fokus</button>
      </div>
    </div>
  </section>

  <section class="panel lab-panel" role="region" aria-label="Market Orca Lab">
    <small>Market Orca Lab</small>
    <h2>Event Impact Simulator</h2>
    <p>Simulasikan dampak rate hike, regulasi, supply shock, earnings miss, atau AI breakthrough ke watchlist.</p>
    <RouterLink class="refresh-btn" to="/impact-simulator" aria-label="Buka simulator dampak event">Buka simulator</RouterLink>
  </section>

  <section class="panel insight-panel" v-if="insights" role="region" aria-label="Watchlist Insight">
    <small>Watchlist Insight</small>
    <h2>Top risk: {{ insights.top_risk?.symbol || 'belum ada watchlist' }}</h2>
    <p v-if="insights.top_risk">{{ insights.top_risk.action }} · {{ insights.top_risk.risk }} risk · {{ insights.top_risk.change_percent }}%</p>
    <div class="asset-grid compact-grid">
      <article v-for="item in insights.items.slice(0,4)" :key="item.slug" class="asset-card" :aria-label="`${item.symbol}: ${item.change_percent}% — ${item.action}`">
        <strong>{{ item.symbol }}</strong>
        <span>{{ item.name }}</span>
        <b :class="item.change_percent >= 0 ? 'up' : 'down'">{{ item.change_percent }}%</b>
        <p>{{ item.action }}</p>
        <small v-if="item.catalyst">{{ item.catalyst.source }} · {{ item.catalyst.title }}</small>
      </article>
    </div>
  </section>

  <!-- ═══ Alert Summary Dashboard ═════════════════════════════ -->
  <AlertSummaryWidget />

  <section v-if="focusMode === 'single' && focusAsset" class="panel focus-panel" role="region" aria-label="Focus mode">
    <small>Focus mode</small>
    <h2>{{ focusAsset.name }} ({{ focusAsset.symbol }})</h2>
    <p>{{ focusAsset.thesis }}</p>
    <MiniSparkline :points="focusAsset.sparkline || []" :positive="focusAsset.change_percent >= 0" />
    <b :class="focusAsset.change_percent >= 0 ? 'up' : 'down'">{{ focusAsset.price }} ({{ focusAsset.change_percent }}%)</b>
  </section>

  <section class="panel" role="region" :aria-label="focusMode === 'single' ? 'Asset fokus' : 'Semua aset'">
    <h2>{{ focusMode === 'single' ? 'Asset fokus' : focusMode === 'favorites' ? 'Favorit' : 'Semua aset' }} {{ loading ? '(loading...)' : '' }}</h2>
    <div class="asset-grid" role="list">
      <div v-for="asset in filtered" :key="asset.slug" class="asset-card" role="listitem">
        <RouterLink :to="`/asset/${asset.slug}`" :aria-label="`${asset.symbol} — ${asset.name}: ${asset.price}, ${asset.change_percent}%`">
          <strong>{{ asset.symbol }}</strong>
          <span>{{ asset.name }}</span>
          <small>{{ asset.market }} • {{ asset.category }} • {{ asset.provider || 'live' }}</small>
          <MiniSparkline :points="asset.sparkline || []" :positive="asset.change_percent >= 0" />
          <b :class="asset.change_percent >= 0 ? 'up' : 'down'">{{ asset.price }} ({{ asset.change_percent }}%)</b>
          <p>{{ asset.thesis }}</p>
        </RouterLink>
        <button class="refresh-btn" @click="toggleFavorite(asset.slug)" :aria-label="`${favorites.includes(asset.slug) ? 'Hapus' : 'Tambah'} ${asset.symbol} dari favorit`">
          {{ favorites.includes(asset.slug) ? '★ Favorit tersimpan' : '☆ Tambah favorit' }}
        </button>
      </div>
    </div>
  </section>

  <!-- ═══ Recent Reports ═══════════════════════════════════ -->
  <section v-if="!reportsLoading && recentReports.length" class="recent-reports-section">
    <h3 class="section-title" style="margin-bottom:12px">📋 Laporan Terbaru</h3>
    <div class="report-horiz-scroll">
      <RouterLink v-for="r in recentReports" :key="r.slug" :to="`/report/${r.slug}`" class="report-horiz-card premium-card">
        <span class="report-horiz-date">{{ r.date }}</span>
        <span class="report-horiz-title">{{ r.title }}</span>
        <span class="report-horiz-meta">{{ r.topicCount }} topik{{ r.hasIncidents ? ` · ⚠️ ${r.incidentCount} insiden` : '' }}</span>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
/* ═══ Recent Reports Horizontal Scroll ════════════════════════════ */
.recent-reports-section {
  margin-top: var(--space-6, 24px);
}

.section-title {
  font-size: calc(1.125rem * var(--font-scale, 1));
  font-weight: 600;
  color: var(--ink);
  letter-spacing: -0.01em;
}

.report-horiz-scroll {
  display: flex;
  gap: var(--space-3, 12px);
  overflow-x: auto;
  padding-bottom: var(--space-2, 8px);
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
  scrollbar-color: var(--line-strong, #353645) transparent;
}

.report-horiz-card {
  flex: 0 0 220px;
  scroll-snap-align: start;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--space-4, 16px);
  text-decoration: none;
  color: inherit;
  background: var(--premium-card-bg, var(--panel, #14151e));
  border: 1px solid var(--premium-border, var(--line, #2a2b36));
  border-radius: 10px;
  transition: all 0.2s ease;
}

.report-horiz-card:hover {
  border-color: var(--premium-accent, var(--accent, #00d4aa));
  background: var(--accent-dim, rgba(0, 212, 170, 0.08));
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}

.report-horiz-date {
  font-size: var(--font-overline, 0.6875rem);
  color: var(--premium-text-tertiary, var(--muted-subtle, #5c6072));
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.report-horiz-title {
  font-size: var(--font-small, 0.8125rem);
  font-weight: 600;
  line-height: 1.3;
  color: var(--ink);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.report-horiz-meta {
  font-size: var(--font-caption, 0.75rem);
  color: var(--premium-text-secondary, var(--muted, #8b8fa3));
  margin-top: auto;
}
</style>
