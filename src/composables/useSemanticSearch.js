/**
 * useSemanticSearch — Client-side semantic search using Transformers.js
 * Model: Xenova/all-MiniLM-L6-v2 (384-dim embeddings, ~23MB, runs in-browser)
 * All embedding + search happens locally — zero paid APIs, zero backend calls.
 */
import { ref, shallowRef, computed, watch, nextTick } from 'vue'

// ── Singleton pipeline (shared across instances) ───────────────
let _pipeline = null
let _pipelinePromise = null

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'
const CDN_BASE = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2'

async function getPipeline() {
  if (_pipeline) return _pipeline
  if (_pipelinePromise) return _pipelinePromise

  _pipelinePromise = (async () => {
    try {
      // Dynamic import from CDN (Vite passes absolute URLs to browser unchanged)
      const { pipeline, env } = await import(`${CDN_BASE}/dist/transformers.min.js`)

      // Config for browser: disable local cache, use CDN for models
      env.allowLocalModels = false
      env.backends.onnx.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 2, 4)

      const pipe = await pipeline('feature-extraction', MODEL_ID, {
        progress_callback: (p) => {
          if (p.status === 'done') console.log(`[SemanticSearch] Model loaded: ${MODEL_ID}`)
        }
      })
      _pipeline = pipe
      return pipe
    } catch (err) {
      console.error('[SemanticSearch] Failed to load model:', err)
      _pipelinePromise = null
      throw err
    }
  })()

  return _pipelinePromise
}

// ── Cosine similarity ──────────────────────────────────────────
function cosineSim(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// ── Composable ─────────────────────────────────────────────────
export function useSemanticSearch() {
  const searchQuery = ref('')
  const minScore = ref(0.25)      // min similarity threshold (0-1)
  const searchEnabled = ref(false)
  const isIndexing = ref(false)
  const isModelLoading = ref(false)
  const modelReady = ref(false)
  const modelError = ref(null)
  const indexCount = ref(0)
  const searchResults = ref([])   // [{ id, item, score, topic }, ...]

  // Vector index: { id, embedding, item, topic }
  const _index = shallowRef([])
  // Debounce timer
  let _debounce = null
  let _lastQueryEmb = null

  // ── Embed a single text ────────────────────────────────────
  async function embedText(text) {
    const pipe = await getPipeline()
    const output = await pipe(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)  // Float32Array → Array for comparison
  }

  // ── Batch embed multiple texts ─────────────────────────────
  async function embedBatch(texts, batchSize = 8) {
    const pipe = await getPipeline()
    const embeddings = []
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const outputs = await Promise.all(
        batch.map(t => pipe(t, { pooling: 'mean', normalize: true }))
      )
      for (const out of outputs) {
        embeddings.push(Array.from(out.data))
      }
      // Yield to main thread between batches
      if (i + batchSize < texts.length) await new Promise(r => setTimeout(r, 0))
    }
    return embeddings
  }

  // ── Build index from report data ───────────────────────────
  async function buildIndex(report) {
    if (!report || !report.topics) return

    isIndexing.value = true
    searchResults.value = []
    _lastQueryEmb = null
    const entries = []

    // Flatten all items from all topics
    for (const topic of (report.topics || [])) {
      // Index topic intro + title as a "virtual item"
      if (topic.intro?.length > 10 || topic.title) {
        const text = [topic.title, topic.intro, topic.funFact].filter(Boolean).join('. ')
        if (text.length > 5) {
          entries.push({
            id: `topic:${topic.title}`,
            text: text.slice(0, 512),
            item: { title: topic.title, snippet: topic.intro, type: 'topic', source: 'Report Topic' },
            topic: topic.title
          })
        }
      }

      for (const item of (topic.items || [])) {
        if (!item.title) continue
        const text = [item.title, item.snippet].filter(Boolean).join('. ')
        if (text.length < 3) continue
        entries.push({
          id: item.url || item.title,
          text: text.slice(0, 512),
          item,
          topic: topic.title
        })
      }
    }

    if (entries.length === 0) { isIndexing.value = false; return }

    try {
      const texts = entries.map(e => e.text)
      const embeddings = await embedBatch(texts)

      _index.value = entries.map((entry, i) => ({
        ...entry,
        embedding: embeddings[i]
      }))
      indexCount.value = entries.length
    } catch (err) {
      console.error('[SemanticSearch] Index build failed:', err)
      modelError.value = err.message
    } finally {
      isIndexing.value = false
    }
  }

  // ── Internal: rerank with current minScore (no re-embedding) ──
  function rerankResults() {
    if (!_lastQueryEmb || _index.value.length === 0) return
    const results = _index.value
      .map(entry => ({
        id: entry.id,
        item: entry.item,
        topic: entry.topic,
        score: cosineSim(_lastQueryEmb, entry.embedding)
      }))
      .filter(r => r.score >= minScore.value)
      .sort((a, b) => b.score - a.score)

    searchResults.value = results
  }

  // ── Search ─────────────────────────────────────────────────
  async function search(query) {
    if (!query || query.trim().length < 2) {
      searchResults.value = []
      _lastQueryEmb = null
      return
    }
    if (_index.value.length === 0) return

    try {
      _lastQueryEmb = await embedText(query)

      rerankResults()
    } catch (err) {
      console.error('[SemanticSearch] Search failed:', err)
    }
  }

  // ── Debounced search watcher ───────────────────────────────
  watch(searchQuery, (q) => {
    clearTimeout(_debounce)
    _debounce = setTimeout(() => {
      if (searchEnabled.value && q.trim().length >= 2) {
        search(q)
      } else {
        searchResults.value = []
        _lastQueryEmb = null
      }
    }, 400) // 400ms debounce
  })

  // Re-filter when threshold changes (no re-embedding needed)
  watch(minScore, () => {
    if (searchEnabled.value && _lastQueryEmb) {
      rerankResults()
    }
  })

  // ── Load model on demand ───────────────────────────────────
  async function loadModel() {
    if (modelReady.value) return
    isModelLoading.value = true
    modelError.value = null
    try {
      await getPipeline()
      modelReady.value = true
    } catch (err) {
      modelError.value = err.message
    } finally {
      isModelLoading.value = false
    }
  }

  // ── Toggle search on/off ───────────────────────────────────
  async function toggleSearch() {
    searchEnabled.value = !searchEnabled.value
    if (searchEnabled.value) {
      if (!modelReady.value) {
        await loadModel()
      }
      // Auto-build index if not yet indexed
      if (_index.value.length === 0 && !isIndexing.value) {
        // Index is built externally (from ReportPage onMounted)
        // This is here as fallback
      }
    } else {
      searchResults.value = []
      searchQuery.value = ''
      _lastQueryEmb = null
    }
  }

  // ── Check if an item is in search results ──────────────────
  const resultMap = computed(() => {
    const map = new Map()
    for (const r of searchResults.value) {
      map.set(r.id, r.score)
    }
    return map
  })

  function getItemScore(item, topicTitle) {
    const id = item.url || item.title
    return resultMap.value.get(id) ?? resultMap.value.get(`topic:${topicTitle}`) ?? null
  }

  function isItemVisible(item, topicTitle) {
    if (!searchEnabled.value || searchResults.value.length === 0) return true
    return getItemScore(item, topicTitle) !== null
  }

  // ── Get matched topics (for semantic filtering) ────────────
  const matchedTopics = computed(() => {
    if (!searchEnabled.value || searchResults.value.length === 0) return null
    const topics = new Set(searchResults.value.map(r => r.topic))
    return topics
  })

  function isTopicVisible(topicTitle) {
    if (!matchedTopics.value) return true
    return matchedTopics.value.has(topicTitle)
  }

  return {
    // State
    searchQuery,
    searchEnabled,
    minScore,
    isIndexing,
    isModelLoading,
    modelReady,
    modelError,
    indexCount,
    searchResults,

    // Computed
    resultMap,
    matchedTopics,

    // Methods
    buildIndex,
    search,
    toggleSearch,
    loadModel,
    getItemScore,
    isItemVisible,
    isTopicVisible
  }
}
