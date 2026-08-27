import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTodos } from '../hooks/useTodos'
import { todayKey } from '../lib/date'
import Sidebar from './Sidebar'
import ListView from './ListView'
import TaskDetail from './TaskDetail'
import CommandPalette from './CommandPalette'
import { Toasts } from './Toasts'
import { toast } from '../lib/toast'
import { IconSun, IconMoon, IconList, IconBoard, IconCalendar, IconBookmark, IconLayers, IconBolt } from './Icons'

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

const DEFAULT_VIEW = { smart: 'all' }

export default function TodoApp() {
  const [data, dispatch] = useTodos()
  const [view, setView] = useState(DEFAULT_VIEW)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('manual')
  const [tagFilter, setTagFilter] = useState('')
  const [input, setInput] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [paletteOpen, setPaletteOpen]=useState(false)
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('shawn-theme')
      if (stored === 'light' || stored === 'dark') return stored
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

  // counts for sidebar
  const taskCounts = useMemo(() => {
    const t = todayKey()
    return {
      all: data.tasks.filter((x) => !x.completed).length,
      today: data.tasks.filter((x) => x.dueDate && x.dueDate === t && !x.completed).length,
      upcoming: data.tasks.filter((x) => x.dueDate && x.dueDate > t && !x.completed).length,
      overdue: data.tasks.filter((x) => x.dueDate && x.dueDate < t && !x.completed).length,
      high: data.tasks.filter((x) => x.priority >= 3 && !x.completed).length,
      projects: data.tasks.reduce((acc, x) => {
        if (!x.completed) acc[x.projectId] = (acc[x.projectId] || 0) + 1
        return acc
      }, {}),
    }
  }, [data.tasks])

  // visible tasks pipeline
  const visibleTasks = useMemo(() => {
    let list = data.tasks
    if (view.smart) list = list.filter((t) => require_match(t, view.smart))
    else if (view.projectId) list = list.filter((t) => t.projectId === view.projectId)
    if (tagFilter) list = list.filter((t) => t.tags.includes(tagFilter))
    if (query.trim()) {
      const q = query.trim().toLowerCase()
      list = list.filter(
        (t) =>
          t.text.toLowerCase().includes(q) ||
          t.notes.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.includes(q))
      )
    }
    const active = list.filter((t) => !t.completed)
    const done = list.filter((t) => t.completed)
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
    if (sort !== 'manual') {
      const sortedActive = [...active].sort(sortFn)
      const sortedDone = [...done].sort((a, b) => b.updatedAt - a.updatedAt)
      return [...sortedActive, ...sortedDone]
    }
    return [...active, ...done]
  }, [data.tasks, view, query, tagFilter, sort])

  const selectedTask = data.tasks.find((t) => t.id === selectedId) || null

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

  const addingRef = useRef(false)
  async function addTask(e) {
    e.preventDefault()
    if (addingRef.current) return
    const text = input.trim()
    if (!text) return
    if (text.length>500) { toast('Task too long','error'); return }
    addingRef.current = true
    let dueDate = null
    let cleanText = text
    try{
      const { parse: chronoParse } = await import('chrono-node')
      const results=chronoParse(text, new Date(), {forwardDate:true})
      if(results.length){
        const last=results[results.length-1]
        const parsedDate=last.start.date()
        const y=parsedDate.getFullYear(), m=String(parsedDate.getMonth()+1).padStart(2,'0'), d=String(parsedDate.getDate()).padStart(2,'0')
        const key=`${y}-${m}-${d}`
        // only strip if dated fragment at end (avoid mid-sentence)
        const frag=text.slice(last.index, last.index+last.text.length)
        const trailing=text.slice(last.index).trim()
        if(trailing.toLowerCase()===frag.trim().toLowerCase()){
          dueDate=key
          cleanText=text.slice(0, last.index).trim()
        } else {
          dueDate=key
        }
        // validate date
        const [yy,mm,dd]=key.split('-').map(Number)
        const chk=new Date(yy,mm-1,dd)
        if(chk.getFullYear()!==yy || chk.getMonth()!==mm-1 || chk.getDate()!==dd) dueDate=null
      }
    }catch{ /* fallback to suffix */ } finally { /* ensure flag reset if early error before dispatch already handled */ }
    // quick-add tags #tag and priority !p1 !p2 !high
    let tags=[]
    const tagMatches=[...cleanText.matchAll(/#([a-z0-9_-]{1,20})/gi)]
    if(tagMatches.length){ tags=tagMatches.map(m=>m[1].toLowerCase()); cleanText=cleanText.replace(/#([a-z0-9_-]{1,20})/gi,'').replace(/\s{2,}/g,' ').trim() }
    let priority=0
    const prioMatch=cleanText.match(/\s!(p[1-3]|high|medium|low)\s*$/i) || cleanText.match(/\s!(p[1-3]|high|medium|low)\b/i)
    if(prioMatch){
      const v=prioMatch[1].toLowerCase()
      if(v==='p3'||v==='high') priority=3
      else if(v==='p2'||v==='medium') priority=2
      else if(v==='p1'||v==='low') priority=1
      cleanText=cleanText.replace(prioMatch[0],'').trim()
    }
    if(!cleanText) cleanText=text.replace(/#([a-z0-9_-]{1,20})/gi,'').replace(/\s!(p[1-3]|high|medium|low)\b/gi,'').trim()
    if(!cleanText.trim()){ toast('Task text empty after parsing','error'); addingRef.current=false; return }
    dispatch({
      type: 'task/add',
      text: cleanText,
      dueDate,
      priority,
      tags,
      projectId: view.projectId || 'inbox',
    })
    setInput('')
    addingRef.current=false
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
    const name =
      (query.trim() ? `"${query.trim()}"` : SMART_LABELS[view.smart] || projectsById[view.projectId]?.name || 'Filter') +
      (tagFilter ? ` #${tagFilter}` : '')
    dispatch({
      type: 'filter/save',
      filter: { name, query, tagFilter, smart: view.smart || null, projectId: view.projectId || null },
      name,
    })
    toast(`Saved filter "${name}"`)
  }, [query, tagFilter, view.smart, view.projectId, projectsById, dispatch])

  // keyboard shortcuts
  useEffect(() => {
    function onKey(e) {
      const target = e.target
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o=>!o); return }
      const isTextUndo = typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='z'
      if(isTextUndo) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        dispatch({ type: e.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (typing) {
        if (e.key==='Escape' && paletteOpen) setPaletteOpen(false)
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'n') { e.preventDefault(); inputRef.current?.focus() }
      else if (e.key === '/') { e.preventDefault(); searchRef.current?.focus() }
      else if (e.key === '?') {
        toast('N: new · /: search · Ctrl+K palette · Ctrl+Z undo · drag to reorder')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dispatch, paletteOpen])

  const heading =
    (view.viewMode==='habits' ? 'Habits' : view.viewMode==='focus' ? 'Focus' : view.viewMode==='notes' ? 'Notes' : view.viewMode==='dashboard' ? 'Dashboard' : view.smart ? SMART_LABELS[view.smart] : projectsById[view.projectId]?.name || 'Tasks')

  const completedCount = visibleTasks.filter((t) => t.completed).length

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button type="button" className="nav-toggle" aria-label="Open menu" aria-expanded={sidebarOpen} aria-controls="app-sidebar" onClick={() => setSidebarOpen(true)}>
        <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="12" x2="20" y2="12" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      <button type="button" className="theme-toggle" onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))} aria-label="Toggle theme" aria-pressed={theme==='dark'} title="Toggle theme">
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
                if (v.smart !== undefined) { next.smart = v.smart; next.projectId = undefined; next.savedFilterId = undefined; next.viewMode = 'list' }
              }
              if ('projectId' in v) {
                if (v.projectId !== undefined && v.projectId !== null) { next.projectId = v.projectId; next.smart = null; next.savedFilterId = undefined; next.viewMode = 'list' }
                else next.projectId = v.projectId
              }
              if ('savedFilterId' in v) { next.savedFilterId = v.savedFilterId; next.viewMode = 'list' }
             // copy remaining keys except those already handled
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
          dispatch({ type: 'project/delete', id: p.id })
          if (view.projectId === p.id) setView(DEFAULT_VIEW)
          toast(`Deleted project "${p.name}"`, 'info', { label: 'Undo', onClick: () => dispatch({ type: 'undo' }) })
        }}
        onFilterDelete={(id) => dispatch({ type: 'filter/delete', id })}
        taskCounts={taskCounts}
      />
      {sidebarOpen && (
        <button type="button" className="backdrop" aria-label="Close menu" onClick={() => setSidebarOpen(false)} />
      )}

      <main className="main">
        <div className="bento">
          <div className="bento-tile tile-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px'}}>
            <div><h1 style={{fontSize:'28px',margin:0, fontFamily:'var(--font-display)'}}>{heading}</h1><p className="todo-subtitle" style={{margin:'2px 0 0'}}>{visibleTasks.length===0 ? 'Nothing here yet.' : `${visibleTasks.filter(t=>!t.completed).length} tasks to focus on.`}</p></div>
            <div className="segmented" role="tablist" aria-label="View mode">
              {[['dashboard',<IconLayers size={14} key="d" />],['list',<IconList size={14} key="l" />],['board',<IconBoard size={14} key="b" />],['calendar',<IconCalendar size={14} key="c" />],['habits',<IconBolt size={14} key="h" />],['focus',<IconSun size={14} key="f" />],['notes',<IconBookmark size={14} key="n" />]].map(([key,icon])=>(
                <button key={key} role="tab" aria-selected={(view.viewMode||'list')===key} aria-label={key} type="button" className={(view.viewMode||'list')===key?'is-active':''} onClick={()=>setView(v=>({...v,viewMode:key}))} aria-controls="task-panel">{icon}<span className="view-label">{key[0].toUpperCase()+key.slice(1)}</span></button>
              ))}
            </div>
          </div>

          <div className="bento-tile tile-composer" style={{padding:0, overflow:'hidden'}}>
            <form className="todo-input-row" onSubmit={addTask} style={{margin:0, padding:'16px 16px 12px'}}>
              <label htmlFor="todo-input" className="sr-only">Add task</label><input id="todo-input" ref={inputRef} type="text" className="todo-input" placeholder={`Add to ${heading}… (try "essay #chem !high tomorrow")`} value={input} onChange={e=>setInput(e.target.value)} maxLength={200} />
              <button type="submit" className="todo-add-btn" disabled={!input.trim()}>Add</button>
            </form>
            <div className="toolbar" style={{margin:0, padding:'12px 16px', borderTop:'1px solid var(--border)', background:'rgba(255,255,255,0.01)'}}>
              <div className="toolbar-search"><input ref={searchRef} type="search" placeholder="Search…  ( / )" value={query} onChange={e=>setQuery(e.target.value)} aria-label="Search tasks" /></div>
              <select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort order">{SORTS.map(s=><option key={s.key} value={s.key}>Sort: {s.label}</option>)}</select>
              <select value={tagFilter} onChange={e=>setTagFilter(e.target.value)} aria-label="Filter by tag"><option value="">All tags</option>{allTags.map(tag=><option key={tag} value={tag}>#{tag}</option>)}</select>
              {(query||tagFilter)&& <button type="button" className="btn btn-ghost" onClick={saveCurrentFilter}><IconBookmark size={13} /> Save filter</button>}
              <details style={{position:'relative'}}><summary className="btn btn-ghost" style={{listStyle:'none',cursor:'pointer'}}>⋯</summary><div style={{position:'absolute', right:0, top:'calc(100% + 8px)', background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:'12px', padding:'6px', display:'flex', flexDirection:'column', gap:'4px', boxShadow:'var(--shadow-md)', zIndex:10, minWidth:'140px'}}>
                <button type="button" className="btn btn-ghost" style={{justifyContent:'flex-start'}} onClick={()=>{const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='studyflow-export.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500)}}>Export JSON</button>
                <label className="btn btn-ghost" style={{cursor:'pointer',justifyContent:'flex-start'}}>Import<input type="file" accept=".json" hidden onChange={e=>{const f=e.target.files?.[0]; if(!f) return; const r=new FileReader(); r.onload=()=>{try{const parsed=JSON.parse(r.result); dispatch({type:'__hydrate', data:parsed}); toast('Imported')}catch{ toast('Invalid file','error')} finally{e.target.value=''}}; r.readAsText(f); e.target.value=''}} /></label>
              </div></details>
            </div>
          </div>

          {(view.viewMode==='dashboard') ? <Suspense fallback={<div className="bento-tile" style={{gridColumn:'span 12'}}>Loading…</div>}><BentoGrid data={data} dispatch={dispatch} visibleTasks={visibleTasks} onSelect={setSelectedId} setView={setView} /></Suspense> : null}
          {(view.viewMode==='habits') ? <div className="bento-tile tile-habits-full"><Suspense fallback={<div>Loading…</div>}><HabitTracker habits={data.habits||[]} dispatch={dispatch} /></Suspense></div> : null}
          {(view.viewMode==='focus') ? <div className="bento-tile tile-focus-full"><Suspense fallback={<div>Loading…</div>}><FocusTimer selectedTask={selectedTask} dispatch={dispatch} /></Suspense></div> : null}
          {(view.viewMode==='notes') ? <div className="bento-tile tile-notes"><Suspense fallback={<div>Loading…</div>}><NotesView docs={data.docs||[]} projects={data.projects} dispatch={dispatch} /></Suspense></div> : null}
          {(view.viewMode==='list' || !view.viewMode) ? <>
            <div className="bento-tile tile-tasks" id="task-panel" role="tabpanel"><ListView tasks={visibleTasks} selectedId={selectedId} onSelect={setSelectedId} dispatch={dispatch} onDelete={deleteTask} canReorder={sort==='manual'} /></div>
            <div className="bento-tile tile-detail"><TaskDetail key={selectedId||'empty'} task={selectedTask} project={selectedTask?projectsById[selectedTask.projectId]:null} projects={data.projects} dispatch={dispatch} /></div>
          </> : null}
          {(view.viewMode==='board') ? <>
            <div className="bento-tile tile-board"><Suspense fallback={<div>Loading…</div>}><BoardView tasks={visibleTasks} dispatch={dispatch} onSelect={setSelectedId} canReorder={sort==='manual'} /></Suspense></div>
            <div className="bento-tile tile-detail"><TaskDetail key={selectedId||'empty'} task={selectedTask} project={selectedTask?projectsById[selectedTask.projectId]:null} projects={data.projects} dispatch={dispatch} /></div>
          </> : null}
          {(view.viewMode==='calendar') ? <div className="bento-tile tile-calendar"><Suspense fallback={<div>Loading…</div>}><CalendarView tasks={visibleTasks} allTasks={data.tasks} onSelect={setSelectedId} /></Suspense></div> : null}

          {completedCount>0 && <div className="bento-tile tile-header" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span className="todo-count"><strong>{visibleTasks.length-completedCount}</strong> items left</span><button type="button" className="todo-clear-btn" onClick={clearCompleted}>Clear completed ({completedCount})</button></div>}
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} tasks={data.tasks} onSelect={setSelectedId} dispatch={dispatch} setView={setView} />
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
