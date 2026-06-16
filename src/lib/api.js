const host = window.location.hostname || 'localhost'
const protocol = window.location.protocol || 'http:'
const apiPort = import.meta.env.VITE_API_PORT || '1747'
export const API_BASE = import.meta.env.VITE_API_BASE || `${protocol}//${host}:${apiPort}`

async function withRetry(fn, maxAttempts = 2) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxAttempts || !isNetworkError(err)) throw err
      await new Promise(r => setTimeout(r, 1000 * attempt))
    }
  }
}

function isNetworkError(err) {
  return err instanceof TypeError && /fetch|network/i.test(err.message)
}

export async function apiGet(path) {
  return withRetry(async () => {
    const res = await fetch(`${API_BASE}${path}`)
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  })
}

export async function apiPost(path, body) {
  return withRetry(async () => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  })
}

export async function apiPut(path, body) {
  return withRetry(async () => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) throw new Error(`API error ${res.status}`)
    return res.json()
  })
}
