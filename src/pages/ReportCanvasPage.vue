<template>
  <div v-if="state.loaded" class="canvas-shell" @keydown="handleKeydown" tabindex="0" ref="shellRef">
    <!-- Progress Bar -->
    <div class="progress-wrap">
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: progressPct + '%' }"></div>
      </div>
      <span class="progress-label">{{ progressPct }}% · {{ filledSections }}/{{ state.sections.length }} sections</span>
    </div>

    <!-- Market Overview Bar -->
    <div class="market-overview-bar" v-if="marketData.length" @click="showMarketOverview = !showMarketOverview">
      <div class="market-bar-label">📊 Market <span class="market-toggle">{{ showMarketOverview ? '▾' : '▸' }}</span></div>
      <div class="market-bar-compact" v-if="!showMarketOverview">
        <span v-for="m in marketData.slice(0, 6)" :key="m.slug" :class="['mkt-chip', Number(m.change_percent) >= 0 ? 'up' : 'down']">
          {{ m.symbol }} {{ formatPrice(m.price) }} ({{ Number(m.change_percent) >= 0 ? '+' : '' }}{{ m.change_percent }}%)
        </span>
      </div>
    </div>
    <div v-if="showMarketOverview && marketData.length" class="market-overview-expanded">
      <div class="market-grid">
        <div v-for="m in marketData" :key="m.slug" class="market-card-mini">
          <div class="mc-name">{{ m.symbol }}</div>
          <div class="mc-price">{{ formatPrice(m.price) }}</div>
          <div :class="['mc-change', Number(m.change_percent) >= 0 ? 'up' : 'down']">
            {{ Number(m.change_percent) >= 0 ? '+' : '' }}{{ m.change_percent }}%
          </div>
        </div>
      </div>
    </div>

    <!-- Top bar -->
    <div class="canvas-top">
      <div>
        <h1>📐 Canvas</h1>
        <div class="meta">{{ state.title }} · {{ state.date }} · {{ state.sections.length }} sections</div>
      </div>
      <div class="top-actions">
        <span v-if="showAutoSaved" class="auto-badge">✓ Auto-saved</span>
        <button class="btn" @click="saveCanvas" :disabled="state.saving">
          {{ state.saving ? 'Saving…' : '💾 Save' }}
        </button>
        <button class="btn" @click="showExport = true">📤 Export</button>
        <router-link :to="`/report/${$route.params.slug}`" class="btn secondary">← Report</router-link>
      </div>
    </div>

    <!-- Toast -->
    <div v-if="state.toast" class="toast" :class="state.toastType">{{ state.toast }}</div>

    <!-- Section list -->
    <div class="section-list">
      <div
        v-for="(sec, idx) in state.sections"
        :key="sec.key"
        :data-sec-key="sec.key"
        class="sec-card"
        :class="{
          hidden: sec.hidden,
          dragging: dragIdx === idx,
          active: activeIdx === idx
        }"
        draggable="true"
        @dragstart="onDragStart($event, idx)"
        @dragover.prevent="onDragOver($event, idx)"
        @dragenter.prevent
        @drop="onDrop($event, idx)"
        @dragend="dragIdx = -1"
        @click="activeIdx = idx"
      >
        <!-- Floating toolbar -->
        <div class="sec-toolbar">
          <button class="tb-btn" @click.stop="toggleNote(sec)" :class="{ active: noteOpen === sec.key }" title="Note">📌</button>
          <button class="tb-btn" @click.stop="toggleHidden(sec)" :class="{ active: sec.hidden }" :title="sec.hidden ? 'Show' : 'Hide'">{{ sec.hidden ? '👁️' : '🙈' }}</button>
          <button class="tb-btn" @click.stop="deleteSection(idx)" title="Delete">🗑️</button>
          <button class="tb-btn" @click.stop="moveSection(idx, -1)" :disabled="idx === 0" title="Move up">↑</button>
          <button class="tb-btn" @click.stop="moveSection(idx, 1)" :disabled="idx === state.sections.length - 1" title="Move down">↓</button>
        </div>

        <!-- Head -->
        <div class="sec-head">
          <span class="drag-handle" title="Drag">⠿</span>
          <span class="sec-num">{{ idx + 1 }}</span>
          <span class="health-dot" :class="getHealthClass(sec)" :title="getHealthTip(sec)"></span>
          <div
            class="sec-title"
            :contenteditable="isEditing(sec, 'title')"
            @blur="saveEdit(sec, 'title', $event)"
            @keydown.enter.prevent="saveEdit(sec, 'title', $event)"
            @dblclick="startEdit(sec, 'title')"
            v-text="sec.title"
          ></div>
        </div>

        <!-- Note editor -->
        <div v-if="noteOpen === sec.key" class="note-editor">
          <textarea
            v-model="sec.note"
            placeholder="Note…"
            rows="2"
            @blur="closeNote(sec)"
            @keydown.esc="closeNote(sec)"
            @input="markDirty"
          ></textarea>
        </div>

        <!-- Body -->
        <div v-if="!sec.hidden" class="sec-body">
          <div
            class="body-text"
            :contenteditable="isEditing(sec, 'body')"
            @blur="saveEdit(sec, 'body', $event)"
            @keydown.esc="cancelEdit()"
            @dblclick="startEdit(sec, 'body')"
            v-text="sec.body || '(empty)'"
          ></div>
        </div>

        <!-- Section sparkline -->
        <div
          v-if="!sec.hidden && hasSparkline(sec)"
          :data-spk="sec.key"
          class="sec-sparkline"
        ></div>

        <!-- Items table -->
        <div v-if="!sec.hidden && sec.items?.length" class="sec-items">
          <table>
            <thead>
              <tr>
                <th @click="setSort(sec, 'title')" class="sortable">Item {{ sortArrow(sec, 'title') }}</th>
                <th @click="setSort(sec, 'sentiment')" class="sortable">Sentiment {{ sortArrow(sec, 'sentiment') }}</th>
                <th @click="setSort(sec, 'direction')" class="sortable">Dir {{ sortArrow(sec, 'direction') }}</th>
                <th @click="setSort(sec, 'price')" class="sortable">Price {{ sortArrow(sec, 'price') }}</th>
                <th @click="setSort(sec, 'score')" class="sortable">Score {{ sortArrow(sec, 'score') }}</th>
                <th>Spark</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in sortedItems(sec)" :key="i">
                <td class="cell-title">{{ item.title || item.symbol || '-' }}</td>
                <td><span class="badge" :class="sentClass(item)">{{ item.sentiment || '-' }}</span></td>
                <td><span class="badge dir-badge" :class="dirClass(item)">{{ item.direction || '-' }}</span></td>
                <td class="cell-price">
                  {{ fmtPrice(item) }}
                  <span v-if="item.changePercent" class="chg" :class="item.changePercent >= 0 ? 'up' : 'down'">
                    {{ item.changePercent >= 0 ? '+' : '' }}{{ item.changePercent.toFixed(1) }}%
                  </span>
                </td>
                <td><span class="badge score-badge" :class="scoreClass(item)">{{ item.score ?? '-' }}</span></td>
                <td>
                  <div
                    v-if="item.sparkline?.length > 1"
                    :data-ispk="`${sec.key}-${i}`"
                    class="item-sparkline"
                  ></div>
                  <span v-else class="no-spark">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Fun fact -->
        <div v-if="!sec.hidden && sec.funFact" class="fun-fact">💡 {{ sec.funFact }}</div>
      </div>
    </div>

    <!-- Hidden bar -->
    <div v-if="hiddenCount" class="hidden-bar">
      🙈 {{ hiddenCount }} hidden · <button class="link-btn" @click="showAll">Show all</button>
    </div>

    <!-- Export modal -->
    <div v-if="showExport" class="modal-overlay" @click.self="showExport = false">
      <div class="modal">
        <h2>📤 Export</h2>
        <div class="export-formats">
          <button
            v-for="fmt in formats"
            :key="fmt.key"
            class="fmt-card"
            :class="{ active: exportFmt === fmt.key }"
            @click="exportFmt = fmt.key"
          >
            <span class="fmt-icon">{{ fmt.icon }}</span>
            <span class="fmt-name">{{ fmt.label }}</span>
            <span class="fmt-desc">{{ fmt.desc }}</span>
          </button>
        </div>
        <div class="modal-actions">
          <button class="btn" @click="doExport" :disabled="state.exporting">
            {{ state.exporting ? 'Exporting…' : 'Export' }}
          </button>
          <button class="btn secondary" @click="showExport = false">Cancel</button>
        </div>
        <p v-if="state.exportError" class="err-text">{{ state.exportError }}</p>
      </div>
    </div>
  </div>

  <!-- Loading / Error -->
  <div v-else-if="state.error" class="err">
    <h2>Failed to load canvas</h2>
    <p>{{ state.error }}</p>
    <router-link to="/" class="btn secondary">← Home</router-link>
  </div>
  <div v-else class="loading">Loading canvas…</div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { createChart, AreaSeries, LineSeries } from 'lightweight-charts'

const route = useRoute()
const shellRef = ref(null)
const activeIdx = ref(0)
const editTarget = ref(null) // { key, field }
const noteOpen = ref(null)
const showExport = ref(false)
const exportFmt = ref('md')
const dragIdx = ref(-1)
const showAutoSaved = ref(false)
const sortMap = ref({}) // { [secKey]: { field, dir } }

// ── State ────────────────────────────────────────────────────
const state = reactive({
  loaded: false,
  saving: false,
  exporting: false,
  toast: '',
  toastType: 'info',
  title: '',
  date: '',
  sections: [],
  error: null,
  exportError: null,
  _origMap: {},
})

let dirty = false
let autoTimer = null
let toastTimer = null
const chartInstances = new Map()

// ── Formats ──────────────────────────────────────────────────
const formats = [
  { key: 'md', icon: '📝', label: 'Markdown', desc: 'For Notion/Obsidian' },
  { key: 'html', icon: '🌐', label: 'HTML', desc: 'Email-ready' },
  { key: 'json', icon: '📊', label: 'JSON', desc: 'Raw data' },
  { key: 'pdf', icon: '📄', label: 'PDF', desc: 'Print-to-PDF' },
]

// Market overview
const marketData = ref([])
const showMarketOverview = ref(false)

function formatPrice(p) {
  const n = Number(p)
  if (!n || n === 0) return '-'
  if (n > 100000) return n.toLocaleString('id-ID', { maximumFractionDigits: 0 })
  if (n > 100) return n.toLocaleString('id-ID', { maximumFractionDigits: 1 })
  return n.toLocaleString('id-ID', { maximumFractionDigits: 4 })
}

async function loadMarketData() {
  try {
    const res = await fetch('/api/overview')
    const data = await res.json()
    const targetSlugs = ['jkse','usdidr','btcusdt','ethusdt','spy','qqq','xauusd','eurusd','gbpusd','sgdidr','myridr']
    marketData.value = (data.assets || []).filter(a => targetSlugs.includes(a.slug))
      .sort((a, b) => targetSlugs.indexOf(a.slug) - targetSlugs.indexOf(b.slug))
  } catch {}
}

// ── Computed ─────────────────────────────────────────────────
const hiddenCount = computed(() => state.sections.filter(s => s.hidden).length)
const filledSections = computed(() =>
  state.sections.filter(s => s.body || (s.items && s.items.length)).length
)
const progressPct = computed(() =>
  state.sections.length
    ? Math.round((filledSections.value / state.sections.length) * 100)
    : 0
)

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  state.toast = msg
  state.toastType = type
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { state.toast = '' }, 3000)
}

// ── Dirty / Auto-save ───────────────────────────────────────
function markDirty() {
  if (state.sections.length === 0) return
  dirty = true
  clearTimeout(autoTimer)
  autoTimer = setTimeout(() => {
    if (dirty) {
      dirty = false
      doSave({ auto: true })
    }
  }, 2000)
}

// ── Edit helpers ─────────────────────────────────────────────
function isEditing(sec, field) {
  const t = editTarget.value
  return t && t.key === sec.key && t.field === field
}

function startEdit(sec, field) {
  editTarget.value = { key: sec.key, field }
  nextTick(() => {
    const sel = window.getSelection()
    sel && sel.selectAllChildren(
      document.querySelector(
        `[data-sec-key="${sec.key}"] .${field === 'title' ? 'sec-title' : 'body-text'}`
      ) || document.createTextNode('')
    )
  })
}

function saveEdit(sec, field, e) {
  const val = (e.target.textContent || '').trim()
  if (val && val !== sec[field]) {
    sec[field] = val
    showToast('✏️ Edited — auto-save will persist', 'info')
    markDirty()
  }
  editTarget.value = null
}

function cancelEdit() {
  editTarget.value = null
}

// ── Note ─────────────────────────────────────────────────────
function toggleNote(sec) {
  noteOpen.value = noteOpen.value === sec.key ? null : sec.key
  if (noteOpen.value === sec.key) {
    nextTick(() => {
      const ta = document.querySelector(`[data-sec-key="${sec.key}"] .note-editor textarea`)
      ta && ta.focus()
    })
  }
}

function closeNote(sec) {
  if (!sec.note || !sec.note.trim()) sec.note = null
  noteOpen.value = null
  markDirty()
}

// ── Section actions ──────────────────────────────────────────
function toggleHidden(sec) {
  sec.hidden = !sec.hidden
  markDirty()
}

function showAll() {
  state.sections.forEach(s => { s.hidden = false })
  markDirty()
}

function deleteSection(idx) {
  state.sections.splice(idx, 1)
  if (activeIdx.value >= state.sections.length) activeIdx.value = state.sections.length - 1
  markDirty()
}

function moveSection(idx, dir) {
  const target = idx + dir
  if (target < 0 || target >= state.sections.length) return
  const s = state.sections
  const [moved] = s.splice(idx, 1)
  s.splice(target, 0, moved)
  activeIdx.value = target
  markDirty()
  showToast('🔄 Section moved')
}

// ── Drag & Drop ──────────────────────────────────────────────
function onDragStart(e, idx) {
  dragIdx.value = idx
  e.dataTransfer.effectAllowed = 'move'
  e.dataTransfer.setData('text/plain', idx)
}

function onDragOver(e, idx) {
  if (dragIdx.value === idx || dragIdx.value < 0) return
  e.dataTransfer.dropEffect = 'move'
}

function onDrop(e, idx) {
  const from = dragIdx.value
  if (from < 0 || from === idx) return
  const s = [...state.sections]
  const [moved] = s.splice(from, 1)
  s.splice(idx, 0, moved)
  state.sections = s
  activeIdx.value = idx
  dragIdx.value = -1
  markDirty()
  showToast('✅ Order changed')
}

// ── Sentiment / Direction / Score helpers ────────────────────
function sentClass(item) {
  const v = (item.sentiment || '').toLowerCase()
  if (['bullish', 'buy', 'long', 'positive'].includes(v)) return 'badge-green'
  if (['bearish', 'sell', 'short', 'negative'].includes(v)) return 'badge-red'
  if (v === 'neutral') return 'badge-gray'
  return ''
}

function dirClass(item) {
  const v = (item.direction || '').toLowerCase()
  if (['up', 'bullish', 'buy', 'long'].includes(v)) return 'dir-up'
  if (['down', 'bearish', 'sell', 'short'].includes(v)) return 'dir-down'
  return ''
}

function scoreClass(item) {
  const s = Number(item.score)
  if (isNaN(s)) return ''
  if (s > 70) return 'badge-green'
  if (s >= 40) return 'badge-amber'
  return 'badge-red'
}

function fmtPrice(item) {
  const p = Number(item.price)
  if (isNaN(p)) return '-'
  return p < 1 ? p.toFixed(4) : p.toFixed(2)
}

// ── Section Health ───────────────────────────────────────────
function calcHealth(sec) {
  if (!sec.items || !sec.items.length) return { bullish: 0, bearish: 0, neut: 0, pct: 0 }
  let b = 0, r = 0, n = 0
  for (const item of sec.items) {
    const v = (item.sentiment || item.direction || '').toLowerCase()
    if (['bullish', 'buy', 'long', 'positive'].includes(v)) b++
    else if (['bearish', 'sell', 'short', 'negative'].includes(v)) r++
    else n++
  }
  const tot = sec.items.length
  return { bullish: b, bearish: r, neut: n, pct: Math.round((b / tot) * 100) }
}

function getHealthClass(sec) {
  const h = calcHealth(sec)
  if (h.pct >= 60) return 'health-good'
  if (h.pct >= 30) return 'health-mid'
  return 'health-bad'
}

function getHealthTip(sec) {
  const h = calcHealth(sec)
  return `${h.bullish}↑ ${h.bearish}↓ ${h.neut}— (${h.pct}% bullish)`
}

// ── Sorting ──────────────────────────────────────────────────
function setSort(sec, field) {
  const cur = sortMap.value[sec.key]
  if (cur && cur.field === field) {
    cur.dir = cur.dir === 'asc' ? 'desc' : 'asc'
  } else {
    sortMap.value[sec.key] = { field, dir: 'asc' }
  }
}

function sortArrow(sec, field) {
  const cur = sortMap.value[sec.key]
  if (!cur || cur.field !== field) return ''
  return cur.dir === 'asc' ? ' ▲' : ' ▼'
}

function sortedItems(sec) {
  const cfg = sortMap.value[sec.key]
  if (!cfg || !sec.items) return sec.items
  return [...sec.items].sort((a, b) => {
    const va = a[cfg.field], vb = b[cfg.field]
    const ca = va == null ? '' : (typeof va === 'string' ? va.toLowerCase() : va)
    const cb = vb == null ? '' : (typeof vb === 'string' ? vb.toLowerCase() : vb)
    if (ca < cb) return cfg.dir === 'asc' ? -1 : 1
    if (ca > cb) return cfg.dir === 'asc' ? 1 : -1
    return 0
  })
}

// ── Sparkline detection ──────────────────────────────────────
function hasSparkline(sec) {
  return sec.items && sec.items.some(item => item.sparkline && item.sparkline.length > 1)
}

function prepSparkData(data) {
  // data can be numbers[] or {time,value}[]
  if (!data || !data.length) return []
  if (typeof data[0] === 'number') {
    return data.map((v, i) => ({ time: i, value: v }))
  }
  return data
}

// ── Chart rendering ──────────────────────────────────────────
function renderAllSparklines() {
  // Clean old
  for (const [k, ch] of chartInstances) {
    try { ch.remove() } catch {}
  }
  chartInstances.clear()

  nextTick(() => {
    // Section sparklines
    document.querySelectorAll('[data-spk]').forEach(el => {
      const key = el.getAttribute('data-spk')
      const sec = state.sections.find(s => s.key === key)
      if (!sec || !sec.items) return
      let best = []
      for (const item of sec.items) {
        if (item.sparkline && item.sparkline.length > best.length) {
          best = item.sparkline
        }
      }
      const data = prepSparkData(best)
      if (data.length < 2) return
      renderSparkline(el, data, sec)
    })

    // Item sparklines (tiny)
    document.querySelectorAll('[data-ispk]').forEach(el => {
      const key = el.getAttribute('data-ispk')
      const [secKey, itemIdx] = key.split('-')
      const sec = state.sections.find(s => s.key === secKey)
      if (!sec || !sec.items) return
      const item = sec.items[parseInt(itemIdx)]
      if (!item || !item.sparkline) return
      const data = prepSparkData(item.sparkline)
      if (data.length < 2) return
      renderItemSparkline(el, data, item)
    })
  })
}

function makeChartId(el) {
  return el.getAttribute('data-spk') || el.getAttribute('data-ispk') || Math.random().toString(36)
}

function renderSparkline(container, data, sec) {
  const rect = container.getBoundingClientRect()
  const w = Math.max(rect.width || 300, 60)
  const h = Math.max(rect.height || 80, 30)

  const isUp = data[data.length - 1].value >= data[0].value
  const lineColor = isUp ? '#22c55e' : '#ef4444'
  const topColor = isUp ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'
  const botColor = isUp ? 'rgba(34,197,94,0.02)' : 'rgba(239,68,68,0.02)'

  const chart = createChart(container, {
    width: w,
    height: h,
    layout: {
      background: { color: 'transparent' },
      textColor: '#9fb0cf',
    },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    rightPriceScale: { visible: false, borderVisible: false },
    leftPriceScale: { visible: false },
    timeScale: { visible: false, borderVisible: false },
    crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    handleScroll: false,
    handleScale: false,
  })

  const series = chart.addSeries(AreaSeries, {
    lineColor,
    topColor,
    bottomColor: botColor,
    lineWidth: 1.5,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  series.setData(data)
  chart.timeScale().fitContent()
  chartInstances.set(makeChartId(container), chart)
}

function renderItemSparkline(container, data, item) {
  const w = 72
  const h = 20
  const isUp = data[data.length - 1].value >= data[0].value
  const lineColor = isUp ? '#22c55e' : '#ef4444'

  const chart = createChart(container, {
    width: w,
    height: h,
    layout: {
      background: { color: 'transparent' },
      textColor: 'transparent',
    },
    grid: { vertLines: { visible: false }, horzLines: { visible: false } },
    rightPriceScale: { visible: false },
    leftPriceScale: { visible: false },
    timeScale: { visible: false },
    crosshair: { vertLine: { visible: false }, horzLine: { visible: false } },
    handleScroll: false,
    handleScale: false,
  })

  const series = chart.addSeries(LineSeries, {
    color: lineColor,
    lineWidth: 1.5,
    priceLineVisible: false,
    lastValueVisible: false,
  })

  series.setData(data)
  chart.timeScale().fitContent()
  chartInstances.set(makeChartId(container), chart)
}

// ── Keyboard Navigation ──────────────────────────────────────
function handleKeydown(e) {
  // Ignore when editing note or contenteditable
  if (editTarget.value || noteOpen.value) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (editTarget.value) cancelEdit()
      if (noteOpen.value) { noteOpen.value = null }
    }
    return
  }

  const len = state.sections.length
  switch (e.key) {
    case 'j':
    case 'ArrowDown':
      e.preventDefault()
      activeIdx.value = Math.min(activeIdx.value + 1, len - 1)
      scrollSection()
      break
    case 'k':
    case 'ArrowUp':
      e.preventDefault()
      activeIdx.value = Math.max(activeIdx.value - 1, 0)
      scrollSection()
      break
    case 'Enter':
      e.preventDefault()
      startEdit(state.sections[activeIdx.value], 'title')
      break
    case 'Escape':
      cancelEdit()
      break
    case 's':
      if (!e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        saveCanvas()
      }
      break
    case 'h':
      if (e.ctrlKey || e.metaKey) return
      e.preventDefault()
      const sec = state.sections[activeIdx.value]
      if (sec) toggleHidden(sec)
      break
  }
}

function scrollSection() {
  const sec = state.sections[activeIdx.value]
  if (!sec) return
  const el = document.querySelector(`[data-sec-key="${sec.key}"]`)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// ── Save ─────────────────────────────────────────────────────
async function saveCanvas() {
  dirty = false
  clearTimeout(autoTimer)
  await doSave({ auto: false })
}

async function doSave(opts = {}) {
  if (state.saving) return
  state.saving = true
  try {
    const sectionOrder = state.sections.map(s => s.key)
    const overrides = {}
    const notes = {}
    const hiddenSections = []

    state.sections.forEach(sec => {
      const o = {}
      const orig = state._origMap?.[sec.key]
      if (sec.title !== orig?.title) o.title = sec.title
      if (sec.body !== orig?.body) o.body = sec.body
      if (JSON.stringify(sec.items) !== JSON.stringify(orig?.items)) o.items = sec.items
      if (sec.funFact !== orig?.funFact) o.funFact = sec.funFact
      if (Object.keys(o).length) overrides[sec.key] = o
      if (sec.note) notes[sec.key] = sec.note
      if (sec.hidden) hiddenSections.push(sec.key)
    })

    const res = await fetch(`/api/report/${route.params.slug}/canvas/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sectionOrder, overrides, notes, hiddenSections }),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.error || 'save_failed')

    // Refresh orig map
    state._origMap = {}
    state.sections.forEach(sec => {
      state._origMap[sec.key] = { title: sec.title, body: sec.body, items: sec.items ? [...sec.items] : [], funFact: sec.funFact }
    })

    if (opts.auto) {
      showAutoSaved.value = true
      setTimeout(() => { showAutoSaved.value = false }, 3000)
    } else {
      showToast('✅ Saved!', 'success')
    }
  } catch (e) {
    showToast('❌ Save failed: ' + e.message, 'error')
    opts.auto && (dirty = true) // retry on next change
  } finally {
    state.saving = false
  }
}

// ── Export ───────────────────────────────────────────────────
async function doExport() {
  if (exportFmt.value === 'pdf') {
    showExport.value = false
    await doSave({ auto: false })
    window.print()
    return
  }

  state.exporting = true
  state.exportError = null
  try {
    await doSave({ auto: false })

    const res = await fetch(`/api/report/${route.params.slug}/export?format=${exportFmt.value}`)
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`)
    }
    const blob = await res.blob()
    const ext = exportFmt.value === 'html' ? 'html' : exportFmt.value === 'json' ? 'json' : 'md'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${route.params.slug}-canvas.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    showToast(`✅ ${exportFmt.value.toUpperCase()} downloaded!`, 'success')
    showExport.value = false
  } catch (e) {
    state.exportError = e.message
    showToast('❌ Export failed: ' + e.message, 'error')
  } finally {
    state.exporting = false
  }
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(async () => {
  try {
    const res = await fetch(`/api/report/${route.params.slug}/canvas`)
    if (!res.ok) {
      if (res.status === 404) { state.error = 'Report not found'; return }
      throw new Error(`HTTP ${res.status}`)
    }
    const data = await res.json()
    state.title = data.title
    state.date = data.date
    state.sections = data.sections || []
    state._origMap = {}
    state.sections.forEach(sec => {
      state._origMap[sec.key] = {
        title: sec.title,
        body: sec.body,
        items: sec.items ? [...sec.items] : [],
        funFact: sec.funFact,
      }
    })
    state.loaded = true
    document.title = `Canvas ${state.title} · Market Orca`
    await nextTick()
    renderAllSparklines()
    loadMarketData()
  } catch (e) {
    state.error = e.message
  }
})

onBeforeUnmount(() => {
  clearTimeout(autoTimer)
  clearTimeout(toastTimer)
  for (const [, ch] of chartInstances) {
    try { ch.remove() } catch {}
  }
  chartInstances.clear()
})

// Watch sections changes → re-render sparklines
watch(
  () => state.sections.map(s => s.key + s.hidden + (s.items ? s.items.length : 0)).join(','),
  () => {
    nextTick(() => renderAllSparklines())
  }
)
</script>

<style scoped>
/* ── Shell ─────────────────────────────────────────────── */
.canvas-shell {
  max-width: 960px;
  margin: 0 auto;
  padding: 24px 16px 80px;
  outline: none;
  position: relative;
}

/* ── Progress Bar ──────────────────────────────────────── */
.progress-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}
.progress-track {
  flex: 1;
  height: 6px;
  background: var(--line);
  border-radius: 4px;
  overflow: hidden;
}
.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--green), var(--accent));
  border-radius: 4px;
  transition: width 0.4s ease;
}
.progress-label {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  font-weight: 600;
}

/* ── Top Bar ────────────────────────────────────────────── */
.canvas-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.canvas-top h1 {
  margin: 0;
  font-size: clamp(20px, 4vw, 28px);
  color: var(--accent);
  font-weight: 800;
}
.meta {
  color: var(--muted);
  font-size: 13px;
  margin-top: 2px;
}
.top-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.auto-badge {
  font-size: 11px;
  font-weight: 700;
  color: var(--green);
  background: rgba(34, 197, 94, 0.12);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(34, 197, 94, 0.25);
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ── Buttons ────────────────────────────────────────────── */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border: 2px solid var(--accent);
  background: var(--accent);
  color: #000;
  border-radius: 10px;
  font-weight: 800;
  font-size: 13px;
  cursor: pointer;
  transition: 0.15s;
  white-space: nowrap;
  font-family: inherit;
}
.btn:hover { filter: brightness(1.12); }
.btn.secondary {
  background: var(--panel2);
  color: var(--ink);
  border-color: var(--line-strong);
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.tb-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 13px;
  padding: 3px 5px;
  border-radius: 4px;
  transition: 0.12s;
  color: var(--muted);
  line-height: 1;
}
.tb-btn:hover { background: var(--panel2); color: var(--ink); }
.tb-btn.active { color: var(--accent); }
.tb-btn:disabled { opacity: 0.3; cursor: default; }

.link-btn {
  background: none;
  border: none;
  color: var(--accent);
  cursor: pointer;
  font-weight: 600;
  font-size: inherit;
  padding: 2px;
  font-family: inherit;
}
.link-btn:hover { text-decoration: underline; }

/* ── Toast ──────────────────────────────────────────────── */
.toast {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 100;
  padding: 10px 20px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 13px;
  border: 2px solid;
  box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
  background: var(--panel);
  color: var(--ink);
}
.toast.success { border-color: var(--green); color: var(--green); }
.toast.error { border-color: var(--red); color: var(--red); }
.toast.info { border-color: var(--accent); color: var(--accent); }

/* ── Section Cards ──────────────────────────────────────── */
.section-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.sec-card {
  background: var(--panel);
  border: 2px solid var(--line-strong);
  border-radius: 14px;
  padding: 16px;
  transition: border-color 0.18s, box-shadow 0.18s;
  position: relative;
  cursor: default;
}
.sec-card:hover {
  border-color: var(--accent);
  box-shadow: 0 2px 16px rgba(96, 165, 250, 0.08);
}
.sec-card.active {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.sec-card.hidden {
  opacity: 0.35;
  border-color: var(--muted);
}
.sec-card.hidden:hover { opacity: 0.6; }
.sec-card.dragging { opacity: 0.25; border-style: dashed; }

/* ── Floating Toolbar ───────────────────────────────────── */
.sec-toolbar {
  position: absolute;
  top: -14px;
  right: 12px;
  display: flex;
  gap: 2px;
  background: var(--bg2);
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  padding: 3px 4px;
  opacity: 0;
  transform: translateY(2px);
  transition: opacity 0.15s, transform 0.15s;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}
.sec-card:hover .sec-toolbar {
  opacity: 1;
  transform: translateY(0);
}

/* ── Section Head ───────────────────────────────────────── */
.sec-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.drag-handle {
  cursor: grab;
  color: var(--muted);
  font-size: 18px;
  user-select: none;
  padding: 2px;
}
.drag-handle:active { cursor: grabbing; }
.sec-num {
  font-size: 10px;
  font-weight: 900;
  color: var(--muted);
  background: var(--bg2);
  padding: 2px 6px;
  border-radius: 4px;
  min-width: 20px;
  text-align: center;
}
.sec-title {
  flex: 1;
  font-weight: 700;
  font-size: 15px;
  color: var(--ink);
  padding: 2px 6px;
  border-radius: 4px;
  min-height: 22px;
  cursor: text;
  word-break: break-word;
  line-height: 1.4;
}
.sec-title:focus {
  outline: 2px solid var(--accent);
  background: var(--bg2);
  border-radius: 4px;
}

/* ── Health Dot ─────────────────────────────────────────── */
.health-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
  border: 1px solid transparent;
}
.health-good { background: var(--green); border-color: rgba(34,197,94,0.4); }
.health-mid { background: var(--accent2); border-color: rgba(245,158,11,0.4); }
.health-bad { background: var(--red); border-color: rgba(239,68,68,0.4); }

/* ── Note Editor ────────────────────────────────────────── */
.note-editor {
  margin: 0 0 8px 28px;
}
.note-editor textarea {
  width: 100%;
  background: var(--bg2);
  border: 2px solid var(--accent2);
  border-radius: 8px;
  padding: 8px;
  color: var(--ink);
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
}
.note-editor textarea:focus {
  outline: none;
  border-color: var(--accent);
}

/* ── Body ───────────────────────────────────────────────── */
.sec-body { margin-left: 28px; }
.body-text {
  color: var(--muted);
  font-size: 13px;
  line-height: 1.7;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: text;
  white-space: pre-wrap;
  word-break: break-word;
}
.body-text:focus {
  outline: 2px solid var(--line-strong);
  background: var(--bg2);
  color: var(--ink);
}

/* ── Section Sparkline ──────────────────────────────────── */
.sec-sparkline {
  margin: 8px 0 4px 28px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(0,0,0,0.15);
}

/* ── Items Table ────────────────────────────────────────── */
.sec-items {
  margin: 10px 0 4px 28px;
  overflow-x: auto;
}
.sec-items table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.sec-items th {
  text-align: left;
  padding: 6px 8px;
  background: var(--bg2);
  color: var(--muted);
  font-weight: 700;
  border-bottom: 2px solid var(--line);
  white-space: nowrap;
  user-select: none;
}
.sec-items th.sortable {
  cursor: pointer;
}
.sec-items th.sortable:hover { color: var(--ink); }
.sec-items td {
  padding: 5px 8px;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  vertical-align: middle;
}
.sec-items tr:hover td { background: rgba(255,255,255,0.02); }
.cell-title { font-weight: 600; }
.cell-price { font-variant-numeric: tabular-nums; }
.chg { font-size: 11px; margin-left: 4px; font-weight: 700; }
.chg.up { color: var(--green); }
.chg.down { color: var(--red); }

/* ── Badges ─────────────────────────────────────────────── */
.badge {
  display: inline-block;
  padding: 2px 7px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.badge-green { background: rgba(34,197,94,0.15); color: var(--green); border: 1px solid rgba(34,197,94,0.3); }
.badge-red { background: rgba(239,68,68,0.15); color: var(--red); border: 1px solid rgba(239,68,68,0.3); }
.badge-amber { background: rgba(245,158,11,0.15); color: var(--accent2); border: 1px solid rgba(245,158,11,0.3); }
.badge-gray { background: rgba(159,176,207,0.12); color: var(--muted); border: 1px solid rgba(159,176,207,0.2); }
.dir-badge.dir-up { background: rgba(34,197,94,0.12); color: var(--green); }
.dir-badge.dir-down { background: rgba(239,68,68,0.12); color: var(--red); }
.score-badge { font-variant-numeric: tabular-nums; }

/* ── Item Sparkline ─────────────────────────────────────── */
.item-sparkline {
  width: 72px;
  height: 20px;
  display: inline-block;
  vertical-align: middle;
}
.no-spark { color: var(--muted); font-size: 11px; }

/* ── Fun Fact ───────────────────────────────────────────── */
.fun-fact {
  background: var(--panel2);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 6px 10px;
  margin: 6px 0 0 28px;
  font-size: 12px;
  color: var(--accent2);
}

/* ── Hidden bar ─────────────────────────────────────────── */
.hidden-bar {
  text-align: center;
  padding: 14px;
  color: var(--muted);
  font-size: 13px;
  margin-top: 16px;
}

/* ── Export Modal ───────────────────────────────────────── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(0,0,0,0.7);
  display: grid;
  place-items: center;
  padding: 16px;
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg2);
  border: 2px solid var(--line-strong);
  border-radius: 16px;
  padding: 28px;
  max-width: 520px;
  width: 100%;
  box-shadow: 12px 12px 0 rgba(0,0,0,0.4);
}
.modal h2 {
  color: var(--accent);
  margin: 0 0 18px;
  font-size: 20px;
}
.export-formats {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 18px;
}
.fmt-card {
  display: grid;
  grid-template-columns: 32px 1fr;
  grid-template-rows: auto auto;
  gap: 2px 12px;
  align-items: center;
  padding: 12px;
  border: 2px solid var(--line);
  border-radius: 10px;
  background: var(--panel);
  cursor: pointer;
  transition: 0.15s;
  text-align: left;
  font-family: inherit;
}
.fmt-card:hover,
.fmt-card.active {
  border-color: var(--accent);
  background: var(--bg2);
}
.fmt-icon { font-size: 24px; grid-row: span 2; }
.fmt-name { font-weight: 700; font-size: 14px; color: var(--ink); }
.fmt-desc { font-size: 12px; color: var(--muted); }
.modal-actions { display: flex; gap: 10px; margin-top: 8px; }
.err-text { color: var(--red); font-size: 13px; margin-top: 8px; }

/* ── States ─────────────────────────────────────────────── */
.loading, .err {
  text-align: center;
  padding: 60px 16px;
  color: var(--muted);
}
.err h2 { color: var(--red); }

/* ── Responsive ─────────────────────────────────────────── */
@media (max-width: 600px) {
  .canvas-shell { padding: 16px 10px 60px; }
  .canvas-top { flex-direction: column; }
  .top-actions { width: 100%; }
  .top-actions .btn { flex: 1; justify-content: center; }
  .sec-card { padding: 12px; }
  .sec-title { font-size: 14px; }
  .sec-sparkline { height: 60px; }
  .sec-toolbar { top: -12px; right: 8px; }
}

/* ── Market Overview Bar ───────────────────────────────── */
.market-overview-bar{cursor:pointer;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:8px 14px;margin:0 16px 12px;display:flex;align-items:center;gap:12px;transition:background .2s}
.market-overview-bar:hover{background:var(--panel2)}
.market-bar-label{font-size:12px;font-weight:700;color:var(--accent);white-space:nowrap}
.market-toggle{font-size:10px;margin-left:4px}
.market-bar-compact{display:flex;flex-wrap:wrap;gap:6px;overflow:hidden}
.mkt-chip{font-size:11px;font-weight:600;padding:2px 8px;border-radius:12px;white-space:nowrap}
.mkt-chip.up{color:#22c55e;background:rgba(34,197,94,.1)}
.mkt-chip.down{color:#ef4444;background:rgba(239,68,68,.1)}
.market-overview-expanded{margin:0 16px 12px}
.market-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px}
.market-card-mini{background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:10px;text-align:center}
.mc-name{font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px}
.mc-price{font-size:13px;font-weight:800;color:var(--ink)}
.mc-change{font-size:11px;font-weight:700;margin-top:2px}
.mc-change.up{color:#22c55e}
.mc-change.down{color:#ef4444}
</style>

<!-- Unscoped print styles -->
<style>
@media print {
  @page { margin: 1.2cm; size: A4; }
  body { background: #fff !important; color: #111 !important; }
  .canvas-shell { max-width: 100% !important; padding: 0 !important; }
  .progress-wrap, .top-actions, .sec-toolbar, .btn,
  .hidden-bar, .toast, .modal-overlay, .drag-handle,
  .tb-btn, .nav-link, .auto-badge, .market-overview-bar, .market-overview-expanded { display: none !important; }
  .sec-card { break-inside: avoid; border: 1px solid #ccc !important; box-shadow: none !important; padding: 12px !important; }
  .sec-card.active { box-shadow: none !important; }
  .sec-card.hidden { opacity: 1 !important; }
  .sec-title { color: #111 !important; }
  .body-text { color: #333 !important; }
  .sec-items th { background: #f5f5f5 !important; color: #333 !important; }
  .sec-items td { color: #111 !important; }
  .badge { border: 1px solid currentColor !important; }
  .fun-fact { background: #fafafa !important; color: #92400e !important; }
  .health-dot { width: 8px !important; height: 8px !important; }
  .sec-sparkline { height: 60px !important; }
}
</style>
