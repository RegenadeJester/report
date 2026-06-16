<script setup>
import { defineAsyncComponent, onMounted, onBeforeUnmount, ref } from 'vue'
import { apiGet, apiPost, API_BASE } from '../lib/api'
import { useRoute } from 'vue-router'
import { useRuntimeSettings } from '../stores/useRuntimeSettings'
const AssetCharts = defineAsyncComponent(() => import('../components/AssetCharts.vue'))

const route = useRoute()
const { dataSaver } = useRuntimeSettings()
const asset = ref(null)
const news = ref([])
const candles = ref([])
const article = ref(null)
const loading = ref(true)
const settings = ref(null)
const recommendation = ref(null)
const thresholdUp = ref('')
const thresholdDown = ref('')
const saveState = ref('')
const history = ref([])
const proxyImage = (url) => url ? `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}` : ''
let timer = null
let stream = null

async function load() {
  if (document.hidden) return
  const data = await apiGet(`/api/assets/${route.params.slug}`)
  asset.value = data.asset
  news.value = data.news || []
  candles.value = data.candles || []
  article.value = data.article || null
  settings.value = data.settings || null
  recommendation.value = data.alert_recommendation || null
  history.value = data.history || []
  thresholdUp.value = data.settings?.threshold_up ?? ''
  thresholdDown.value = data.settings?.threshold_down ?? ''
  loading.value = false
}

function connectStream() {
  if (stream) stream.close()
  if (document.hidden) return
  if (dataSaver.value) return
  stream = new EventSource(`/api/assets/${route.params.slug}/stream`)
  stream.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data)
      if (data.asset) asset.value = { ...(asset.value || {}), ...data.asset }
      if (data.candles) candles.value = data.candles
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

async function saveThreshold() {
  saveState.value = 'saving'
  const res = await apiPost(`/api/assets/${route.params.slug}/settings`, { threshold_up: Number(thresholdUp.value), threshold_down: Number(thresholdDown.value), watch_enabled: true })
  settings.value = res
  saveState.value = 'saved'
}

async function sendTestAlert() {
  await apiPost('/api/alerts/test', { slug: asset.value.slug })
}

function applyRecommendation() {
  if (!recommendation.value) return
  thresholdUp.value = recommendation.value.recommended_threshold_up
  thresholdDown.value = recommendation.value.recommended_threshold_down
}

onMounted(async () => {
  await load()
  connectStream()
  timer = setInterval(load, dataSaver.value ? 30000 : 15000)
  document.addEventListener('visibilitychange', handleVisibility)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (stream) stream.close()
  document.removeEventListener('visibilitychange', handleVisibility)
})
</script>

<template>
  <section v-if="asset" class="panel asset-layout">
    <div class="asset-header">
      <div>
        <small>{{ asset.market }} • {{ asset.category }} • {{ asset.marketState || 'LIVE' }} • {{ asset.provider || 'live' }}</small>
        <h2>{{ asset.name }} ({{ asset.symbol }})</h2>
        <p>{{ asset.thesis }}</p>
      </div>
      <div class="asset-actions">
        <button class="refresh-btn" @click="load">Refresh detail</button>
        <button class="refresh-btn" @click="sendTestAlert">Kirim test alert ke Discord</button>
      </div>
    </div>

    <AssetCharts :candles="candles" :symbol="asset.symbol" />

    <div class="grid-2">
      <div class="panel nested article-panel" v-if="article">
        <h3>{{ article.headline }}</h3>
        <p v-for="(paragraph, idx) in article.body" :key="idx">{{ paragraph }}</p>
      </div>
      <div class="panel nested">
        <h3>Threshold editor</h3>
        <div class="filters" aria-label="Threshold editor">
          <label class="sr-only" for="threshold-up">Alert naik</label>
          <input id="threshold-up" v-model="thresholdUp" inputmode="decimal" placeholder="Alert up threshold %" />
          <label class="sr-only" for="threshold-down">Alert turun</label>
          <input id="threshold-down" v-model="thresholdDown" inputmode="decimal" placeholder="Alert down threshold %" />
          <button class="refresh-btn" @click="saveThreshold">Simpan threshold</button>
        </div>
        <div v-if="recommendation" class="recommendation-card">
          <strong>Rekomendasi alert</strong>
          <p>Naik {{ recommendation.recommended_threshold_up }}% • Turun {{ recommendation.recommended_threshold_down }}%</p>
          <small>basis: {{ recommendation.basis.market }} • {{ recommendation.basis.samples }} sampel • avg move {{ recommendation.basis.avg_abs_change_percent }}% • confidence {{ recommendation.basis.confidence }}</small>
          <button class="refresh-btn" @click="applyRecommendation">Pakai rekomendasi</button>
        </div>
        <small aria-live="polite">status: {{ saveState || 'idle' }}</small>
      </div>
    </div>

    <div v-if="article?.relatedNews" class="grid-2 related-news-grid">
      <div class="panel nested">
        <h3>Berita yang paling terkait dengan {{ asset.change_percent >= 0 ? 'kenaikan' : 'penurunan' }}</h3>
        <article v-for="item in article.relatedNews.main" :key="item.title" class="news-card rich-news-card">
          <div class="news-thumb news-thumb-media">
            <img v-if="item.image" :src="proxyImage(item.image)" alt="thumbnail" loading="lazy" referrerpolicy="no-referrer" />
            <span v-else>{{ item.thumbnail || '📰' }}</span>
          </div>
          <div>
            <small>{{ item.sentiment }} • {{ item.freshness || item.created_at }} • {{ item.source || 'news' }}</small>
            <h4>{{ item.title }}</h4>
            <p>{{ item.summary }}</p>
            <a v-if="item.link" :href="item.link" target="_blank" rel="noreferrer">Buka sumber berita</a>
          </div>
        </article>
      </div>
      <div class="panel nested">
        <h3>Berita lawan / penyeimbang</h3>
        <article v-for="item in article.relatedNews.counter" :key="item.title" class="news-card rich-news-card">
          <div class="news-thumb news-thumb-media">
            <img v-if="item.image" :src="proxyImage(item.image)" alt="thumbnail" loading="lazy" referrerpolicy="no-referrer" />
            <span v-else>{{ item.thumbnail || '📰' }}</span>
          </div>
          <div>
            <small>{{ item.sentiment }} • {{ item.freshness || item.created_at }} • {{ item.source || 'news' }}</small>
            <h4>{{ item.title }}</h4>
            <p>{{ item.summary }}</p>
            <a v-if="item.link" :href="item.link" target="_blank" rel="noreferrer">Buka sumber berita</a>
          </div>
        </article>
      </div>
    </div>

    <div class="panel nested">
      <h3>Histori snapshot</h3>
      <div class="history-list">
        <article v-for="(row, idx) in history.slice(0, 10)" :key="idx" class="news-card">
          <small>{{ row.created_at }}</small>
          <strong>{{ row.price }}</strong>
          <p>{{ row.change_percent }}% • {{ row.source }}</p>
        </article>
      </div>
    </div>

    <div class="panel nested portal-news-panel">
      <h3>Berita lengkap</h3>
      <a v-for="item in news" :key="item.title" class="portal-news-card portal-news-link" :href="item.link || '#'" target="_blank" rel="noreferrer">
        <div class="portal-news-media news-thumb-media">
          <img v-if="item.image" :src="proxyImage(item.image)" alt="thumbnail" loading="lazy" referrerpolicy="no-referrer" />
          <span v-else class="portal-news-fallback">{{ item.thumbnail || '📰' }}</span>
        </div>
        <div class="portal-news-body">
          <small>{{ item.sentiment }} • {{ item.freshness || item.created_at }} • {{ item.source || 'news' }}</small>
          <h4>{{ item.title }}</h4>
          <p>{{ item.summary }}</p>
          <div class="news-actions">
            <span>Buka sumber berita</span>
            <span>Lihat coverage asset</span>
          </div>
        </div>
      </a>
    </div>
  </section>

  <section v-else class="panel">{{ loading ? 'Loading...' : 'Asset tidak ditemukan' }}</section>
</template>
