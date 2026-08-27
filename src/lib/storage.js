import { newId } from './id'

export const STORAGE_KEY = 'shawn-todos-v3'
export const LEGACY_KEY = 'shawn-todos-v1'
export const SCHEMA_VERSION = 3

const INBOX = () => ({ id: 'inbox', name: 'Inbox' })
const DUE_RE = /^\d{4}-\d{2}-\d{2}$/

const blank = () => ({
  version: SCHEMA_VERSION,
  projects: [INBOX()],
  savedFilters: [],
  tasks: [],
  habits: [],
  docs: [],
  goals: [],
  focusSessions: [],
})

function isValidDateStr(s){
  if(!DUE_RE.test(s)) return false
  const [y,m,d]=s.split('-').map(Number)
  const dt=new Date(y,m-1,d)
  return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d
}
function normalizeProject(p) {
  if (!p || typeof p !== 'object') return null
  if (Object.hasOwn(p, '__proto__') || Object.hasOwn(p, 'constructor')) return null
  const name = String(p.name || '').trim().slice(0, 40)
  if (!name) return null
  return { id: String(p.id || newId()), name }
}

function normalizeFilter(f) {
  if (!f || typeof f !== 'object') return null
  if (Object.hasOwn(f, '__proto__') || Object.hasOwn(f, 'constructor')) return null
  const allowedSmart=new Set(['all','today','upcoming','overdue','high',null])
  return {
    id: String(f.id || newId()),
    name: String(f.name || 'Filter').trim().slice(0, 40) || 'Filter',
    query: typeof f.query === 'string' ? f.query.slice(0, 100) : '',
    tagFilter: typeof f.tagFilter === 'string' ? f.tagFilter.slice(0, 30) : '',
    smart: allowedSmart.has(f.smart) ? f.smart : null,
    projectId: typeof f.projectId==='string' ? f.projectId.slice(0,40) : null,
  }
}

function migrateLegacy(raw) {
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return {
      ...blank(),
      tasks: parsed.filter((t) => t && typeof t === 'object').map((t) => ({
        id: t.id || newId(),
        text: String(t.text || '').trim() || 'Task',
        notes: '',
        completed: Boolean(t.completed),
        createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
        updatedAt: Number.isFinite(t.updatedAt) ? t.updatedAt : (Number.isFinite(t.createdAt) ? t.createdAt : Date.now()),
        dueDate: null,
        priority: 0,
        tags: [],
        projectId: 'inbox',
        status: t.completed ? 'done' : 'todo',
        subtasks: [],
      })),
    }
  } catch {
    return null
  }
}

function normalizeHabit(h) {
  if (!h || typeof h !== 'object') return null
  const name = String(h.name || '').trim().slice(0, 40)
  if (!name) return null
  return {
    id: String(h.id || newId()),
    name,
    icon: String(h.icon || '⭐').slice(0, 2),
    completions: h.completions && typeof h.completions === 'object' ? h.completions : {},
    createdAt: Number.isFinite(h.createdAt) ? h.createdAt : Date.now(),
  }
}
function normalizeDoc(d) {
  if (!d || typeof d !== 'object') return null
  const title = String(d.title || '').trim().slice(0, 80) || 'Untitled'
  return {
    id: String(d.id || newId()),
    title,
    body: typeof d.body === 'string' ? d.body.slice(0, 50000) : '',
    projectId: d.projectId ? String(d.projectId) : 'inbox',
    createdAt: Number.isFinite(d.createdAt) ? d.createdAt : Date.now(),
    updatedAt: Number.isFinite(d.updatedAt) ? d.updatedAt : Date.now(),
  }
}
function normalizeGoal(g) {
  if (!g || typeof g !== 'object') return null
  const title = String(g.title || '').trim().slice(0, 60)
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
      const parsed = JSON.parse(raw)
      if (parsed && Array.isArray(parsed.tasks) && Array.isArray(parsed.projects) && !Object.hasOwn(parsed, '__proto__')) {
        const base=blank()
        const projects = parsed.projects.map(normalizeProject).filter(Boolean)
        const hasInbox = projects.some((p) => p.id === 'inbox')
        return {
          ...base,
          version: SCHEMA_VERSION,
          projects: hasInbox ? projects : [INBOX(), ...projects],
          savedFilters: Array.isArray(parsed.savedFilters) ? parsed.savedFilters.map(normalizeFilter).filter(Boolean).slice(0,20) : [],
          tasks: parsed.tasks.filter((t) => t && typeof t === 'object').map(normalizeTask),
          habits: Array.isArray(parsed.habits) ? parsed.habits.map(normalizeHabit).filter(Boolean) : [],
          docs: Array.isArray(parsed.docs) ? parsed.docs.map(normalizeDoc).filter(Boolean) : [],
          goals: Array.isArray(parsed.goals) ? parsed.goals.map(normalizeGoal).filter(Boolean) : [],
           focusSessions: Array.isArray(parsed.focusSessions) ? parsed.focusSessions.filter(s=> s && typeof s==='object' && Number.isFinite(s.startedAt)).slice(-200).map(s=> ({taskId: s.taskId ? String(s.taskId): null, duration: Number.isFinite(s.duration)? s.duration:0, startedAt: s.startedAt, completed: !!s.completed})).slice(-200) : [],
        }
      }
    }
  } catch {
    /* fall through */
  }
  // migrate from v2
  try {
    const raw2 = localStorage.getItem('shawn-todos-v2')
    if (raw2) {
      const parsed = JSON.parse(raw2)
      if (parsed && Array.isArray(parsed.tasks)) {
        const projects = (parsed.projects || []).map(normalizeProject).filter(Boolean)
        const hasInbox = projects.some((p) => p.id === 'inbox')
        return {
          ...blank(),
          ...parsed,
          version: SCHEMA_VERSION,
          projects: hasInbox ? projects : [INBOX(), ...projects],
          savedFilters: Array.isArray(parsed.savedFilters) ? parsed.savedFilters.map(normalizeFilter).filter(Boolean) : [],
          tasks: parsed.tasks.map(normalizeTask),
        }
      }
    }
  } catch { /* ignore */ }
  try {
    const legacy = localStorage.getItem(LEGACY_KEY)
    if (legacy) {
      const migrated = migrateLegacy(legacy)
      if (migrated) return { ...blank(), ...migrated }
    }
  } catch {
    /* ignore */
  }
  return blank()
}

export function normalizeTask(t) {
  if (!t || typeof t !== 'object') t = {}
  if (Object.hasOwn(t, '__proto__') || Object.hasOwn(t, 'constructor')) t={}
  const allowedEst = new Set([0, 15, 30, 60, 120])
  let due=null
  if(typeof t.dueDate==='string' && DUE_RE.test(t.dueDate) && isValidDateStr(t.dueDate)) due=t.dueDate
  return {
    id: t.id ? String(t.id) : newId(),
    text: String(t.text || '').trim().slice(0, 200) || 'Task',
    notes: typeof t.notes === 'string' ? t.notes.slice(0, 50000) : '',
    completed: Boolean(t.completed),
    createdAt: Number.isFinite(t.createdAt) ? t.createdAt : Date.now(),
    updatedAt: Number.isFinite(t.updatedAt) ? t.updatedAt : (Number.isFinite(t.createdAt) ? t.createdAt : Date.now()),
    dueDate: due,
    priority: Number.isInteger(t.priority) ? Math.min(3, Math.max(0, t.priority)) : 0,
    tags: Array.isArray(t.tags) ? [...new Set(t.tags.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, 20) : [],
    projectId: t.projectId ? String(t.projectId) : 'inbox',
    status: ['todo', 'doing', 'done'].includes(t.status) ? t.status : (t.completed ? 'done' : 'todo'),
    subtasks: Array.isArray(t.subtasks)
      ? t.subtasks.filter((s) => s && typeof s === 'object').map((s) => ({ id: s.id ? String(s.id) : newId(), text: String(s.text || '').slice(0, 200), completed: Boolean(s.completed) })).slice(0, 50)
      : [],
    estimate: allowedEst.has(t.estimate) ? t.estimate : 0,
    repeat: ['daily','weekly'].includes(t.repeat) ? t.repeat : null,
  }
}

let warnedQuota = false
export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: SCHEMA_VERSION }))
    warnedQuota=false
  } catch (err) {
    const msg = String(err && (err.message || err.name || err))
    if (msg.includes('circular') || msg.includes('Converting circular')) {
      try { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Could not save — data is invalid.', tone: 'error' } })) } catch {}
      return
    }
    if (!warnedQuota && (/quota/i.test(msg) || /QuotaExceeded/i.test(msg) || /NS_ERROR_DOM_QUOTA/i.test(msg))) {
      warnedQuota = true
      try {
        window.dispatchEvent(new CustomEvent('app-toast', {
          detail: { message: 'Storage is full — large images may not be saved.', tone: 'error' },
        }))
      } catch { /* ignore */ }
    }
  }
}
