<script setup>
import { ref, onMounted, computed } from 'vue'
import { apiGet } from '../lib/api'

const data = ref(null)
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  try {
    data.value = await apiGet('/api/market/alerts-summary')
  } catch (e) {
    error.value = String(e)
  } finally {
    loading.value = false
  }
}

onMounted(load)

const summary = computed(() => data.value?.summary || {})
const triggered = computed(() => data.value?.triggered || [])
const suggested = computed(() => data.value?.suggested || [])
const thresholdAlerts = computed(() => data.value?.threshold_alerts || [])
const breaches = computed(() => thresholdAlerts.value.filter(a => a.breach !== 'none'))
const movers = computed(() => thresholdAlerts.value.filter(a => a.breach === 'none').slice(0, 5))

function fmtPct(n) { return (n > 0 ? '+' : '') + Number(n || 0).toFixed(2) + '%' }
function fmtPrice(n) { return n != null ? Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—' }
function changeColor(v) { return v > 0 ? 'var(--green, #22c55e)' : v < 0 ? 'var(--red, #ef4444)' : 'var(--muted, #888)' }
function severityIcon(s) { return s === 'critical' ? '🔴' : s === 'warning' ? '🟡' : '⚪' }
function severityClass(s) { return s === 'critical' ? 'alert-critical' : s === 'warning' ? 'alert-warning' : 'alert-info' }
</script>

<template>
  <div class="alert-summary-widget">
    <div class="widget-header" @click="$emit('toggle')">
      <h3>⚡ Alert Dashboard</h3>
      <span class="summary-badges">
        <span v-if="summary.critical" class="badge critical">{{ summary.critical }} critical</span>
        <span v-if="summary.warning" class="badge warning">{{ summary.warning }} warning</span>
        <span v-if="summary.triggered" class="badge fired">{{ summary.triggered }} fired</span>
        <span v-if="summary.suggested" class="badge suggested">{{ summary.suggested }} suggested</span>
        <span v-if="!summary.critical && !summary.warning && !summary.triggered && !summary.suggested" class="badge ok">all clear</span>
      </span>
    </div>

    <div v-if="loading" class="widget-loading">
      <span class="spinner"></span> Loading alerts...
    </div>

    <div v-else-if="error" class="widget-error">{{ error }}</div>

    <div v-else class="widget-body">
      <!-- Critical + Warning Breaches -->
      <div v-if="breaches.length" class="section">
        <h4>🚨 Active Breaches</h4>
        <div class="alert-list">
          <div v-for="a in breaches" :key="a.asset_slug" :class="['alert-item', severityClass(a.severity)]">
            <span class="alert-icon">{{ severityIcon(a.severity) }}</span>
            <div class="alert-info">
              <span class="alert-symbol">{{ a.symbol }}</span>
              <span class="alert-name">{{ a.name }}</span>
              <span class="alert-market">{{ a.market }}</span>
            </div>
            <div class="alert-data">
              <span class="alert-price">{{ fmtPrice(a.current_price) }}</span>
              <span :class="['alert-change', a.change_percent > 0 ? 'up' : 'down']">{{ fmtPct(a.change_percent) }}</span>
            </div>
            <div class="alert-threshold">
              <span v-if="a.breach === 'up'" class="breach-up">↑ above {{ fmtPct(a.threshold_up) }}</span>
              <span v-else class="breach-down">↓ below {{ fmtPct(a.threshold_down) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- No Breaches -->
      <div v-else class="section section-ok">
        <span class="ok-icon">✅</span> No active threshold breaches
      </div>

      <!-- Triggered Alerts (from alert history) -->
      <div v-if="triggered.length" class="section">
        <h4>🔔 Recent Triggered Alerts</h4>
        <div class="alert-list">
          <div v-for="a in triggered.slice(0, 5)" :key="a.id" class="alert-item alert-history">
            <div class="alert-info">
              <span class="alert-symbol">{{ a.symbol || a.asset_slug }}</span>
              <span class="alert-title">{{ a.title }}</span>
            </div>
            <div class="alert-meta">
              <span class="alert-time">{{ new Date(a.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }) }}</span>
              <span v-if="a.discord_sent" class="badge sent">sent</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Suggested Alerts from Reports -->
      <div v-if="suggested.length" class="section">
        <h4>💡 Suggested Alerts (from Reports)</h4>
        <div class="alert-list">
          <div v-for="a in suggested.slice(0, 5)" :key="a.id" class="alert-item alert-suggested">
            <div class="alert-info">
              <span class="alert-symbol">{{ a.symbol }}</span>
              <span class="alert-name">{{ a.name }}</span>
              <span class="alert-dir" :class="a.direction">{{ a.direction === 'up' ? '↑' : '↓' }} {{ fmtPrice(a.target_price) }}</span>
            </div>
            <div class="alert-data">
              <span class="alert-dist">{{ a.distance_pct > 0 ? '+' : '' }}{{ a.distance_pct }}% away</span>
              <span class="alert-conf">{{ Math.round(a.confidence * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Watchlist Movers (near threshold) -->
      <div v-if="movers.length" class="section">
        <h4>📈 Watchlist Movers</h4>
        <div class="alert-list">
          <div v-for="a in movers" :key="a.asset_slug" class="alert-item alert-mover">
            <div class="alert-info">
              <span class="alert-symbol">{{ a.symbol }}</span>
              <span class="alert-name">{{ a.name }}</span>
            </div>
            <div class="alert-data">
              <span class="alert-price">{{ fmtPrice(a.current_price) }}</span>
              <span :class="['alert-change', a.change_percent > 0 ? 'up' : 'down']">{{ fmtPct(a.change_percent) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.alert-summary-widget {
  background: var(--card-bg, #1a1a2e);
  border: 1px solid var(--border, #2a2a4a);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.widget-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  margin-bottom: 12px;
}

.widget-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--text, #e0e0e0);
}

.summary-badges {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.badge {
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
}

.badge.critical { background: #7f1d1d; color: #fca5a5; }
.badge.warning { background: #78350f; color: #fcd34d; }
.badge.fired { background: #312e81; color: #c4b5fd; }
.badge.suggested { background: #064e3b; color: #6ee7b7; }
.badge.ok { background: #064e3b; color: #34d399; }
.badge.sent { background: #1e3a5f; color: #93c5fd; }

.widget-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted, #888);
  padding: 12px 0;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--border, #2a2a4a);
  border-top-color: var(--accent, #6366f1);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.widget-error { color: var(--red, #ef4444); font-size: 0.85rem; }

.section { margin-bottom: 14px; }
.section h4 { margin: 0 0 8px; font-size: 0.85rem; color: var(--muted, #aaa); font-weight: 500; }
.section-ok {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(34, 197, 94, 0.08);
  border-radius: 8px;
  color: var(--green, #22c55e);
  font-size: 0.85rem;
}

.alert-list { display: flex; flex-direction: column; gap: 6px; }

.alert-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 0.82rem;
}

.alert-item.alert-critical { background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444; }
.alert-item.alert-warning { background: rgba(245, 158, 11, 0.08); border-left: 3px solid #f59e0b; }
.alert-item.alert-history { background: rgba(99, 102, 241, 0.06); }
.alert-item.alert-suggested { background: rgba(34, 197, 94, 0.06); }
.alert-item.alert-mover { background: rgba(255, 255, 255, 0.02); }

.alert-icon { font-size: 1rem; }

.alert-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.alert-symbol {
  font-weight: 700;
  color: var(--text, #e0e0e0);
  min-width: 48px;
}

.alert-name, .alert-title {
  color: var(--muted, #aaa);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alert-market {
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.7rem;
  color: var(--muted, #888);
}

.alert-dir { font-weight: 600; margin-left: auto; }
.alert-dir.up { color: var(--green, #22c55e); }
.alert-dir.down { color: var(--red, #ef4444); }

.alert-data {
  display: flex;
  align-items: center;
  gap: 6px;
}

.alert-price { color: var(--text, #e0e0e0); font-weight: 500; font-variant-numeric: tabular-nums; }
.alert-change { font-weight: 600; font-size: 0.78rem; font-variant-numeric: tabular-nums; }
.alert-change.up { color: var(--green, #22c55e); }
.alert-change.down { color: var(--red, #ef4444); }

.alert-threshold { font-size: 0.75rem; color: var(--muted, #888); }
.breach-up { color: var(--green, #22c55e); }
.breach-down { color: var(--red, #ef4444); }

.alert-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}

.alert-time { font-size: 0.75rem; color: var(--muted, #888); }
.alert-dist { color: var(--muted, #aaa); font-size: 0.78rem; }
.alert-conf { color: var(--accent, #6366f1); font-weight: 600; font-size: 0.78rem; }
</style>
