import { ref } from 'vue'
import { apiGet, apiPost } from '../lib/api'

const soundEnabled = ref(localStorage.getItem('market-orca:sound') === '1')
const favorites = ref([])

export async function loadFavorites() {
  try {
    const data = await apiGet('/api/watchlist')
    favorites.value = (data.items || []).map((x) => x.slug)
  } catch {
    favorites.value = JSON.parse(localStorage.getItem('market-orca:favorites') || '[]')
  }
}

export function usePreferences() {
  async function toggleFavorite(slug) {
    if (favorites.value.includes(slug)) {
      favorites.value = favorites.value.filter((x) => x !== slug)
      try { await apiPost('/api/watchlist/remove', { slug }) } catch {}
    } else {
      favorites.value = [...favorites.value, slug]
      try { await apiPost('/api/watchlist', { slug }) } catch {}
    }
    localStorage.setItem('market-orca:favorites', JSON.stringify(favorites.value))
  }
  return { soundEnabled, favorites, toggleFavorite }
}
