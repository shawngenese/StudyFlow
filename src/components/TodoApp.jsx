import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTodos } from '../hooks/useTodos'
import { todayKey, parseDueDate, humanDue } from '../lib/date'
import Sidebar from './Sidebar'
import ListView from './ListView'
import TaskDetail from './TaskDetail'
import CommandPalette from './CommandPalette'
import HelpModal from './HelpModal'
import Composer from './Composer'
import Toolbar from './Toolbar'
import ViewHeader from './ViewHeader'
import OfflineIndicator from './OfflineIndicator'
import SyncStatus from './SyncStatus'
import { Toasts } from './Toasts'
import { toast } from '../lib/toast'
import { normalizeImport, LIMITS, estimateStorageSize } from '../lib/storage'
import { IconSun, IconMoon } from './Icons'

const BoardView = lazy(() => import('./BoardView'))
const CalendarView = lazy(() => import('./CalendarView'))
const HabitTracker = lazy(() => import('./HabitTracker'))
const FocusTimer = lazy(() => import('./FocusTimer'))
const NotesView = lazy(() => import('./NotesView'))
const BentoGrid = lazy(() => import('./BentoGrid'))

const SMART_LABELS = {
  all: 'All tasks',
  today: 'Today',
  upcoming: 'Upcoming',
  overdue: 'Overdue',
  high: 'High priority',
}
const SORTS = [
  { key: 'manual', label: 'Manual' },
  { key: 'due', label: 'Due date' },
  { key: 'priority', label: 'Priority' },
  { key: 'created', label: 'Newest' },
]

const DEFAULT_VIEW = { smart: 'all', viewMode: 'list' }

let chronoLoader = null
function loadChrono(){
  if(!chronoLoader) chronoLoader = import('chrono-node')
  return chronoLoader
}

export default function TodoApp() {
  const [data, dispatch, todoState] = useTodos()
  const canUndo = !!(todoState && todoState.past && todoState.past.length)
  const canRedo = !!(todoState && todoState.future && todoState.future.length)
  const [view, setView] = useState(DEFAULT_VIEW)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('manual')
  const [tagFilter, setTagFilter] = useState('')
  const [input, setInput] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen]=useState(false)
  const [helpOpen, setHelpOpen]=useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('shawn-theme')
      if (stored === 'light' || stored === 'dark') return stored
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light'
    } catch { /* ignore */ }
    return 'dark'
  })
  const inputRef = useRef(null)
  const searchRef = useRef(null)

  // theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('shawn-theme', theme) } catch { /* ignore */ }
  }, [theme])

  const projectsById = useMemo(
    () => Object.fromEntries(data.projects.map((p) => [p.id, p])),
    [data.projects]
  )
  const allTags = useMemo(() => [...new Set(data.tasks.flatMap((t) => t.tags))].sort(), [data.tasks])

  // counts for sidebar - single pass
  const taskCounts = useMemo(() => {
    const t = todayKey()
    const counts = { all:0, today:0, upcoming:0, overdue:0, high:0, projects:{} }
    for(const x of data.tasks){
      if(x.completed) continue
      counts.all++
      if(x.priority >=3) counts.high++
      if(x.dueDate){
        if(x.dueDate === t) counts.today++
        else if(x.dueDate > t) counts.upcoming++
        else counts.overdue++
      }
      counts.projects[x.projectId] = (counts.projects[x.projectId] || 0) + 1
    }
    return counts
  }, [data.tasks])

  // visible tasks pipeline - single filter pass + sort
  const visibleTasks = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hasQuery = q.length > 0
    const list = []
    for(const t of data.tasks){
      if(view.smart){
        if(!require_match(t, view.smart)) continue
      } else if(view.projectId){
        if(t.projectId !== view.projectId) continue
      }
      if(tagFilter && !t.tags.includes(tagFilter)) continue
      if(hasQuery){
        if(!(t.text.toLowerCase().includes(q) || t.notes.toLowerCase().includes(q) || t.tags.some(tag=>tag.includes(q)))) continue
      }
      list.push(t)
    }
    const active = []
    const done=[]
    for(const t of list){ if(t.completed) done.push(t); else active.push(t)}
    if (sort !== 'manual') {
      const sortFn = (a, b) => {
        switch (sort) {
          case 'due': {
            if (!a.dueDate && !b.dueDate) return 0
            if (!a.dueDate) return 1
            if (!b.dueDate) return -1
            return a.dueDate.localeCompare(b.dueDate) || a.createdAt - b.createdAt
          }
          case 'priority':
            return b.priority - a.priority || a.createdAt - b.createdAt
          case 'created':
            return b.createdAt - a.createdAt
          default:
            return 0
        }
      }
      active.sort(sortFn)
      done.sort((a, b) => b.updatedAt - a.updatedAt)
      return [...active, ...done]
    }
    return [...active, ...done]
  }, [data.tasks, view.smart, view.projectId, query, tagFilter, sort])

  const selectedTask = useMemo(()=> data.tasks.find((t) => t.id === selectedId) || null, [data.tasks, selectedId])

  useEffect(() => {
    if (selectedId && !data.tasks.some((t) => t.id === selectedId)) setSelectedId(null)
  }, [data.tasks, selectedId])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  useEffect(() => {
    if (!sidebarOpen) return
    function onEsc(e) { if (e.key === 'Escape') setSidebarOpen(false) }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [sidebarOpen])

  const composerPreview = useMemo(()=>{
    const t = input.trim()
    if(!t) return null
    const tags = [...t.matchAll(/#([a-z0-9_-]{1,20})/gi)].map(m=>m[1].toLowerCase()).slice(0,3)
    const prioMatch = t.match(/\s!(p[1-3]|high|medium|low)\s*$/i)
    let prio = null
    if(prioMatch){
      const v=prioMatch[1].toLowerCase()
      if(v==='p3'||v==='high') prio='High'
      else if(v==='p2'||v==='medium') prio='Medium'
      else if(v==='p1'||v==='low') prio='Low'
    }
    // eslint-disable-next-line no-useless-assignment
    let due = null
    try{ due = parseDueDate(t) } catch{ due = null }
    // only show due if it looks trailing (last word is date-like)
    if(due){
      const frag = t.slice(-20).toLowerCase()
      const hasDateWord = /(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})/i.test(frag)
      if(!hasDateWord) due = null
    }
    if(!tags.length && !prio && !due) return null
    return { tags, prio, due }
  }, [input])

  const addingRef = useRef(false)
  async function addTask(e) {
    e.preventDefault()
    if (addingRef.current) return
    const text = input.trim()
    if (!text) return
    if (text.length> LIMITS.TASK_TEXT) { toast(`Task too long (max ${LIMITS.TASK_TEXT})`,'error'); return }
    if (data.tasks.length >= LIMITS.IMPORT_TASKS_MAX){ toast('Task limit reached — delete some tasks first','error'); return }
    // storage size guard
    if (estimateStorageSize(data) > 4_500_000){ toast('Storage nearly full — export and clear first','error'); return }
    addingRef.current = true
    let dueDate = null
    let cleanText = text
    try{
      const chronoMod = await loadChrono()
      const chronoParse = chronoMod.parse
      const results=chronoParse(text, new Date(), {forwardDate:true})
      if(results.length){
        const last=results[results.length-1]
        const parsedDate=last.start.date()
        const y=parsedDate.getFullYear(), m=String(parsedDate.getMonth()+1).padStart(2,'0'), d=String(parsedDate.getDate()).padStart(2,'0')
        const key=`${y}-${m}-${d}`
        const frag=text.slice(last.index, last.index+last.text.length)
        const trailing=text.slice(last.index).trim()
        // Only treat as due date if the parsed fragment is trailing (at end) — prevents "meeting tomorrow with bob" false positives
        if(trailing.toLowerCase()===frag.trim().toLowerCase()){
          const [yy,mm,dd]=key.split('-').map(Number)
          const chk=new Date(yy,mm-1,dd,12,0,0)
          if(chk.getFullYear()===yy && chk.getMonth()===mm-1 && chk.getDate()===dd){
            dueDate=key
            cleanText=text.slice(0, last.index).trim()
          }
        }
      }
    }catch{ /* fallback */ }
    // quick-add tags #tag and priority !p1 !p2 !high - deduped
    let tags=[]
    const tagMatches=[...cleanText.matchAll(/#([a-z0-9_-]{1,20})/gi)]
    if(tagMatches.length){
      const seen=new Set()
      for(const m of tagMatches){ const v=m[1].toLowerCase(); if(!seen.has(v)){ seen.add(v); tags.push(v)} }
      cleanText=cleanText.replace(/#([a-z0-9_-]{1,20})/gi,'').replace(/\s{2,}/g,' ').trim()
    }
    let priority=0
    // only trailing priority token to avoid mid-sentence false positives
    const prioMatch=cleanText.match(/\s!(p[1-3]|high|medium|low)\s*$/i)
    if(prioMatch){
      const v=prioMatch[1].toLowerCase()
      if(v==='p3'||v==='high') priority=3
      else if(v==='p2'||v==='medium') priority=2
      else if(v==='p1'||v==='low') priority=1
      cleanText=cleanText.replace(prioMatch[0],'').trim()
    }
    if(!cleanText) {
      // if text was only tags/prio, recover original without tags/prio
      const recovered = text.replace(/#([a-z0-9_-]{1,20})/gi,'').replace(/\s!(p[1-3]|high|medium|low)\s*$/gi,'').trim()
      cleanText = recovered || 'Task'
    }
    if(!cleanText.trim()){ toast('Task text empty after parsing','error'); addingRef.current=false; return }
    cleanText = cleanText.slice(0, LIMITS.TASK_TEXT)
    try {
      dispatch({
        type: 'task/add',
        text: cleanText,
        dueDate,
        priority,
        tags,
        projectId: view.projectId || 'inbox',
      })
      setInput('')
    } finally {
      addingRef.current=false
    }
  }

  const deleteTask = useCallback((task) => {
    dispatch({ type: 'task/delete', id: task.id })
    toast(`Deleted "${task.text.slice(0, 30)}"`, 'info', {
      label: 'Undo',
      onClick: () => dispatch({ type: 'undo' }),
    })
  }, [dispatch])

  const clearCompleted = useCallback(() => {
    const doneIds = visibleTasks.filter((t) => t.completed).map((t) => t.id)
    if (!doneIds.length) return
    dispatch({ type: 'completed/clear', ids: doneIds })
    toast(`Cleared ${doneIds.length} completed`, 'info', {
      label: 'Undo',
      onClick: () => dispatch({ type: 'undo' }),
    })
  }, [visibleTasks, dispatch])

  const saveCurrentFilter = useCallback(() => {
    if(!query.trim() && !tagFilter){ toast('Add a search or tag first — nothing to save','error'); return }
    if(data.savedFilters.length >= LIMITS.SAVED_FILTERS_MAX){ toast('Max saved filters reached','error'); return }
    const name =
      (query.trim() ? `"${query.trim()}"` : SMART_LABELS[view.smart] || projectsById[view.projectId]?.name || 'Filter') +
      (tagFilter ? ` #${tagFilter}` : '')
    dispatch({
      type: 'filter/save',
      filter: { name, query, tagFilter, smart: view.smart || null, projectId: view.projectId || null },
      name,
    })
    toast(`Saved filter "${name}"`)
  }, [query, tagFilter, view.smart, view.projectId, projectsById, dispatch, data.savedFilters.length])

  // keyboard shortcuts - aware of palette/help
  useEffect(() => {
    function onKey(e) {
      if(e.key === 'Escape' && helpOpen){ e.preventDefault(); setHelpOpen(false); return }
      if(e.key === 'Escape' && paletteOpen){ e.preventDefault(); setPaletteOpen(false); return }
      const target = e.target
      const typing = target instanceof HTMLElement && (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o=>!o); return }
      const isTextUndo = typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='z'
      if(isTextUndo) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (typing) {
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'n') { e.preventDefault(); inputRef.current?.focus() }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
      else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault(); setHelpOpen(o=>!o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, paletteOpen, helpOpen])

  const savedFilterName = view.savedFilterId ? data.savedFilters.find(f=>f.id===view.savedFilterId)?.name : null
  const heading =
    (view.viewMode==='habits' ? 'Habits' : view.viewMode==='focus' ? 'Focus' : view.viewMode==='notes' ? 'Notes' : view.viewMode==='dashboard' ? 'Dashboard' : savedFilterName ? savedFilterName : view.smart ? SMART_LABELS[view.smart] : projectsById[view.projectId]?.name || 'Tasks')

  const completedCount = useMemo(()=> visibleTasks.filter((t) => t.completed).length, [visibleTasks])
  const activeCount = visibleTasks.length - completedCount

  const handleCalendarCreate = useCallback((dateKey)=>{
    if(data.tasks.length >= LIMITS.IMPORT_TASKS_MAX){ toast('Task limit reached','error'); return }
    dispatch({ type:'task/add', text: 'New task', dueDate: dateKey, projectId: view.projectId || 'inbox' })
    toast(`Added task for ${humanDue(dateKey)}`, 'info', { label: 'Undo', onClick: ()=> dispatch({type:'undo'}) })
    // switch to list if not already to show new task, but keep calendar visible
    setView(v=> v.viewMode==='calendar' ? v : {...v, viewMode: 'list'})
  }, [data.tasks.length, dispatch, view.projectId])

  const handleExport = useCallback(()=>{
    try{
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'})
      const url=URL.createObjectURL(blob)
      const a=document.createElement('a')
      a.href=url
      a.download=`studyflow-export-${new Date().toISOString().slice(0,10)}.json`
      a.rel='noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(()=>URL.revokeObjectURL(url),1000)
      toast('Exported JSON')
    }catch{ toast('Export failed','error')}
  }, [data])

  const handleImport = useCallback((e)=>{
    const f=e.target.files?.[0]
    if(!f) return
    if(f.size > 5_000_000){ toast('File too large (max 5MB)','error'); e.target.value=''; return }
    const r=new FileReader()
    r.onload=()=>{
      try{
        const parsed=JSON.parse(String(r.result||''))
        const normalized=normalizeImport(parsed)
        if(!normalized) { toast('Import failed — invalid format','error'); return }
        if(!normalized.tasks.length && parsed?.tasks?.length) { toast('Import failed — no valid tasks found','error'); return }
        dispatch({type:'__hydrate', data:parsed})
        toast(`Imported ${normalized.tasks.length} tasks — ${normalized.projects.length} projects`, 'info', { label: 'Undo', onClick: ()=> dispatch({type:'undo'}) })
      }catch{
        toast('Invalid JSON file','error')
      } finally{
        e.target.value=''
      }
    }
    r.onerror=()=>{ toast('Failed to read file','error'); e.target.value='' }
    r.readAsText(f)
  }, [dispatch])

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button type="button" className="nav-toggle" aria-label="Open menu" aria-expanded={sidebarOpen} aria-controls="app-sidebar" onClick={() => setSidebarOpen(true)}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <button type="button" className="theme-toggle" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label={`Switch to ${theme==='dark'?'light':'dark'} theme`} aria-pressed={theme==='dark'} title={`Toggle theme (current: ${theme})`}>
        <span className={`theme-toggle-track ${theme === 'dark' ? 'is-dark' : ''}`}>
          <span className="theme-toggle-thumb">
            {theme === 'dark' ? <IconMoon size={14} /> : <IconSun size={14} />}
          </span>
        </span>
      </button>

        <Sidebar
         data={data}
         view={view}
         open={sidebarOpen}
         onClose={() => setSidebarOpen(false)}
          onViewChange={(v) => {
            if (typeof v.query === 'string') setQuery(v.query)
            else if ('smart' in v || 'projectId' in v) { setQuery(''); setTagFilter('') }
            if (typeof v.tagFilter === 'string') setTagFilter(v.tagFilter)
            setView((prev) => {
              const next = { ...prev }
              if ('smart' in v) {
                if (v.smart !== undefined) { next.smart = v.smart; next.projectId = undefined; next.savedFilterId = undefined; if(!v.viewMode) next.viewMode = 'list' }
              }
              if ('projectId' in v) {
                if (v.projectId !== undefined && v.projectId !== null) { next.projectId = v.projectId; next.smart = null; next.savedFilterId = undefined; if(!v.viewMode) next.viewMode = 'list' }
                else next.projectId = v.projectId
              }
              if ('savedFilterId' in v) { next.savedFilterId = v.savedFilterId; if(!v.viewMode) next.viewMode = 'list' }
             for (const k of Object.keys(v)) {
               if (!['smart','projectId','savedFilterId','query','tagFilter'].includes(k)) next[k] = v[k]
             }
             if ('filter' in v && v.filter && typeof v.filter === 'object') Object.assign(next, v.filter)
             return next
           })
           setSidebarOpen(false)
         }}
        onProjectAdd={(name) => dispatch({ type: 'project/add', name })}
        onProjectDelete={(p) => {
          const name = p.name
          dispatch({ type: 'project/delete', id: p.id })
          if (view.projectId === p.id) setView(DEFAULT_VIEW)
          toast(`Deleted project "${name}" — tasks moved to Inbox`, 'info', { label: 'Undo', onClick: () => dispatch({ type: 'undo' }) })
        }}
        onFilterDelete={(id) => {
          const name = data.savedFilters.find(f=>f.id===id)?.name || 'Filter'
          dispatch({ type: 'filter/delete', id })
          toast(`Removed filter "${name}"`, 'info', { label: 'Undo', onClick: ()=> dispatch({type:'undo'}) })
        }}
        taskCounts={taskCounts}
      />
      {sidebarOpen && (
        <button type="button" className="backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="main" id="main-content">
        <div className="bento">
          <ViewHeader heading={heading} activeCount={activeCount} visibleTasksLength={visibleTasks.length} view={view} setView={setView} onHelp={()=>setHelpOpen(true)} />

          <div className="bento-tile tile-composer">
            <Composer input={input} setInput={setInput} onAdd={addTask} heading={heading} preview={composerPreview} inputRef={inputRef} />
            <Toolbar
              query={query}
              setQuery={setQuery}
              sort={sort}
              setSort={setSort}
              tagFilter={tagFilter}
              setTagFilter={setTagFilter}
              allTags={allTags}
              sorts={SORTS}
              onSaveFilter={saveCurrentFilter}
              canUndo={canUndo}
              canRedo={canRedo}
              onUndo={()=>dispatch({type:'undo'})}
              onRedo={()=>dispatch({type:'redo'})}
              data={data}
              searchRef={searchRef}
              onExport={handleExport}
              onImport={handleImport}
            />
          </div>

          {(view.viewMode==='dashboard') ? <Suspense fallback={<div className="bento-tile" style={{gridColumn:'span 12'}}>Loading…</div>}><BentoGrid data={data} dispatch={dispatch} visibleTasks={visibleTasks} onSelect={setSelectedId} setView={setView} /></Suspense> : null}
          {(view.viewMode==='habits') ? <div className="bento-tile tile-habits-full"><Suspense fallback={<div>Loading…</div>}><HabitTracker habits={data.habits||[]} dispatch={dispatch} /></Suspense></div> : null}
          {(view.viewMode==='focus') ? <div className="bento-tile tile-focus-full"><Suspense fallback={<div>Loading…</div>}><FocusTimer selectedTask={selectedTask} dispatch={dispatch} focusSessions={data.focusSessions} /></Suspense></div> : null}
          {(view.viewMode==='notes') ? <div className="bento-tile tile-notes"><Suspense fallback={<div>Loading…</div>}><NotesView docs={data.docs||[]} projects={data.projects} dispatch={dispatch} /></Suspense></div> : null}
          {(view.viewMode==='list' || !view.viewMode) ? <>
            <div className="bento-tile tile-tasks" id="task-panel" role="tabpanel" aria-label="Task list"><ListView tasks={visibleTasks} selectedId={selectedId} onSelect={setSelectedId} dispatch={dispatch} onDelete={deleteTask} canReorder={sort==='manual'} /></div>
            <div className="bento-tile tile-detail"><TaskDetail key={selectedId||'empty'} task={selectedTask} project={selectedTask?projectsById[selectedTask.projectId]:null} projects={data.projects} dispatch={dispatch} /></div>
          </> : null}
          {(view.viewMode==='board') ? <>
            <div className="bento-tile tile-board"><Suspense fallback={<div>Loading…</div>}><BoardView tasks={visibleTasks} dispatch={dispatch} onSelect={setSelectedId} canReorder={sort==='manual'} /></Suspense></div>
            <div className="bento-tile tile-detail"><TaskDetail key={selectedId||'empty'} task={selectedTask} project={selectedTask?projectsById[selectedTask.projectId]:null} projects={data.projects} dispatch={dispatch} /></div>
          </> : null}
          {(view.viewMode==='calendar') ? <div className="bento-tile tile-calendar"><Suspense fallback={<div>Loading…</div>}><CalendarView tasks={visibleTasks} allTasks={data.tasks} onSelect={setSelectedId} onCreate={handleCalendarCreate} /></Suspense></div> : null}

          {completedCount>0 && <div className="bento-tile tile-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span className="todo-count"><strong>{activeCount}</strong> items left</span><button type="button" className="todo-clear-btn" onClick={clearCompleted}>Clear completed ({completedCount})</button></div>}
        </div>
      </main>

      <OfflineIndicator />
      <SyncStatus />
      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} tasks={data.tasks} projects={data.projects} docs={data.docs||[]} habits={data.habits||[]} onSelect={setSelectedId} dispatch={dispatch} setView={setView} />
      <HelpModal open={helpOpen} onClose={()=>setHelpOpen(false)} />
      <Toasts />
    </div>
  )
}

function require_match(task, smart) {
  const t = todayKey()
  switch (smart) {
    case 'today': return !!task.dueDate && task.dueDate === t && !task.completed
    case 'upcoming': return !!task.dueDate && task.dueDate > t && !task.completed
    case 'overdue': return !!task.dueDate && task.dueDate < t && !task.completed
    case 'high': return task.priority >= 3 && !task.completed
    default: return true
  }
}
