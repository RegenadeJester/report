<script setup>
import { onMounted, ref } from 'vue'
import { API_BASE } from '../lib/api'

const prefs = ref({ tone:'balanced', depth:'normal', language:'id', priority_topics:'market,indonesia,watchlist', favorite_assets:'', discord_spam_level:'digest' })
const gaps = ref({ missing:[], questions:[], assumptions:[], answers:{}, confidence:'low' })
const status = ref('loading')
const answerStatus = ref('')
const draftAnswers = ref({})

async function loadPrefs() {
  status.value = 'loading'
  const [prefRes, gapRes] = await Promise.all([
    fetch(`${API_BASE}/api/report-preferences`),
    fetch(`${API_BASE}/api/report-context/gaps`)
  ])
  const prefData = await prefRes.json()
  const gapData = await gapRes.json()
  prefs.value = prefData.preferences || prefs.value
  gaps.value = gapData || gaps.value
  status.value = 'ready'
}

async function savePrefs() {
  status.value = 'saving'
  const res = await fetch(`${API_BASE}/api/report-preferences`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify(prefs.value) })
  const data = await res.json()
  prefs.value = data.preferences || prefs.value
  status.value = data.ok ? 'saved' : 'error'
}

async function saveAnswer(q) {
  const value = (draftAnswers.value[q.key] || '').trim()
  if (!value) return
  answerStatus.value = `saving ${q.key}`
  const res = await fetch(`${API_BASE}/api/report-context/answer`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ key:q.key, value, confidence:1 }) })
  const data = await res.json()
  if (data.ok) {
    gaps.value = data
    draftAnswers.value[q.key] = ''
    answerStatus.value = 'saved'
  } else answerStatus.value = 'error'
}

onMounted(loadPrefs)
</script>

<template>
  <main class="page-grid">
    <section class="panel hero-panel">
      <p class="kicker">Personalized Report Preferences</p>
      <h2>Atur gaya report + konteks keputusan</h2>
      <p>Context Gap Interviewer mencegah report generik. Kalau konteks kosong, report pakai asumsi low-confidence dan tanya 3 pertanyaan paling penting.</p>
    </section>

    <section class="panel context-card">
      <div class="context-head">
        <div>
          <p class="kicker">Context Gap Interviewer</p>
          <h3>Report confidence: <span :class="gaps.confidence === 'high' ? 'ok' : 'warn'">{{ gaps.confidence }}</span></h3>
        </div>
        <button class="ghost-btn" @click="loadPrefs">Refresh</button>
      </div>

      <div v-if="gaps.questions?.length" class="question-list">
        <article v-for="q in gaps.questions" :key="q.key" class="question-card">
          <b>{{ q.question }}</b>
          <div class="answer-row">
            <input v-model="draftAnswers[q.key]" :placeholder="`Jawaban untuk ${q.key}`" @keyup.enter="saveAnswer(q)" />
            <button class="primary-btn" @click="saveAnswer(q)">Simpan</button>
          </div>
        </article>
      </div>
      <p v-else class="ok-box">Konteks utama lengkap. Report bisa lebih tajam.</p>

      <details class="assumption-box">
        <summary>Fallback assumptions</summary>
        <ul>
          <li v-for="a in gaps.assumptions" :key="a.key"><b>{{ a.key }}</b>: {{ a.value }} · confidence {{ a.confidence }}</li>
        </ul>
      </details>
      <details class="assumption-box">
        <summary>Saved answers</summary>
        <ul>
          <li v-for="(a,k) in gaps.answers" :key="k"><b>{{ k }}</b>: {{ a.value }} · {{ a.source }} · confidence {{ a.confidence }}</li>
        </ul>
      </details>
      <p class="muted">Answer status: {{ answerStatus || '-' }}</p>
    </section>

    <section class="panel pref-form">
      <label>Tone
        <select v-model="prefs.tone">
          <option value="concise">Concise</option>
          <option value="balanced">Balanced</option>
          <option value="analytical">Analytical</option>
        </select>
      </label>
      <label>Kedalaman
        <select v-model="prefs.depth">
          <option value="brief">Brief</option>
          <option value="normal">Normal</option>
          <option value="deep">Deep</option>
        </select>
      </label>
      <label>Bahasa
        <select v-model="prefs.language">
          <option value="id">Indonesia</option>
          <option value="en">English</option>
          <option value="mixed">Mixed</option>
        </select>
      </label>
      <label>Spam Discord
        <select v-model="prefs.discord_spam_level">
          <option value="digest">Digest</option>
          <option value="normal">Normal</option>
          <option value="full">Full</option>
        </select>
      </label>
      <label>Topik prioritas
        <input v-model="prefs.priority_topics" placeholder="market, indonesia, watchlist" />
      </label>
      <label>Aset favorit
        <input v-model="prefs.favorite_assets" placeholder="BBCA, BTC, USDIDR" />
      </label>
      <button class="primary-btn" @click="savePrefs">Simpan preferensi</button>
      <p class="muted">Status: {{ status }}</p>
    </section>
  </main>
</template>

<style scoped>
.page-grid{display:grid;gap:16px}.pref-form{display:grid;gap:12px;max-width:720px}label{display:grid;gap:6px;font-weight:900}select,input{border:2px solid var(--border,#111);border-radius:12px;padding:10px;background:var(--card,#fff);color:inherit}.primary-btn{justify-self:start}.muted{opacity:.75}.context-card{display:grid;gap:14px}.context-head{display:flex;align-items:center;justify-content:space-between;gap:12px}.warn{color:#b45309}.ok{color:#047857}.question-list{display:grid;gap:10px}.question-card{border:1px solid rgba(0,0,0,.12);border-radius:18px;padding:14px;background:rgba(255,255,255,.65)}.answer-row{display:flex;gap:8px;margin-top:10px}.answer-row input{flex:1}.ghost-btn{border:1px solid rgba(0,0,0,.15);border-radius:999px;padding:9px 12px;background:transparent;font-weight:900}.assumption-box,.ok-box{border-radius:16px;background:rgba(16,185,129,.08);padding:12px}.assumption-box{background:rgba(59,130,246,.08)}@media(max-width:640px){.context-head,.answer-row{display:grid}.primary-btn,.ghost-btn{width:100%}}
</style>
