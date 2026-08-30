import { newId } from './id'

const listeners = new Set()
let toasts = []
const timers = new Map()
const recentMessages = new Map() // dedupe throttle

export function getToasts() {
  return [...toasts]
}

export function subscribeToasts(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  for (const l of listeners) {
    try { l([...toasts]) } catch { /* ignore listener throw */ }
  }
}

export function dismissToast(id) {
  const timer = timers.get(id)
  if (timer) { clearTimeout(timer); timers.delete(id) }
  const had = toasts.some((t) => t.id === id)
  if (!had) return
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function toast(message, tone = 'info', action) {
  const validTone = tone === 'error' ? 'error' : 'info'
  const text = String(message).slice(0, 300)
  const key = `${text}::${validTone}`
  const now = Date.now()
  const last = recentMessages.get(key)
  // throttle identical toasts to once per 2s
  if (last && now - last < 2000) return last
  if (toasts.some((t) => t.message === text && t.tone === validTone)) return
  recentMessages.set(key, now)
  setTimeout(()=> { if(recentMessages.get(key)===now) recentMessages.delete(key)}, 2000)
  const item = { id: newId(), message: text, tone: validTone, action }
  const MAX = 4
  const next = [...toasts, item]
  if (next.length > MAX) {
    const evicted = next.slice(0, next.length - MAX)
    for (const e of evicted) {
      const t = timers.get(e.id)
      if (t) { clearTimeout(t); timers.delete(e.id) }
    }
  }
  toasts = next.length > MAX ? next.slice(next.length - MAX) : next
  notify()
  const timer = setTimeout(() => dismissToast(item.id), 4200)
  timers.set(item.id, timer)
  return item.id
}

export function clearAllToasts(){
  for(const [,t] of timers){ clearTimeout(t) }
  timers.clear()
  toasts=[]
  notify()
}
