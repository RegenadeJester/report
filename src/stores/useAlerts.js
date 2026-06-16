import { ref } from 'vue'

const DISMISSED_KEY = 'market-orca:dismissed-alerts'
const DISMISSED_TTL_MS = 1000 * 60 * 60 * 24 * 3

function loadDismissedMap() {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '{}')
    const now = Date.now()
    const cleaned = Object.fromEntries(Object.entries(raw).filter(([, ts]) => now - Number(ts) < DISMISSED_TTL_MS))
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(cleaned))
    return cleaned
  } catch {
    localStorage.setItem(DISMISSED_KEY, '{}')
    return {}
  }
}

const toasts = ref([])
const history = ref([])
const audioReady = ref(false)
const dismissedMap = ref(loadDismissedMap())
const soundEnabledState = ref(localStorage.getItem('market-orca:sound') === '1')
const notificationReady = ref(typeof Notification !== 'undefined' && Notification.permission === 'granted')
let nextId = 1
let ctx = null

function persistDismissed() {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedMap.value))
}

function isDismissed(alertKey) {
  return !!dismissedMap.value[String(alertKey)]
}

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)()
  return ctx
}

export async function enableAlertAudio() {
  try {
    const c = getCtx()
    if (c.state === 'suspended') await c.resume()
    const oscillator = c.createOscillator()
    const gain = c.createGain()
    oscillator.connect(gain)
    gain.connect(c.destination)
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(880, c.currentTime)
    gain.gain.setValueAtTime(0.001, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.18)
    oscillator.start(c.currentTime)
    oscillator.stop(c.currentTime + 0.2)
    audioReady.value = true
  } catch {}
}

export async function enableBrowserNotifications() {
  if (typeof Notification === 'undefined') return false
  if (Notification.permission === 'granted') {
    notificationReady.value = true
    return true
  }
  const result = await Notification.requestPermission()
  notificationReady.value = result === 'granted'
  return notificationReady.value
}

function beep() {
  try {
    const c = getCtx()
    if (c.state === 'suspended') c.resume()
    const o1 = c.createOscillator()
    const o2 = c.createOscillator()
    const gain = c.createGain()
    o1.connect(gain)
    o2.connect(gain)
    gain.connect(c.destination)
    o1.type = 'triangle'
    o2.type = 'sine'
    o1.frequency.setValueAtTime(740, c.currentTime)
    o2.frequency.setValueAtTime(988, c.currentTime)
    gain.gain.setValueAtTime(0.001, c.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.08, c.currentTime + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.35)
    o1.start(c.currentTime)
    o2.start(c.currentTime)
    o1.stop(c.currentTime + 0.35)
    o2.stop(c.currentTime + 0.35)
  } catch {}
}

function sendBrowserNotification(payload) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
  const n = new Notification(payload.title, {
    body: payload.message,
    tag: String(payload.alertKey || payload.id || payload.title),
    silent: true,
  })
  n.onclick = () => {
    window.focus()
    if (payload.newsLink) window.open(payload.newsLink, '_blank', 'noopener,noreferrer')
    else if (payload.slug) window.location.href = `/asset/${payload.slug}`
  }
}

export function setSoundEnabled(value) {
  soundEnabledState.value = !!value
  localStorage.setItem('market-orca:sound', value ? '1' : '0')
}

export function useAlerts() {
  function pushToast(payload, withSound = false, options = {}) {
    const alertKey = String(payload.alertKey ?? payload.id ?? nextId)
    if (isDismissed(alertKey) || toasts.value.some((t) => String(t.alertKey) === alertKey)) return
    const toast = { id: nextId++, alertKey, ...payload }
    history.value.unshift(toast)
    if (options.browserNotify) {
      sendBrowserNotification(toast)
    } else {
      toasts.value.unshift(toast)
      setTimeout(() => {
        toasts.value = toasts.value.filter((t) => t.id !== toast.id)
      }, 9000)
    }
    if ((withSound || soundEnabledState.value) && audioReady.value) beep()
  }

  function dismissToast(id) {
    const toast = toasts.value.find((t) => t.id === id)
    if (toast?.alertKey) {
      dismissedMap.value[String(toast.alertKey)] = Date.now()
      persistDismissed()
    }
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  return { toasts, history, pushToast, dismissToast, audioReady, dismissedMap, soundEnabledState, notificationReady, isDismissed }
}
