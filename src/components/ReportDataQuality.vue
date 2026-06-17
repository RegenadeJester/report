<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE } from '../lib/api'

const props = defineProps({
  reportSlug: { type: String, required: true }
})

const loading = ref(true)
const error = ref('')
const expanded = ref(false)
const quality = ref(null)
const gaps = ref([])

const qualityBadge = computed(() => {
  if (!quality.value) return { label: 'Unknown', color: '#6b7280', bg: 'rgba(107,114,128,.12)', icon: '📊' }
  const score = quality.value.score ?? quality.value.overall_score ?? 0
  if (score >= 80) return { label: 'Good', color: '#22c55e', bg: 'rgba(34,197,94,.12)', icon: '✅' }
  if (score >= 50) return { label: 'Fair', color: '#f59e0b', bg: 'rgba(245,158,11,.12)', icon: '⚠️' }
  return { label: 'Poor', color: '#ef4444', bg: 'rgba(239,68,68,.12)', icon: '❌' }
})

const qualityScore = computed(() => {
  if (!quality.value) return null
  return quality.value.score ?? quality.value.overall_score ?? null
})

const sourceFreshness = computed(() => {
  if (!quality.value) return []
  const sources = quality.value.sources || quality.value.data_sources || []
  return sources.map(s => ({
    name: s.name || s.source || 'Unknown',
    freshness: freshnessLabel(s.last_updated || s.freshness || s.updated_at),
    status: freshnessStatus(s.last_updated || s.freshness || s.updated_at),
    icon: freshnessIcon(s.last_updated || s.freshness || s.updated_at)
  }))
})

const dataIssues = computed(() => {
  if (!quality.value) return []
  return quality.value.issues || quality.value.data_issues || []
})

const gapCount = computed(() => gaps.value.length)

function freshnessLabel(val) {
  if (!val) return 'Unknown'
  if (typeof val === 'string' && /\d/.test(val)) return val
  if (typeof val === 'number') {
    const hours = Math.floor(val / 3600)
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }
  return String(val)
}

function freshnessStatus(val) {
  if (!val) return 'unknown'
  if (typeof val === 'number') {
    if (val < 7200) return 'fresh'
    if (val < 86400) return 'stale'
    return 'old'
  }
  return 'unknown'
}

function freshnessIcon(val) {
  const s = freshnessStatus(val)
  if (s === 'fresh') return '✅'
  if (s === 'stale') return '⚠️'
  if (s === 'old') return '❌'
  return '📊'
}

function issueIcon(severity) {
  const s = String(severity).toLowerCase()
  if (s === 'critical' || s === 'error') return '❌'
  if (s === 'warning' || s === 'medium') return '⚠️'
  if (s === 'info' || s === 'low') return '📊'
  return '⚠️'
}

function issueClass(severity) {
  const s = String(severity).toLowerCase()
  if (s === 'critical' || s === 'error') return 'rdq-issue-critical'
  if (s === 'warning' || s === 'medium') return 'rdq-issue-warning'
  return 'rdq-issue-info'
}

async function fetchData() {
  loading.value = true
  error.value = ''
  try {
    const [qualityRes, gapsRes] = await Promise.allSettled([
      fetch(`${API_BASE}/api/report/${props.reportSlug}/quality`),
      fetch(`${API_BASE}/api/report-context/gaps?slug=${encodeURIComponent(props.reportSlug)}`)
    ])

    if (qualityRes.status === 'fulfilled' && qualityRes.value.ok) {
      quality.value = await qualityRes.value.json()
    } else if (qualityRes.status === 'fulfilled') {
      // Endpoint may not exist yet — provide defaults
      quality.value = { score: null, sources: [], issues: [] }
    } else {
      quality.value = { score: null, sources: [], issues: [] }
    }

    if (gapsRes.status === 'fulfilled' && gapsRes.value.ok) {
      const gData = await gapsRes.value.json()
      gaps.value = Array.isArray(gData) ? gData : (gData.gaps || gData.data || [])
    } else {
      gaps.value = []
    }
  } catch (e) {
    error.value = e.message || 'Failed to load data quality info'
    quality.value = { score: null, sources: [], issues: [] }
    gaps.value = []
  } finally {
    loading.value = false
  }
}

function toggleExpand() {
  expanded.value = !expanded.value
}

onMounted(fetchData)
</script>

<template>
  <section class="rdq" v-if="!loading || quality">
    <!-- Collapsible Header -->
    <button class="rdq-header" @click="toggleExpand" :aria-expanded="expanded" :aria-label="`Data Quality: ${qualityBadge.label}`">
      <div class="rdq-header-left">
        <span class="rdq-badge" :style="{ color: qualityBadge.color, background: qualityBadge.bg, borderColor: qualityBadge.color }">
          {{ qualityBadge.icon }} {{ qualityBadge.label }}
        </span>
        <span class="rdq-title">📊 Data Quality</span>
        <span v-if="qualityScore !== null" class="rdq-score" :style="{ color: qualityBadge.color }">{{ qualityScore }}%</span>
      </div>
      <div class="rdq-header-right">
        <span v-if="gapCount > 0" class="rdq-gaps-badge">⚠️ {{ gapCount }} gap{{ gapCount !== 1 ? 's' : '' }}</span>
        <span class="rdq-chevron" :class="{ open: expanded }">▾</span>
      </div>
    </button>

    <!-- Collapsible Body -->
    <Transition name="rdq-expand">
      <div v-if="expanded" class="rdq-body">
        <!-- Error State -->
        <div v-if="error" class="rdq-error">
          <span>⚠️</span> {{ error }}
        </div>

        <!-- Loading Skeleton -->
        <div v-if="loading && !quality" class="rdq-loading">
          <div class="rdq-skeleton rdq-skel-1"></div>
          <div class="rdq-skeleton rdq-skel-2"></div>
        </div>

        <template v-else>
          <!-- Data Source Freshness -->
          <div v-if="sourceFreshness.length" class="rdq-section">
            <h4 class="rdq-section-title">🕐 Data Source Freshness</h4>
            <div class="rdq-source-list">
              <div v-for="(src, i) in sourceFreshness" :key="i" class="rdq-source">
                <span class="rdq-source-icon">{{ src.icon }}</span>
                <span class="rdq-source-name">{{ src.name }}</span>
                <span class="rdq-source-freshness" :class="`rdq-fresh-${src.status}`">{{ src.freshness }}</span>
              </div>
            </div>
          </div>

          <!-- Data Issues -->
          <div v-if="dataIssues.length" class="rdq-section">
            <h4 class="rdq-section-title">🔔 Data Issues ({{ dataIssues.length }})</h4>
            <div class="rdq-issues-list">
              <div v-for="(issue, i) in dataIssues" :key="i" class="rdq-issue" :class="issueClass(issue.severity || issue.level)">
                <span class="rdq-issue-icon">{{ issueIcon(issue.severity || issue.level) }}</span>
                <div class="rdq-issue-body">
                  <span class="rdq-issue-msg">{{ issue.message || issue.description || issue.text || issue }}</span>
                  <span v-if="issue.source || issue.field" class="rdq-issue-meta">{{ issue.source || issue.field }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Data Gaps -->
          <div v-if="gapCount > 0" class="rdq-section">
            <h4 class="rdq-section-title">🕳️ Data Gaps ({{ gapCount }})</h4>
            <ul class="rdq-gaps-list">
              <li v-for="(gap, i) in gaps" :key="i" class="rdq-gap-item">
                <span>⚠️</span>
                <span>{{ gap.description || gap.text || gap.type || gap }}</span>
              </li>
            </ul>
          </div>

          <!-- No Data -->
          <div v-if="!sourceFreshness.length && !dataIssues.length && !gapCount" class="rdq-empty">
            <span>✅</span> No quality issues detected. Data sources appear healthy.
          </div>

          <!-- Raw Metadata Toggle -->
          <details v-if="quality" class="rdq-raw">
            <summary class="rdq-raw-toggle">📋 Raw Quality Data</summary>
            <pre class="rdq-raw-json">{{ JSON.stringify(quality, null, 2) }}</pre>
          </details>
        </template>
      </div>
    </Transition>
  </section>
</template>

<style scoped>
/* ─── Container ─── */
.rdq {
  background: var(--panel, #111827);
  border: 2px solid var(--line, #263247);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 14px;
  transition: border-color .2s;
}
.rdq:hover { border-color: var(--line-strong, #4b5d7a); }

/* ─── Header ─── */
.rdq-header {
  width: 100%;
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 16px;
  background: transparent;
  border: 0; cursor: pointer;
  color: var(--ink, #ebf2ff);
  transition: background .15s;
}
.rdq-header:hover { background: rgba(255,255,255,.03); }
.rdq-header-left { display: flex; align-items: center; gap: 10px; }
.rdq-header-right { display: flex; align-items: center; gap: 10px; }
.rdq-title { font-size: 14px; font-weight: 800; }
.rdq-badge {
  font-size: 11px; font-weight: 800;
  padding: 3px 10px;
  border-radius: 999px;
  border: 1px solid;
  white-space: nowrap;
}
.rdq-score {
  font-size: 13px; font-weight: 900;
}
.rdq-gaps-badge {
  font-size: 11px; font-weight: 700;
  color: var(--accent2, #f59e0b);
  white-space: nowrap;
}
.rdq-chevron {
  font-size: 14px;
  color: var(--muted, #9fb0cf);
  transition: transform .2s;
}
.rdq-chevron.open { transform: rotate(180deg); }

/* ─── Body ─── */
.rdq-body {
  padding: 0 16px 16px;
  border-top: 1px solid var(--line, #263247);
}

/* ─── Sections ─── */
.rdq-section { margin-top: 14px; }
.rdq-section-title {
  margin: 0 0 8px;
  font-size: 13px; font-weight: 800;
  color: var(--accent, #60a5fa);
}

/* ─── Source List ─── */
.rdq-source-list { display: flex; flex-direction: column; gap: 6px; }
.rdq-source {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 10px;
  background: var(--bg2, #111827);
  border: 1px solid var(--line, #263247);
  border-radius: 10px;
  font-size: 12px;
}
.rdq-source-icon { font-size: 14px; flex-shrink: 0; }
.rdq-source-name { font-weight: 700; color: var(--ink, #ebf2ff); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rdq-source-freshness { font-size: 11px; font-weight: 700; white-space: nowrap; }
.rdq-fresh-fresh { color: #22c55e; }
.rdq-fresh-stale { color: #f59e0b; }
.rdq-fresh-old { color: #ef4444; }
.rdq-fresh-unknown { color: var(--muted, #9fb0cf); }

/* ─── Issues ─── */
.rdq-issues-list { display: flex; flex-direction: column; gap: 6px; }
.rdq-issue {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  border-left: 3px solid;
}
.rdq-issue-critical { background: rgba(239,68,68,.08); border-left-color: #ef4444; }
.rdq-issue-warning { background: rgba(245,158,11,.08); border-left-color: #f59e0b; }
.rdq-issue-info { background: rgba(96,165,250,.08); border-left-color: #60a5fa; }
.rdq-issue-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }
.rdq-issue-body { display: flex; flex-direction: column; gap: 2px; }
.rdq-issue-msg { color: var(--ink, #ebf2ff); line-height: 1.4; }
.rdq-issue-meta { font-size: 10px; color: var(--muted, #9fb0cf); }

/* ─── Gaps ─── */
.rdq-gaps-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rdq-gap-item {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 8px 10px;
  background: rgba(245,158,11,.06);
  border: 1px solid rgba(245,158,11,.2);
  border-radius: 10px;
  font-size: 12px;
  color: var(--ink, #ebf2ff);
}

/* ─── Empty ─── */
.rdq-empty {
  margin-top: 14px;
  padding: 14px;
  background: rgba(34,197,94,.06);
  border: 1px solid rgba(34,197,94,.2);
  border-radius: 10px;
  font-size: 13px;
  color: #22c55e;
  text-align: center;
}

/* ─── Error ─── */
.rdq-error {
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(239,68,68,.08);
  border: 1px solid rgba(239,68,68,.2);
  border-radius: 10px;
  font-size: 12px;
  color: var(--red, #fb7185);
}

/* ─── Loading ─── */
.rdq-loading { padding: 12px 0; }
.rdq-skeleton {
  height: 32px;
  border-radius: 10px;
  background: linear-gradient(90deg, var(--bg2, #111827) 25%, var(--line, #263247) 50%, var(--bg2, #111827) 75%);
  background-size: 200% 100%;
  animation: rdq-shimmer 1.5s infinite;
  margin-bottom: 8px;
}
.rdq-skel-1 { width: 70%; }
.rdq-skel-2 { width: 50%; }
@keyframes rdq-shimmer { to { background-position: -200% 0; } }

/* ─── Raw Data ─── */
.rdq-raw { margin-top: 12px; }
.rdq-raw-toggle {
  font-size: 11px; font-weight: 700;
  color: var(--muted, #9fb0cf);
  cursor: pointer;
  padding: 4px 0;
}
.rdq-raw-toggle:hover { color: var(--ink, #ebf2ff); }
.rdq-raw-json {
  margin: 6px 0 0;
  padding: 10px;
  background: var(--bg, #0b0f17);
  border: 1px solid var(--line, #263247);
  border-radius: 8px;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 10px;
  color: var(--muted, #9fb0cf);
  overflow-x: auto;
  max-height: 200px;
  line-height: 1.5;
}

/* ─── Expand Transition ─── */
.rdq-expand-enter-active, .rdq-expand-leave-active {
  transition: all .25s ease;
  overflow: hidden;
}
.rdq-expand-enter-from, .rdq-expand-leave-to {
  opacity: 0;
  max-height: 0;
}
.rdq-expand-enter-to, .rdq-expand-leave-from {
  opacity: 1;
  max-height: 1000px;
}
</style>
