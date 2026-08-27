import { useState } from 'react'
import { todayKey } from '../lib/date'

function streakCount(completions){
  let n=0
  let d=new Date()
  for(let i=0;i<60;i++){
    const k=todayKey(d)
    if(completions[k]) n++; else if(i>0) break
    d=new Date(d.getFullYear(), d.getMonth(), d.getDate()-1)
  }
  return n
}

export default function HabitTracker({ habits, dispatch }){
  const [name,setName]=useState('')
  const today=todayKey()
  // week header last 7 days
  const days=[...Array(7)].map((_,i)=>{
    const d=new Date(Date.now() - (6-i)*86400000)
    return todayKey(d)
  })
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <header><h2 style={{fontSize:'18px'}}>Habits & rituals</h2><p className="todo-subtitle" style={{marginBottom:0}}>Small daily wins for student life. Tap to check today.</p></header>
      <form onSubmit={e=>{e.preventDefault(); if(!name.trim()) return; dispatch({type:'habit/add', name:name.trim()}); setName('')}} style={{display:'flex',gap:'8px'}}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="New habit — e.g., Review notes" maxLength={40} style={{flex:1}} />
        <button type="submit" className="todo-add-btn" disabled={!name.trim()}>Add</button>
      </form>
      {habits.length===0 && <p className="muted">No habits yet. Add one above — try "Read 20m" or "Sleep before 11pm".</p>}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {habits.map(h=>{
          const streak=streakCount(h.completions||{})
          return (
            <div key={h.id} style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'12px 14px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
                <div style={{fontWeight:600, minWidth:0, flex:'1 1 160px'}}>{h.icon} {h.name} {streak>=3 && <span style={{color:'var(--accent)',fontSize:'12px'}}>🔥 {streak}d streak</span>}</div>
                <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                  <button type="button" onClick={()=>dispatch({type:'habit/toggle', id:h.id, date:today})} style={{minWidth:'78px'}} className={h.completions?.[today] ? 'btn':'todo-add-btn'}>{h.completions?.[today]?'Done ✓':'Do today'}</button>
                  <button type="button" aria-label={`Delete ${h.name}`} onClick={()=>dispatch({type:'habit/delete', id:h.id})} style={{color:'var(--text-muted)'}}>×</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:'6px'}}>
                {days.map(k=>{
                  const done=!!h.completions?.[k]
                  const isToday=k===today
                  const dayNum=k.slice(8)
                  const weekday=new Date(k+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}).slice(0,1)
                  return <div key={k} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}} title={k}>
                    <span style={{fontSize:'9px',color:'var(--text-muted)',lineHeight:1}}>{weekday}</span>
                    <span style={{width:'32px',height:'32px',borderRadius:'999px',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:600,background: done?'var(--success-soft)': isToday?'var(--bg-inset)':'transparent',border:`1px solid ${done?'var(--success)': isToday?'var(--border-strong)':'var(--border)'}`,color:done?'var(--success)':'var(--text-muted)'}}>{dayNum}</span>
                  </div>
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
