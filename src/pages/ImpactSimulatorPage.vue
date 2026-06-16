<template>
  <main class="impact-page">
    <section class="hero">
      <p class="kicker">Market Orca Lab</p>
      <h1>Impact Simulator</h1>
      <p>Simulasikan dampak event pasar ke watchlist: bull/base/bear, risk level, dan sinyal yang perlu dipantau.</p>
    </section>

    <section class="panel controls">
      <label>Event
        <select v-model="eventType">
          <option v-for="t in templates" :key="t.type" :value="t.type">{{ t.label }}</option>
        </select>
      </label>
      <label>Timeframe
        <select v-model="timeframe">
          <option value="1d">1 day</option>
          <option value="1w">1 week</option>
          <option value="1m">1 month</option>
        </select>
      </label>
      <label>Scope
        <select v-model="scope">
          <option value="all">All impacted assets</option>
          <option value="watchlist">Watchlist only</option>
        </select>
      </label>
      <label>Severity {{ severity }}x
        <input v-model="severity" type="range" min="0.25" max="3" step="0.25" />
      </label>
      <label>Probability {{ Math.round(probability*100) }}%
        <input v-model="probability" type="range" min="0.05" max="1" step="0.05" />
      </label>
      <label class="wide">Custom event
        <input v-model="customEvent" placeholder="contoh: BI rate hike dan rupiah stress" />
      </label>
      <button @click="simulate" :disabled="loading">{{ loading ? 'Running…' : 'Run Simulation' }}</button>
    </section>

    <section v-if="result" class="grid">
      <div class="panel">
        <p class="kicker">{{ result.event_label }}</p>
        <h2>Drivers</h2>
        <div class="chips"><span v-for="d in result.drivers" :key="d">{{ d }}</span></div>
        <h2>Signals</h2>
        <div class="chips"><span v-for="s in result.signals" :key="s">{{ s }}</span></div>
      </div>
      <div class="panel md">
        <div class="md-head"><h2>Export Block</h2><button @click="copyMd">Copy MD</button></div>
        <pre>{{ result.markdown }}</pre>
      </div>
    </section>

    <section v-if="result" class="cards">
      <article v-for="item in result.items" :key="item.slug" class="card" :class="item.direction">
        <div>
          <b>{{ item.symbol }}</b>
          <small>{{ item.name }}</small>
        </div>
        <div class="score">{{ item.impact_score }}</div>
        <p><strong>{{ item.direction }}</strong> · {{ item.risk_level }} risk · {{ item.kind }}</p>
        <ul>
          <li><b>Bull:</b> {{ item.bull }}</li>
          <li><b>Base:</b> {{ item.base }}</li>
          <li><b>Bear:</b> {{ item.bear }}</li>
        </ul>
      </article>
    </section>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
const eventType = ref('rate_hike')
const timeframe = ref('1d')
const scope = ref('all')
const severity = ref(1)
const probability = ref(0.6)
const customEvent = ref('')
const result = ref(null)
const templates = ref([{ type:'rate_hike', label:'Rate hike / hawkish central bank' }])
const loading = ref(false)
async function loadTemplates(){
  const res = await fetch('/api/impact-simulator/templates')
  const data = await res.json()
  if (data.templates && !Array.isArray(data.templates)) templates.value = Object.entries(data.templates).map(([type,t]) => ({ type, label:t.label }))
  else templates.value = data.items || data.templates || templates.value
}
async function simulate(){
  loading.value = true
  try{
    const res = await fetch('/api/impact-simulator',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({event_type:eventType.value,timeframe:timeframe.value,scope:scope.value,severity:Number(severity.value),probability:Number(probability.value),custom_event_text:customEvent.value})})
    result.value = await res.json()
  } finally { loading.value = false }
}
async function copyMd(){ if(result.value?.markdown) await navigator.clipboard.writeText(result.value.markdown) }
onMounted(async()=>{ await loadTemplates(); await simulate() })
</script>

<style scoped>
.impact-page{max-width:1180px;margin:auto;padding:24px 14px 70px;color:var(--ink)}.hero{border:3px solid var(--line-strong);background:#facc15;padding:32px;box-shadow:8px 8px 0 var(--line-strong);margin-bottom:18px}.kicker{text-transform:uppercase;font-weight:900;letter-spacing:.16em;color:#9a3412;margin:0 0 8px}.hero h1{font-size:clamp(44px,8vw,92px);line-height:.85;letter-spacing:-.07em;margin:0 0 12px}.hero p{font-weight:800;max-width:760px}.panel{background:var(--bg2);border:2px solid var(--line-strong);box-shadow:5px 5px 0 var(--line-strong);padding:16px;margin-bottom:18px}.controls{display:flex;gap:12px;align-items:end;flex-wrap:wrap}.controls label{display:grid;gap:6px;font-size:12px;font-weight:900;text-transform:uppercase}.controls select,.controls button,.controls input{border:2px solid var(--line-strong);background:var(--bg2);padding:10px 12px;font-weight:900;color:var(--ink)}.controls .wide{min-width:min(100%,420px);flex:1}.controls button{background:var(--ink);color:var(--accent2);cursor:pointer}.grid{display:grid;grid-template-columns:.8fr 1.2fr;gap:18px}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips span{background:var(--ink);color:var(--accent2);font-weight:900;padding:6px 9px}.md-head{display:flex;justify-content:space-between;gap:10px}.md button{border:2px solid var(--line-strong);background:var(--accent2);font-weight:900;color:var(--ink)}.md pre{white-space:pre-wrap;background:var(--ink);color:var(--bg2);padding:14px;max-height:320px;overflow:auto}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px}.card{background:var(--bg2);border:2px solid var(--line-strong);box-shadow:5px 5px 0 var(--line-strong);padding:14px}.card div:first-child{display:flex;justify-content:space-between;gap:12px}.card b{font-size:22px}.card small{color:var(--muted);text-align:right}.score{font-size:44px;font-weight:900;letter-spacing:-.06em}.bullish .score{color:var(--green)}.bearish .score{color:var(--red)}.neutral .score{color:var(--muted)}.card p{text-transform:uppercase;font-size:12px;font-weight:900}.card ul{padding-left:18px;color:var(--muted)}@media(max-width:760px){.grid{grid-template-columns:1fr}.controls{align-items:stretch}.controls label,.controls button{width:100%}}
</style>
