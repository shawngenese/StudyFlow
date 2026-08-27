import { useEffect, useState, useMemo } from 'react'

export default function CommandPalette({ open, onClose, tasks, onSelect, dispatch, setView }) {
  const [q, setQ] = useState('')
  useEffect(()=>{ if(open) setQ('') },[open])
  useEffect(()=>{
    if(!open) return
    function onKey(e){ if(e.key==='Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return ()=>window.removeEventListener('keydown', onKey)
  },[open,onClose])
  const results = useMemo(()=>{
    if(!q.trim()) return tasks.slice(0,8)
    const qq = q.toLowerCase()
    return tasks.filter(t=> t.text.toLowerCase().includes(qq) || t.tags.some(tag=>tag.includes(qq))).slice(0,8)
  },[q,tasks])
  if(!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label="Command palette" style={{position:'fixed',inset:0,zIndex:90,display:'flex',alignItems:'flex-start',justifyContent:'center',paddingTop:'18vh'}}>
      <button type="button" onClick={onClose} aria-label="Close" style={{position:'absolute',inset:0,background:'rgba(10,10,14,0.55)',backdropFilter:'blur(10px)',WebkitBackdropFilter:'blur(10px)',border:'none'}} />
      <div style={{position:'relative',background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'16px',width:'min(560px,92vw)',boxShadow:'var(--shadow-lg)',overflow:'hidden',animation:'slide-up 0.28s var(--ease-premium)'}}>
        <input autoFocus placeholder="Search tasks or type an action…  (e.g., 'habits' 'focus')" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{
          if(e.key==='Enter'){
            const cmd=q.trim().toLowerCase()
            if(['habits','focus','notes','dashboard','board','calendar','list'].includes(cmd)){
              setView(v=>({...v,viewMode: cmd==='dashboard'?'dashboard':cmd})); onClose(); return
            }
            if(results[0]){ onSelect(results[0].id); onClose() }
          }
        }} style={{width:'100%',border:'none',borderBottom:'1px solid var(--border)',borderRadius:0,padding:'14px 16px',fontSize:'15px'}} />
        <ul style={{listStyle:'none',margin:0,padding:'6px',maxHeight:'280px',overflowY:'auto'}}>
          {results.map(t=>(
            <li key={t.id}><button type="button" onClick={()=>{onSelect(t.id); onClose()}} style={{width:'100%',textAlign:'left',padding:'10px 12px',borderRadius:'8px',display:'flex',justifyContent:'space-between'}} className="cmd-item"><span>{t.text.slice(0,60)}</span><span style={{color:'var(--text-muted)',fontSize:'12px'}}>{t.projectId}</span></button></li>
          ))}
          {results.length===0 && <li style={{padding:'18px',textAlign:'center',color:'var(--text-muted)'}}>No matches — try `habits` `focus` `notes` `dashboard`</li>}
        </ul>
      </div>
    </div>
  )
}
