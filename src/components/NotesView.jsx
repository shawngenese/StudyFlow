import { useState, useEffect, useRef, useCallback } from 'react'
import { renderMarkdown } from '../lib/markdown'
import { LIMITS } from '../lib/storage'
import { toast } from '../lib/toast'

export default function NotesView({ docs, projects, dispatch }){
  const [active, setActive]=useState(docs[0]?.id || null)
  const [filter,setFilter]=useState('all')
  const doc = docs.find(d=>d.id===active) || null
  const [edit,setEdit]=useState(false)
  const filtered = filter==='all'? docs : docs.filter(d=>d.projectId===filter)
   const [localTitle, setLocalTitle] = useState(doc?.title || '')
  const [localBody, setLocalBody] = useState(doc?.body || '')
  const titleTimer = useRef(null)
  const bodyTimer = useRef(null)
  const titleRef = useRef(doc?.title || '')
  const bodyRef = useRef(doc?.body || '')
  const selNewRef = useRef(false)
  const prevDocsLenRef = useRef(docs.length)
  const prevActiveRef = useRef(active)

  const flushAll = useCallback(()=>{
    if (titleTimer.current && doc) { clearTimeout(titleTimer.current); titleTimer.current=null; const v=titleRef.current; if (v!==doc.title) dispatch({ type:'doc/update', id: doc.id, patch:{ title: v.slice(0,LIMITS.DOC_TITLE)} }) }
    if (bodyTimer.current && doc) { clearTimeout(bodyTimer.current); bodyTimer.current=null; const v=bodyRef.current; if (v!==doc.body) dispatch({ type:'doc/update', id: doc.id, patch:{ body: v.slice(0,LIMITS.DOC_BODY)} }) }
  }, [doc, dispatch])

  const switchTo = useCallback((id)=>{
    flushAll()
    setActive(id)
    setEdit(false)
  }, [flushAll])

  useEffect(()=>{
    // select newest doc after "New note" click - track by id not length
    if (selNewRef.current && docs.length > prevDocsLenRef.current) {
      const newest = docs[docs.length - 1]
      if (newest) { setActive(newest.id); setEdit(true) }
      selNewRef.current = false
    }
    prevDocsLenRef.current = docs.length
    if (!docs.length) { setActive(null); return }
    // Only auto-select if active doc no longer exists globally — don't jump when filter changes
    if (!active || !docs.some(d=>d.id===active)) {
      const candidate = (filtered[0]?.id || docs[docs.length-1]?.id || docs[0]?.id || null)
      setActive(candidate)
    }
  }, [docs, active, filtered])

  // flush when active changes
  useEffect(()=>{
    const prev = prevActiveRef.current
    prevActiveRef.current = active
    if(prev && prev !== active){
      // timers were for previous doc; they are already flushed via switchTo, but guard
      if(titleTimer.current){ clearTimeout(titleTimer.current); titleTimer.current=null }
      if(bodyTimer.current){ clearTimeout(bodyTimer.current); bodyTimer.current=null }
    }
  }, [active])

  useEffect(()=>{
    setLocalTitle(doc?.title || '')
    titleRef.current = doc?.title || ''
    if (titleTimer.current) { clearTimeout(titleTimer.current); titleTimer.current=null }
  }, [doc?.id])
  useEffect(()=>{
    setLocalBody(doc?.body || '')
    bodyRef.current = doc?.body || ''
    if (bodyTimer.current) { clearTimeout(bodyTimer.current); bodyTimer.current=null }
  }, [doc?.id])

  useEffect(()=>{
    if (!titleTimer.current && doc && doc.title !== titleRef.current) {
      setLocalTitle(doc.title || '')
      titleRef.current = doc.title || ''
    }
  }, [doc?.title])
  useEffect(()=>{
    if (!bodyTimer.current && doc && doc.body !== bodyRef.current) {
      setLocalBody(doc.body || '')
      bodyRef.current = doc.body || ''
    }
  }, [doc?.body])

  useEffect(()=>()=> {
    if (titleTimer.current) clearTimeout(titleTimer.current)
    if (bodyTimer.current) clearTimeout(bodyTimer.current)
  }, [])

  function commitTitle(v){
    const sliced = v.slice(0, LIMITS.DOC_TITLE)
    titleRef.current = sliced
    setLocalTitle(sliced)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(()=>{ titleTimer.current=null; if (doc && sliced !== doc.title) dispatch({ type:'doc/update', id: doc.id, patch:{ title: sliced } }) }, 450)
  }
  function commitBody(v){
    const sliced = v.slice(0, LIMITS.DOC_BODY)
    bodyRef.current = sliced
    setLocalBody(sliced)
    if (bodyTimer.current) clearTimeout(bodyTimer.current)
    bodyTimer.current = setTimeout(()=>{ bodyTimer.current=null; if (doc && sliced !== doc.body) dispatch({ type:'doc/update', id: doc.id, patch:{ body: sliced } }) }, 550)
  }

  const handleNew = useCallback(()=>{
    if(docs.length >= 500){ toast('Max notes reached','error'); return }
    selNewRef.current = true
    dispatch({type:'doc/add', title:'Untitled note', projectId: filter!=='all'? filter : 'inbox'})
  }, [docs.length, filter, dispatch])

  const handleDelete = useCallback(()=>{
    if(!doc) return
    const title = doc.title
    if(titleTimer.current) clearTimeout(titleTimer.current)
    if(bodyTimer.current) clearTimeout(bodyTimer.current)
    titleTimer.current=null
    bodyTimer.current=null
    dispatch({type:'doc/delete', id:doc.id})
    setActive(null)
    toast(`Deleted "${title.slice(0,30)}"`, 'info', { label: 'Undo', onClick: ()=> dispatch({type:'undo'}) })
  }, [doc, dispatch])

    return (
    <div className="notes-layout" style={{display:'flex',gap:'16px',alignItems:'flex-start'}}>
      <div className="notes-sidebar" style={{width:'240px',flexShrink:0,background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'10px',maxHeight:'60vh',overflowY:'auto'}}>
        <button type="button" className="todo-add-btn" style={{width:'100%',marginBottom:'10px'}} onClick={handleNew}>+ New note</button>
        <label htmlFor="notes-filter" className="sr-only">Filter by course</label>
        <select id="notes-filter" value={filter} onChange={e=>setFilter(e.target.value)} style={{width:'100%',marginBottom:'10px'}} aria-label="Filter by course">
          <option value="all">All courses</option>
          {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:'4px'}} role="listbox" aria-label="Notes">
          {filtered.map(d=>(
            <li key={d.id} role="option" aria-selected={active===d.id}><button type="button" onClick={()=>switchTo(d.id)} style={{width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:'8px',background: active===d.id? 'var(--accent-soft)':'transparent',color: active===d.id? 'var(--accent)':'var(--text)',fontWeight: active===d.id?600:500}}>{d.title.slice(0,32) || 'Untitled'}</button></li>
          ))}
          {filtered.length===0 && <li className="muted" style={{padding:'12px',textAlign:'center'}}>No notes — create one.</li>}
        </ul>
      </div>
      <div className="notes-main" style={{flex:1,minWidth:0,background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'18px'}}>
        {!doc ? <p className="muted">Select or create a note.</p> : (
          <>
            <label htmlFor="note-title" className="sr-only">Note title</label>
            <input id="note-title" value={localTitle} onChange={e=>commitTitle(e.target.value)} onBlur={flushAll} placeholder="Title" maxLength={LIMITS.DOC_TITLE} style={{width:'100%',fontSize:'18px',fontWeight:650,border:'none',background:'transparent',padding:'4px 0',marginBottom:'8px'}} aria-label="Note title" />
            <div style={{display:'flex',gap:'6px',marginBottom:'12px',flexWrap:'wrap'}}>
              <label htmlFor="note-project" className="sr-only">Project</label>
              <select id="note-project" value={doc.projectId} onChange={e=>{ flushAll(); dispatch({type:'doc/update', id:doc.id, patch:{projectId:e.target.value}})}} aria-label="Project">{projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button type="button" className="btn" onClick={()=>{ flushAll(); setEdit(e=>!e)}} aria-pressed={edit}>{edit?'Preview':'Edit'}</button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>Delete</button>
            </div>
            {edit ? (
              <textarea value={localBody} onChange={e=>commitBody(e.target.value)} onBlur={flushAll} placeholder="Write markdown… paste images supported in task notes." style={{width:'100%',minHeight:'300px',resize:'vertical'}} maxLength={LIMITS.DOC_BODY} aria-label="Note body" />
            ) : (
              <div className="markdown-body" style={{minHeight:'200px',background:'var(--bg-inset)',borderRadius:'10px',padding:'14px'}} dangerouslySetInnerHTML={{__html: renderMarkdown(localBody || doc.body || '*No content yet — click Edit.*')}} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
