import { ref } from 'vue'
import { apiGet } from '../lib/api'

export function useSymbolSearch() {
  const results = ref([])
  const loading = ref(false)
  let timer = null

  function search(q) {
    clearTimeout(timer)
    if (!q || q.trim().length < 2) {
      results.value = []
      return
    }
    timer = setTimeout(async () => {
      loading.value = true
      try {
        const data = await apiGet(`/api/search?q=${encodeURIComponent(q)}`)
        results.value = data.results || []
      } catch {
        results.value = []
      } finally {
        loading.value = false
      }
    }, 250)
  }

  return { results, loading, search }
}
