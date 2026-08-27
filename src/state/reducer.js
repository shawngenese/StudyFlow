import { newId } from '../lib/id'
import { normalizeTask, loadData, normalizeImport, SCHEMA_VERSION } from '../lib/storage'

export const PRIORITIES = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' }
export const STATUS_LABELS = { todo: 'To do', doing: 'In progress', done: 'Done' }
const HISTORY_LIMIT = 30
const VALID_STATUS = new Set(['todo', 'doing', 'done'])
const DUE_RE = /^\d{4}-\d{2}-\d{2}$/
function isValidDateStr(s){ if(!DUE_RE.test(s)) return false; const [y,m,d]=s.split('-').map(Number); const dt=new Date(y,m-1,d); return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d }

export const initialState = () => ({
  past: [],
  present: loadData(),
  future: [],
})

function commit(state, present) {
  const past = [...state.past, state.present]
  const trimmed = past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past
  return {
    past: trimmed,
    present: { ...present, version: SCHEMA_VERSION },
    future: [],
  }
}

function updateTask(data, id, fn) {
  let found = false
  const tasks = data.tasks.map((t) => {
    if (t.id !== id) return t
    found = true
    const next = fn({...t, subtasks: t.subtasks||[]})
    if (typeof next === 'object' && next !== null) {
      return { ...next, updatedAt: Date.now() }
    }
    return { ...t, updatedAt: Date.now() }
  })
  if (!found) return null
  return { ...data, tasks }
}

function patchTask(data, id, patch) {
  return updateTask(data, id, (t) => ({ ...t, ...patch }))
}

export function reducer(state, action) {
  switch (action.type) {
    case 'task/add': {
      const text = String(action.text || '').trim()
      if (!text) return state
      const dueRaw = String(action.dueDate||'').trim()
      const dueDate = isValidDateStr(dueRaw) ? dueRaw : null
      const prio = Number.isInteger(action.priority) ? Math.min(3, Math.max(0, action.priority)) : 0
      const rawTags = Array.isArray(action.tags) ? action.tags : []
      const tags = [...new Set(rawTags.map((x) => String(x).trim().toLowerCase()).filter(Boolean))]
      const allowedEst = new Set([0,15,30,60,120])
      const estimate = allowedEst.has(action.estimate) ? action.estimate : 0
      const repeat = ['daily','weekly'].includes(action.repeat) ? action.repeat : null
      const task = normalizeTask({
        id: newId(),
        text,
        createdAt: Date.now(),
        projectId: action.projectId || 'inbox',
        dueDate,
        priority: prio,
        tags,
        estimate,
        repeat,
      })
      const data = { ...state.present, tasks: [task, ...state.present.tasks] }
      return commit(state, data)
    }
    case 'task/update': {
      if (!action.id || typeof action.patch !== 'object' || action.patch === null) return state
      const patch = { ...action.patch }
      if ('text' in patch) {
        const txt = String(patch.text || '').trim()
        if (!txt) return state
        patch.text = txt
      }
      if ('priority' in patch) {
        const p = patch.priority
        patch.priority = Number.isInteger(p) ? Math.min(3, Math.max(0, p)) : 0
      }
      if ('dueDate' in patch) {
        const d = patch.dueDate
        if (d === null) { /* allow clear */ }
        else if (typeof d === 'string' && isValidDateStr(d)) { /* ok */ }
        else { delete patch.dueDate; if(Object.keys(patch).length===0) return state }
      }
      if ('estimate' in patch) {
        const e = patch.estimate
        const allowed = new Set([0, 15, 30, 60, 120])
        patch.estimate = allowed.has(e) ? e : 0
      }
      const next = patchTask(state.present, action.id, patch)
      if (!next) return state
      return commit(state, next)
    }
    case 'task/toggle': {
      const t = state.present.tasks.find((x) => x.id === action.id)
      if (!t) return state
      const completed = !t.completed
      let data = patchTask(state.present, action.id, {
        completed,
        status: completed ? 'done' : 'todo',
      })
      if (completed && t.repeat && t.dueDate && isValidDateStr(t.dueDate)) {
        try {
          const [yy,mm,dd]=t.dueDate.split('-').map(Number)
          const d=new Date(Date.UTC(yy,mm-1,dd,12,0,0))
          if (!Number.isNaN(d.getTime())) {
            if (t.repeat === 'daily') d.setUTCDate(d.getUTCDate()+1)
            else if (t.repeat === 'weekly') d.setUTCDate(d.getUTCDate()+7)
            const y = d.getUTCFullYear(), m = String(d.getUTCMonth()+1).padStart(2,'0'), day = String(d.getUTCDate()).padStart(2,'0')
            const nextDue = `${y}-${m}-${day}`
            if(!data.tasks.some(x=> x.text===t.text && x.dueDate===nextDue && !x.completed)){
              const nextTask = normalizeTask({ ...t, id: newId(), completed:false, status:'todo', dueDate: nextDue, createdAt: Date.now(), updatedAt: Date.now() })
              data = { ...data, tasks: [nextTask, ...data.tasks] }
            }
          }
        } catch { /* ignore */ }
      }
      return commit(state, data)
    }
    case 'task/setStatus': {
      if (!VALID_STATUS.has(action.status)) return state
      const exists = state.present.tasks.some((t) => t.id === action.id)
      if (!exists) return state
      const completed = action.status === 'done'
      return commit(state, patchTask(state.present, action.id, { status: action.status, completed }))
    }
    case 'task/delete': {
      const exists = state.present.tasks.some((t) => t.id === action.id)
      if (!exists) return state
      const data = {
        ...state.present,
        tasks: state.present.tasks.filter((t) => t.id !== action.id),
      }
      return commit(state, data)
    }
    case 'task/reorder': {
      const { activeId, overId } = action
      if (activeId === overId) return state
      const tasks = [...state.present.tasks]
      const from = tasks.findIndex((t) => t.id === activeId)
      const to = tasks.findIndex((t) => t.id === overId)
      if (from === -1 || to === -1) return state
      const [moved] = tasks.splice(from, 1)
      tasks.splice(to, 0, moved)
      return commit(state, { ...state.present, tasks })
    }
    case 'task/reorderMany': {
      if (!Array.isArray(action.ids)) return state
      const seen = new Set()
      for (const id of action.ids) {
        if (seen.has(id)) return state
        seen.add(id)
      }
      const order = new Map(action.ids.map((id, i) => [id, i]))
      const moved = state.present.tasks.filter((t) => order.has(t.id))
      if (moved.length !== order.size) return state
      moved.sort((a, b) => order.get(a.id) - order.get(b.id))
      const result = []
      let mi = 0
      for (const t of state.present.tasks) {
        if (order.has(t.id)) result.push(moved[mi++])
        else result.push(t)
      }
      return commit(state, { ...state.present, tasks: result })
    }
    case 'subtask/add': {
      const text = String(action.text || '').trim()
      if (!text) return state
      const next = updateTask(state.present, action.taskId, (t) => ({
        ...t,
        subtasks: [...(t.subtasks || []), { id: newId(), text: text.slice(0, 200), completed: false }],
      }))
      if (!next) return state
      return commit(state, next)
    }
    case 'subtask/toggle': {
      const next = updateTask(state.present, action.taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) =>
          s.id === action.subId ? { ...s, completed: !s.completed } : s
        ),
      }))
      if (!next) return state
      return commit(state, next)
    }
    case 'subtask/update': {
      const txt = String(action.text || '').trim()
      if (!txt) return state
      const next = updateTask(state.present, action.taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.map((s) =>
          s.id === action.subId ? { ...s, text: txt.slice(0, 200) } : s
        ),
      }))
      if (!next) return state
      return commit(state, next)
    }
    case 'subtask/delete': {
      const next = updateTask(state.present, action.taskId, (t) => ({
        ...t,
        subtasks: t.subtasks.filter((s) => s.id !== action.subId),
      }))
      if (!next) return state
      return commit(state, next)
    }
    case 'project/add': {
      const name = String(action.name || '').trim().slice(0, 40)
      if (!name) return state
      if (state.present.projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) return state
      const project = { id: newId(), name }
      return commit(state, { ...state.present, projects: [...state.present.projects, project] })
    }
    case 'project/rename': {
      if (action.id === 'inbox') return state
      const name = String(action.name || '').trim().slice(0, 40)
      if (!name) return state
      if (!state.present.projects.some((p) => p.id === action.id)) return state
      if (state.present.projects.some((p) => p.id !== action.id && p.name.toLowerCase() === name.toLowerCase())) return state
      return commit(state, {
        ...state.present,
        projects: state.present.projects.map((p) =>
          p.id === action.id ? { ...p, name } : p
        ),
      })
    }
    case 'project/delete': {
      if (action.id === 'inbox') return state
      if (!state.present.projects.some((p) => p.id === action.id)) return state
      return commit(state, {
        ...state.present,
        projects: state.present.projects.filter((p) => p.id !== action.id),
        savedFilters: state.present.savedFilters.filter((f) => f.projectId !== action.id),
        tasks: state.present.tasks.map((t) =>
          t.projectId === action.id ? { ...t, projectId: 'inbox', updatedAt: Date.now() } : t
        ),
        docs: (state.present.docs||[]).map(d=> d.projectId===action.id ? {...d, projectId:'inbox'} : d),
        goals: (state.present.goals||[]).map(g=> ({...g, projectIds: (g.projectIds||[]).filter(id=>id!==action.id)})),
      })
    }
    case 'filter/save': {
      if (!action.filter || typeof action.filter !== 'object') return state
      if (state.present.savedFilters.length>=20) return state
      const allowedSmart=new Set(['all','today','upcoming','overdue','high',null])
      const name = String(action.name || action.filter.name || 'Filter').trim().slice(0, 40) || 'Filter'
      const f = { id: newId(), name, query: typeof action.filter.query==='string'? action.filter.query.slice(0,100):'', tagFilter: typeof action.filter.tagFilter==='string'? action.filter.tagFilter.slice(0,30):'', smart: allowedSmart.has(action.filter.smart)? action.filter.smart:null, projectId: typeof action.filter.projectId==='string'? action.filter.projectId.slice(0,40):null }
      return commit(state, { ...state.present, savedFilters: [...state.present.savedFilters, f] })
    }
    case 'filter/delete': {
      const exists = state.present.savedFilters.some((f) => f.id === action.id)
      if (!exists) return state
      return commit(state, {
        ...state.present,
        savedFilters: state.present.savedFilters.filter((f) => f.id !== action.id),
      })
    }
    case 'completed/clear': {
      if (!Array.isArray(action.ids) || !action.ids.length) return state
      const ids = new Set(action.ids)
      const hasAny = state.present.tasks.some((t) => ids.has(t.id) && t.completed)
      if (!hasAny) return state
      return commit(state, {
        ...state.present,
        tasks: state.present.tasks.filter((t) => !(ids.has(t.id) && t.completed)),
      })
    }
    case 'habit/add': {
      const name = String(action.name || '').trim().slice(0, 40)
      if (!name) return state
      if (state.present.habits?.some((h) => h.name.toLowerCase() === name.toLowerCase())) return state
      const habit = { id: newId(), name, icon: String(action.icon || '⭐').slice(0,2), completions:{}, createdAt: Date.now() }
      return commit(state, { ...state.present, habits: [...(state.present.habits||[]), habit] })
    }
    case 'habit/toggle': {
      const { id, date } = action
      if(typeof date!=='string' || !isValidDateStr(date) || date==='__proto__' || date==='constructor') return state
      const exists = (state.present.habits||[]).some(h=>h.id===id)
      if (!exists) return state
      const habits = (state.present.habits||[]).map((h) => {
        if (h.id !== id) return h
        const comp = { ...(h.completions||{}) }
        if (comp[date]) delete comp[date]; else comp[date]=true
        return { ...h, completions: comp }
      })
      return commit(state, { ...state.present, habits })
    }
    case 'habit/delete': {
      if (!(state.present.habits||[]).some(h=>h.id===action.id)) return state
      return commit(state, { ...state.present, habits: (state.present.habits||[]).filter(h=>h.id!==action.id) })
    }
    case 'doc/add': {
      const title = String(action.title || '').trim().slice(0,80) || 'Untitled'
      const doc = { id:newId(), title, body:String(action.body||''), projectId: action.projectId || 'inbox', createdAt: Date.now(), updatedAt: Date.now() }
      return commit(state, { ...state.present, docs: [...(state.present.docs||[]), doc] })
    }
    case 'doc/update': {
      if (!action.id || typeof action.patch!=='object' || action.patch===null) return state
      if (Object.hasOwn(action.patch,'id') || Object.hasOwn(action.patch,'__proto__') || Object.hasOwn(action.patch,'constructor')) return state
      const patch={}
      if('title' in action.patch) patch.title=String(action.patch.title).slice(0,80)
      if('body' in action.patch) patch.body=String(action.patch.body).slice(0,50000)
      if('projectId' in action.patch) patch.projectId=String(action.patch.projectId).slice(0,40)
      const docs = (state.present.docs||[]).map(d=> d.id===action.id ? { ...d, ...patch, updatedAt: Date.now()} : d)
      if (!docs.some(d=>d.id===action.id)) return state
      return commit(state, { ...state.present, docs })
    }
    case 'doc/delete': {
      if (!(state.present.docs||[]).some(d=>d.id===action.id)) return state
      return commit(state, { ...state.present, docs: (state.present.docs||[]).filter(d=>d.id!==action.id) })
    }
    case 'goal/add': {
      const title = String(action.title||'').trim().slice(0,60)
      if (!title) return state
      const goal = { id:newId(), title, projectIds: Array.isArray(action.projectIds)? action.projectIds.slice(0,10): [], targetDate: /^\d{4}-\d{2}-\d{2}$/.test(action.targetDate||'')? action.targetDate:null, createdAt: Date.now() }
      return commit(state, { ...state.present, goals: [...(state.present.goals||[]), goal] })
    }
    case 'goal/delete': {
      if (!(state.present.goals||[]).some(g=>g.id===action.id)) return state
      return commit(state, { ...state.present, goals: (state.present.goals||[]).filter(g=>g.id!==action.id) })
    }
    case 'focus/addSession': {
      const s = action.session
      if (!s || typeof s!=='object') return state
      let dur=Number(s.duration)
      if(!Number.isFinite(dur)) dur=0
      dur=Math.max(0, Math.min(180, Math.round(dur)))
      let at=Number(s.startedAt)
      if(!Number.isFinite(at)) at=Date.now()
      at=Math.min(Date.now()+60000, Math.max(Date.now()-86400000*7, at))
      const list = [...(state.present.focusSessions||[]), { id:newId(), taskId: s.taskId||null, duration: dur, startedAt: at, completed: !!s.completed }].slice(-200)
      return commit(state, { ...state.present, focusSessions: list })
    }
    case 'undo': {
      if (!state.past.length) return state
      const previous = state.past[state.past.length - 1]
      const future = [state.present, ...state.future]
      const cappedFuture = future.length > HISTORY_LIMIT ? future.slice(0, HISTORY_LIMIT) : future
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: cappedFuture,
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      const [next, ...rest] = state.future
      const past = [...state.past, state.present]
      const cappedPast = past.length > HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT) : past
      return {
        past: cappedPast,
        present: next,
        future: rest,
      }
    }
    case '__hydrate': {
      const normalized = normalizeImport(action.data)
      if (!normalized) return state
      if (!normalized.tasks.length && action.data?.tasks?.length) return state
      return { ...state, present: { ...state.present, ...normalized, version: SCHEMA_VERSION } }
    }
    default:
      return state
  }
}
