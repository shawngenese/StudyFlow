import { useState, useCallback, useMemo } from 'react'
import { todayKey } from '../lib/date'
import { EmptyState } from './EmptyState'
import { LIMITS } from '../lib/storage'
import { toast } from '../lib/toast'

function streakCount(completions){
  let n=0
  let d=new Date()
  d.setHours(12,0,0,0)
  for(let i=0;i<60;i++){
    const k=todayKey(d)
    if(completions[k]) n++; else if(i>0) break
    d=new Date(d.getFullYear(), d.getMonth(), d.getDate()-1)
    d.setHours(12,0,0,0)
  }
  return n
}

export default function HabitTracker({ habits, dispatch }){
  const [name,setName]=useState('')
  const today=todayKey()
  const days=useMemo(()=>[...Array(7)].map((_,i)=>{
    const d=new Date()
    d.setHours(12,0,0,0)
    d.setDate(d.getDate() - (6-i))
    return todayKey(d)
  }), [])

  const handleAdd = useCallback((e)=>{
    e.preventDefault()
    const n=name.trim()
    if(!n) return
    if(n.length> LIMITS.HABIT_NAME){ toast(`Habit name too long (max ${LIMITS.HABIT_NAME})`,'error'); return }
    if(habits.some(h=>h.name.toLowerCase()===n.toLowerCase())){ toast('Habit already exists','error'); return }
    dispatch({type:'habit/add', name: n})
    setName('')
  }, [name, habits, dispatch])

  const handleDelete = useCallback((h)=>{
    dispatch({type:'habit/delete', id:h.id})
    toast(`Deleted habit "${h.name}"`, 'info', { label: 'Undo', onClick: ()=> dispatch({type:'undo'}) })
  }, [dispatch])

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <header><h2 style={{fontSize:'18px'}}>Habits & rituals</h2><p className="todo-subtitle" style={{marginBottom:0}}>Small daily wins for student life. Tap to check today.</p></header>
      <form onSubmit={handleAdd} style={{display:'flex',gap:'8px'}}>
        <label htmlFor="habit-input" className="sr-only">New habit</label>
        <input id="habit-input" value={name} onChange={e=>setName(e.target.value)} placeholder="New habit — e.g., Review notes" maxLength={LIMITS.HABIT_NAME} style={{flex:1}} aria-label="New habit name" />
        <button type="submit" className="todo-add-btn" disabled={!name.trim()}>Add</button>
      </form>
      {habits.length===0 && <EmptyState message="No habits yet. Add one above — try &ldquo;Read 20m&rdquo;." iconSize={28} compact />}
      <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
        {habits.map(h=>{
          const streak=streakCount(h.completions||{})
          const doneToday = !!h.completions?.[today]
          return (
            <div key={h.id} style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'12px 14px',display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'12px',flexWrap:'wrap'}}>
                <div style={{fontWeight:600, minWidth:0, flex:'1 1 160px'}}>{h.icon} {h.name} {streak>=3 && <span style={{color:'var(--accent)',fontSize:'12px'}}>🔥 {streak}d streak</span>}</div>
                <div style={{display:'flex',gap:'8px',alignItems:'center',flexShrink:0}}>
                  <button type="button" onClick={()=>dispatch({type:'habit/toggle', id:h.id, date:today})} style={{minWidth:'78px'}} className={doneToday ? 'btn':'todo-add-btn'} aria-pressed={doneToday} aria-label={`${doneToday?'Undo': 'Complete'} habit ${h.name} for today`}>{doneToday?'Done ✓':'Do today'}</button>
                  <button type="button" aria-label={`Delete habit ${h.name}`} onClick={()=>handleDelete(h)} style={{color:'var(--text-muted)'}}>×</button>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(7, 1fr)',gap:'6px'}} role="group" aria-label={`${h.name} weekly progress`}>
                {days.map(k=>{
                  const done=!!h.completions?.[k]
                  const isToday=k===today
                  const dayNum=k.slice(8)
                  const weekday=new Date(k+'T12:00:00').toLocaleDateString(undefined,{weekday:'short'}).slice(0,1)
                  return <div key={k} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'2px'}} title={k} role="img" aria-label={`${k} ${done?'completed':''} ${isToday?'(today)':''}`}>
                    <span style={{fontSize:'9px',color:'var(--text-muted)',lineHeight:1}} aria-hidden="true">{weekday}</span>
                    <span style={{width:'32px',height:'32px',borderRadius:'999px',display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:600,background: done?'var(--success-soft)': isToday?'var(--bg-inset)':'transparent',border:`1px solid ${done?'var(--success)': isToday?'var(--border-strong)':'var(--border)'}`,color:done?'var(--success)':'var(--text-muted)'}} aria-hidden="true">{dayNum}</span>
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
