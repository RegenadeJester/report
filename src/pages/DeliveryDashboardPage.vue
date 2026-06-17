<template>
  <main class="dash">
    <section class="hero">
      <p class="kicker">Ops</p>
      <h1>Delivery Health</h1>
      <p>Status report, file deliverables, Discord delivery log, retry queue.</p>
      <button @click="generate" :disabled="loading">{{ loading ? 'Generating…' : 'Generate + Send Report' }}</button>
    </section>

    <!-- Health Status Cards -->
    <section v-if="health" class="health-cards">
      <div class="hc overall" :class="'hc-' + health.overall_status">
        <div class="hc-dot" :class="'dot-' + health.overall_status"></div>
        <div class="hc-body">
          <span class="hc-label">System</span>
          <span class="hc-value">{{ health.overall_status.toUpperCase() }}</span>
          <span class="hc-reason">{{ health.overall_reason }}</span>
        </div>
      </div>
      <div class="hc">
        <div class="hc-icon">📋</div>
        <div class="hc-body">
          <span class="hc-label">Last Report</span>
          <span class="hc-value">{{ health.report_age_hours != null ? health.report_age_hours + 'h ago' : '—' }}</span>
          <span class="hc-reason">{{ health.total_reports }} total report(s)</span>
        </div>
      </div>
      <div class="hc">
        <div class="hc-icon">🚀</div>
        <div class="hc-body">
          <span class="hc-label">Delivery Rate</span>
          <span class="hc-value" :class="deliveryRateClass">{{ health.delivery_success_rate != null ? health.delivery_success_rate + '%' : '—' }}</span>
          <span class="hc-reason">last {{ health.delivery_sample_size }} attempts</span>
        </div>
      </div>
      <div class="hc">
        <div class="hc-icon">📦</div>
        <div class="hc-body">
          <span class="hc-label">Deliverables</span>
          <span class="hc-value" :class="deliverablesClass">{{ health.deliverables_ok }}/{{ health.deliverables_total }}</span>
          <span class="hc-reason">html · json · md · card</span>
        </div>
      </div>
      <div class="hc">
        <div class="hc-icon">📬</div>
        <div class="hc-body">
          <span class="hc-label">Queue</span>
          <span class="hc-value" :class="queueClass">{{ health.queue_pending + health.queue_failed + health.queue_queued }} items</span>
          <span class="hc-reason">{{ health.queue_pending }} pending · {{ health.queue_failed }} failed · {{ health.queue_queued }} queued</span>
        </div>
      </div>
    </section>

    <!-- Existing sections -->
    <section v-if="data" class="grid">
      <article class="panel">
        <h2>Latest</h2>
        <b>{{ data.latest_report }}</b>
        <p><a :href="data.local" target="_blank">Local</a> · <a :href="data.tailscale" target="_blank">Tailscale</a></p>
      </article>
      <article class="panel">
        <h2>Deliverables</h2>
        <p v-for="(v, k) in data.deliverables" :key="k"><b>{{ k }}</b>: {{ v ? '✅ OK' : '❌ MISSING' }}</p>
      </article>
    </section>

    <section class="panel" v-if="data">
      <h2>Send Queue</h2>
      <div class="summary">
        <span v-for="x in queueSummary" :key="x.status" :class="x.status">{{ x.status }}: {{ x.count }}</span>
        <span v-if="!queueSummary.length" class="ok">empty</span>
      </div>
      <div class="log queue" v-for="x in queueRows" :key="x.id">
        <b>#{{ x.id }} {{ x.step }}</b>
        <span :class="x.status">{{ x.status }}</span>
        <small>{{ x.channel }} · {{ x.slug }} · attempts {{ x.attempts }} · next {{ x.next_attempt_at || '-' }} · {{ x.last_error || 'no error' }}</small>
      </div>
    </section>

    <section class="panel" v-if="data">
      <h2>Delivery Log</h2>
      <div class="log" v-for="x in data.delivery" :key="x.step + x.created_at">
        <b>{{ x.step }}</b>
        <span :class="x.status">{{ x.status }}</span>
        <small>{{ x.detail }} · {{ x.created_at }}</small>
      </div>
    </section>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { apiGet, apiPost } from '../lib/api'

const data = ref(null)
const loading = ref(false)

const health = computed(() => data.value?.health || null)
const queueSummary = computed(() => data.value?.send_queue?.summary || [])
const queueRows = computed(() => data.value?.send_queue?.pending_failed || [])

const deliveryRateClass = computed(() => {
  const r = health.value?.delivery_success_rate
  if (r == null) return ''
  if (r >= 90) return 'val-good'
  if (r >= 70) return 'val-warn'
  return 'val-bad'
})

const deliverablesClass = computed(() => {
  const h = health.value
  if (!h) return ''
  return h.deliverables_ok === h.deliverables_total ? 'val-good' : 'val-warn'
})

const queueClass = computed(() => {
  const h = health.value
  if (!h) return ''
  if (h.queue_failed > 0) return 'val-bad'
  if (h.queue_pending > 3) return 'val-warn'
  return 'val-good'
})

async function load() { data.value = await apiGet('/api/report-health') }
async function generate() {
  loading.value = true
  try { await apiPost('/api/ai-daily-report/generate', {}); await load() } finally { loading.value = false }
}
onMounted(load)
</script>

<style scoped>
.dash { max-width: 1100px; margin: auto; padding: 24px 14px 70px; color: var(--ink) }
.hero, .panel { background: var(--bg2); border: 2px solid var(--line-strong); box-shadow: 5px 5px 0 var(--line-strong); padding: 18px; margin-bottom: 16px }
.hero { background: #facc15 }
.hero h1 { font-size: clamp(42px, 8vw, 80px); margin: 0; letter-spacing: -.07em }
.kicker { text-transform: uppercase; font-weight: 900; color: #9a3412 }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px }
.log { display: grid; grid-template-columns: 160px 90px 1fr; gap: 10px; border-top: 1px solid var(--line); padding: 10px }
.queue { grid-template-columns: 190px 90px 1fr }
.summary { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px }
.summary span { border: 2px solid var(--line-strong); padding: 6px 10px; font-weight: 900 }
.ok, .sent, .done { color: var(--green); font-weight: 900 }
.fail, .failed { color: var(--red); font-weight: 900 }
.pending { color: var(--accent2); font-weight: 900 }
.running, .retry { color: var(--accent); font-weight: 900 }
button { border: 2px solid var(--line-strong); background: var(--ink); color: var(--accent2); padding: 10px 14px; font-weight: 900 }

/* Health cards */
.health-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 18px;
}
.hc {
  background: var(--bg2);
  border: 2px solid var(--line-strong);
  box-shadow: 4px 4px 0 var(--line-strong);
  padding: 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.hc.overall { grid-column: 1 / -1 }
.hc-dot {
  width: 14px; height: 14px;
  border-radius: 50%;
  margin-top: 4px;
  flex-shrink: 0;
}
.dot-healthy { background: var(--green, #22c55e); box-shadow: 0 0 8px var(--green, #22c55e) }
.dot-degraded { background: #f59e0b; box-shadow: 0 0 8px #f59e0b }
.dot-critical { background: var(--red, #ef4444); box-shadow: 0 0 8px var(--red, #ef4444); animation: pulse 1.5s ease-in-out infinite }
@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
.hc-icon { font-size: 1.4rem; flex-shrink: 0 }
.hc-body { display: flex; flex-direction: column; gap: 2px }
.hc-label { font-size: 0.65rem; text-transform: uppercase; font-weight: 800; letter-spacing: 0.1em; color: var(--muted, #888) }
.hc-value { font-size: 1.4rem; font-weight: 900; line-height: 1.1 }
.hc-reason { font-size: 0.75rem; color: var(--muted, #888) }
.val-good { color: var(--green, #22c55e) }
.val-warn { color: #f59e0b }
.val-bad { color: var(--red, #ef4444) }

@media (max-width: 720px) {
  .grid, .log, .queue { grid-template-columns: 1fr }
  .health-cards { grid-template-columns: 1fr 1fr }
}
</style>
