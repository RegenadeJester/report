<script setup>
import { ref, onMounted } from 'vue'
import { apiGet } from '../lib/api'

const status = ref(null)
const loading = ref(true)

const LABEL_MAP = {
  crypto: { name: 'Crypto', icon: '₿' },
  forex: { name: 'Forex', icon: '💱' },
  idx: { name: 'IDX', icon: '🇮🇩' },
  nyse: { name: 'NYSE/NASDAQ', icon: '🇺🇸' },
}

const FRESHNESS_COLOR = {
  live: '#22c55e',
  closed: '#ef4444',
  holiday: '#f59e0b',
  stale: '#a855f7',
}

async function load() {
  try {
    const data = await apiGet('/api/market-calendar')
    status.value = data.summary || {}
  } catch {}
  loading.value = false
}

onMounted(() => { load() })
</script>

<template>
  <div v-if="!loading && status" class="market-status-bar">
    <div v-for="(s, key) in status" :key="key" class="market-chip">
      <span class="market-icon">{{ LABEL_MAP[key]?.icon || '📊' }}</span>
      <span class="market-name">{{ LABEL_MAP[key]?.name || key }}</span>
      <span class="market-dot" :style="{ background: FRESHNESS_COLOR[s.data_freshness] || '#999' }"></span>
      <span class="market-label" :class="s.data_freshness">{{ s.label }}</span>
      <span v-if="s.detail" class="market-detail">{{ s.detail }}</span>
    </div>
  </div>
  <div v-else-if="loading" class="market-status-bar loading">
    <span class="market-chip muted">Memuat status pasar...</span>
  </div>
</template>

<style scoped>
.market-status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 0;
  align-items: center;
}
.market-status-bar.loading {
  padding: 8px 0;
}
.market-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 4px 10px;
  font-size: 12px;
  white-space: nowrap;
}
.market-icon { font-size: 14px; }
.market-name { color: #888; font-weight: 500; }
.market-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}
.market-label { font-weight: 600; color: #ccc; }
.market-label.live { color: #22c55e; }
.market-label.holiday { color: #f59e0b; }
.market-label.closed { color: #ef4444; }
.market-detail { color: #777; font-size: 11px; }
.muted { color: #666; font-size: 12px; }
</style>
