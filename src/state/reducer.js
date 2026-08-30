import { newId } from '../lib/id'
import { normalizeTask, loadData, normalizeImport, SCHEMA_VERSION, LIMITS, TOMBSTONE_COLLECTIONS, emptyDeleted, mergeDeletedMaps } from '../lib/storage'

export const PRIORITIES = { 0: 'None', 1: 'Low', 2: 'Medium', 3: 'High' }
export const STATUS_LABELS = { todo: 'To do', doing: 'In progress', done: 'Done' }
const HISTORY_LIMIT = 30
const HISTORY_LIMIT_LARGE = 10
const HISTORY_LIMIT_XL = 5
function getHistoryLimit(taskCount){
  if(taskCount > 2000) return HISTORY_LIMIT_XL
  if(taskCount > 1000) return HISTORY_LIMIT_LARGE
  if(taskCount > 500) return 15
  return HISTORY_LIMIT
}
const VALID_STATUS = new Set(['todo', 'doing', 'done'])
const DUE_RE = /^\d{4}-\d{2}-\d{2}$/
function isValidDateStr(s){ if(!DUE_RE.test(s)) return false; const [y,m,d]=s.split('-').map(Number); const dt=new Date(y,m-1,d); return dt.getFullYear()===y && dt.getMonth()===m-1 && dt.getDate()===d }

export const initialState = () => ({
  past: [],
  present: loadData(),
  future: [],
})

function deepClonePresent(present){
  // structuredClone if available otherwise JSON clone (lossy but safe for this shape)
  try{
    if (typeof structuredClone === 'function') return structuredClone(present)
  }catch{/* fallback */}
  return JSON.parse(JSON.stringify(present))
}

function commit(state, present) {
  // tombstone anything removed from a deletable collection so deletes sync
  // (and don't get resurrected by another device's stale copy)
  const now = Date.now()
  const prev = state.present
  const deleted = { ...(present.deleted || emptyDeleted()) }
  for (const coll of TOMBSTONE_COLLECTIONS) {
    const before = (prev[coll] || []).filter((x) => x && x.id)
    const after = new Set((present[coll] || []).map((x) => x && x.id).filter(Boolean))
    if (!before.some((x) => !after.has(x.id))) continue
    const map = { ...(deleted[coll] || {}) }
    for (const x of before) if (!after.has(x.id)) map[x.id] = Math.max(map[x.id] || 0, now)
    deleted[coll] = map
  }
  const present2 = { ...present, deleted }

  // store deep clone to avoid shared references — dynamic limit for large task counts
  const count = Math.max(state.present.tasks?.length || 0, present.tasks?.length || 0)
  const limit = getHistoryLimit(count)
  const snapshot = deepClonePresent(state.present)
  const past = [...state.past, snapshot]
  const trimmed = past.length > limit ? past.slice(past.length - limit) : past
  return {
    past: trimmed,
    present: { ...present2, version: SCHEMA_VERSION },
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
      const rawText = String(action.text || '').trim()
      if (!rawText) return state
      const text = rawText.slice(0, LIMITS.TASK_TEXT)
      const dueRaw = String(action.dueDate||'').trim()
      const dueDate = isValidDateStr(dueRaw) ? dueRaw : null
      const prio = Number.isInteger(action.priority) ? Math.min(3, Math.max(0, action.priority)) : 0
      const rawTags = Array.isArray(action.tags) ? action.tags : []
      const tags = [...new Set(rawTags.map((x) => String(x).trim().toLowerCase()).filter(Boolean))].slice(0, LIMITS.TAG_COUNT)
      const allowedEst = new Set([0,15,30,60,120])
      const estimate = allowedEst.has(action.estimate) ? action.estimate : 0
      const repeat = ['daily','weekly','monthly'].includes(action.repeat) ? action.repeat : null
      if (state.present.tasks.length >= LIMITS.IMPORT_TASKS_MAX) {
        return state
      }
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
      // block dangerous keys
      if (Object.hasOwn(patch,'__proto__') || Object.hasOwn(patch,'constructor') || Object.hasOwn(patch,'id')) return state
      if ('text' in patch) {
        const txt = String(patch.text || '').trim()
        if (!txt) return state
        patch.text = txt.slice(0, LIMITS.TASK_TEXT)
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
      if ('notes' in patch) {
        if (typeof patch.notes === 'string') patch.notes = patch.notes.slice(0, LIMITS.NOTES_LEN)
        else patch.notes = ''
      }
      if ('tags' in patch) {
        if (Array.isArray(patch.tags)) patch.tags = [...new Set(patch.tags.map(x=>String(x).trim().toLowerCase()).filter(Boolean))].slice(0, LIMITS.TAG_COUNT)
        else patch.tags = []
      }
      if ('projectId' in patch) patch.projectId = String(patch.projectId).slice(0, 40)
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
          const d=new Date(yy,mm-1,dd,12,0,0)
          if (!Number.isNaN(d.getTime())) {
            if (t.repeat === 'daily') d.setDate(d.getDate()+1)
            else if (t.repeat === 'weekly') d.setDate(d.getDate()+7)
            else if (t.repeat === 'monthly') { const origDay=dd; d.setMonth(d.getMonth()+1); // handle month overflow (e.g., Jan 31 -> Feb 28)
              // if day shifted, clamp to last day of previous month
              if(d.getDate()!==origDay){ d.setDate(0) } }
            const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
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
      // ensure completed boolean matches status
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
      // reorders only within the provided ids, keeping other tasks in place
      // For filtered views, caller should pass only visibleIds and we interleave correctly.
      // To avoid unexpected jumps with filtered views, we validate ids exist and preserve non-matched order.
      if (!Array.isArray(action.ids)) return state
      if (action.ids.length === 0) return state
      const seen = new Set()
      for (const id of action.ids) {
        if (typeof id !== 'string') return state
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
      // if action is scoped to a filtered view, caller should instead use task/reorderFiltered pattern:
      // but we also support scoped reorder where ids are subset; above preserves interleaving which is correct for global reorder.
      return commit(state, { ...state.present, tasks: result })
    }
    case 'task/reorderFiltered': {
      // Scoped reorder: reorder only tasks that match filter; other tasks untouched
      // action.ids = new order of filtered ids
      // action.filterIds = set of ids that were visible (same as ids before reorder)
      if (!Array.isArray(action.ids)) return state
      const filterSet = action.filterIds ? new Set(action.filterIds) : new Set(action.ids)
      const seen = new Set()
      for(const id of action.ids){ if(seen.has(id)) return state; seen.add(id)}
      if (seen.size !== filterSet.size) return state
      for(const id of seen){ if(!filterSet.has(id)) return state }
      const order = new Map(action.ids.map((id,i)=>[id,i]))
      const filteredTasks = state.present.tasks.filter(t=>filterSet.has(t.id))
      filteredTasks.sort((a,b)=> order.get(a.id) - order.get(b.id))
      let fi=0
      const result=[]
      for(const t of state.present.tasks){
        if(filterSet.has(t.id)) result.push(filteredTasks[fi++])
        else result.push(t)
      }
      return commit(state, { ...state.present, tasks: result })
    }
    case 'subtask/add': {
      const text = String(action.text || '').trim()
      if (!text) return state
      const task = state.present.tasks.find(t=>t.id===action.taskId)
      if (!task) return state
      if ((task.subtasks||[]).length >= LIMITS.SUBTASK_COUNT) return state
      const next = updateTask(state.present, action.taskId, (t) => ({
        ...t,
        subtasks: [...(t.subtasks || []), { id: newId(), text: text.slice(0, LIMITS.SUBTASK_TEXT), completed: false }],
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
          s.id === action.subId ? { ...s, text: txt.slice(0, LIMITS.SUBTASK_TEXT) } : s
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
    case 'subtask/reorder': {
      if (!action.taskId || !Array.isArray(action.ids)) return state
      const task = state.present.tasks.find((t) => t.id === action.taskId)
      if (!task) return state
      const existing = new Set((task.subtasks || []).map((s) => s.id))
      if (action.ids.length !== existing.size) return state
      for (const id of action.ids) if (!existing.has(id)) return state
      const order = new Map(action.ids.map((id, i) => [id, i]))
      const sorted = [...(task.subtasks || [])].sort((a, b) => order.get(a.id) - order.get(b.id))
      const next = updateTask(state.present, action.taskId, (t) => ({ ...t, subtasks: sorted }))
      if (!next) return state
      return commit(state, next)
    }
    case 'project/add': {
      const name = String(action.name || '').trim().slice(0, LIMITS.PROJECT_NAME)
      if (!name) return state
      if (state.present.projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) return state
      if (state.present.projects.length >= 50) return state
      const project = { id: newId(), name }
      return commit(state, { ...state.present, projects: [...state.present.projects, project] })
    }
    case 'project/rename': {
      if (action.id === 'inbox') return state
      const name = String(action.name || '').trim().slice(0, LIMITS.PROJECT_NAME)
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
      if (Object.hasOwn(action.filter,'__proto__') || Object.hasOwn(action.filter,'constructor')) return state
      if (state.present.savedFilters.length>=LIMITS.SAVED_FILTERS_MAX) return state
      const allowedSmart=new Set(['all','today','upcoming','overdue','high',null])
      const name = String(action.name || action.filter.name || 'Filter').trim().slice(0, LIMITS.FILTER_NAME) || 'Filter'
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
      const name = String(action.name || '').trim().slice(0, LIMITS.HABIT_NAME)
      if (!name) return state
      if (state.present.habits?.some((h) => h.name.toLowerCase() === name.toLowerCase())) return state
      if ((state.present.habits||[]).length >= 50) return state
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
      const title = String(action.title || '').trim().slice(0,LIMITS.DOC_TITLE) || 'Untitled'
      if ((state.present.docs||[]).length >= 500) return state
      const doc = { id:newId(), title, body:String(action.body||'').slice(0, LIMITS.DOC_BODY), projectId: action.projectId || 'inbox', createdAt: Date.now(), updatedAt: Date.now() }
      return commit(state, { ...state.present, docs: [...(state.present.docs||[]), doc] })
    }
    case 'doc/update': {
      if (!action.id || typeof action.patch!=='object' || action.patch===null) return state
      if (Object.hasOwn(action.patch,'id') || Object.hasOwn(action.patch,'__proto__') || Object.hasOwn(action.patch,'constructor')) return state
      const patch={}
      if('title' in action.patch) patch.title=String(action.patch.title).slice(0,LIMITS.DOC_TITLE)
      if('body' in action.patch) patch.body=String(action.patch.body).slice(0,LIMITS.DOC_BODY)
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
      const title = String(action.title||'').trim().slice(0,LIMITS.GOAL_TITLE)
      if (!title) return state
      if ((state.present.goals||[]).length >= 100) return state
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
      if (Object.hasOwn(s,'__proto__') || Object.hasOwn(s,'constructor')) return state
      let dur=Number(s.duration)
      if(!Number.isFinite(dur)) dur=0
      dur=Math.max(0, Math.min(180, Math.round(dur)))
      let at=Number(s.startedAt)
      if(!Number.isFinite(at)) at=Date.now()
      at=Math.min(Date.now()+60000, Math.max(Date.now()-86400000*7, at))
      const list = [...(state.present.focusSessions||[]), { id:newId(), taskId: s.taskId||null, duration: dur, startedAt: at, completed: !!s.completed }].slice(-LIMITS.FOCUS_SESSIONS_MAX)
      return commit(state, { ...state.present, focusSessions: list })
    }
    case 'undo': {
      if (!state.past.length) return state
      const previous = state.past[state.past.length - 1]
      const future = [state.present, ...state.future]
      const limit = getHistoryLimit(state.present.tasks?.length || 0)
      const cappedFuture = future.length > limit ? future.slice(0, limit) : future
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: cappedFuture,
      }
    }
    case 'redo': {
      if (!state.future.length) return state
      const [next, ...rest] = state.future
      const newPast = [...state.past, deepClonePresent(state.present)]
      const limit = getHistoryLimit(state.present.tasks?.length || 0)
      const cappedPast = newPast.length > limit ? newPast.slice(newPast.length - limit) : newPast
      return {
        past: cappedPast,
        present: next,
        future: rest,
      }
    }
    case '__hydrate': {
      const normalized = normalizeImport(action.data)
      if (!normalized) {
        // don't silently swallow invalid import — keep state, optionally log
        return state
      }
      // if normalized empties tasks but raw had tasks, respect raw only if raw was truly invalid? Already checked.
      // merge with version guard
      const incomingVer = action.data?.version ?? 0
      const currentVer = state.present.version ?? 0
      if (incomingVer < currentVer && state.past.length === 0 && state.future.length === 0) {
        // if incoming is older, still allow but don't overwrite newer local if tasks length smaller
        if (normalized.tasks.length < state.present.tasks.length) return state
      }
      // merge tombstones (newer wins) so deletes survive hydration from either source
      const deleted = mergeDeletedMaps(state.present.deleted || {}, normalized.deleted || {})
      return { ...state, present: { ...state.present, ...normalized, deleted, version: SCHEMA_VERSION } }
    }
    default:
      return state
  }
}
