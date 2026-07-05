<template>
  <div class="rw" v-if="report">
    <div class="tabs" v-if="!loading" role="tablist" aria-label="Mode baca laporan">
      <button role="tab" :aria-selected="tab === 'report'" :class="['tab', {a: tab === 'report'}]" @click="tab='report'">Laporan</button>
      <button role="tab" :aria-selected="tab === 'full'" :class="['tab', {a: tab === 'full'}]" @click="tab='full'">Teks Lengkap</button>
      <button role="tab" :aria-selected="tab === 'compare'" :class="['tab', {a: tab === 'compare'}]" @click="tab='compare'; loadCompare()">Compare</button>
      <button role="tab" :aria-selected="tab === 'charts'" :class="['tab', {a: tab === 'charts'}]" @click="tab='charts'">📊 Market Charts</button>
      <router-link :to="`/canvas/${route.params.slug}`" class="tab edit-tab" target="_blank">🎨 Canvas Report</router-link>
      <a :href="`/report-editor/${route.params.slug}`" class="tab edit-tab" target="_blank">✏️ Channel Edit</a>
    </div>

    <!-- Tab: Card Report -->
      <div v-show="tab === 'report'">
      <h1 class="display-headline">Laporan Harian AI</h1>
      <div class="byline">{{ report.date }} · {{ report.topics.length }} bagian · {{ sources.length }} sumber</div>

      <!-- ═══ Semantic Search Bar ═══ -->
      <div class="semantic-search-wrap" :class="{active: semSearch.searchEnabled.value}">
        <div class="ss-row">
          <button class="ss-toggle" :class="{on: semSearch.searchEnabled.value}" @click="semSearch.toggleSearch()" :disabled="semSearch.isModelLoading.value" :title="semSearch.searchEnabled.value ? 'Nonaktifkan pencarian semantik' : 'Aktifkan pencarian semantik'">
            <span v-if="semSearch.isModelLoading.value" class="ss-spinner">⏳</span>
            <span v-else>🧠</span>
            {{ semSearch.searchEnabled.value ? 'Semantik ON' : 'Pencarian Semantik' }}
          </button>
          <div v-if="semSearch.searchEnabled.value" class="ss-input-wrap">
            <input ref="ssInputEl" v-model="semSearch.searchQuery.value" type="search" class="ss-input" placeholder="Cari secara semantik... (contoh: crypto crash, AI regulation, market outlook)" aria-label="Pencarian semantik laporan" @keydown.esc="clearSemanticSearch" />
            <button v-if="semSearch.searchQuery.value" class="ss-clear" @click="clearSemanticSearch" title="Hapus pencarian">✕</button>
          </div>
        </div>
        <div v-if="semSearch.searchEnabled.value" class="ss-controls">
          <label class="ss-threshold-label">
            <span class="ss-label-text">Min Similaritas:</span>
            <input type="range" v-model.number="semSearch.minScore.value" min="0" max="1" step="0.05" class="ss-slider" />
            <span class="ss-threshold-val">{{ Math.round(semSearch.minScore.value * 100) }}%</span>
          </label>
          <span class="ss-meta" v-if="semSearch.isIndexing.value">⚡ Mengindeks {{ semSearch.indexCount.value }} item...</span>
          <span class="ss-meta" v-else-if="semSearch.searchResults.value.length > 0">🎯 {{ semSearch.searchResults.value.length }} hasil ditemukan</span>
          <span class="ss-meta" v-else-if="semSearch.searchQuery.value.length >= 2">❌ Tidak ada hasil di atas {{ Math.round(semSearch.minScore.value * 100) }}%</span>
          <span class="ss-meta" v-else-if="semSearch.indexCount.value > 0">✅ {{ semSearch.indexCount.value }} item terindeks</span>
          <span v-if="semSearch.modelError.value" class="ss-error">⚠️ {{ semSearch.modelError.value }}</span>
        </div>
      </div>

      <div class="card stats"><h3>Statistik</h3>
        <div class="row">Item: {{ totalItems }} · Artikel: {{ totalArts }} · Model: {{ totalMods }} · Sumber: {{ sources.length }}</div>
      </div>

      <div class="card sb" v-if="summaryTxt">
        <h2>Ringkasan</h2>
        <div class="stext lead-body" v-html="summaryHtml"></div>
      </div>

      <div class="card fb" v-if="funFacts.length">
        <h2>Fakta Menarik</h2>
        <p v-for="f in funFacts.slice(0,8)" :key="f.title"><span class="ft">{{ f.title }}:</span> {{ sentenceTrunc(f.fact, 220) }}</p>
      </div>

      <div v-for="topic in report.topics" :key="topic.title" class="card sec topic-section" v-show="semSearch.isTopicVisible(topic.title)">
        <h2>{{ topic.title }}<span v-if="semSearch.getItemScore({title: topic.title}, topic.title) !== null" class="ss-score-inline" :class="scoreClass(semSearch.getItemScore({title: topic.title}, topic.title))">{{ scoreLabel(semSearch.getItemScore({title: topic.title}, topic.title)) }}</span></h2>
        <div class="intro" v-if="topic.intro?.length > 30">"{{ sentenceTrunc(topic.intro, 350) }}"</div>
        <article v-for="item in topic.items.filter(i=>i.title && semSearch.isItemVisible(i, topic.title)).slice(0,8)" :key="item.url || item.title" class="item article-card" :class="{'ss-highlight': semSearch.getItemScore(item, topic.title) !== null}">
          <div class="item-img hero-thumb" v-if="item.imageUrl">
            <img :src="thumb(item)" :alt="item.title" loading="lazy" @error="e => e.target.src=fallbackThumb(item)">
          </div>
          <div v-else class="item-img thumb-fallback" :style="{background: fallbackGradient(item)}"><span>{{ topic.title.slice(0,2) }}</span></div>
          <div class="body">
            <div class="hl headline">
              <span v-if="item.source" class="badge" :style="{ '--c': badgeColor(item.source) }">{{ item.source }}</span>
              <span v-if="item.source" class="trust-badge" :class="sourceTrustClass(item.source)" :title="'Reliabilitas: '+sourceTrustLabel(item.source)">{{ sourceTrustLabel(item.source) }}</span>
              {{ item.title }}
            </div>
            <!-- Color-coded tag badge per item -->
            <span v-if="item.tag" class="tag-badge" :class="tagBadgeClass(item.tag)" role="status">{{ formatTag(item.tag) }}</span>
            <span v-if="semSearch.getItemScore(item, topic.title) !== null" class="ss-score-badge" :class="scoreClass(semSearch.getItemScore(item, topic.title))" :title="'Skor semantik: ' + Math.round(semSearch.getItemScore(item, topic.title) * 100) + '%'" role="status" aria-label="Relevansi semantik">{{ scoreLabel(semSearch.getItemScore(item, topic.title)) }}</span>
            <div class="snip" v-if="item.snippet && item.snippet !== item.title">{{ expanded[item.url || item.title] ? item.snippet : sentenceTrunc(item.snippet, 220) }}</div>
            <button v-if="item.snippet?.length > 220" class="more" @click="toggleMore(item)">{{ expanded[item.url || item.title] ? 'Tutup konteks' : 'Show more' }}</button>
            <div class="meta" v-if="item.points">Skor: {{ item.points }} poin{{ item.comments ? ' · '+item.comments+' komentar' : '' }}</div>
            <a class="link source-cta" :href="item.url" target="_blank" rel="noopener noreferrer" :aria-label="`Buka sumber ${item.title} di tab baru`">Baca selengkapnya</a>
          </div>
        </article>
      </div>

      <div class="footer">Dibuat oleh Little Candle · {{ report.date }}</div>
    </div>

    <!-- Tab: Full Text -->
    <div v-show="tab === 'full'" class="ft" v-html="fullHtml"></div>

    <!-- Tab: Compare -->
    <div v-show="tab === 'compare'" class="card cmp">
      <h2>Report Comparison</h2>
      <div class="row"><label>Bandingkan dengan</label><select v-model="compareSlug" @change="loadCompare"><option v-for="s in reportList.filter(x=>x!==route.params.slug)" :key="s" :value="s">{{ s }}</option></select></div>
      <p v-if="compareLoading" class="meta">Memuat diff...</p>
      <p v-else-if="compareData" class="stext">{{ compareData.summary }}</p>
      <div v-if="compareData" class="grid2">
        <div><b>Stats</b><p>Item Δ {{ compareData.stats.item_delta }} · Source Δ {{ compareData.stats.source_delta }}</p></div>
        <div><b>Topik baru</b><p>{{ compareData.topics.added.join(', ') || '-' }}</p></div>
        <div><b>Topik hilang</b><p>{{ compareData.topics.removed.join(', ') || '-' }}</p></div>
        <div><b>Repeated headlines</b><p>{{ compareData.headlines.repeated.length }}</p></div>
      </div>
      <ul v-if="compareData"><li v-for="h in compareData.headlines.added.slice(0,8)" :key="h.url || h.title">+ {{ h.topic }} — {{ h.title }}</li></ul>
    </div>

    <!-- Tab: Market Charts -->
    <div v-show="tab === 'charts'" class="charts-tab">
      <div class="charts-header">
        <h2>📊 Market Overview</h2>
        <p class="charts-subtitle">Data real-time dari TradingView · IHSG, US, China, Forex, Crypto, IDR</p>
      </div>
      <TradingViewWidgets />
    </div>

    <ReportDataQuality :report-slug="route.params.slug" style="margin-bottom:16px" />

    <aside class="evidence" v-if="report.blocks?.length" aria-label="Evidence-aware report composer">
      <h2>Evidence Composer</h2>
      <p class="meta">Klik badge untuk lihat source/claim, hide, atau lock paragraf sebelum export.</p>
      <button class="more" @click="remapAllBlocks">Remap All Blocks</button>
      <button class="more" @click="rewriteWeakBlocks">Rewrite Weak Blocks</button>
      <div v-for="b in report.blocks.filter(x=>!x.hidden).slice(0,8)" :key="b.block_key" class="block" :class="b.claim_type">
        <button class="claim" @click="editingBlock = b">{{ claimLabel(b.claim_type) }} · {{ Math.round(Number(b.confidence)*100) }}% · health {{ b.evidence_health?.score ?? '-' }}</button>
        <p>{{ sentenceTrunc(b.body_md, 220) }}</p>
        <small>{{ b.edit_suggestion }}</small>
      </div>
      <div v-if="editingBlock" class="drawer">
        <button class="x" @click="editingBlock=null">Tutup</button>
        <h3>{{ editingBlock.block_key }} · {{ claimLabel(editingBlock.claim_type) }}</h3>
        <textarea v-model="editingBlock.body_md" rows="6"></textarea>
        <p>Evidence: {{ editingBlock.evidence_ids }}</p>
        <p v-if="editingBlock.evidence_health">Health: {{ editingBlock.evidence_health.score }} · {{ editingBlock.evidence_health.badges.join(', ') }}</p>
        <button class="more" @click="saveBlock(editingBlock)">Simpan</button>
        <button class="more" @click="rewriteBlock(editingBlock)">Rewrite RAG</button>
        <button class="more" @click="remapEvidence(editingBlock)">Remap Evidence</button>
        <button class="more" @click="loadSources(editingBlock)">Sources</button>
        <button class="more" @click="saveBlock({...editingBlock, locked: editingBlock.locked ? 0 : 1})">{{ editingBlock.locked ? 'Unlock' : 'Lock' }}</button>
        <button class="more" @click="saveBlock({...editingBlock, hidden:1})">Hide</button>
        <div v-if="pendingRewrite" class="sources"><h4>Rewrite diff</h4><p><b>Before</b>: {{ sentenceTrunc(pendingRewrite.before, 360) }}</p><p><b>After</b>: {{ sentenceTrunc(pendingRewrite.after, 360) }}</p><button class="more" @click="acceptRewrite(pendingRewrite)">Accept</button><button class="more" @click="rejectRewrite(pendingRewrite)">Reject</button></div>
        <div v-if="sourceDrawer.length" class="sources"><h4>Citation drawer</h4><a v-for="s in sourceDrawer" :key="s.url||s.title" :href="s.url" target="_blank" rel="noopener">{{ s.kind || s.retrieval || 'source' }} · {{ s.source }} · {{ s.title }}</a></div>
      </div>
    </aside>

    <!-- Colab Notes (floating sidebar) -->
    <ColabNotes :report-slug="route.params.slug" :sections="(report.topics || []).map(t => t.title)" />
  </div>

  <div v-else-if="error" class="err" role="alert">
    <h2>Laporan tidak ditemukan</h2>
    <p>{{ error }}</p>
    <router-link to="/">Kembali ke beranda</router-link>
  </div>

  <div v-else class="loading" role="status" aria-live="polite">Memuat laporan...</div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSemanticSearch } from '../composables/useSemanticSearch.js'
import TradingViewWidgets from '../components/TradingViewWidgets.vue'
import ColabNotes from '../components/ColabNotes.vue'
import ReportDataQuality from '../components/ReportDataQuality.vue'

const route = useRoute()
const semSearch = useSemanticSearch()
const ssInputEl = ref(null)
const report = ref(null)
const error = ref(null)
const loading = ref(true)
const tab = ref('report')
const expanded = ref({})
const editingBlock = ref(null)
const sourceDrawer = ref([])
const blockQuality = ref(null)
const pendingRewrite = ref(null)
const reportList = ref([])
const compareSlug = ref('')
const compareData = ref(null)
const compareLoading = ref(false)

const BADGES = {
  'HN':'#FF6600','TechCrunch':'#0A9E01','VentureBeat':'#FF5722','The Verge':'#00D4AA',
  'Google AI Blog':'#4285F4','MIT Tech Review':'#000','Ars Technica':'#FF4C00',
  'Dev.to':'#0A0A0A','BBC Tech':'#BB1919','Guardian Tech':'#052962','Engadget':'#00A3E0',
  'HF':'#F59E0B','GitHub':'#333','CNBC Tech':'#005594','CoinDesk':'#2563EB',
  'Analytics Vidhya':'#8B5CF6','Forbes':'#3D7A4D','MarketWatch':'#E67E22',
  'Kontan':'#0066CC','Bisnis.com':'#CC0000','Tempo':'#000080','CNBC Indonesia':'#CC0000',
  'Liputan6':'#CC3300',
}

function badgeColor(src) { return BADGES[src] || '#6B7280' }
// Source trust helpers
const trustMap = ref(new Map())
function sourceTrustLabel(src) {
  const t = trustMap.value.get(src)
  if (!t) return '?'
  return t.label === 'high_trust' ? '●' : t.label === 'medium_trust' ? '◐' : '○'
}
function sourceTrustClass(src) {
  const t = trustMap.value.get(src)
  if (!t) return 'trust-unknown'
  if (t.label === 'high_trust') return 'trust-high'
  if (t.label === 'medium_trust') return 'trust-med'
  return 'trust-low'
}

// ── Sentence-aware truncation (NO .slice(n)!) ──────────────
function sentenceTrunc(text, maxLen = 200) {
  if (!text || text.length <= maxLen) return text || ''
  const cut = text.substring(0, maxLen)
  // Try to find the last sentence boundary before maxLen
  const lastPeriod = cut.lastIndexOf('.')
  const lastExcl = cut.lastIndexOf('!')
  const lastQ = cut.lastIndexOf('?')
  const lastSent = Math.max(lastPeriod, lastExcl, lastQ)
  if (lastSent > maxLen * 0.4) {
    return cut.substring(0, lastSent + 1).trimEnd()
  }
  // Fallback: cut at last space (word boundary)
  const lastSpace = cut.lastIndexOf(' ')
  if (lastSpace > maxLen * 0.5) {
    return cut.substring(0, lastSpace).trimEnd() + '…'
  }
  // Last resort: hard cut + ellipsis
  return cut.trimEnd() + '…'
}

// Keep old trunc for backward compat with minimal callers
function trunc(s, n) { return sentenceTrunc(s, n) }

function toggleMore(item) { const k = item.url || item.title; expanded.value = { ...expanded.value, [k]: !expanded.value[k] } }
function fallbackGradient(item) { const n = (item.title || '').length % 5; return ['linear-gradient(135deg,#7c3aed,#06b6d4)','linear-gradient(135deg,#f59e0b,#ef4444)','linear-gradient(135deg,#10b981,#0ea5e9)','linear-gradient(135deg,#111827,#6366f1)','linear-gradient(135deg,#ec4899,#8b5cf6)'][n] }
function fallbackThumb(item) { return `https://picsum.photos/seed/${encodeURIComponent(item.source || item.title || 'market-orca')}/320/180` }
function thumb(item) { return item.imageUrl || fallbackThumb(item) }
function claimLabel(t) { return ({cited:'cited', weak_evidence:'weak evidence', assumption:'assumption', actionable:'actionable'}[t] || t) }

// ── Tag badge helpers ──────────────────────────────────────
function tagBadgeClass(tag) {
  const map = { red_flag:'tag-red_flag', worth_knowing:'tag-worth_knowing', model_wars:'tag-model_wars', breaking:'tag-breaking' }
  return map[tag] || 'tag-neutral'
}
function formatTag(tag) {
  return (tag || '').replace(/_/g, ' ')
}

// ── Semantic search score helpers ──────────────────────────
function scoreClass(score) {
  if (score >= 0.65) return 'ss-high'
  if (score >= 0.40) return 'ss-med'
  return 'ss-low'
}
function scoreLabel(score) {
  if (score === null || score === undefined) return ''
  return `${Math.round(score * 100)}%`
}
function clearSemanticSearch() {
  semSearch.searchQuery.value = ''
  nextTick(() => ssInputEl.value?.focus())
}

async function saveBlock(b) {
  const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/blocks`, { method:'PATCH', headers:{'content-type':'application/json'}, body:JSON.stringify(b) })
  if (!res.ok) { error.value = `Save block failed ${res.status}`; return }
  const data = await res.json()
  report.value.blocks = report.value.blocks.map(x => x.block_key === data.block.block_key ? data.block : x)
  blockQuality.value = data.quality || blockQuality.value
  editingBlock.value = data.block.hidden ? null : data.block
}
async function rewriteBlock(b) {
  const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/blocks/${encodeURIComponent(b.block_key)}/rewrite`, { method:'POST' })
  if (!res.ok) { error.value = `Rewrite failed ${res.status}`; return }
  const data = await res.json()
  pendingRewrite.value = data
  blockQuality.value = data.quality
}
async function acceptRewrite(p) {
  const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/rewrite-proposals/${p.proposal_id}/accept`, { method:'POST' })
  if (!res.ok) { error.value = `Accept failed ${res.status}`; return }
  const data = await res.json(); report.value.blocks = report.value.blocks.map(x => x.block_key === data.block.block_key ? data.block : x); editingBlock.value = data.block; pendingRewrite.value = null; blockQuality.value = data.quality
}
async function rejectRewrite(p) {
  await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/rewrite-proposals/${p.proposal_id}/reject`, { method:'POST' }); pendingRewrite.value = null
}
async function remapEvidence(b) {
  const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/blocks/${encodeURIComponent(b.block_key)}/remap-evidence`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ limit:5 }) })
  if (!res.ok) { error.value = `Remap failed ${res.status}`; return }
  const data = await res.json()
  report.value.blocks = report.value.blocks.map(x => x.block_key === data.block.block_key ? data.block : x)
  blockQuality.value = data.quality
  sourceDrawer.value = data.sources || []
  editingBlock.value = data.block
}
async function loadSources(b) {
  const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/blocks/${encodeURIComponent(b.block_key)}/sources`)
  if (!res.ok) { error.value = `Sources failed ${res.status}`; return }
  const data = await res.json()
  sourceDrawer.value = data.sources || []
}
async function remapAllBlocks() {
  const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/blocks/remap-all`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ limit:5 }) })
  if (!res.ok) { error.value = `Remap all failed ${res.status}`; return }
  const data = await res.json()
  report.value.blocks = data.blocks || report.value.blocks
  blockQuality.value = data.quality
}
async function rewriteWeakBlocks() {
  const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/blocks/rewrite-weak`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({ limit:20 }) })
  if (!res.ok) { error.value = `Rewrite weak failed ${res.status}`; return }
  const data = await res.json()
  report.value.blocks = data.blocks || report.value.blocks
  blockQuality.value = data.quality
}

// Min markdown-to-HTML for Vue
function mdToHtml(t) {
  if (!t) return ''
  const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
  return t.split('\n').map(line => {
    if (line.startsWith('# ')) return `<h1>${esc(line.slice(2))}</h1>`
    if (line.startsWith('## ')) return `<h2>${esc(line.slice(3))}</h2>`
    if (/^[-=%]{5,}$/.test(line)) return '<hr>'
    let h = esc(line)
    h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>')
    h = h.replace(/`(.+?)`/g, '<code>$1</code>')
    h = h.replace(/https?:\/\/\S+/g, m => `<a href="${m}" target="_blank" rel="noopener">${m}</a>`)
    if (!h.trim()) return '<br>'
    if (line.startsWith('> ')) return `<blockquote>${h.slice(2)}</blockquote>`
    if (line.startsWith('^ ')) return `<div class="meta">${h.slice(2)}</div>`
    if (line.startsWith('**') && !line.includes('>') && !line.match(/^\^ \d+ pts/)) return `<p class="hl">${h}</p>`
    return `<p>${h}</p>`
  }).join('\n')
}

const fullHtml = computed(() => mdToHtml(report.value?.textReport || ''))

const summaryTxt = computed(() => {
  if (!report.value) return ''
  const idx = report.value.textReport?.indexOf('## Ringkasan')
  if (idx < 0) return ''
  return report.value.textReport.slice(idx + '## Ringkasan'.length + 1).split('\n\n')[0]?.trim() || ''
})

const summaryHtml = computed(() => {
  return (summaryTxt.value || '').split('\n').filter(l => l.trim()).map(l => l.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')).join('<br>')
})

const funFacts = computed(() => (report.value?.topics || []).filter(t => t.funFact?.length > 15).map(t => ({ title: t.title, fact: t.funFact })))
const totalItems = computed(() => report.value?.topics.reduce((s,t) => s + t.items.length, 0) || 0)
const totalArts = computed(() => report.value?.topics.reduce((s,t) => s + t.items.filter(i=>i.type==='article').length, 0) || 0)
const totalMods = computed(() => report.value?.topics.reduce((s,t) => s + t.items.filter(i=>i.type==='model').length, 0) || 0)
const sources = computed(() => [...new Set(report.value?.topics.flatMap(t => t.items.map(i => i.source).filter(Boolean)) || [])])

async function loadCompare() {
  if (!compareSlug.value) return
  compareLoading.value = true
  try {
    const res = await fetch(`/api/report/${encodeURIComponent(route.params.slug)}/compare/${encodeURIComponent(compareSlug.value)}`)
    compareData.value = res.ok ? await res.json() : { summary:`Compare gagal HTTP ${res.status}`, stats:{item_delta:0,source_delta:0}, topics:{added:[],removed:[]}, headlines:{added:[],repeated:[]} }
  } finally { compareLoading.value = false }
}

onMounted(async () => {
  const slug = route.params.slug
  try {
    const res = await fetch(`/api/report/${slug}`)
    if (!res.ok) { error.value = `HTTP ${res.status}`; return }
    report.value = await res.json()
    // Build trust map from source_trust
    if (report.value?.source_trust) {
      const map = new Map()
      for (const entry of report.value.source_trust) {
        map.set(entry.source, entry.trust)
      }
      trustMap.value = map
    }
    const listRes = await fetch('/api/reports')
    if (listRes.ok) { reportList.value = await listRes.json(); compareSlug.value = reportList.value.find(s => s !== slug) || '' }
    document.title = `Laporan Harian AI ${report.value.date || slug} · Market Orca`
    let meta = document.querySelector('meta[name="description"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name:'description' }))
    meta.setAttribute('content', (summaryTxt.value || 'Laporan market, AI, dan teknologi berbasis sumber.').slice(0,155))
    let canon = document.querySelector('link[rel="canonical"]') || document.head.appendChild(Object.assign(document.createElement('link'), { rel:'canonical' }))
    canon.setAttribute('href', `${location.origin}/report/${encodeURIComponent(slug)}`)
  } catch (e) { error.value = e.message }
  finally { loading.value = false }
})

// Auto-build search index when model becomes ready
watch(() => semSearch.modelReady.value, (ready) => {
  if (ready && report.value && semSearch.searchEnabled.value && semSearch.indexCount.value === 0) {
    semSearch.buildIndex(report.value)
  }
})

</script>

<style scoped>
/* ================================================================
   MARKET ORCA — Premium Article Reading Experience
   Inspired by: Medium, Ars Technica, Bloomberg, The Verge
   ================================================================ */

/* ── Skip Link (A11y) ── */
/* Visual only — lives in DOM via CSS content trick */
.rw::before {
  content: '';
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

/* ── Main Container ── */
.rw {
  max-width: 780px;
  margin: 0 auto;
  padding: 40px 24px 80px;
  width: 100%;
  color: var(--ink);
  line-height: 1.6;
  position: relative;
}

/* ── Display Headline (Page Title) ── */
.display-headline,
h1 {
  font-size: clamp(36px, 7vw, 52px);
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 8px;
  line-height: 1.08;
  letter-spacing: -0.03em;
  font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
}

/* ── Byline ── */
.byline {
  color: var(--muted);
  font-size: 15px;
  margin-bottom: 36px;
  line-height: 1.5;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}

/* ── Generic .meta (non-byline) ── */
.meta {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 6px;
  line-height: 1.5;
}

/* ── Card (Base) ── */
.card {
  margin-bottom: 44px;
  padding: 0;
  background: transparent;
  border-radius: 0;
}

/* ── Section Headers (Topic / Summary / Fun Facts) ── */
.card h2 {
  font-size: clamp(13px, 2vw, 15px);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
  margin-bottom: 12px;
  font-weight: 600;
}

/* ── Stats ── */
.stats {
  background: var(--panel);
  border-radius: 12px;
  padding: 16px 20px;
}
.stats h3 {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--muted);
  margin-bottom: 6px;
  font-weight: 600;
}
.stats .row {
  color: var(--muted);
  font-size: 13px;
}

/* ────────────────────────────────────────────────
   SUMMARY → Lead Paragraph / Lede
   ──────────────────────────────────────────────── */
.sb {
  border-bottom: 1px solid var(--line);
  padding-bottom: 40px;
}
.sb h2 {
  color: var(--accent);
  font-size: 13px;
}
.stext,
.lead-body {
  font-size: 19px;
  color: var(--ink);
  line-height: 1.78;
  font-weight: 400;
  max-width: 680px;
  font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
}
.lead-body {
  font-size: 20px;
  line-height: 1.82;
  color: var(--ink);
  font-weight: 400;
}
.stext strong,
.lead-body strong {
  color: var(--ink);
  font-weight: 700;
}

/* ────────────────────────────────────────────────
   FUN FACTS → Pull-Quote Style
   ──────────────────────────────────────────────── */
.fb {
  background: var(--panel);
  border-radius: 16px;
  padding: 28px 32px;
  border-left: 4px solid var(--accent2);
  margin-bottom: 48px;
}
.fb h2 {
  color: var(--accent2);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  margin-bottom: 16px;
}
.fb p {
  font-size: 16px;
  color: var(--ink);
  line-height: 1.65;
  margin-bottom: 14px;
  padding-left: 0;
  font-weight: 400;
}
.fb p:last-child {
  margin-bottom: 0;
}
.fb .ft {
  color: var(--accent2);
  font-weight: 700;
  font-size: 15px;
}

/* ────────────────────────────────────────────────
   TOPIC SECTIONS
   ──────────────────────────────────────────────── */
.topic-section {
  margin-bottom: 56px;
  padding: 0;
  background: transparent;
  border-top: 2px solid var(--line);
  padding-top: 36px;
}
.topic-section > h2 {
  font-size: clamp(24px, 5vw, 34px);
  font-weight: 700;
  color: var(--ink);
  margin-bottom: 8px;
  line-height: 1.2;
  letter-spacing: -0.02em;
  font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
  text-transform: none;
  letter-spacing: -0.02em;
}

/* ── Topic Intro → Editorial Quote ── */
.intro {
  color: var(--muted);
  font-style: italic;
  font-size: 16px;
  line-height: 1.65;
  margin-bottom: 28px;
  padding: 16px 20px;
  border-left: 3px solid var(--accent);
  background: var(--panel);
  border-radius: 0 12px 12px 0;
}

/* ────────────────────────────────────────────────
   ARTICLE ITEMS → Cards
   ──────────────────────────────────────────────── */
.article-card,
.item {
  display: flex;
  flex-direction: column;
  margin-bottom: 36px;
  background: var(--panel);
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
  border: 1px solid var(--line);
  /* override old flex-row defaults */
  gap: 0;
  padding-bottom: 0;
  border-bottom: none;
}
.article-card:hover,
.item:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2);
  border-color: var(--line-strong);
}
.article-card:last-child,
.item:last-child {
  margin-bottom: 0;
}

/* ── Hero Image ── */
.hero-thumb,
.item-img {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: var(--bg2);
  position: relative;
  flex-shrink: 0;
  border-radius: 0;
  /* override old thumbnail sizes */
  height: auto;
}
.hero-thumb img,
.item-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}
.article-card:hover .item-img img,
.item:hover .item-img img {
  transform: scale(1.04);
}

/* ── Thumb Fallback ── */
.thumb-fallback {
  display: grid;
  place-items: center;
  color: #fff;
  font-weight: 900;
  font-size: 20px;
  aspect-ratio: 16 / 9;
  width: 100%;
}
.thumb-fallback span {
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.5);
}

/* ── Article Body ── */
.body {
  padding: 22px 26px 26px;
  flex: 1;
  min-width: 0;
}

/* ── Headlines ── */
.headline,
.hl {
  font-size: clamp(18px, 3.5vw, 22px);
  font-weight: 700;
  line-height: 1.32;
  margin-bottom: 10px;
  color: var(--ink);
  letter-spacing: -0.01em;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
}

/* ── Source Badge ── */
.badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 3px 10px;
  border-radius: 4px;
  color: #fff;
  background: var(--c);
  margin-right: 6px;
  vertical-align: middle;
  white-space: nowrap;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* ── Trust Badge ── */
.trust-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: 4px;
  margin-right: 4px;
  vertical-align: middle;
  white-space: nowrap;
  border: 1px solid;
}
.trust-high {
  color: #22c55e;
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.12);
}
.trust-med {
  color: #f59e0b;
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.12);
}
.trust-low {
  color: #ef4444;
  border-color: #ef4444;
  background: rgba(239, 68, 68, 0.12);
}
.trust-unknown {
  color: var(--muted);
  border-color: var(--muted);
  background: rgba(107, 114, 128, 0.12);
}

/* ── Tag Badges ── */
.tag-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 999px;
  margin: 4px 4px 4px 0;
  vertical-align: middle;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.tag-red_flag {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.tag-worth_knowing {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.tag-model_wars {
  background: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.3);
}
.tag-breaking {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.tag-neutral {
  background: rgba(107, 114, 128, 0.12);
  color: var(--muted);
  border: 1px solid var(--line);
}

/* ── Snippet → Article Excerpt ── */
.snip {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.72;
  margin-bottom: 12px;
}

/* ── Item Meta (points, comments) ── */
.card .meta,
.item .meta {
  color: var(--muted);
  font-size: 13px;
  margin-bottom: 8px;
}

/* ── Source CTA Link ── */
.source-cta,
.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--accent);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  padding: 4px 0;
  transition: color 0.2s ease;
  overflow: visible;
  white-space: normal;
}
.source-cta::after,
.link::after {
  content: ' →';
  font-weight: 400;
  opacity: 0.7;
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.source-cta:hover,
.link:hover {
  color: var(--accent2);
}
.source-cta:hover::after,
.link:hover::after {
  opacity: 1;
  transform: translateX(3px);
}

/* ── "More" / Expand Button ── */
.more {
  border: 1px solid var(--line-strong);
  background: transparent;
  color: var(--muted);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 4px 8px 4px 0;
}
.more:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(0, 212, 170, 0.06);
}

/* ────────────────────────────────────────────────
   FULL TEXT TAB → Article Reading Format
   ──────────────────────────────────────────────── */
div.ft {
  background: var(--panel);
  border-radius: 16px;
  padding: 36px;
  overflow-x: hidden;
}
div.ft h1 {
  font-size: clamp(26px, 5vw, 36px);
  margin-bottom: 16px;
  color: var(--ink);
  font-weight: 800;
  letter-spacing: -0.02em;
}
div.ft h2 {
  font-size: clamp(20px, 4vw, 26px);
  margin: 32px 0 14px;
  color: var(--ink);
  font-weight: 700;
  border-bottom: 1px solid var(--line);
  padding-bottom: 10px;
  font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
}
div.ft p {
  font-size: 17px;
  color: var(--ink);
  margin-bottom: 20px;
  line-height: 1.82;
  word-wrap: break-word;
  overflow-wrap: break-word;
  font-family: Georgia, 'Times New Roman', 'Noto Serif', serif;
}
div.ft blockquote {
  color: var(--muted);
  font-size: 15px;
  padding: 16px 20px;
  margin: 24px 0;
  border-left: 3px solid var(--accent);
  background: var(--bg2);
  border-radius: 0 12px 12px 0;
  line-height: 1.7;
  font-style: italic;
}
div.ft .hl {
  font-weight: 700;
  color: var(--ink);
  margin: 24px 0 10px;
}
div.ft hr {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 28px 0;
}
div.ft code {
  font-size: 13px;
  background: var(--bg2);
  padding: 2px 8px;
  border-radius: 4px;
  color: var(--accent);
  font-family: 'SF Mono', 'Fira Code', monospace;
}
div.ft a {
  color: var(--accent);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
}

/* ────────────────────────────────────────────────
   TABS → Navigation Bar
   ──────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 40px;
  padding: 4px;
  background: var(--panel);
  border-radius: 14px;
  border: 1px solid var(--line);
}
.tab {
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: transparent;
  color: var(--muted);
  text-align: center;
  flex: 1;
  transition: all 0.2s ease;
  text-decoration: none;
}
.tab.a {
  background: var(--accent);
  color: #fff;
  font-weight: 600;
}
.tab:hover:not(.a) {
  color: var(--ink);
  background: var(--bg2);
}
.edit-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
}

/* ────────────────────────────────────────────────
   COMPARE TAB
   ──────────────────────────────────────────────── */
.cmp select {
  background: var(--bg2);
  color: var(--ink);
  border: 1px solid var(--accent);
  border-radius: 10px;
  padding: 8px 14px;
  margin-left: 8px;
  font-size: 14px;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.grid2 div {
  background: var(--bg2);
  border-radius: 12px;
  padding: 16px;
}
.grid2 b {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--muted);
}
.cmp li {
  color: var(--ink);
  font-size: 14px;
  margin: 8px 0;
  line-height: 1.5;
}

/* ────────────────────────────────────────────────
   EVIDENCE COMPOSER
   ──────────────────────────────────────────────── */
.evidence {
  margin-top: 28px;
  background: var(--panel);
  border: 1px solid var(--line-strong);
  border-radius: 16px;
  padding: 20px;
}
.evidence h2 {
  color: var(--accent2);
  font-size: 18px;
  margin-bottom: 8px;
}
.evidence h3 {
  color: var(--ink);
}
.block {
  border-left: 4px solid var(--muted);
  background: var(--bg2);
  border-radius: 12px;
  padding: 14px 16px;
  margin: 12px 0;
}
.block.cited { border-color: var(--green); }
.block.weak_evidence { border-color: var(--accent2); }
.block.assumption { border-color: var(--red); }
.block.actionable { border-color: var(--accent); }
.claim {
  border: 0;
  border-radius: 999px;
  background: var(--line);
  color: var(--ink);
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.claim:hover {
  background: var(--line-strong);
}
.block p {
  color: var(--ink);
  line-height: 1.6;
  margin: 8px 0;
  font-size: 14px;
}
.block small {
  color: var(--muted);
  font-size: 12px;
}
.drawer {
  position: fixed;
  right: 16px;
  top: 16px;
  bottom: 16px;
  width: min(440px, calc(100vw - 32px));
  z-index: 20;
  background: var(--bg2);
  color: var(--ink);
  border: 2px solid var(--line-strong);
  border-radius: 16px;
  box-shadow: 8px 8px 0 var(--line-strong);
  padding: 20px;
  overflow: auto;
}
.drawer textarea {
  width: 100%;
  border: 2px solid var(--line-strong);
  border-radius: 12px;
  padding: 12px;
  background: var(--bg);
  color: var(--ink);
  font-size: 14px;
  line-height: 1.6;
}
.x {
  float: right;
  border: 0;
  background: var(--ink);
  color: var(--bg2);
  border-radius: 999px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}
.x:hover { opacity: 0.8; }
.sources {
  margin-top: 12px;
  border-top: 1px solid var(--line-strong);
  padding-top: 8px;
}
.sources a {
  display: block;
  color: var(--accent);
  font-weight: 700;
  margin: 8px 0;
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
}
.sources a:hover {
  text-decoration: underline;
}

/* ────────────────────────────────────────────────
   CHARTS TAB
   ──────────────────────────────────────────────── */
.charts-tab {
  max-width: 900px;
  margin: 0 auto;
}
.charts-header {
  margin-bottom: 20px;
}
.charts-header h2 {
  color: var(--accent);
  font-size: 24px;
  margin-bottom: 4px;
  font-weight: 700;
}
.charts-subtitle {
  color: var(--muted);
  font-size: 14px;
}

/* ────────────────────────────────────────────────
   FOOTER
   ──────────────────────────────────────────────── */
.footer {
  text-align: center;
  color: var(--muted);
  font-size: 13px;
  margin-top: 56px;
  padding: 20px;
  border-top: 1px solid var(--line);
}

/* ────────────────────────────────────────────────
   LOADING & ERROR STATES
   ──────────────────────────────────────────────── */
.loading,
.err {
  text-align: center;
  padding: 80px 24px;
  color: var(--muted);
  font-size: 16px;
}
.err h2 {
  color: var(--red);
  margin-bottom: 8px;
  font-size: 24px;
}

/* ================================================================
   SEMANTIC SEARCH STYLES
   ================================================================ */
.semantic-search-wrap {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
  transition: border-color 0.2s;
}
.semantic-search-wrap.active {
  border-color: var(--accent2);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}
.ss-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.ss-toggle {
  flex-shrink: 0;
  border: 1px solid var(--line-strong);
  background: var(--bg2);
  color: var(--muted);
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.ss-toggle:hover {
  border-color: var(--accent);
  color: var(--ink);
}
.ss-toggle.on {
  background: rgba(245, 158, 11, 0.12);
  border-color: var(--accent2);
  color: var(--accent2);
}
.ss-toggle:disabled {
  opacity: 0.5;
  cursor: wait;
}
.ss-spinner {
  animation: ss-spin 0.8s linear infinite;
  display: inline-block;
}
@keyframes ss-spin {
  to { transform: rotate(360deg); }
}
.ss-input-wrap {
  flex: 1;
  position: relative;
  min-width: 0;
}
.ss-input {
  width: 100%;
  padding: 9px 36px 9px 14px;
  background: var(--bg2);
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--ink);
  font-size: 14px;
  transition: border-color 0.2s;
}
.ss-input:focus {
  border-color: var(--accent2);
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}
.ss-input::placeholder {
  color: var(--muted);
  opacity: 0.6;
}
.ss-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 50%;
}
.ss-clear:hover {
  color: var(--ink);
  background: var(--line);
}
.ss-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-top: 8px;
  flex-wrap: wrap;
}
.ss-threshold-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
}
.ss-label-text {
  white-space: nowrap;
}
.ss-slider {
  width: 80px;
  accent-color: var(--accent2);
  cursor: pointer;
}
.ss-threshold-val {
  font-weight: 800;
  color: var(--accent2);
  min-width: 36px;
  text-align: right;
  font-size: 12px;
}
.ss-meta {
  font-size: 12px;
  color: var(--muted);
}
.ss-error {
  font-size: 12px;
  color: var(--red);
  font-weight: 700;
}

/* ── Semantic Score Badges ── */
.ss-score-badge {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  margin-left: 4px;
  vertical-align: middle;
  white-space: nowrap;
}
.ss-high {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.ss-med {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
}
.ss-low {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}
.ss-score-inline {
  display: inline-block;
  font-size: 10px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 999px;
  margin-left: 8px;
  vertical-align: middle;
}

/* ── Semantic Highlight ── */
.ss-highlight {
  border-color: var(--accent2) !important;
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.15);
}

/* ================================================================
   ACCESSIBILITY: Focus Visible
   ================================================================ */
:focus-visible {
  outline: 3px solid var(--accent2);
  outline-offset: 3px;
  border-radius: 4px;
}
button:focus-visible,
a:focus-visible {
  outline: 3px solid var(--accent2);
  outline-offset: 2px;
}

/* ================================================================
   RESPONSIVE
   ================================================================ */
@media (max-width: 640px) {
  .rw {
    padding: 24px 16px 56px;
  }
  .display-headline,
  h1 {
    font-size: clamp(28px, 8vw, 40px);
  }
  .tabs {
    padding: 3px;
    gap: 2px;
    border-radius: 10px;
  }
  .tab {
    font-size: 12px;
    padding: 8px 10px;
    border-radius: 8px;
  }
  .topic-section > h2 {
    font-size: clamp(22px, 6vw, 28px);
  }
  .body {
    padding: 16px 18px 20px;
  }
  .headline,
  .hl {
    font-size: clamp(16px, 4vw, 19px);
  }
  .snip {
    font-size: 14px;
  }
  .intro {
    font-size: 14px;
    padding: 12px 16px;
  }
  .lead-body,
  .stext {
    font-size: 17px;
  }
  .fb {
    padding: 20px;
    border-radius: 12px;
  }
  .fb p {
    font-size: 15px;
  }
  div.ft {
    padding: 20px;
    border-radius: 12px;
  }
  div.ft p {
    font-size: 16px;
  }
  .grid2 {
    grid-template-columns: 1fr;
  }
  .ss-row {
    flex-wrap: wrap;
  }
  .ss-toggle {
    width: 100%;
    text-align: center;
  }
  .ss-input-wrap {
    width: 100%;
  }
  .ss-controls {
    flex-direction: column;
    align-items: stretch;
  }
  .ss-threshold-label {
    justify-content: center;
  }
}

@media (min-width: 1200px) {
  .rw {
    max-width: 820px;
  }
}
</style>
