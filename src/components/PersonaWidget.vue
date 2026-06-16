<script setup>
import { ref, computed, onMounted } from 'vue'
import { API_BASE } from '../lib/api'

const role = ref('retail_investor')
const risk = ref('moderate')
const sectors = ref([])
const sectorInput = ref('')
const timeframe = ref('swing')
const style = ref('value')
const holdings = ref('')
const saving = ref(false)
const inferring = ref(false)
const message = ref('')

const roles = [
  { value: 'retail_investor', label: 'Retail Investor' },
  { value: 'day_trader', label: 'Day Trader' },
  { value: 'swing_trader', label: 'Swing Trader' },
  { value: 'institutional', label: 'Institutional' },
  { value: 'quant_analyst', label: 'Quant Analyst' },
  { value: 'crypto_degen', label: 'Crypto Degen' },
]
const riskLevels = [
  { value: 'conservative', label: 'Conservative' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'aggressive', label: 'Aggressive' },
  { value: 'yolo', label: 'YOLO' },
]
const timeframes = [
  { value: 'scalp', label: 'Scalp (min-hours)' },
  { value: 'day', label: 'Intraday' },
  { value: 'swing', label: 'Swing (days-weeks)' },
  { value: 'position', label: 'Position (weeks-months)' },
  { value: 'long_term', label: 'Long Term (months+)' },
]
const styles = [
  { value: 'value', label: 'Value' },
  { value: 'growth', label: 'Growth' },
  { value: 'momentum', label: 'Momentum' },
  { value: 'technical', label: 'Technical' },
  { value: 'sentiment', label: 'Sentiment' },
  { value: 'macro', label: 'Macro' },
]

const contextPrompt = computed(() => {
  const parts = [`Role: ${role.value.replace('_', ' ')}`, `Risk appetite: ${risk.value}`]
  if (sectors.value.length) parts.push(`Sectors: ${sectors.value.join(', ')}`)
  parts.push(`Timeframe: ${timeframe.value}`, `Style: ${style.value}`)
  if (holdings.value.trim()) parts.push(`Holdings: ${holdings.value.trim().slice(0, 200)}`)
  return parts.join(' | ')
})

function addSector() {
  const s = sectorInput.value.trim()
  if (s && !sectors.value.includes(s)) sectors.value.push(s)
  sectorInput.value = ''
}
function removeSector(i) { sectors.value.splice(i, 1) }

function populate(data) {
  role.value = data.role || 'retail_investor'
  risk.value = data.risk || 'moderate'
  sectors.value = Array.isArray(data.sectors) ? data.sectors : []
  timeframe.value = data.timeframe || 'swing'
  style.value = data.style || 'value'
  holdings.value = data.holdings || ''
}

async function save() {
  saving.value = true; message.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/user/persona`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role: role.value, risk: risk.value, sectors: sectors.value, timeframe: timeframe.value, style: style.value, holdings: holdings.value }),
    })
    if (res.ok) { message.value = '✓ Profile saved' } else { message.value = '✗ Save failed' }
  } catch { message.value = '✗ Network error' }
  saving.value = false
}

async function infer() {
  inferring.value = true; message.value = ''
  try {
    const res = await fetch(`${API_BASE}/api/user/persona/infer`, { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      populate(data)
      message.value = '✓ Inferred from activity'
    } else { message.value = '✗ Inference failed' }
  } catch { message.value = '✗ Network error' }
  inferring.value = false
}

onMounted(async () => {
  try {
    const res = await fetch(`${API_BASE}/api/user/persona`, { credentials: 'include' })
    if (res.ok) { const d = await res.json(); if (d && d.role) populate(d) }
  } catch {}
})
</script>

<template>
  <div class="persona-widget">
    <h3 class="widget-title">🐋 Your Market Orca Profile</h3>

    <div class="form-grid">
      <label class="field">
        <span class="field-label">Role</span>
        <select v-model="role">
          <option v-for="r in roles" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Risk Appetite</span>
        <select v-model="risk">
          <option v-for="r in riskLevels" :key="r.value" :value="r.value">{{ r.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Timeframe</span>
        <select v-model="timeframe">
          <option v-for="t in timeframes" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </label>

      <label class="field">
        <span class="field-label">Style</span>
        <select v-model="style">
          <option v-for="s in styles" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
    </div>

    <div class="field sector-field">
      <span class="field-label">Sectors</span>
      <div class="sector-row">
        <input v-model="sectorInput" placeholder="e.g. Tech, Energy, Crypto" @keydown.enter.prevent="addSector" />
        <button type="button" class="btn-sm" @click="addSector">+ Add</button>
      </div>
      <div class="sector-tags" v-if="sectors.length">
        <span class="tag" v-for="(s, i) in sectors" :key="i">{{ s }} <button @click="removeSector(i)">×</button></span>
      </div>
    </div>

    <div class="field">
      <span class="field-label">Portfolio Holdings <span class="muted">(optional)</span></span>
      <textarea v-model="holdings" rows="3" placeholder="AAPL:30%, BTC:20%, ETH:15%, VTI:35%"></textarea>
    </div>

    <div class="actions">
      <button class="btn-save" @click="save" :disabled="saving">{{ saving ? 'Saving...' : '💾 Save Profile' }}</button>
      <button class="btn-infer" @click="infer" :disabled="inferring">{{ inferring ? 'Inferring...' : '🤖 Infer from Activity' }}</button>
    </div>
    <div v-if="message" class="status-msg">{{ message }}</div>

    <div class="preview-footer">
      <span class="preview-label">Context prompt:</span>
      <code>{{ contextPrompt }}</code>
    </div>
  </div>
</template>

<style scoped>
.persona-widget {
  font-family: 'Inter', system-ui, sans-serif;
  border: 2px solid var(--ink, #000);
  box-shadow: 4px 4px 0 var(--ink, #000);
  background: var(--bg2, #f5f5f5);
  padding: 1.5rem;
  border-radius: 0;
}
.widget-title {
  margin: 0 0 1rem;
  font-size: 1.25rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}
@media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }
.field { display: flex; flex-direction: column; gap: 0.3rem; }
.field-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.muted { font-weight: 400; opacity: 0.6; }
select, input, textarea {
  font-family: inherit;
  border: 2px solid var(--ink, #000);
  background: var(--bg2, #f5f5f5);
  padding: 0.5rem;
  font-size: 0.9rem;
}
.sector-row { display: flex; gap: 0.5rem; }
.sector-row input { flex: 1; }
.sector-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.4rem; }
.tag {
  background: var(--ink, #000);
  color: var(--bg2, #f5f5f5);
  padding: 0.2rem 0.5rem;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex; align-items: center; gap: 0.3rem;
}
.tag button {
  background: none; border: none; color: inherit; cursor: pointer;
  font-size: 1rem; line-height: 1; padding: 0;
}
.actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
.btn-save, .btn-infer, .btn-sm {
  font-family: inherit;
  font-weight: 700;
  border: 2px solid var(--ink, #000);
  box-shadow: 3px 3px 0 var(--ink, #000);
  padding: 0.5rem 1rem;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 0.85rem;
  transition: transform 0.1s;
}
.btn-save:active, .btn-infer:active, .btn-sm:active { transform: translate(3px, 3px); box-shadow: none; }
.btn-save { background: var(--green, #22c55e); }
.btn-infer { background: var(--accent2, #a855f7); color: #fff; }
.btn-sm { background: var(--bg2, #f5f5f5); padding: 0.4rem 0.7rem; }
.status-msg { margin-top: 0.5rem; font-weight: 700; font-size: 0.85rem; }
.preview-footer {
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 2px solid var(--line-strong, #ccc);
  display: flex;
  gap: 0.5rem;
  font-size: 0.8rem;
  align-items: baseline;
  flex-wrap: wrap;
}
.preview-label { font-weight: 700; white-space: nowrap; }
.preview-footer code {
  background: var(--ink, #000);
  color: var(--green, #22c55e);
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  word-break: break-word;
}
textarea {
  resize: vertical;
  min-height: 3rem;
}
</style>
