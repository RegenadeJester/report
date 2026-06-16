<template>
  <section class="rag-page">
    <div class="hero">
      <div>
        <p class="eyebrow">RAG REPORT STUDIO</p>
        <h1>Buat Laporan Market Berbasis Bukti</h1>
        <p>Search → retrieval → konteks user → laporan Bahasa Indonesia + sitasi + export.</p>
      </div>
      <div class="score"><b>{{ contextGap?.confidence || 'low' }}</b><span>confidence konteks</span></div>
    </div>

    <div class="grid">
      <form class="panel" @submit.prevent="generate">
        <h2>Pertanyaan laporan</h2>
        <textarea v-model="question" rows="4" placeholder="Contoh: Analisa IHSG hari ini untuk trading cepat"></textarea>
        <div class="two">
          <label>Tujuan
            <select v-model="context.goal"><option>trading cepat</option><option>investasi jangka panjang</option><option>monitoring risiko</option><option>riset kompetitor</option></select>
          </label>
          <label>Horizon
            <select v-model="context.time_horizon"><option>intraday</option><option>harian</option><option>mingguan</option><option>bulanan</option><option>jangka panjang</option></select>
          </label>
          <label>Prioritas watchlist <input v-model="context.watchlist_priority" placeholder="BBCA, BBRI, USD/IDR, BTC" /></label>
          <label>Risk tolerance
            <select v-model="context.risk_tolerance"><option>konservatif</option><option>normal</option><option>agresif</option></select>
          </label>
          <label>Aksi disukai
            <select v-model="context.preferred_action"><option>watch + risk alert</option><option>buy/sell/watch</option><option>research note</option><option>risk alert</option></select>
          </label>
          <label>Limit sumber <input v-model.number="limit" type="number" min="1" max="12" /></label>
        </div>
        <button class="primary" :disabled="loading">{{ loading ? 'Menyusun...' : 'Generate laporan' }}</button>
      </form>

      <aside class="panel questions">
        <h2>Context Gap Interviewer</h2>
        <button class="ghost" @click="loadGaps">Cek gap konteks</button>
        <div v-if="contextGap?.questions?.length" class="qbox">
          <p v-for="q in contextGap.questions" :key="q.key"><b>{{ q.key }}</b><br>{{ q.question }}</p>
        </div>
        <div v-else class="ok">Konteks cukup. Laporan lebih tajam.</div>
        <div class="assume" v-if="contextGap?.assumptions?.length">
          <h3>Asumsi fallback</h3>
          <p v-for="a in contextGap.assumptions" :key="a.key">{{ a.key }} → {{ a.value }} ({{ a.confidence }})</p>
        </div>
      </aside>
    </div>

    <div class="panel output" v-if="result">
      <div class="out-head">
        <div><h2>Hasil Laporan</h2><p>ID #{{ result.id || 'guarded' }} · confidence {{ result.confidence }} · intent {{ result.relevanceGate?.intent || 'auto' }}</p></div>
        <div class="actions">
          <a :href="`${apiBase}/api/reports/rag/${result.id}/export?format=md`" target="_blank">Export MD</a>
          <a :href="`${apiBase}/api/reports/rag/${result.id}/export?format=pdf`" target="_blank">Export PDF</a>
        </div>
      </div>
      <div class="quality-strip" :class="result.docs?.length ? 'ok' : 'bad'">
        <b>{{ result.docs?.length ? 'Evidence relevan ditemukan' : 'Evidence tidak relevan — laporan ditahan' }}</b>
        <span>Kept {{ result.relevanceGate?.kept ?? result.docs?.length ?? 0 }} / Raw {{ result.relevanceGate?.raw ?? 0 }}</span>
      </div>
      <div class="tv-shell" v-if="result.relevanceGate?.intent === 'market'">
        <div class="tv-head"><b>MARKET VIEW</b><span>Trading-style evidence gate</span></div>
        <div class="tv-grid">
          <article><small>INTENT</small><strong>{{ result.relevanceGate?.intent }}</strong></article>
          <article><small>CONFIDENCE</small><strong>{{ Math.round((result.confidence||0)*100) }}%</strong></article>
          <article><small>SOURCES</small><strong>{{ result.docs?.length || 0 }}</strong></article>
        </div>
        <p class="tv-note">Market report hanya boleh pakai sumber market/official/relevan. Evidence coding/AI otomatis digugurkan.</p>
      </div>
      <pre>{{ result.report }}</pre>
      <h3>Sitasi</h3>
      <div class="cite" v-for="c in result.citations" :key="c.n">[{{ c.n }}] {{ c.title }} <small>{{ c.url }}</small><blockquote>{{ c.quote }}</blockquote></div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { API_BASE, apiGet, apiPost } from '../lib/api'
const apiBase = API_BASE
const question = ref('Analisa IHSG hari ini untuk trading cepat')
const limit = ref(5)
const loading = ref(false)
const result = ref(null)
const contextGap = ref(null)
const context = ref({ goal:'trading cepat', time_horizon:'intraday', watchlist_priority:'', risk_tolerance:'normal', preferred_action:'watch + risk alert' })
async function loadGaps(){ contextGap.value = await apiGet('/api/report-context/gaps') }
async function generate(){ loading.value=true; try{ result.value = await apiPost('/api/reports/rag-generate',{ question:question.value, limit:limit.value, context:context.value }); contextGap.value=result.value.contextGap } finally{ loading.value=false } }
onMounted(loadGaps)
</script>

<style scoped>
.rag-page{max-width:1180px;margin:auto;padding:16px 12px 60px}.hero{display:flex;justify-content:space-between;gap:18px;align-items:stretch;background:linear-gradient(135deg,#111827,#312e81);border:2px solid #111;padding:24px;border-radius:20px;box-shadow:8px 8px 0 #111;margin-bottom:18px}.eyebrow{font-weight:900;color:#fbbf24;letter-spacing:.12em}.hero h1{font-size:clamp(28px,5vw,54px);line-height:.95;margin:4px 0;color:#fff}.hero p{color:#dbeafe}.score{min-width:150px;background:#fbbf24;color:#111;border:2px solid #111;border-radius:18px;padding:18px;display:grid;place-items:center;text-align:center}.score b{font-size:30px}.score span{font-size:12px;font-weight:900}.grid{display:grid;grid-template-columns:1.5fr .9fr;gap:16px}.panel{background:#fff;color:#111;border:2px solid #111;border-radius:18px;padding:18px;box-shadow:5px 5px 0 #111;margin-bottom:16px}.panel h2{margin:0 0 12px}.two{display:grid;grid-template-columns:1fr 1fr;gap:12px}label{display:grid;gap:6px;font-weight:900;font-size:13px}textarea,input,select{width:100%;border:2px solid #111;border-radius:12px;padding:11px;background:#f8fafc;color:#111}.primary,.ghost,.actions a{border:2px solid #111;border-radius:12px;background:#7c3aed;color:#fff;font-weight:900;padding:12px 16px;box-shadow:3px 3px 0 #111;text-decoration:none;cursor:pointer}.ghost{background:#111}.primary{margin-top:14px;width:100%}.qbox p,.assume p,.cite{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:12px;padding:10px}.ok{background:#dcfce7;border:1px solid #16a34a;border-radius:12px;padding:12px;font-weight:900}.out-head{display:flex;justify-content:space-between;gap:12px;align-items:center}.actions{display:flex;gap:8px;flex-wrap:wrap}.output pre{white-space:pre-wrap;background:#0f172a;color:#e5e7eb;border-radius:14px;padding:16px;max-height:720px;overflow:auto}.cite small{display:block;color:#64748b}.cite blockquote{margin:8px 0 0;border-left:3px solid #7c3aed;padding-left:10px;color:#334155}.quality-strip{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:12px 14px;border:2px solid #111;border-radius:14px;margin:12px 0;font-weight:900}.quality-strip.ok{background:#dcfce7}.quality-strip.bad{background:#fee2e2}.tv-shell{background:#050816;color:#dbeafe;border:2px solid #1e40af;border-radius:18px;padding:14px;margin:12px 0;box-shadow:0 0 0 1px #0ea5e9 inset}.tv-head{display:flex;justify-content:space-between;color:#93c5fd;letter-spacing:.12em;font-size:12px}.tv-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.tv-grid article{background:#0b1220;border:1px solid #1e3a8a;border-radius:12px;padding:12px}.tv-grid small{display:block;color:#60a5fa;font-weight:900}.tv-grid strong{display:block;font-size:24px;color:#fff}.tv-note{color:#bfdbfe;font-size:13px;margin:12px 0 0}@media(max-width:860px){.grid,.two{grid-template-columns:1fr}.hero,.out-head{flex-direction:column}}
</style>
