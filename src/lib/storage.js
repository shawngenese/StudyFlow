import { newId } from './id'

export const STORAGE_KEY = 'shawn-todos-v3'
export const SCHEMA_VERSION = 3

export const TOMBSTONE_COLLECTIONS = ['projects', 'savedFilters', 'tasks', 'habits', 'docs', 'goals']
export const TOMBSTONE_TTL = 120 * 24 * 60 * 60 * 1000

export const LIMITS = {
  TASK_TEXT: 200,
  PROJECT_NAME: 40,
  FILTER_NAME: 40,
  TAG_LEN: 20,
  TAG_COUNT: 20,
  SUBTASK_TEXT: 200,
  SUBTASK_COUNT: 50,
  NOTES_LEN: 50000,
  HABIT_NAME: 40,
  DOC_TITLE: 80,
  DOC_BODY: 50000,
  GOAL_TITLE: 60,
  IMPORT_TASKS_MAX: 5000,
  SAVED_FILTERS_MAX: 20,
  FOCUS_SESSIONS_MAX: 200,
  IMAGE_BYTES: 32 * 1024,
}

const INBOX = () => ({ id: 'inbox', name: 'Inbox' })
const DUE_RE = /^\d{4}-\d{2}-\d{2}$/

export const emptyDeleted = () => {
  const d = {}
  for (const c of TOMBSTONE_COLLECTIONS) d[c] = {}
  return d
}

function validDeletedMap(m) {
  const out = {}
  if (m && typeof m === 'object' && !Array.isArray(m)) {
    for (const [k, v] of Object.entries(m)) {
      if (k === '__proto__' || k === 'constructor') continue
      const t = Number(v)
      if (Number.isFinite(t) && t > 0) out[k] = t
    }
  }
  return out
}

function pruneDeleted(m, now) {
  const out = {}
  for (const [k, t] of Object.entries(m)) if (now - t < TOMBSTONE_TTL) out[k] = t
  return out
}

// per-collection, per-id timestamp map merge (newer tombstone wins)
export function mergeDeletedMaps(a, b) {
  const res = {}
  for (const coll of TOMBSTONE_COLLECTIONS) {
    const ma = validDeletedMap(a && a[coll])
    const mb = validDeletedMap(b && b[coll])
    const merged = {}
    for (const k of new Set([...Object.keys(ma), ...Object.keys(mb)])) merged[k] = Math.max(ma[k] || 0, mb[k] || 0)
    res[coll] = merged
  }
  return res
}

// drop items tombstoned after their last edit (items edited *after* a delete survive)
export function filterDeletedItems(list, map, tsKey = 'updatedAt') {
  if (!Array.isArray(list)) return list
  const m = validDeletedMap(map)
  if (!Object.keys(m).length) return list
  return list.filter((it) => {
    if (!it || !it.id) return true
    const tomb = m[it.id]
    if (!tomb) return true
    const itemTs = it[tsKey]
    if (typeof itemTs !== 'number') return false
    return itemTs > tomb
  })
}

const blank = () => ({
  version: SCHEMA_VERSION,
  projects: [INBOX()],
  savedFilters: [],
  tasks: [],
  habits: [],
  docs: [],
  goals: [],
  focusSessions: [],
  deleted: emptyDeleted(),
})

function isValidDateStr(s){
  if(!DUE_RE.test(s)) return false
  const [y,m,d]=s.split('-').map(Number)
  const dt=new Date(y,m-1,d)
  return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d
}

function isPlainObject(v){
  if(!v || typeof v !== 'object') return false
  if (Object.hasOwn(v, '__proto__') || Object.hasOwn(v, 'constructor')) return false
  // ensure prototype is plain Object
  const proto = Object.getPrototypeOf(v)
  return proto === Object.prototype || proto === null
}

function safeParse(raw){
  // use reviver to strip dangerous keys before they touch prototype
  try{
    return JSON.parse(raw, (k, v) => {
      if (k === '__proto__' || k === 'constructor') return undefined
      return v
    })
  }catch{
    return null
  }
}

function normalizeProject(p) {
  if (!isPlainObject(p)) return null
  const name = String(p.name || '').trim().slice(0, LIMITS.PROJECT_NAME)
  if (!name) return null
  return { id: String(p.id || newId()), name }
}

function normalizeFilter(f) {
  if (!isPlainObject(f)) return null
  const allowedSmart=new Set(['all','today','upcoming','overdue','high',null])
  return {
    id: String(f.id || newId()),
    name: String(f.name || 'Filter').trim().slice(0, LIMITS.FILTER_NAME) || 'Filter',
    query: typeof f.query === 'string' ? f.query.slice(0, 100) : '',
    tagFilter: typeof f.tagFilter === 'string' ? f.tagFilter.slice(0, 30) : '',
    smart: allowedSmart.has(f.smart) ? f.smart : null,
    projectId: typeof f.projectId==='string' ? f.projectId.slice(0,40) : null,
  }
}

function normalizeHabit(h) {
  if (!isPlainObject(h)) return null
  const name = String(h.name || '').trim().slice(0, LIMITS.HABIT_NAME)
  if (!name) return null
  return {
    id: String(h.id || newId()),
    name,
    icon: String(h.icon || '⭐').slice(0, 2),
    completions: h.completions && typeof h.completions === 'object' && !Array.isArray(h.completions) ? h.completions : {},
    createdAt: Number.isFinite(h.createdAt) ? h.createdAt : Date.now(),
  }
}
function normalizeDoc(d) {
  if (!isPlainObject(d)) return null
  const title = String(d.title || '').trim().slice(0, LIMITS.DOC_TITLE) || 'Untitled'
  return {
    id: String(d.id || newId()),
    title,
    body: typeof d.body === 'string' ? d.body.slice(0, LIMITS.DOC_BODY) : '',
    projectId: d.projectId ? String(d.projectId) : 'inbox',
    createdAt: Number.isFinite(d.createdAt) ? d.createdAt : Date.now(),
    updatedAt: Number.isFinite(d.updatedAt) ? d.updatedAt : Date.now(),
  }
}
function normalizeGoal(g) {
  if (!isPlainObject(g)) return null
  const title = String(g.title || '').trim().slice(0, LIMITS.GOAL_TITLE)
  if (!title) return null
  return {
    id: String(g.id || newId()),
    title,
    projectIds: Array.isArray(g.projectIds) ? g.projectIds.map(String).slice(0, 10) : [],
    targetDate: DUE_RE.test(g.targetDate || '') ? g.targetDate : null,
    createdAt: Number.isFinite(g.createdAt) ? g.createdAt : Date.now(),
  }
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = safeParse(raw)
      if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.projects) && !Object.hasOwn(parsed, '__proto__')) {
        const base = blank()
        const now = Date.now()
        const tombRaw = {}
        for (const coll of TOMBSTONE_COLLECTIONS) tombRaw[coll] = validDeletedMap(parsed.deleted && parsed.deleted[coll])
        const deleted = {}
        for (const coll of TOMBSTONE_COLLECTIONS) deleted[coll] = pruneDeleted(tombRaw[coll], now)
        const projects = filterDeletedItems(parsed.projects.map(normalizeProject).filter(Boolean), tombRaw.projects, null)
        const hasInbox = projects.some((p) => p.id === 'inbox')
        return {
          ...base,
          version: SCHEMA_VERSION,
          projects: hasInbox ? projects : [INBOX(), ...projects],
          savedFilters: filterDeletedItems((Array.isArray(parsed.savedFilters) ? parsed.savedFilters.map(normalizeFilter).filter(Boolean).slice(0, LIMITS.SAVED_FILTERS_MAX) : []), tombRaw.savedFilters, null),
          tasks: filterDeletedItems(parsed.tasks.filter((t) => isPlainObject(t)).map(normalizeTask), tombRaw.tasks),
          habits: filterDeletedItems((Array.isArray(parsed.habits) ? parsed.habits.map(normalizeHabit).filter(Boolean) : []), tombRaw.habits, null),
          docs: filterDeletedItems((Array.isArray(parsed.docs) ? parsed.docs.map(normalizeDoc).filter(Boolean) : []), tombRaw.docs),
          goals: filterDeletedItems((Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal).filter(Boolean) : []), tombRaw.goals, null),
           focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions.filter(s=> s && typeof s==='object' && Number.isFinite(s.startedAt)).slice(-LIMITS.FOCUS_SESSIONS_MAX).map(s=> ({taskId: s.taskId ? String(s.taskId): null, duration: Number.isFinite(s.duration)? s.duration:0, startedAt: s.startedAt, completed: !!s.completed})).slice(-LIMITS.FOCUS_SESSIONS_MAX) : [],
          deleted,
        }
      }
    }
  } catch (_e) {
    /* fall through */
  }
  return blank()
}

export function normalizeImport(raw) {
  if (!isPlainObject(raw)) return null
  if (!Array.isArray(raw.tasks) || !Array.isArray(raw.projects)) return null
  if (raw.tasks.length > LIMITS.IMPORT_TASKS_MAX) return null
  const base = blank()
  const now = Date.now()
  const tombRaw = {}
  for (const coll of TOMBSTONE_COLLECTIONS) tombRaw[coll] = validDeletedMap(raw.deleted && raw.deleted[coll])
  const deleted = {}
  for (const coll of TOMBSTONE_COLLECTIONS) deleted[coll] = pruneDeleted(tombRaw[coll], now)
  const projects = filterDeletedItems(raw.projects.map(normalizeProject).filter(Boolean), tombRaw.projects, null)
  const hasInbox = projects.some((p) => p.id === 'inbox')
  try {
    return {
      ...base,
      version: SCHEMA_VERSION,
      projects: hasInbox ? projects : [INBOX(), ...projects],
      savedFilters: filterDeletedItems((Array.isArray(raw.savedFilters) ? raw.savedFilters.map(normalizeFilter).filter(Boolean).slice(0, LIMITS.SAVED_FILTERS_MAX) : []), tombRaw.savedFilters, null),
      tasks: filterDeletedItems(raw.tasks.filter((t) => isPlainObject(t)).map(normalizeTask), tombRaw.tasks),
      habits: filterDeletedItems((Array.isArray(raw.habits) ? raw.habits.map(normalizeHabit).filter(Boolean) : []), tombRaw.habits, null),
      docs: filterDeletedItems((Array.isArray(raw.docs) ? raw.docs.map(normalizeDoc).filter(Boolean) : []), tombRaw.docs),
      goals: filterDeletedItems((Array.isArray(raw.goals) ? raw.goals.map(normalizeGoal).filter(Boolean) : []), tombRaw.goals, null),
      focusSessions: Array.isArray(raw.focusSessions) ? raw.focusSessions.filter((s) => s && typeof s === 'object' && Number.isFinite(s.startedAt)).slice(-LIMITS.FOCUS_SESSIONS_MAX).map((s) => ({ taskId: s.taskId ? String(s.taskId) : null, duration: Number.isFinite(s.duration) ? s.duration : 0, startedAt: s.startedAt, completed: !!s.completed })).slice(-LIMITS.FOCUS_SESSIONS_MAX) : [],
      deleted,
    }
  } catch (_e) { return null }
}

export function normalizeTask(t) {
  if (!isPlainObject(t)) t = {}
  const allowedEst = new Set([0, 15, 30, 60, 120])
  let due=null
  if(typeof t.dueDate==='string' && DUE_RE.test(t.dueDate) && isValidDateStr(t.dueDate)) due=t.dueDate
  return {
    id: t.id ? String(t.id) : newId(),
    text: String(t.text || '').trim().slice(0, LIMITS.TASK_TEXT) || 'Task',
    notes: typeof t.notes === 'string' ? t.notes.slice(0, LIMITS.NOTES_LEN) : '',
    completed: Boolean(t.completed),
    createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
    updatedAt: Number.isFinite(t.updatedAt) ? t.updatedAt : (Number.isFinite(t.createdAt) ? t.createdAt : Date.now()),
    dueDate: due,
    priority: Number.isInteger(t.priority) ? Math.min(3, Math.max(0, t.priority)) : 0,
    tags: Array.isArray(t.tags) ? [...new Set(t.tags.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, LIMITS.TAG_COUNT) : [],
    projectId: t.projectId ? String(t.projectId) : 'inbox',
    status: ['todo', 'doing', 'done'].includes(t.status) ? t.status : (t.completed ? 'done' : 'todo'),
    subtasks: Array.isArray(t.subtasks)
      ? t.subtasks.filter((s) => isPlainObject(s)).map((s) => ({ id: s.id ? String(s.id) : newId(), text: String(s.text || '').slice(0, LIMITS.SUBTASK_TEXT), completed: Boolean(s.completed) })).slice(0, LIMITS.SUBTASK_COUNT)
      : [],
    estimate: allowedEst.has(t.estimate) ? t.estimate : 0,
    repeat: ['daily','weekly','monthly'].includes(t.repeat) ? t.repeat : null,
  }
}

let lastQuotaToast = 0
export function saveData(data) {
  try {
    const payload = JSON.stringify({ ...data, version: SCHEMA_VERSION })
    // pre-check size: localStorage typically 5MB
    if (payload.length > 4_800_000) {
      try { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Data too large — please export and remove images.', tone: 'error' } })) } catch (_e2) { /* ignore */ }
      return false
    }
    localStorage.setItem(STORAGE_KEY, payload)
    return true
  } catch (err) {
    const msg = String(err && (err.message || err.name || err))
    if (msg.includes('circular') || msg.includes('Converting circular')) {
      try { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Could not save — data is invalid.', tone: 'error' } })) } catch (_e2) { /* ignore */ }
      return false
    }
    const isQuota = /quota/i.test(msg) || /QuotaExceeded/i.test(msg) || /NS_ERROR_DOM_QUOTA/i.test(msg)
    if (isQuota) {
      const now = Date.now()
      // throttle quota toasts to once per 10s (timestamp-only, no boolean race)
      if (now - lastQuotaToast > 10000) {
        lastQuotaToast = now
        try {
          window.dispatchEvent(new CustomEvent('app-toast', {
            detail: { message: 'Storage is full — large images may not be saved. Export to back up.', tone: 'error' },
          }))
        } catch (_e3) { /* ignore */ }
      }
    }
    return false
  }
}

export function estimateStorageSize(data){
  try{ return JSON.stringify({ ...data, version: SCHEMA_VERSION }).length } catch{ return 0 }
}
