<template>
  <main class="page">
    <section class="hero">
      <p class="kicker">Ops</p>
      <h1>Pipeline Monitor</h1>
      <p>APM pipeline run status, stage breakdown, event timeline.</p>
    </section>

    <section v-if="loading" class="panel"><p>Memuat…</p></section>
    <section v-else-if="error" class="panel error"><p>{{ error }}</p></section>

    <!-- Stats Cards -->
    <section v-if="stats" class="cards">
      <article class="card"><div class="val">{{ stats.totalRuns }}</div><div class="lbl">Total Runs</div></article>
      <article class="card"><div class="val ok">{{ stats.completed }}</div><div class="lbl">Completed</div></article>
      <article class="card"><div class="val warn">{{ stats.running }}</div><div class="lbl">Running</div></article>
      <article class="card"><div class="val err">{{ stats.failed }}</div><div class="lbl">Failed</div></article>
      <article class="card"><div class="val">{{ stats.avgIngested || '—' }}</div><div class="lbl">Avg Ingested</div></article>
      <article class="card"><div class="val">{{ stats.avgScore || '—' }}</div><div class="lbl">Avg Score</div></article>
    </section>

    <!-- Latest Run -->
    <section v-if="latest?.run" class="panel">
      <div class="run-header">
        <h2>Latest Run</h2>
        <span :class="['badge', latest.run.status]">{{ latest.run.status }}</span>
      </div>
      <div class="run-meta">
        <span>ID: {{ latest.run.id }}</span>
        <span>{{ fmt(latest.run.started_at) }}</span>
        <span v-if="latest.run.completed_at">→ {{ fmt(latest.run.completed_at) }}</span>
        <span v-if="latest.run.items_ingested">Ingested: {{ latest.run.items_ingested }}</span>
        <span v-if="latest.run.items_classified">Classified: {{ latest.run.items_classified }}</span>
        <span v-if="latest.run.report_score != null">Score: {{ latest.run.report_score }}</span>
      </div>
      <div v-if="latest.run.events?.length" class="events">
        <h3>Event Timeline</h3>
        <div class="evt" v-for="e in latest.run.events" :key="e.id">
          <span class="evt-time">{{ fmt(e.created_at) }}</span>
          <span class="evt-stage">{{ e.stage }}</span>
          <span class="evt-type" :class="e.type">{{ e.type }}</span>
          <span class="evt-msg">{{ e.message }}</span>
        </div>
      </div>
    </section>

    <!-- Recent Events -->
    <section v-if="recent?.length" class="panel">
      <h2>Recent Events</h2>
      <div class="evt" v-for="e in recent" :key="e.id">
        <span class="evt-time">{{ fmt(e.created_at) }}</span>
        <span class="evt-stage">{{ e.stage }}</span>
        <span class="evt-type" :class="e.type">{{ e.type }}</span>
        <span class="evt-msg">{{ e.message }}</span>
        <small class="evt-run">run #{{ e.run_id }}</small>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../lib/api'

const loading = ref(true)
const error = ref(null)
const stats = ref(null)
const latest = ref(null)
const recent = ref(null)

const fmt = (ts) => ts ? new Date(ts).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' }) : '—'

onMounted(async () => {
  try {
    const [s, l, r] = await Promise.all([
      apiGet('/api/pipeline/stats'),
      apiGet('/api/pipeline/latest'),
      apiGet('/api/pipeline/recent?limit=30')
    ])
    stats.value = s
    latest.value = l
    recent.value = r
  } catch (e) {
    error.value = 'Gagal memuat: ' + e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.page { max-width: 1100px; margin: auto; padding: 24px 14px 70px; color: var(--ink) }
.hero { background: #facc15; border: 2px solid var(--line-strong); box-shadow: 5px 5px 0 var(--line-strong); padding: 18px; margin-bottom: 16px }
.hero h1 { font-size: clamp(42px,8vw,80px); margin: 0; letter-spacing: -.07em }
.kicker { text-transform: uppercase; font-weight: 900; color: #9a3412 }
.hero p:last-child { color: var(--ink); opacity: .8 }

.panel, .card { background: var(--bg2); border: 2px solid var(--line-strong); box-shadow: 5px 5px 0 var(--line-strong); padding: 18px; margin-bottom: 16px }
.panel.error { border-color: var(--red); background: #fee }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 16px }
.card { text-align: center; padding: 16px }
.val { font-size: 32px; font-weight: 900; line-height: 1.1 }
.lbl { font-size: 12px; text-transform: uppercase; color: var(--muted); margin-top: 4px }
.val.ok { color: var(--green) }
.val.warn { color: var(--accent2) }
.val.err { color: var(--red) }

.run-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px }
.badge { padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 900; text-transform: uppercase }
.badge.completed { background: var(--green); color: #fff }
.badge.running { background: var(--accent2); color: #fff }
.badge.failed { background: var(--red); color: #fff }
.badge.pending { background: var(--muted); color: var(--ink) }

.run-meta { display: flex; flex-wrap: wrap; gap: 16px; margin: 12px 0; font-size: 14px; color: var(--muted) }
.run-meta span { background: var(--bg3); padding: 2px 8px; border-radius: 4px }

.events h3 { margin: 16px 0 8px; font-size: 16px }
.evt { display: grid; grid-template-columns: 90px 80px 70px 1fr; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--line) }
.evt:last-child { border-bottom: none }
.evt-time { color: var(--muted); font-size: 12px }
.evt-stage { font-weight: 600; font-size: 12px; color: var(--accent) }
.evt-type { text-transform: uppercase; font-size: 10px; font-weight: 900; padding: 1px 6px; border-radius: 3px; width: fit-content }
.evt-type.start { background: var(--blue); color: #fff }
.evt-type.complete { background: var(--green); color: #fff }
.evt-type.error { background: var(--red); color: #fff }
.evt-type.info { background: var(--muted); color: var(--ink) }
.evt-msg { font-size: 13px }
.evt-run { color: var(--muted); font-size: 11px }
</style>