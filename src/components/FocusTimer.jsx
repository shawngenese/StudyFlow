import { useEffect, useRef, useState, useCallback } from 'react'

const PRESETS=[15,25,50]

export default function FocusTimer({ selectedTask, dispatch }){
  const [minutes,setMinutes]=useState(25)
  const [secs,setSecs]=useState(25*60)
  const [running,setRunning]=useState(false)
  const [completed,setCompleted]=useState(0)
  const raf=useRef(null)
  const startRef=useRef(null)

  const tick=useCallback(()=>{
    if(!running || !startRef.current) return
    const elapsed=Math.floor((Date.now()-startRef.current.startAt)/1000)
    const remaining=Math.max(0, startRef.current.total - elapsed)
    setSecs(remaining)
    if(remaining<=0){
      setRunning(false)
      setCompleted(c=>c+1)
      dispatch({type:'focus/addSession', session:{taskId:selectedTask?.id||null, duration:startRef.current.total/60, startedAt: startRef.current.startAt, completed:true}})
      try{ new Notification('Focus complete!',{body: selectedTask? selectedTask.text : 'Take a short break.'}) } catch{}
      if('vibrate' in navigator) try{ navigator.vibrate(200)}catch{}
    } else {
      raf.current=requestAnimationFrame(tick)
    }
  },[running, selectedTask, dispatch])

  useEffect(()=>{
    if(running){ raf.current=requestAnimationFrame(tick); return ()=>{ if(raf.current) cancelAnimationFrame(raf.current); raf.current=null }}
  },[running,tick])
  useEffect(()=>()=>{ if(raf.current) cancelAnimationFrame(raf.current) },[])

  useEffect(()=>{
    if(typeof window!=='undefined' && 'Notification' in window && Notification.permission==='default'){
      try{
        const r=Notification.requestPermission()
        if(r && typeof r.catch==='function') r.catch(()=>{})
      }catch{}
    }
  },[])

  function start(){
    if(running) return
    if(!startRef.current || secs===minutes*60){
      startRef.current={ startAt: Date.now(), total: minutes*60 }
    } else {
      startRef.current={ startAt: Date.now() - (minutes*60 - secs)*1000, total: startRef.current.total }
    }
    setRunning(true)
  }
  function pause(){ setRunning(false); if(raf.current){ cancelAnimationFrame(raf.current); raf.current=null } }
  function reset(m=minutes){ const v=Math.max(1,Math.min(180,m)); setRunning(false); if(raf.current){ cancelAnimationFrame(raf.current); raf.current=null } setSecs(v*60); startRef.current=null; setMinutes(v) }
  useEffect(()=>{
    function onVis(){ if(document.visibilityState==='hidden' && running) { /* pause tick, keep startRef */ if(raf.current){ cancelAnimationFrame(raf.current); raf.current=null } } else if(document.visibilityState==='visible' && running){ raf.current=requestAnimationFrame(tick) } }
    document.addEventListener('visibilitychange', onVis)
    return ()=> document.removeEventListener('visibilitychange', onVis)
  },[running, tick])

  const totalForPct=minutes*60 || 1
  const pct = Math.max(0, Math.min(100, Math.round((1 - secs/totalForPct)*100)))
  const mm=String(Math.floor(secs/60)).padStart(2,'0')
  const ss=String(secs%60).padStart(2,'0')

  const ringR=54, circ=2*Math.PI*ringR, offset= circ - (pct/100)*circ
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <header><h2 style={{fontSize:'18px'}}>Focus</h2><p className="todo-subtitle" style={{marginBottom:0}}>Pomodoro for studying. {selectedTask? `Focusing: ${selectedTask.text.slice(0,40)}` : 'Pick a task in List/Board or just focus.'}</p></header>
      <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'20px',padding:'28px',textAlign:'center', position:'relative'}}>
        <div style={{position:'relative', width:'140px', height:'140px', margin:'0 auto 12px'}}>
          <svg width="140" height="140" style={{transform:'rotate(-90deg)'}}><circle cx="70" cy="70" r={ringR} stroke="var(--bg-inset)" strokeWidth="7" fill="none"/><circle cx="70" cy="70" r={ringR} stroke="var(--accent)" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{transition:'stroke-dashoffset 0.5s linear'}} /></svg>
          <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px',fontWeight:750,letterSpacing:'-0.04em',fontVariantNumeric:'tabular-nums', fontFamily:'var(--font-display)'}}>{mm}:{ss}</div>
        </div>
        <div style={{height:'6px',background:'var(--bg-inset)',borderRadius:'999px',overflow:'hidden',margin:'12px 0', opacity:0.6}}>
          <div style={{width:`${pct}%`,height:'100%',background:'var(--accent)',transition:'width 0.5s linear'}} />
        </div>
        <div style={{display:'flex',gap:'6px',justifyContent:'center',marginBottom:'14px'}}>
          {PRESETS.map(p=> <button key={p} type="button" className={minutes===p?'is-active segmented':'segmented'} style={{padding:'6px 12px',borderRadius:'999px',border:'1px solid var(--border)',background: minutes===p?'var(--accent)':'var(--bg-inset)',color: minutes===p?'#fff':'var(--text)'}} onClick={()=>{setMinutes(p); reset(p)}}>{p}m</button>)}
        </div>
        <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
          {!running ? <button type="button" className="todo-add-btn" style={{padding:'10px 22px'}} onClick={start}>Start</button> : <button type="button" className="btn" style={{padding:'10px 22px'}} onClick={pause}>Pause</button>}
          <button type="button" className="btn" onClick={()=>reset()}>Reset</button>
        </div>
        <p className="muted" style={{marginTop:'10px'}}>{completed} sessions completed today</p>
      </div>
    </div>
  )
}
export function FocusDock({ running, secs }){
  if(!running) return null
  const mm=String(Math.floor(secs/60)).padStart(2,'0'); const ss=String(secs%60).padStart(2,'0')
  return <div style={{position:'fixed',bottom:'12px',right:'12px',background:'var(--text)',color:'var(--bg)',padding:'8px 14px',borderRadius:'999px',fontVariantNumeric:'tabular-nums',fontWeight:600,fontSize:'13px',boxShadow:'var(--shadow-md)',zIndex:50}}>{mm}:{ss} · focusing</div>
}
