<template>
  <div class="ed">
    <div class="topbar">
      <div>
        <span class="eb">MULTI-CHANNEL PREVIEW & EDIT</span>
        <h1>{{ slug }}</h1>
      </div>
      <div class="actions">
        <button class="btn primary" @click="publish" :disabled="publishing || !dirty">
          {{ publishing ? 'Publishing...' : dirty ? 'Publish ✨' : 'Saved' }}
        </button>
        <a class="btn" :href="`/report/${slug}`" target="_blank">View Live</a>
      </div>
    </div>

    <!-- Channel Tabs -->
    <div class="ctabs" role="tablist">
      <button v-for="ch in channels" :key="ch.id"
        :class="['ctab', { a: activeTab === ch.id }]"
        :aria-selected="activeTab === ch.id"
        role="tab"
        @click="switchTab(ch.id)">
        <span class="ci">{{ ch.icon }}</span>
        {{ ch.label }}
        <span v-if="ch.id === 'discord' && discordParts" class="badge">{{ discordParts }} part</span>
      </button>
    </div>

    <!-- Tab Content -->
    <div class="cpanel" role="tabpanel">

      <!-- EDITOR TAB -->
      <div v-show="activeTab === 'editor'" class="editor-tab">
        <div class="edit-toolbar">
          <span class="stats">{{ statsText }}</span>
          <span class="chars">{{ textReport?.length || 0 }} chars</span>
        </div>
        <textarea v-model="localText" @input="dirty = true"
          class="code-editor"
          :style="{ minHeight: Math.max(400, Math.min(1200, (textReport?.length || 0) * 0.04)) + 'px' }"
          placeholder="Edit report text here..."></textarea>
      </div>

      <!-- DISCORD TAB -->
      <div v-show="activeTab === 'discord'" class="discord-tab">
        <div v-if="loading.preview" class="loading">Rendering Discord preview...</div>
        <div v-else-if="error" class="err">{{ error }}</div>
        <template v-else>
          <div class="dc-summary">
            <span>📦 {{ discordData?.totalParts || 0 }} part</span>
            <span>⚠️ {{ discordData?.warnings || 0 }} overflow</span>
            <span>📏 max {{ discordData?.charMax || 1850 }} chars/part</span>
          </div>
          <div v-for="p in discordData?.parts || []" :key="p.part" class="dc-part" :class="{ overflow: p.overflow }">
            <div class="dc-header">
              Part {{ p.part }}/{{ p.total }}
              <span class="dc-chars">{{ p.chars }} chars</span>
              <span v-if="p.overflow" class="dc-warn">⚠️ OVERFLOW (max {{ discordData?.splitMax }})</span>
            </div>
            <pre class="dc-body">{{ p.content }}</pre>
          </div>
        </template>
      </div>

      <!-- WEB TAB -->
      <div v-show="activeTab === 'web'" class="web-tab">
        <div v-if="loading.preview" class="loading">Rendering Web preview...</div>
        <div v-else-if="error" class="err">{{ error }}</div>
        <iframe v-else-if="webData?.html" :srcdoc="webData.html" class="web-frame" title="Web Preview"></iframe>
        <div v-else class="err">No web content available</div>
      </div>

      <!-- PDF TAB -->
      <div v-show="activeTab === 'pdf'" class="pdf-tab">
        <div v-if="loading.preview" class="loading">Rendering PDF preview...</div>
        <div v-else-if="error" class="err">{{ error }}</div>
        <template v-else>
          <div class="pdf-summary">
            <span>📄 {{ pdfData?.estimatedPages || '?' }} pages (A4)</span>
            <span>📏 {{ pdfData?.chars || 0 }} chars</span>
          </div>
          <iframe v-if="pdfData?.html" :srcdoc="pdfData.html" class="pdf-frame" title="PDF Preview"></iframe>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { API_BASE } from '../lib/api.js'

const route = useRoute()
const slug = computed(() => route.params.slug)

const channels = [
  { id: 'editor', label: 'Editor', icon: '📝' },
  { id: 'discord', label: 'Discord Preview', icon: '💬' },
  { id: 'web', label: 'Web Preview', icon: '🌐' },
  { id: 'pdf', label: 'PDF Preview', icon: '📄' },
]

const activeTab = ref('editor')
const localText = ref('')
const textReport = ref('')
const date = ref('')
const topics = ref([])
const statsText = ref('')
const dirty = ref(false)
const publishing = ref(false)
const error = ref(null)

const discordData = ref(null)
const webData = ref(null)
const pdfData = ref(null)
const discordParts = computed(() => discordData.value?.totalParts || 0)

const loading = ref({ preview: false, init: true })

async function loadReport() {
  loading.value.init = true
  try {
    const res = await fetch(`${API_BASE}/api/report/${slug.value}/preview/editor`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    textReport.value = data.textReport || ''
    localText.value = data.textReport || ''
    date.value = data.date || ''
    topics.value = data.topics || []
    statsText.value = `${data.stats?.topics || 0} sections · ${data.stats?.items || 0} items`
  } catch (e) {
    error.value = `Failed to load report: ${e.message}`
  } finally {
    loading.value.init = false
  }
}

async function renderPreview(channel) {
  loading.value.preview = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/report/${slug.value}/preview/${channel}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (channel === 'discord') discordData.value = data
    else if (channel === 'web') webData.value = data
    else if (channel === 'pdf') pdfData.value = data
  } catch (e) {
    error.value = `Preview failed: ${e.message}`
  } finally {
    loading.value.preview = false
  }
}

function switchTab(channel) {
  activeTab.value = channel
  if (channel !== 'editor' && !loading.value.preview) {
    renderPreview(channel)
  }
}

async function publish() {
  publishing.value = true
  error.value = null
  try {
    const res = await fetch(`${API_BASE}/api/report/${slug.value}/publish/editor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ textReport: localText.value })
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    textReport.value = localText.value
    dirty.value = false
    // Refresh previews
    if (discordData.value) renderPreview('discord')
    if (webData.value) renderPreview('web')
    if (pdfData.value) renderPreview('pdf')
  } catch (e) {
    error.value = `Publish failed: ${e.message}`
  } finally {
    publishing.value = false
  }
}

onMounted(loadReport)
</script>

<style scoped>
.ed {
  max-width: 1100px;
  margin: 0 auto;
  padding: 16px;
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--line);
  padding-bottom: 14px;
}
.eb {
  display: inline-block;
  padding: 4px 10px;
  border: 2px solid var(--line-strong);
  background: #07111f;
  color: #f8b84e;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .14em;
  margin-bottom: 8px;
}
.topbar h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.1;
  letter-spacing: -.04em;
}
.actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}
.btn {
  padding: 10px 18px;
  border: 2px solid var(--line-strong);
  background: var(--panel);
  color: var(--ink);
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: .15s;
  text-decoration: none;
  display: inline-block;
}
.btn:hover { background: var(--line); }
.btn.primary {
  background: #6366f1;
  color: #fff;
  border-color: #4f46e5;
}
.btn.primary:hover { background: #4f46e5; }
.btn.primary:disabled {
  opacity: .5;
  cursor: not-allowed;
}

/* Channel tabs */
.ctabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  overflow-x: auto;
}
.ctab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border: 2px solid var(--line);
  background: var(--panel);
  color: var(--muted);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: .15s;
  white-space: nowrap;
}
.ctab:hover { border-color: var(--line-strong); color: var(--ink); }
.ctab.a {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.ci { font-size: 16px; }
.badge {
  background: #f59e0b;
  color: #111;
  font-size: 10px;
  font-weight: 900;
  padding: 2px 7px;
  border-radius: 999px;
}

/* Panel */
.cpanel {
  min-height: 400px;
  background: var(--panel);
  border: 2px solid var(--line);
  padding: 16px;
}
.loading, .err {
  text-align: center;
  padding: 60px 20px;
  color: var(--muted);
}
.err { color: var(--red); }

/* Editor tab */
.edit-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  font-size: 12px;
  color: var(--muted);
}
.code-editor {
  width: 100%;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: calc(13px * var(--font-scale));
  line-height: 1.6;
  background: #0d1117;
  color: #e6edf3;
  border: 1px solid var(--line);
  padding: 14px;
  resize: vertical;
  tab-size: 2;
}
.code-editor:focus {
  outline: none;
  border-color: var(--accent);
}

/* Discord tab */
.dc-summary {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 14px;
  padding: 10px;
  background: var(--bg2);
  border: 1px solid var(--line);
}
.dc-part {
  margin-bottom: 12px;
  border: 2px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
}
.dc-part.overflow { border-color: var(--red); }
.dc-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  background: var(--bg2);
  font-size: 12px;
  font-weight: 700;
  color: var(--muted);
  border-bottom: 1px solid var(--line);
}
.dc-chars { color: var(--accent); }
.dc-warn { color: var(--red); font-weight: 900; }
.dc-body {
  padding: 12px;
  margin: 0;
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--ink);
  background: var(--panel2);
}

/* Web tab */
.web-frame {
  width: 100%;
  height: 80vh;
  border: none;
  background: #fff;
}

/* PDF tab */
.pdf-summary {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 14px;
  padding: 10px;
  background: var(--bg2);
  border: 1px solid var(--line);
}
.pdf-frame {
  width: 100%;
  height: 80vh;
  border: 1px solid var(--line);
  background: #fff;
}

@media (max-width: 700px) {
  .topbar { flex-direction: column; }
  .topbar h1 { font-size: 24px; }
  .ctab { font-size: 11px; padding: 8px 10px; }
}
</style>
