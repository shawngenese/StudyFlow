import { newId } from './id'

const listeners = new Set()
let toasts = []
const timers = new Map()

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
  const had = toasts.some((t) => t.id === id)
  if (!had) return
  const timer = timers.get(id)
  if (timer) { clearTimeout(timer); timers.delete(id) }
  toasts = toasts.filter((t) => t.id !== id)
  notify()
}

export function toast(message, tone = 'info', action) {
  const validTone = tone === 'error' ? 'error' : 'info'
  const item = { id: newId(), message: String(message).slice(0, 300), tone: validTone, action }
  if (toasts.some((t) => t.message === item.message && t.tone === item.tone)) return item.id
  const MAX = 4
  const next = [...toasts, item]
  toasts = next.length > MAX ? next.slice(next.length - MAX) : next
  notify()
  const timer = setTimeout(() => dismissToast(item.id), 4200)
  timers.set(item.id, timer)
  return item.id
}
