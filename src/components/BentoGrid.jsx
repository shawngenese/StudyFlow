import { useEffect, useMemo, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { todayKey } from '../lib/date'
import { getBentoOrder, saveBentoOrder, DEFAULT_ORDER } from '../lib/bento'
import Tile from './bento/Tile'

export default function BentoGrid({ data, dispatch, visibleTasks, onSelect, setView }){
  const [order,setOrder]=useState(()=> getBentoOrder())
  const [isEditing,setIsEditing]=useState(false)
  const [heroReorder,setHeroReorder]=useState(false)

  const sensors=useSensors(
    useSensor(PointerSensor,{activationConstraint:{distance:8}}),
    useSensor(TouchSensor,{activationConstraint:{delay:200,tolerance:6}}),
    useSensor(KeyboardSensor,{coordinateGetter: sortableKeyboardCoordinates})
  )
  const heroSensors=useSensors(
    useSensor(PointerSensor,{activationConstraint:{distance:4}}),
    useSensor(TouchSensor,{activationConstraint:{delay:150,tolerance:5}}),
    useSensor(KeyboardSensor,{coordinateGetter: sortableKeyboardCoordinates})
  )

  useEffect(()=>{ if(isEditing) saveBentoOrder(order)},[order,isEditing])

  useEffect(()=>{
    function onEsc(e){ if(e.key==='Escape'){ setIsEditing(false); setHeroReorder(false)}}
    window.addEventListener('keydown', onEsc)
    return ()=>window.removeEventListener('keydown', onEsc)
  },[])

  function handleTileDragEnd(e){
    const {active,over}=e
    if(!over || active.id===over.id) return
    const o=[...order]
    const from=o.indexOf(active.id)
    const to=o.indexOf(over.id)
    if(from===-1||to===-1) return
    const next=arrayMove(o,from,to)
    setOrder(next); saveBentoOrder(next)
  }

  function handleHeroTaskDragEnd(e){
    const {active,over}=e
    if(!over || active.id===over.id) return
    const ids=visibleTasks.slice(0,5).map(t=>t.id)
    const from=ids.indexOf(active.id)
    const to=ids.indexOf(over.id)
    if(from===-1||to===-1) return
    const ordered=arrayMove(ids, from, to)
    dispatch({type:'task/reorderMany', ids: ordered})
  }

  const stats=useMemo(()=>{
    const t=todayKey()
    const focusMins=(data.focusSessions||[]).filter(s=>s.completed).reduce((a,s)=>a+(s.duration||0),0)
    const habitStreaks=(data.habits||[]).map(h=>{
      let n=0; let d=new Date(); for(let i=0;i<30;i++){ const k=todayKey(d); if(h.completions?.[k]) n++; else if(i>0) break; d=new Date(d.getFullYear(),d.getMonth(),d.getDate()-1)} return n
    })
    const avgStreak=habitStreaks.length? Math.round(habitStreaks.reduce((a,b)=>a+b,0)/habitStreaks.length):0
    const byCourse={}
    for(const task of data.tasks){ if(!task.completed) byCourse[task.projectId]=(byCourse[task.projectId]||0)+1 }
    return {overdue:data.tasks.filter(x=>!x.completed&&x.dueDate&&x.dueDate<t).length, focusMins, avgStreak, byCourse}
  },[data])

  const heroTasks=visibleTasks.slice(0,5)

  const tileMap={
    hero: (
      <Tile key="hero" id="hero" className="tile-hero" isEditing={isEditing}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px',gap:'8px',flexWrap:'wrap'}}>
          <h3 style={{fontSize:'15px',flexShrink:0}}>Today focus</h3>
            <span className="muted" style={{fontSize:'12px',textAlign:'right',minWidth:0}}>{visibleTasks.filter(t=>!t.completed).length} tasks · {new Date().toLocaleDateString('en-US',{weekday:'short', month:'short', day:'numeric'})}</span>
        </div>
        {heroTasks.length===0 ? <p className="muted">No tasks — add one below or in List.</p> : (
          <DndContext sensors={heroSensors} collisionDetection={closestCenter} onDragEnd={handleHeroTaskDragEnd}>
            <SortableContext items={heroTasks.map(t=>t.id)} strategy={rectSortingStrategy}>
              <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:'6px'}}>
                {heroTasks.map(t=>(
                  <li key={t.id} className="hero-task-row" style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',background:'var(--bg-inset)',borderRadius:'10px',minWidth:0}}>
                    <input type="checkbox" checked={t.completed} onChange={()=>dispatch({type:'task/toggle',id:t.id})} style={{accentColor:'var(--success)',flexShrink:0}} />
                    <span onClick={()=>onSelect(t.id)} style={{flex:1,cursor:'pointer',fontWeight:500, minWidth:0, overflowWrap:'anywhere', wordBreak:'break-word', textDecoration: t.completed?'line-through':'none'}}>{t.text.slice(0,60)}</span>
                    {heroReorder && <span style={{color:'var(--text-muted)',fontSize:'10px',flexShrink:0}}>drag</span>}
                  </li>
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        )}
        <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
          <button type="button" className="btn btn-ghost" style={{fontSize:'12px'}} onClick={()=>setView(v=>({...v,viewMode:'list'}))}>Open List →</button>
          <button type="button" className="btn btn-ghost" style={{fontSize:'12px', marginLeft:'auto'}} onClick={()=>setHeroReorder(v=>!v)}>{heroReorder?'Done':'Reorder tasks'}</button>
        </div>
      </Tile>
    ),
    stats: (
      <Tile key="stats" id="stats" className="tile-stats" isEditing={isEditing}>
        <h3 style={{fontSize:'13px',marginBottom:'10px'}}>Pulse</h3>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          <div><div className="muted" style={{fontSize:'10px',textTransform:'uppercase'}}>Today</div><div className="stat-value" style={{fontSize:'20px',fontWeight:700}}>{data.tasks.filter(x=>!x.completed&&x.dueDate===todayKey()).length}</div></div>
          <div><div className="muted" style={{fontSize:'10px',textTransform:'uppercase'}}>Overdue</div><div className="stat-value" style={{fontSize:'20px',fontWeight:700,color:stats.overdue?'var(--danger)':'inherit'}}>{stats.overdue}</div></div>
          <div><div className="muted" style={{fontSize:'10px',textTransform:'uppercase'}}>Focus</div><div className="stat-value" style={{fontSize:'20px',fontWeight:700}}>{Math.round(stats.focusMins)}m</div></div>
          <div><div className="muted" style={{fontSize:'10px',textTransform:'uppercase'}}>Streak</div><div className="stat-value" style={{fontSize:'20px',fontWeight:700}}>{stats.avgStreak}d</div></div>
        </div>
      </Tile>
    ),
    focus: (
      <Tile key="focus" id="focus" className="tile-focus" isEditing={isEditing}>
        <h3 style={{fontSize:'13px',marginBottom:'4px'}}>Focus</h3>
        <p className="muted" style={{margin:'0 0 8px'}}>Quick 25m session</p>
        <button type="button" className="todo-add-btn" style={{width:'100%'}} onClick={()=>setView(v=>({...v,viewMode:'focus'}))}>Start focus →</button>
        <div className="muted" style={{marginTop:'8px',textAlign:'center'}}>{(data.focusSessions||[]).length} sessions</div>
      </Tile>
    ),
    habits: (
      <Tile key="habits" id="habits" className="tile-habits" isEditing={isEditing}>
        <div style={{display:'flex',justifyContent:'space-between'}}><h3 style={{fontSize:'13px'}}>Habits</h3><button type="button" className="btn btn-ghost" style={{fontSize:'11px'}} onClick={()=>setView(v=>({...v,viewMode:'habits'}))}>Open</button></div>
        {(data.habits||[]).length===0 ? <p className="muted">No habits yet</p> : (
          <div style={{display:'flex',flexDirection:'column',gap:'6px',marginTop:'8px'}}>
            {(data.habits||[]).slice(0,3).map(h=>(
              <div key={h.id} className="habit-row" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'8px',padding:'6px 8px',background:'var(--bg-inset)',borderRadius:'8px',minWidth:0}}>
                <span style={{fontSize:'13px',fontWeight:500,flex:1,minWidth:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{h.icon} {h.name}</span>
                <button type="button" className={h.completions?.[todayKey()] ? 'btn' : 'todo-add-btn'} style={{fontSize:'11px',padding:'4px 10px',flexShrink:0,whiteSpace:'nowrap'}} onClick={()=>dispatch({type:'habit/toggle', id:h.id, date:todayKey()})}>{h.completions?.[todayKey()]?'Done':'Do'}</button>
              </div>
            ))}
          </div>
        )}
      </Tile>
    ),
    cal: (
      <Tile key="cal" id="cal" className="tile-cal" isEditing={isEditing}>
        <div style={{display:'flex',justifyContent:'space-between'}}><h3 style={{fontSize:'13px'}}>This week</h3><button type="button" className="btn btn-ghost" style={{fontSize:'11px'}} onClick={()=>setView(v=>({...v,viewMode:'calendar'}))}>Calendar →</button></div>
        <div className="cal-week-grid" style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:'6px',marginTop:'10px',textAlign:'center'}}>
          {[...Array(7)].map((_,i)=>{
            const d=new Date(Date.now() - (3-i)*86400000)
            const k=todayKey(d)
            const count=(data.tasks||[]).filter(t=>t.dueDate===k && !t.completed).length
            const isToday=k===todayKey()
            return <div key={k} style={{padding:'8px 4px',borderRadius:'10px',background:isToday?'var(--accent-soft)': 'var(--bg-inset)', border: isToday?'1px solid var(--accent-border)':'1px solid transparent'}}>
              <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{d.toLocaleDateString('en-US',{weekday:'short'})}</div>
              <div style={{fontWeight:700}}>{d.getDate()}</div>
              <div style={{fontSize:'11px',color:count?'var(--accent)':'var(--text-muted)'}}>{count? `${count} tasks`: '—'}</div>
            </div>
          })}
        </div>
      </Tile>
    ),
    courses: (
      <Tile key="courses" id="courses" className="tile-courses" isEditing={isEditing}>
        <h3 style={{fontSize:'13px',marginBottom:'8px'}}>Courses & Goals</h3>
        {Object.keys(stats.byCourse).length===0 ? <p className="muted">No active tasks</p> : (
          <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
            {Object.entries(stats.byCourse).slice(0,4).map(([pid,c])=>{
              const proj=data.projects.find(p=>p.id===pid); const max=Math.max(...Object.values(stats.byCourse))
              return <div key={pid} className="course-row" style={{display:'flex',alignItems:'center',gap:'8px',minWidth:0}}><span style={{width:'90px',flexShrink:0,fontSize:'12px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj?.name||pid}</span><div style={{flex:1,minWidth:0,height:'6px',background:'var(--bg-inset)',borderRadius:'999px',overflow:'hidden'}}><div style={{width:`${(c/max)*100}%`,height:'100%',background:'var(--accent)'}}/></div><span style={{fontSize:'11px',color:'var(--text-muted)',flexShrink:0}}>{c}</span></div>
            })}
          </div>
        )}
        <div style={{marginTop:'10px',borderTop:'1px solid var(--border)',paddingTop:'10px'}}>
          <div style={{fontSize:'12px',fontWeight:600,marginBottom:'6px'}}>Goals · {(data.goals||[]).length}</div>
          {(data.goals||[]).slice(0,2).map(g=> <div key={g.id} style={{fontSize:'12px',marginBottom:'4px'}}>• {g.title}</div>)}
          <button type="button" className="btn btn-ghost" style={{fontSize:'11px',marginTop:'4px'}} onClick={()=>setView(v=>({...v,viewMode:'dashboard'}))}>Manage goals in dashboard drill →</button>
        </div>
      </Tile>
    ),
  }

  const orderedTiles=order.map(id=> tileMap[id]).filter(Boolean)

  return (
    <>
      <div style={{gridColumn:'span 12',display:'flex',justifyContent:'flex-end'}}>
        <button type="button" className={isEditing?'todo-add-btn':'btn'} style={{fontSize:'12px'}} onClick={()=>setIsEditing(v=>!v)}>{isEditing?'Done':'Edit layout'}</button>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTileDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className={`bento-dashboard ${isEditing?'is-editing':''}`} style={{display:'contents'}}>
            {orderedTiles}
          </div>
        </SortableContext>
      </DndContext>
    </>
  )
}
