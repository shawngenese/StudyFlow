import { useEffect, useState, useMemo, useRef, useCallback } from 'react'

export default function CommandPalette({ open, onClose, tasks, onSelect, setView, projects = [], docs = [], habits = [] }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [idx, setIdx] = useState(0)
  useEffect(()=>{ if(open){ setQ(''); setIdx(0) } },[open])
  useEffect(()=>{
    if(open) {
      // focus with slight delay to avoid stealing composer focus race
      const id = setTimeout(()=> inputRef.current?.focus(), 30)
      return ()=> clearTimeout(id)
    }
  },[open])
  useEffect(()=>{
    if(!open) return
    function onKey(e){
      if(e.key==='Escape'){ e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return ()=>window.removeEventListener('keydown', onKey)
  },[open,onClose])

  // trap focus
  useEffect(()=>{
    if(!open) return
    function trap(e){
      if(e.key==='Tab'){
        const el = listRef.current
        if(!el) return
        const focusable = el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        if(!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length-1]
        if(e.shiftKey && document.activeElement===first){ e.preventDefault(); last.focus() }
        else if(!e.shiftKey && document.activeElement===last){ e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', trap)
    return ()=> document.removeEventListener('keydown', trap)
  }, [open])

  const COMMANDS = useMemo(()=> [
    { id: 'cmd-dashboard', label: 'Go to Dashboard', action: 'dashboard' },
    { id: 'cmd-list', label: 'Go to List', action: 'list' },
    { id: 'cmd-board', label: 'Go to Board', action: 'board' },
    { id: 'cmd-calendar', label: 'Go to Calendar', action: 'calendar' },
    { id: 'cmd-habits', label: 'Go to Habits', action: 'habits' },
    { id: 'cmd-focus', label: 'Go to Focus', action: 'focus' },
    { id: 'cmd-notes', label: 'Go to Notes', action: 'notes' },
  ], [])

  const projectNames = useMemo(()=> Object.fromEntries(projects.map(p=>[p.id, p.name])), [projects])
  const taskResults = useMemo(()=>{
    if(!q.trim()) return tasks.slice(0,5)
    const qq = q.toLowerCase()
    return tasks.filter(t=> t.text.toLowerCase().includes(qq) || t.notes.toLowerCase().includes(qq) || t.tags.some(tag=>tag.includes(qq)) || (projectNames[t.projectId]||'').toLowerCase().includes(qq)).slice(0,5)
  },[q,tasks,projectNames])
  const docResults = useMemo(()=>{
    if(!q.trim()) return docs.slice(0,3)
    const qq = q.toLowerCase()
    return docs.filter(d=> d.title.toLowerCase().includes(qq) || d.body.toLowerCase().includes(qq)).slice(0,3)
  }, [q, docs])
  const habitResults = useMemo(()=>{
    if(!q.trim()) return habits.slice(0,2)
    const qq = q.toLowerCase()
    return habits.filter(h=> h.name.toLowerCase().includes(qq)).slice(0,2)
  }, [q, habits])

  const filteredCommands = useMemo(()=>{
    const qq = q.trim().toLowerCase()
    if(!qq) return COMMANDS
    return COMMANDS.filter(c=> c.label.toLowerCase().includes(qq) || c.action.includes(qq))
  }, [q, COMMANDS])

  useEffect(()=>{ setIdx(0) }, [q])

  const handleSelect = useCallback((id)=>{
    onSelect(id)
    onClose()
  }, [onSelect, onClose])

  const onInputKey = useCallback((e)=>{
    const total = filteredCommands.length + taskResults.length + docResults.length + habitResults.length
    if(e.key==='ArrowDown'){ e.preventDefault(); setIdx(i=> Math.min(i+1, total-1)) }
    else if(e.key==='ArrowUp'){ e.preventDefault(); setIdx(i=> Math.max(i-1, 0)) }
    else if(e.key==='Enter'){
      e.preventDefault()
      const cmd=q.trim().toLowerCase()
      if(['habits','focus','notes','dashboard','board','calendar','list'].includes(cmd)){
        setView(v=>({...v,viewMode: cmd==='dashboard'?'dashboard':cmd})); onClose(); return
      }
      if(idx < filteredCommands.length){
        const c = filteredCommands[idx]
        if(c){ setView(v=>({...v,viewMode: c.action})); onClose(); return }
      }
      let offset = filteredCommands.length
      if(idx < offset + taskResults.length){
        const t = taskResults[idx - offset]
        if(t){ handleSelect(t.id); return }
      }
      offset += taskResults.length
      if(idx < offset + docResults.length){
        const d = docResults[idx - offset]
        if(d){ setView(v=>({...v,viewMode:'notes'})); onClose(); return }
      }
      offset += docResults.length
      if(idx < offset + habitResults.length){
        const h = habitResults[idx - offset]
        if(h){ setView(v=>({...v,viewMode:'habits'})); onClose(); return }
      }
      if(taskResults[0]) handleSelect(taskResults[0].id)
      else if(docResults[0]){ setView(v=>({...v,viewMode:'notes'})); onClose() }
      else if(habitResults[0]){ setView(v=>({...v,viewMode:'habits'})); onClose() }
      else if(filteredCommands[0]){ setView(v=>({...v,viewMode: filteredCommands[0].action})); onClose() }
    }
  }, [q, taskResults, docResults, habitResults, idx, setView, onClose, handleSelect, filteredCommands])

  if(!open) return null
  const activeId = (() => {
    if(idx < filteredCommands.length) return filteredCommands[idx]?.id
    let off = filteredCommands.length
    if(idx < off + taskResults.length) return `cmd-${taskResults[idx - off]?.id}`
    off += taskResults.length
    if(idx < off + docResults.length) return `cmd-doc-${docResults[idx - off]?.id}`
    off += docResults.length
    if(idx < off + habitResults.length) return `cmd-habit-${habitResults[idx - off]?.id}`
    return undefined
  })()
  return (
    <div role="dialog" aria-modal="true" aria-label="Command palette" style={{position:'fixed',inset:0,zIndex:90,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:'18vh'}}>
      <button type="button" onClick={onClose} aria-label="Close command palette" style={{position:'absolute',inset:0,background:'rgba(10,10,14,0.55)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'none'}} />
      <div ref={listRef} style={{position:'relative',background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'16px',width:'min(560px,92vw)',boxShadow:'var(--shadow-lg)',overflow:'hidden',animation:'slide-up 0.28s var(--ease-premium)'}}>
        <label htmlFor="cmd-input" className="sr-only">Command</label>
        <input id="cmd-input" ref={inputRef} placeholder="Search tasks or type an action…  (e.g., 'habits' 'focus')" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={onInputKey} style={{width:'100%',border:'none',borderBottom:'1px solid var(--border)',borderRadius:0,padding:'14px 16px',fontSize:'16px'}} aria-autocomplete="list" aria-controls="cmd-list" aria-activedescendant={activeId} />
        <ul id="cmd-list" role="listbox" aria-label="Results" style={{listStyle:'none',margin:0,padding:'6px',maxHeight:'320px',overflowY:'auto'}}>
          {filteredCommands.length > 0 && (
            <>
              <li style={{ padding: '6px 10px 4px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Commands</li>
              {filteredCommands.map((c,i)=>(
                <li key={c.id} role="option" aria-selected={i===idx}><button id={c.id} type="button" onClick={()=>{ setView(v=>({...v,viewMode:c.action})); onClose() }} onMouseEnter={()=>setIdx(i)} style={{width:'100%',textAlign:'left',padding:'8px 12px',borderRadius:'8px',display:'flex',justifyContent:'space-between',gap:'12px', background: i===idx? 'var(--accent-soft)':'transparent', fontSize:'13px'}} className="cmd-item"><span>{c.label}</span><span style={{color:'var(--text-muted)',fontSize:'11px'}}>↵</span></button></li>
              ))}
              {(taskResults.length>0 || docResults.length>0 || habitResults.length>0) && <li style={{ height: '1px', background: 'var(--border)', margin: '6px 0' }} aria-hidden="true" />}
            </>
          )}
          {taskResults.length>0 && (
            <>
              <li style={{ padding: '6px 10px 2px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Tasks {q.trim() && `· ${taskResults.length}`}</li>
              {taskResults.map((t,i)=>{
                const realIdx = i + filteredCommands.length
                return <li key={t.id} role="option" aria-selected={realIdx===idx}><button id={`cmd-${t.id}`} type="button" onClick={()=>handleSelect(t.id)} onMouseEnter={()=>setIdx(realIdx)} style={{width:'100%',textAlign:'left',padding:'8px 12px',borderRadius:'8px',display:'flex',justifyContent:'space-between',gap:'12px', background: realIdx===idx? 'var(--accent-soft)':'transparent'}} className="cmd-item"><span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.text.slice(0,60)}</span><span style={{color:'var(--text-muted)',fontSize:'12px',flexShrink:0}}>{projectNames[t.projectId] || t.projectId}</span></button></li>
              })}
            </>
          )}
          {docResults.length>0 && (
            <>
              <li style={{ padding: '6px 10px 2px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Notes</li>
              {docResults.map((d,i)=>{
                const realIdx = i + filteredCommands.length + taskResults.length
                return <li key={d.id} role="option" aria-selected={realIdx===idx}><button id={`cmd-doc-${d.id}`} type="button" onClick={()=>{ setView(v=>({...v,viewMode:'notes'})); onClose() }} onMouseEnter={()=>setIdx(realIdx)} style={{width:'100%',textAlign:'left',padding:'8px 12px',borderRadius:'8px',display:'flex',justifyContent:'space-between',gap:'12px', background: realIdx===idx? 'var(--accent-soft)':'transparent', fontSize:'13px'}} className="cmd-item"><span style={{flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📄 {d.title.slice(0,50)}</span><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Notes</span></button></li>
              })}
            </>
          )}
          {habitResults.length>0 && (
            <>
              <li style={{ padding: '6px 10px 2px', fontSize: '10px', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Habits</li>
              {habitResults.map((h,i)=>{
                const realIdx = i + filteredCommands.length + taskResults.length + docResults.length
                return <li key={h.id} role="option" aria-selected={realIdx===idx}><button id={`cmd-habit-${h.id}`} type="button" onClick={()=>{ setView(v=>({...v,viewMode:'habits'})); onClose() }} onMouseEnter={()=>setIdx(realIdx)} style={{width:'100%',textAlign:'left',padding:'8px 12px',borderRadius:'8px',display:'flex',justifyContent:'space-between',gap:'12px', background: realIdx===idx? 'var(--accent-soft)':'transparent', fontSize:'13px'}} className="cmd-item"><span>{h.icon} {h.name}</span><span style={{color:'var(--text-muted)',fontSize:'11px'}}>Habits</span></button></li>
              })}
            </>
          )}
          {taskResults.length===0 && docResults.length===0 && habitResults.length===0 && filteredCommands.length===0 && <li style={{padding:'18px',textAlign:'center',color:'var(--text-muted)'}} role="status">No matches — try `habits` `focus` `notes` `dashboard`</li>}
        </ul>
      </div>
    </div>
  )
}
