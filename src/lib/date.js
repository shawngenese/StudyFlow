import * as chrono from 'chrono-node'

const DAY_MS = 86400000
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDueDate(input) {
  if (typeof input !== 'string' || !input.trim()) return null
  const results = chrono.parse(input.trim(), new Date(), { forwardDate: true })
  if (!results.length) return null
  const d = results[0].start.date()
  return todayKey(d)
}

export function humanDue(key) {
  if (!key || !DATE_RE.test(key)) return ''
  const today = todayKey()
  const tomorrow = todayKey(new Date(Date.now() + DAY_MS))
  if (key === today) return 'Today'
  if (key === tomorrow) return 'Tomorrow'
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return ''
  const [ty, tm, td] = today.split('-').map(Number)
  const diff = Math.round((date.getTime() - new Date(ty, tm - 1, td).getTime()) / DAY_MS)
  const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (diff === -1) return `Yesterday · ${label}`
  if (diff < 0) return `Overdue · ${label}`
  return label
}

export function isOverdue(task) {
  return !!task.dueDate && DATE_RE.test(task.dueDate) && !task.completed && task.dueDate < todayKey()
}

export function relativeUpdated(ts) {
  if (!Number.isFinite(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 0) return 'just now'
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US')
}
