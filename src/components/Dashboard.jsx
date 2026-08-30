import { useMemo, useState, useCallback } from 'react'
import { todayKey } from '../lib/date'
import { LIMITS } from '../lib/storage'
import { toast } from '../lib/toast'

export default function Dashboard({ data, dispatch }){
  const [goalInput,setGoalInput]=useState('')
  const stats=useMemo(()=>{
    const t=todayKey()
    const tasks=data.tasks
    const now=Date.now()
    let doneThisWeek=0, overdue=0
    for(const x of tasks){
      if(x.completed && x.updatedAt > now-7*86400000) doneThisWeek++
      if(!x.completed && x.dueDate && x.dueDate < t) overdue++
    }
    const focusMins=(data.focusSessions||[]).filter(s=> s.completed).reduce((a,s)=>a+(s.duration||0),0)
    const habitStreaks=(data.habits||[]).map(h=>{
      let n=0; let d=new Date(); for(let i=0;i<30;i++){ const k=todayKey(d); if(h.completions?.[k]) n++; else if(i>0) break; d=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1)} return n
    })
    const avgStreak= habitStreaks.length? Math.round(habitStreaks.reduce((a,b)=>a+b,0)/habitStreaks.length):0
    const byCourse={}
    for(const task of tasks){ if(!task.completed) byCourse[task.projectId]=(byCourse[task.projectId]||0)+1 }
    const todayDue = tasks.filter(x=>!x.completed && x.dueDate===t).length
    return { doneThisWeek, overdue, todayDue, focusMins, avgStreak, habitCount:(data.habits||[]).length, docCount:(data.docs||[]).length, goalCount:(data.goals||[]).length, byCourse, total:tasks.length }
  },[data])

  const chartData = useMemo(()=>{
    const days=[]
    const focusByDate={}
    const doneByDate={}
    for(const s of (data.focusSessions||[])){
      if(!s.completed || !Number.isFinite(s.startedAt)) continue
      const d=new Date(s.startedAt)
      const k=todayKey(d)
      focusByDate[k]=(focusByDate[k]||0)+ (Number(s.duration)||0)
    }
    for(const t of data.tasks){
      if(!t.completed || !Number.isFinite(t.updatedAt)) continue
      const k=todayKey(new Date(t.updatedAt))
      doneByDate[k]=(doneByDate[k]||0)+1
    }
    for(let i=13;i>=0;i--){
      const d=new Date()
      d.setHours(12,0,0,0)
      d.setDate(d.getDate()-i)
      const k=todayKey(d)
      const label=d.toLocaleDateString('en-US',{month:'short', day:'numeric'})
      const short=d.toLocaleDateString('en-US',{weekday:'short'}).slice(0,1)
      days.push({ k, label, short, focus: Math.round(focusByDate[k]||0), done: doneByDate[k]||0 })
    }
    const maxFocus=Math.max(1, ...days.map(d=>d.focus))
    const maxDone=Math.max(1, ...days.map(d=>d.done))
    return { days, maxFocus, maxDone }
  }, [data])

  const Card=({label,value,sub})=>(
    <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'16px',minWidth:0}}>
      <div style={{color:'var(--text-muted)',fontSize:'11px',fontWeight:600,letterSpacing:'0.07em',textTransform:'uppercase'}}>{label}</div>
      <div style={{fontSize:'22px',fontWeight:700,marginTop:'4px'}}>{value}</div>
      {sub && <div className="muted" style={{marginTop:'2px'}}>{sub}</div>}
    </div>
  )

  const handleGoalAdd = useCallback((e)=>{
    e.preventDefault()
    const t=goalInput.trim()
    if(!t) return
    if(t.length > LIMITS.GOAL_TITLE){ toast(`Goal too long (max ${LIMITS.GOAL_TITLE})`,'error'); return }
    if((data.goals||[]).length >= 100){ toast('Max goals reached','error'); return }
    dispatch({type:'goal/add', title:t})
    setGoalInput('')
  }, [goalInput, dispatch, data.goals])

  const handleGoalDelete = useCallback((id, title)=>{
    dispatch({type:'goal/delete', id})
    toast(`Deleted goal "${title.slice(0,30)}"`, 'info', { label: 'Undo', onClick: ()=> dispatch({type:'undo'}) })
  }, [dispatch])

  const todayDueDisplay = `${stats.todayDue} due`

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <header><h2 style={{fontSize:'18px'}}>Dashboard</h2><p className="todo-subtitle" style={{marginBottom:0}}>Your study pulse — tasks, habits, focus. Offline-ready • local-first.</p></header>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))',gap:'12px'}}>
        <Card label="Today" value={todayDueDisplay} sub={`${stats.overdue} overdue`} />
        <Card label="Completed" value={stats.doneThisWeek} sub="last 7 days" />
        <Card label="Focus" value={`${Math.round(stats.focusMins)}m`} sub={`${(data.focusSessions||[]).length} sessions`} />
        <Card label="Habits" value={stats.habitCount} sub={`${stats.avgStreak}d avg streak`} />
        <Card label="Notes" value={stats.docCount} sub={`${stats.goalCount} goals`} />
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))',gap:'12px'}}>
        <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'14px'}}>
          <h3 style={{fontSize:'12px',marginBottom:'10px',color:'var(--text-muted)',letterSpacing:'0.07em',textTransform:'uppercase'}}>Focus — last 14 days (min)</h3>
          <div style={{display:'flex',alignItems:'end',gap:'4px',height:'80px'}}>
            {chartData.days.map(d=>(
              <div key={d.k} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                <div title={`${d.label}: ${d.focus}m`} style={{width:'100%', height:`${Math.max(4, (d.focus/chartData.maxFocus)*60)}px`, background: d.focus? 'var(--accent)' : 'var(--bg-inset)', borderRadius:'4px', transition:'height 0.3s ease'}} />
                <span style={{fontSize:'9px', color:'var(--text-muted)'}}>{d.short}</span>
              </div>
            ))}
          </div>
          <div className="muted" style={{marginTop:'6px', fontSize:'11px'}}>{chartData.days.reduce((a,b)=>a+b.focus,0)}m total · max {chartData.maxFocus}m</div>
        </div>
        <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'14px'}}>
          <h3 style={{fontSize:'12px',marginBottom:'10px',color:'var(--text-muted)',letterSpacing:'0.07em',textTransform:'uppercase'}}>Completed — last 14 days</h3>
          <div style={{display:'flex',alignItems:'end',gap:'4px',height:'80px'}}>
            {chartData.days.map(d=>(
              <div key={d.k} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px'}}>
                <div title={`${d.label}: ${d.done} done`} style={{width:'100%', height:`${Math.max(4, (d.done/chartData.maxDone)*60)}px`, background: d.done? 'var(--success)' : 'var(--bg-inset)', borderRadius:'4px', transition:'height 0.3s ease'}} />
                <span style={{fontSize:'9px', color:'var(--text-muted)'}}>{d.short}</span>
              </div>
            ))}
          </div>
          <div className="muted" style={{marginTop:'6px', fontSize:'11px'}}>{chartData.days.reduce((a,b)=>a+b.done,0)} completed · max {chartData.maxDone}</div>
        </div>
      </div>
      <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'16px'}}>
        <h3 style={{fontSize:'13px',marginBottom:'10px'}}>Tasks by course</h3>
        {Object.keys(stats.byCourse).length===0 ? <p className="muted">No active tasks — enjoy the calm.</p> : (
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {Object.entries(stats.byCourse).map(([pid,count])=>{
              const proj=data.projects.find(p=>p.id===pid)
              const max=Math.max(...Object.values(stats.byCourse))
              return (
                <div key={pid} style={{display:'flex',alignItems:'center',gap:'10px',minWidth:0}}>
                  <span style={{width:'90px',flexShrink:0,fontSize:'13px',fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{proj?.name || pid}</span>
                  <div style={{flex:1,minWidth:0,height:'8px',background:'var(--bg-inset)',borderRadius:'999px',overflow:'hidden'}}><div style={{width:`${(count/max)*100}%`,height:'100%',background:'var(--accent)'}} /></div>
                  <span style={{fontSize:'12px',color:'var(--text-muted)',width:'24px',textAlign:'right',flexShrink:0}}>{count}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'16px'}}>
        <h3 style={{fontSize:'13px',marginBottom:'10px'}}>Goals</h3>
        {data.goals?.length>0 ? <ul style={{margin:0,paddingLeft:'18px',marginBottom:'10px'}}>{data.goals.map(g=> <li key={g.id} style={{marginBottom:'4px',display:'flex',justifyContent:'space-between',gap:'8px',minWidth:0}}><span style={{flex:1,minWidth:0,overflowWrap:'anywhere'}}>{g.title} {g.targetDate && <span className="muted">· due {g.targetDate}</span>}</span><button type="button" onClick={()=>handleGoalDelete(g.id, g.title)} style={{color:'var(--text-muted)',flexShrink:0}} aria-label={`Delete goal ${g.title}`}>×</button></li>)}</ul> : <p className="muted">No goals yet — set a semester target.</p>}
        <form onSubmit={handleGoalAdd} style={{display:'flex',gap:'8px',marginTop:'8px'}}>
          <label htmlFor="goal-input" className="sr-only">New goal</label>
          <input id="goal-input" value={goalInput} onChange={e=>setGoalInput(e.target.value)} placeholder="New goal — e.g., Ace finals" style={{flex:1}} maxLength={LIMITS.GOAL_TITLE} aria-label="New goal" />
          <button type="submit" className="todo-add-btn" disabled={!goalInput.trim()}>Add</button>
        </form>
      </div>
    </div>
  )
}
