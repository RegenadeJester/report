<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'

const props = defineProps({
  reportSlug: { type: String, required: true },
  sections: { type: Array, default: () => [] }
})

const notes = ref([])
const newNote = ref({ section: '', text: '', author: '' })
const panelOpen = ref(false)
const importInput = ref('')
const showImport = ref(false)
const panelRef = ref(null)
const importFileRef = ref(null)

const STORAGE_KEY = computed(() => `mo-colab-notes-${props.reportSlug}`)

const sortedNotes = computed(() =>
  [...notes.value].sort((a, b) => b.timestamp - a.timestamp)
)

const noteCount = computed(() => notes.value.length)

const sectionOptions = computed(() =>
  props.sections.length ? props.sections : ['General']
)

function generateUsername() {
  const id = Math.floor(1000 + Math.random() * 9000)
  return `anon#${id}`
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.value)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) notes.value = parsed
    }
  } catch { notes.value = [] }
}

function saveNotes() {
  try {
    localStorage.setItem(STORAGE_KEY.value, JSON.stringify(notes.value))
  } catch { /* quota exceeded — silent */ }
}

function addNote() {
  const text = newNote.value.text.trim()
  if (!text) return

  const author = newNote.value.author.trim() || generateUsername()
  const section = newNote.value.section || sectionOptions.value[0]

  notes.value.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    author,
    section,
    text,
    timestamp: Date.now(),
    likes: 0,
    likedByUser: false
  })

  saveNotes()
  newNote.value.text = ''
  if (!newNote.value.author) newNote.value.author = author

  nextTick(() => {
    if (panelRef.value) panelRef.value.scrollTop = 0
  })
}

function likeNote(id) {
  const note = notes.value.find(n => n.id === id)
  if (!note) return
  if (note.likedByUser) {
    note.likes = Math.max(0, note.likes - 1)
    note.likedByUser = false
  } else {
    note.likes++
    note.likedByUser = true
  }
  saveNotes()
}

function removeNote(id) {
  notes.value = notes.value.filter(n => n.id !== id)
  saveNotes()
}

function exportNotes() {
  const data = JSON.stringify(notes.value, null, 2)
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `colab-notes-${props.reportSlug}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function importNotes() {
  if (showImport.value) {
    // Try parsing textarea content
    try {
      const parsed = JSON.parse(importInput.value)
      if (Array.isArray(parsed)) {
        const existingIds = new Set(notes.value.map(n => n.id))
        const incoming = parsed.filter(n => n.id && n.text)
        let added = 0
        for (const n of incoming) {
          if (!existingIds.has(n.id)) {
            notes.value.push({ ...n, likedByUser: false })
            added++
          }
        }
        saveNotes()
        importInput.value = ''
        showImport.value = false
      }
    } catch {
      // Invalid JSON — leave open
    }
  } else {
    showImport.value = true
  }
}

function triggerFileImport() {
  importFileRef.value?.click()
}

function onFileImport(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result)
      if (Array.isArray(parsed)) {
        const existingIds = new Set(notes.value.map(n => n.id))
        for (const n of parsed) {
          if (n.id && n.text && !existingIds.has(n.id)) {
            notes.value.push({ ...n, likedByUser: false })
          }
        }
        saveNotes()
      }
    } catch { /* ignore */ }
  }
  reader.readAsText(file)
  e.target.value = ''
}

function formatTime(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now - d
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function togglePanel() {
  panelOpen.value = !panelOpen.value
}

function onKeydown(e) {
  if (e.key === 'Escape') panelOpen.value = false
}

onMounted(() => {
  loadNotes()
  if (!newNote.value.section && sectionOptions.value.length) {
    newNote.value.section = sectionOptions.value[0]
  }
})
</script>

<template>
  <div class="colab-notes-wrapper">
    <!-- Toggle Button -->
    <button class="colab-toggle" :class="{ active: panelOpen }" @click="togglePanel" :title="panelOpen ? 'Close notes' : 'Open collaboration notes'">
      <span class="colab-toggle-icon">💬</span>
      <span v-if="noteCount > 0" class="colab-badge">{{ noteCount }}</span>
    </button>

    <!-- Floating Panel -->
    <Teleport to="body">
      <Transition name="cn-slide">
        <div v-if="panelOpen" class="colab-overlay" @click.self="panelOpen = false" @keydown="onKeydown">
          <aside class="colab-panel" ref="panelRef">
            <!-- Header -->
            <div class="cn-header">
              <div class="cn-title-row">
                <h3 class="cn-title">💬 Collaboration Notes</h3>
                <button class="cn-close" @click="panelOpen = false" aria-label="Close notes">✕</button>
              </div>
              <div class="cn-meta">{{ noteCount }} note{{ noteCount !== 1 ? 's' : '' }} · {{ reportSlug }}</div>
            </div>

            <!-- Input Area -->
            <div class="cn-input-area">
              <div class="cn-input-row">
                <input
                  v-model="newNote.author"
                  type="text"
                  class="cn-field cn-author"
                  placeholder="Your name (optional)"
                  maxlength="30"
                />
                <select v-model="newNote.section" class="cn-field cn-section-select">
                  <option v-for="s in sectionOptions" :key="s" :value="s">{{ s }}</option>
                </select>
              </div>
              <div class="cn-input-main">
                <textarea
                  v-model="newNote.text"
                  class="cn-field cn-textarea"
                  placeholder="Add a note… (Ctrl+Enter to submit)"
                  rows="3"
                  @keydown.ctrl.enter="addNote"
                  @keydown.meta.enter="addNote"
                ></textarea>
              </div>
              <div class="cn-input-actions">
                <button class="cn-btn cn-btn-post" @click="addNote" :disabled="!newNote.text.trim()">
                  ✏️ Post Note
                </button>
                <div class="cn-btn-group">
                  <button class="cn-btn cn-btn-sm" @click="exportNotes" title="Export notes as JSON">📥 Export</button>
                  <button class="cn-btn cn-btn-sm" @click="triggerFileImport" title="Import from JSON file">📤 Import File</button>
                  <input ref="importFileRef" type="file" accept=".json" class="cn-file-input" @change="onFileImport" />
                  <button class="cn-btn cn-btn-sm" @click="importNotes" :class="{ active: showImport }">{{ showImport ? '📋 Paste & Import' : '📋 Import JSON' }}</button>
                </div>
              </div>

              <!-- Paste Import -->
              <div v-if="showImport" class="cn-import-area">
                <textarea
                  v-model="importInput"
                  class="cn-field cn-import-textarea"
                  placeholder="Paste JSON notes here…"
                  rows="4"
                ></textarea>
                <div class="cn-import-actions">
                  <button class="cn-btn cn-btn-sm" @click="importNotes">✅ Confirm Import</button>
                  <button class="cn-btn cn-btn-sm cn-btn-cancel" @click="showImport = false; importInput = ''">Cancel</button>
                </div>
              </div>
            </div>

            <!-- Notes List -->
            <div class="cn-notes-list" v-if="sortedNotes.length">
              <TransitionGroup name="cn-note">
                <article v-for="note in sortedNotes" :key="note.id" class="cn-note-card">
                  <div class="cn-note-header">
                    <span class="cn-note-author">👤 {{ note.author }}</span>
                    <span class="cn-note-section">📁 {{ note.section }}</span>
                    <span class="cn-note-time" :title="new Date(note.timestamp).toLocaleString()">{{ formatTime(note.timestamp) }}</span>
                  </div>
                  <p class="cn-note-text">{{ note.text }}</p>
                  <div class="cn-note-footer">
                    <button class="cn-like-btn" :class="{ liked: note.likedByUser }" @click="likeNote(note.id)" :title="note.likedByUser ? 'Unlike' : 'Like'">
                      {{ note.likedByUser ? '❤️' : '🤍' }} {{ note.likes || '' }}
                    </button>
                    <button class="cn-delete-btn" @click="removeNote(note.id)" title="Delete note">🗑️</button>
                  </div>
                </article>
              </TransitionGroup>
            </div>

            <!-- Empty State -->
            <div v-else class="cn-empty">
              <span class="cn-empty-icon">📝</span>
              <p>No notes yet. Be the first to annotate!</p>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.colab-notes-wrapper { position: relative; display: inline-block; }

/* ─── Toggle Button ─── */
.colab-toggle {
  position: relative;
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px;
  background: var(--panel, #111827);
  border: 2px solid var(--line-strong, #4b5d7a);
  border-radius: 999px;
  color: var(--ink, #ebf2ff);
  font-size: 13px; font-weight: 700;
  cursor: pointer;
  transition: all .2s;
  box-shadow: 4px 4px 0 rgba(0,0,0,.2);
}
.colab-toggle:hover { border-color: var(--accent, #60a5fa); }
.colab-toggle.active { border-color: var(--accent, #60a5fa); background: rgba(96,165,250,.12); box-shadow: none; transform: translate(2px,2px); }
.colab-toggle-icon { font-size: 16px; }
.colab-badge {
  background: var(--accent, #60a5fa);
  color: #fff;
  font-size: 10px; font-weight: 900;
  min-width: 18px; height: 18px;
  display: grid; place-items: center;
  border-radius: 999px;
  padding: 0 5px;
}

/* ─── Overlay ─── */
.colab-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,.45);
  z-index: 9500;
  display: flex; justify-content: flex-end;
}

/* ─── Panel ─── */
.colab-panel {
  width: min(420px, 100vw);
  height: 100%;
  background: linear-gradient(180deg, #10192b, #0b1220);
  border-left: 2px solid var(--line-strong, #4b5d7a);
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: -8px 0 30px rgba(0,0,0,.4);
}

/* ─── Header ─── */
.cn-header {
  padding: 18px 16px 12px;
  border-bottom: 1px solid var(--line, #263247);
  flex-shrink: 0;
}
.cn-title-row { display: flex; justify-content: space-between; align-items: center; }
.cn-title { margin: 0; font-size: 16px; font-weight: 800; color: var(--accent, #60a5fa); }
.cn-close {
  border: 0; background: var(--bg2, #111827); color: var(--ink, #ebf2ff);
  border-radius: 999px; width: 28px; height: 28px;
  display: grid; place-items: center; cursor: pointer;
  font-size: 14px; transition: .15s;
}
.cn-close:hover { background: var(--red, #fb7185); color: #fff; }
.cn-meta { font-size: 11px; color: var(--muted, #9fb0cf); margin-top: 4px; }

/* ─── Input Area ─── */
.cn-input-area {
  padding: 12px 16px;
  border-bottom: 1px solid var(--line, #263247);
  flex-shrink: 0;
}
.cn-input-row { display: flex; gap: 8px; margin-bottom: 8px; }
.cn-field {
  background: var(--bg2, #111827);
  border: 2px solid var(--line, #263247);
  border-radius: 10px;
  color: var(--ink, #ebf2ff);
  font-size: 13px;
  padding: 8px 10px;
  transition: border-color .2s;
  outline: none;
}
.cn-field:focus { border-color: var(--accent, #60a5fa); }
.cn-field::placeholder { color: var(--muted, #9fb0cf); opacity: .6; }
.cn-author { flex: 1; min-width: 0; }
.cn-section-select { min-width: 100px; max-width: 160px; }
.cn-textarea { width: 100%; resize: vertical; min-height: 60px; font-family: inherit; }
.cn-input-actions { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.cn-btn-group { display: flex; gap: 6px; flex-wrap: wrap; }
.cn-btn {
  padding: 8px 14px;
  border-radius: 999px;
  border: 2px solid var(--line-strong, #4b5d7a);
  background: var(--panel, #111827);
  color: var(--ink, #ebf2ff);
  font-size: 12px; font-weight: 700;
  cursor: pointer;
  transition: all .15s;
}
.cn-btn:hover:not(:disabled) { border-color: var(--accent, #60a5fa); }
.cn-btn:disabled { opacity: .4; cursor: not-allowed; }
.cn-btn-post { background: var(--accent, #60a5fa); color: #fff; border-color: var(--accent, #60a5fa); }
.cn-btn-post:hover:not(:disabled) { background: #4b8de8; }
.cn-btn-sm { font-size: 11px; padding: 5px 10px; }
.cn-btn-cancel { border-color: var(--red, #fb7185); color: var(--red, #fb7185); }
.cn-file-input { display: none; }
.cn-import-area { margin-top: 8px; }
.cn-import-textarea { width: 100%; resize: vertical; min-height: 60px; font-family: monospace; font-size: 11px; }
.cn-import-actions { display: flex; gap: 6px; margin-top: 6px; }

/* ─── Notes List ─── */
.cn-notes-list {
  flex: 1; overflow-y: auto;
  padding: 12px 16px;
  display: flex; flex-direction: column; gap: 10px;
}
.cn-note-card {
  background: var(--panel, #111827);
  border: 1px solid var(--line, #263247);
  border-radius: 12px;
  padding: 12px;
  transition: border-color .15s;
}
.cn-note-card:hover { border-color: var(--line-strong, #4b5d7a); }
.cn-note-header {
  display: flex; flex-wrap: wrap; gap: 6px 12px;
  align-items: center;
  margin-bottom: 6px;
}
.cn-note-author { font-size: 12px; font-weight: 700; color: var(--accent, #60a5fa); }
.cn-note-section { font-size: 11px; color: var(--muted, #9fb0cf); }
.cn-note-time { font-size: 10px; color: var(--muted, #9fb0cf); margin-left: auto; }
.cn-note-text { font-size: 13px; color: var(--ink, #ebf2ff); line-height: 1.55; margin: 0; word-wrap: break-word; }
.cn-note-footer {
  display: flex; gap: 8px; align-items: center;
  margin-top: 8px; padding-top: 6px;
  border-top: 1px solid rgba(38,50,71,.5);
}
.cn-like-btn {
  border: 0; background: transparent;
  color: var(--muted, #9fb0cf);
  font-size: 12px; cursor: pointer;
  padding: 2px 6px; border-radius: 999px;
  transition: all .15s;
}
.cn-like-btn:hover { background: rgba(255,255,255,.06); }
.cn-like-btn.liked { color: #fb7185; }
.cn-delete-btn {
  border: 0; background: transparent;
  color: var(--muted, #9fb0cf);
  font-size: 12px; cursor: pointer;
  padding: 2px 6px; border-radius: 999px;
  margin-left: auto;
  opacity: 0; transition: opacity .15s;
}
.cn-note-card:hover .cn-delete-btn { opacity: 1; }
.cn-delete-btn:hover { color: var(--red, #fb7185); background: rgba(251,113,133,.1); }

/* ─── Empty State ─── */
.cn-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  color: var(--muted, #9fb0cf); text-align: center; padding: 32px 16px;
}
.cn-empty-icon { font-size: 36px; margin-bottom: 12px; opacity: .5; }
.cn-empty p { font-size: 13px; margin: 0; }

/* ─── Slide Transition ─── */
.cn-slide-enter-active, .cn-slide-leave-active { transition: opacity .2s; }
.cn-slide-enter-active .colab-panel, .cn-slide-leave-active .colab-panel { transition: transform .25s ease; }
.cn-slide-enter-from, .cn-slide-leave-to { opacity: 0; }
.cn-slide-enter-from .colab-panel, .cn-slide-leave-to .colab-panel { transform: translateX(100%); }

/* ─── Note Transition ─── */
.cn-note-enter-active { transition: all .2s ease; }
.cn-note-leave-active { transition: all .15s ease; }
.cn-note-enter-from { opacity: 0; transform: translateY(-8px); }
.cn-note-leave-to { opacity: 0; transform: translateX(20px); }

/* ─── Scrollbar ─── */
.cn-notes-list::-webkit-scrollbar { width: 6px; }
.cn-notes-list::-webkit-scrollbar-track { background: transparent; }
.cn-notes-list::-webkit-scrollbar-thumb { background: var(--line-strong, #4b5d7a); border-radius: 3px; }

/* ─── Mobile ─── */
@media (max-width: 600px) {
  .colab-panel { width: 100%; }
  .cn-input-row { flex-direction: column; }
  .cn-section-select { max-width: 100%; }
  .cn-input-actions { flex-direction: column; align-items: stretch; }
  .cn-btn-group { justify-content: center; }
}
</style>
