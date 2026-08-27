import { useMemo, useState } from 'react'
import { todayKey } from '../lib/date'

export default function Dashboard({ data, dispatch }){
  const [goalInput,setGoalInput]=useState('')
  const stats=useMemo(()=>{
    const t=todayKey()
    const tasks=data.tasks
    const doneThisWeek=tasks.filter(x=> x.completed && x.updatedAt > Date.now()-7*86400000).length
    const overdue=tasks.filter(x=> !x.completed && x.dueDate && x.dueDate < t).length
    const todayDone=tasks.filter(x=> x.dueDate===t).length
    const focusMins=(data.focusSessions||[]).filter(s=> s.completed).reduce((a,s)=>a+(s.duration||0),0)
    const habitStreaks=(data.habits||[]).map(h=>{
      let n=0; let d=new Date(); for(let i=0;i<30;i++){ const k=todayKey(d); if(h.completions?.[k]) n++; else if(i>0) break; d=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1)} return n
    })
    const avgStreak= habitStreaks.length? Math.round(habitStreaks.reduce((a,b)=>a+b,0)/habitStreaks.length):0
    const byCourse={}
    for(const task of tasks){ if(!task.completed) byCourse[task.projectId]=(byCourse[task.projectId]||0)+1 }
    return { doneThisWeek, overdue, todayDone, focusMins, avgStreak, habitCount:(data.habits||[]).length, docCount:(data.docs||[]).length, goalCount:(data.goals||[]).length, byCourse, total:tasks.length }
  },[data])

  const Card=({label,value,sub})=>(
    <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'16px',flex:'1 1 120px'}}>
      <div style={{color:'var(--text-muted)',fontSize:'11px',fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:'22px',fontWeight:700,marginTop:'4px'}}>{value}</div>
      {sub && <div className="muted" style={{marginTop:'2px'}}>{sub}</div>}
    </div>
  )
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <header><h2 style={{fontSize:'18px'}}>Dashboard</h2><p className="todo-subtitle" style={{marginBottom:0}}>Your study pulse — tasks, habits, focus.</p></header>
      <div style={{display:'flex',gap:'12px',flexWrap:'wrap'}}>
        <Card label="Today" value={`${data.tasks.filter(x=>!x.completed && x.dueDate===todayKey()).length} due`} sub={`${stats.overdue} overdue`} />
        <Card label="Completed" value={stats.doneThisWeek} sub="last 7 days" />
        <Card label="Focus" value={`${Math.round(stats.focusMins)}m`} sub={`${(data.focusSessions||[]).length} sessions`} />
        <Card label="Habits" value={stats.habitCount} sub={`${stats.avgStreak}d avg streak`} />
        <Card label="Notes" value={stats.docCount} sub={`${stats.goalCount} goals`} />
      </div>
      <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'16px'}}>
        <h3 style={{fontSize:'13px',marginBottom:'10px'}}>Tasks by course</h3>
        {Object.keys(stats.byCourse).length===0 ? <p className="muted">No active tasks — enjoy the calm.</p> : (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {Object.entries(stats.byCourse).map(([pid,count])=>{
              const proj=data.projects.find(p=>p.id===pid)
              const max=Math.max(...Object.values(stats.byCourse))
              return (
                <div key={pid} style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <span style={{width:'120px',fontSize:'13px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{proj?.name || pid}</span>
                  <div style={{flex:1,height:'8px',background:'var(--bg-inset)',borderRadius:'999px',overflow:'hidden'}}><div style={{width:`${(count/max)*100}%`,height:'100%',background:'var(--accent)'}} /></div>
                  <span style={{fontSize:'12px',color:'var(--text-muted)',width:'24px',textAlign:'right'}}>{count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'16px'}}>
        <h3 style={{fontSize:'13px',marginBottom:'10px'}}>Goals</h3>
        {data.goals?.length>0 ? <ul style={{margin:0,paddingLeft:'18px',marginBottom:'10px'}}>{data.goals.map(g=> <li key={g.id} style={{marginBottom:'4px',display:'flex',justifyContent:'space-between'}}><span>{g.title} {g.targetDate && <span className="muted">· due {g.targetDate}</span>}</span><button type="button" onClick={()=>dispatch({type:'goal/delete', id:g.id})} style={{color:'var(--text-muted)'}}>×</button></li>)}</ul> : <p className="muted">No goals yet — set a semester target.</p>}
        <form onSubmit={e=>{e.preventDefault(); if(!goalInput.trim()) return; dispatch({type:'goal/add', title:goalInput.trim()}); setGoalInput('')}} style={{display:'flex',gap:'8px',marginTop:'8px'}}>
          <input value={goalInput} onChange={e=>setGoalInput(e.target.value)} placeholder="New goal — e.g., Ace finals" style={{flex:1}} maxLength={60} />
          <button type="submit" className="todo-add-btn" disabled={!goalInput.trim()}>Add</button>
        </form>
      </div>
    </div>
  )
}
