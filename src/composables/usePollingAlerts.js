import { onMounted, onBeforeUnmount } from 'vue'
import { useAlerts } from '../stores/useAlerts'
import { usePreferences } from '../stores/usePreferences'
import { useRuntimeSettings } from '../stores/useRuntimeSettings'
import { apiGet } from '../lib/api'

export function usePollingAlerts() {
  const { pushToast } = useAlerts()
  const { soundEnabled } = usePreferences()
  const { dataSaver } = useRuntimeSettings()
  let timer = null
  let seen = new Set()

  async function poll() {
    try {
      const data = await apiGet('/api/alerts/live')
      for (const item of data.alerts || []) {
        const key = `${item.id}`
        if (seen.has(key)) continue
        seen.add(key)
        const isActiveView = document.visibilityState === 'visible' && document.hasFocus()
        pushToast({
          title: item.title,
          message: item.message,
          slug: item.asset_slug,
          asset_slug: item.asset_slug,
          alertKey: item.id,
          newsLink: item.news_link || '',
          newsTitle: item.news_title || ''
        }, soundEnabled.value, { browserNotify: !isActiveView })
      }
    } catch {}
  }

  function restart() {
    if (timer) clearInterval(timer)
    const base = dataSaver.value ? 25000 : 10000
    timer = setInterval(poll, document.hidden ? Math.max(30000, base * 2) : base)
  }

  function handleVisibility() {
    if (!document.hidden) poll()
    restart()
  }

  onMounted(() => {
    poll()
    restart()
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)
  })

  onBeforeUnmount(() => {
    if (timer) clearInterval(timer)
    document.removeEventListener('visibilitychange', handleVisibility)
    window.removeEventListener('focus', handleVisibility)
  })
}
