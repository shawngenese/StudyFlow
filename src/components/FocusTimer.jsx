import { useEffect, useRef, useState, useCallback } from 'react'

const PRESETS=[15,25,50]
const FOCUS_KEY='shawn-focus-v1'

export default function FocusTimer({ selectedTask, dispatch, focusSessions }){
  const [minutes,setMinutes]=useState(()=>{
    try{
      const raw=localStorage.getItem(FOCUS_KEY)
      if(raw){
        const p=JSON.parse(raw)
        if(Number.isFinite(p?.minutes) && p.minutes>=1 && p.minutes<=180) return Math.round(p.minutes)
      }
    }catch{/* ignore */}
    return 25
  })
  const [secs,setSecs]=useState(()=>{
    try{
      const raw=localStorage.getItem(FOCUS_KEY)
      if(raw){
        const p=JSON.parse(raw)
        if(p?.running && Number.isFinite(p?.startAt) && Number.isFinite(p?.total)){
          const elapsed=Math.floor((Date.now()-p.startAt)/1000)
          const rem=Math.max(0, p.total - elapsed)
          if(rem>0) return rem
        }
        if(!p?.running && Number.isFinite(p?.secs) && Number.isFinite(p?.total)){
          // paused state
          const s=Math.max(0, Math.min(p.total, p.secs))
          if(s>0 && s<=180*60) return s
        }
      }
    }catch{/* ignore */}
    return 25*60
  })
  const [running,setRunning]=useState(()=>{
    try{
      const raw=localStorage.getItem(FOCUS_KEY)
      if(raw){
        const p=JSON.parse(raw)
        if(p?.running && Number.isFinite(p?.startAt) && Number.isFinite(p?.total)){
          const elapsed=Math.floor((Date.now()-p.startAt)/1000)
          if(p.total - elapsed > 0) return true
        }
      }
    }catch{/* ignore */}
    return false
  })
  const intervalRef=useRef(null)
  const startRef=useRef((()=>{
    try{
      const raw=localStorage.getItem(FOCUS_KEY)
      if(raw){
        const p=JSON.parse(raw)
        if(p?.running && Number.isFinite(p?.startAt) && Number.isFinite(p?.total)){
          const elapsed=Math.floor((Date.now()-p.startAt)/1000)
          if(p.total - elapsed > 0) return { startAt: p.startAt, total: p.total }
        }
        if(!p?.running && Number.isFinite(p?.secs) && Number.isFinite(p?.total) && p.secs < p.total){
          return { startAt: Date.now() - (p.total - p.secs)*1000, total: p.total }
        }
      }
    }catch{/* ignore */}
    return null
  })())
  const totalRef=useRef((()=>{
    try{
      const raw=localStorage.getItem(FOCUS_KEY)
      if(raw){
        const p=JSON.parse(raw)
        if(Number.isFinite(p?.total) && p.total>=60 && p.total<=180*60) return p.total
      }
      if(raw){
        const p2=JSON.parse(raw)
        if(Number.isFinite(p2?.minutes)) return Math.round(p2.minutes)*60
      }
    }catch{/* ignore */}
    return 25*60
  })())

  const clearTick = useCallback(()=>{
    if(intervalRef.current){ clearInterval(intervalRef.current); intervalRef.current=null }
  }, [])

  const tick = useCallback(()=>{
    if(!startRef.current) return
    const elapsed=Math.floor((Date.now()-startRef.current.startAt)/1000)
    const remaining=Math.max(0, startRef.current.total - elapsed)
    setSecs(remaining)
    if(remaining<=0){
      clearTick()
      setRunning(false)
      const total = startRef.current.total
      startRef.current=null
      dispatch({type:'focus/addSession', session:{taskId:selectedTask?.id||null, duration: total/60, startedAt: Date.now() - total*1000, completed:true}})
      // Notification only if granted and secure context
      try{
        if (typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext && Notification.permission === 'granted') {
          new Notification('Focus complete!',{body: selectedTask? selectedTask.text.slice(0,60) : 'Take a short break.'})
        }
      }catch(_e){ /* ignore */ }
      try{ if('vibrate' in navigator) navigator.vibrate(200) }catch(_e){ /* ignore */ }
      // audio fallback? optional
    }
  }, [selectedTask, dispatch, clearTick])

  useEffect(()=>{
    if(running){
      intervalRef.current=setInterval(tick, 1000)
      return ()=> clearTick()
    } else {
      clearTick()
    }
  },[running,tick,clearTick])

  useEffect(()=>()=> clearTick(),[clearTick])

  // keep tick accurate when tab becomes visible again
  useEffect(()=>{
    function onVis(){
      if(document.visibilityState==='visible' && running){
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return ()=> document.removeEventListener('visibilitychange', onVis)
  },[running, tick])

  // persist to localStorage (survives reload)
  useEffect(()=>{
    try{
      const payload = running && startRef.current
        ? { minutes, total: totalRef.current, startAt: startRef.current.startAt, running: true }
        : { minutes, secs, total: totalRef.current, running: false }
      localStorage.setItem(FOCUS_KEY, JSON.stringify(payload))
    }catch{/* ignore */}
  }, [minutes, secs, running])

  // also persist on page hide
  useEffect(()=>{
    function onHide(){
      try{
        const payload = running && startRef.current
          ? { minutes, total: totalRef.current, startAt: startRef.current.startAt, running: true }
          : { minutes, secs, total: totalRef.current, running: false }
        localStorage.setItem(FOCUS_KEY, JSON.stringify(payload))
      }catch{/* ignore */}
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') onHide() })
    return ()=>{ window.removeEventListener('pagehide', onHide); document.removeEventListener('visibilitychange', onHide) }
  }, [minutes, secs, running])

  const start=useCallback(()=>{
    if(running) return
    if (typeof window !== 'undefined' && 'Notification' in window && window.isSecureContext && Notification.permission === 'default') {
      try{
        const r=Notification.requestPermission()
        if(r && typeof r.catch==='function') r.catch(()=>{ /* ignore */ })
      }catch(_e){ /* ignore */ }
    }
    // if no startRef or finished, reset start
    if(!startRef.current || secs===0){
      startRef.current={ startAt: Date.now(), total: minutes*60 }
      totalRef.current = minutes*60
      setSecs(minutes*60)
    } else if (startRef.current.total !== totalRef.current && secs === totalRef.current){
      // minutes changed while paused before start
      startRef.current={ startAt: Date.now(), total: minutes*60 }
      totalRef.current = minutes*60
      setSecs(minutes*60)
    } else if(startRef.current){
      // resume: adjust startAt to keep remaining secs
      const remaining = secs
      startRef.current={ startAt: Date.now() - (startRef.current.total - remaining)*1000, total: startRef.current.total }
    } else {
      startRef.current={ startAt: Date.now(), total: minutes*60 }
      totalRef.current = minutes*60
      setSecs(minutes*60)
    }
    setRunning(true)
  }, [running, secs, minutes])

  const pause=useCallback(()=>{ setRunning(false); clearTick() }, [clearTick])
  const reset=useCallback((m=minutes)=>{
    const v=Math.max(1,Math.min(180,m))
    setRunning(false)
    clearTick()
    setSecs(v*60)
    totalRef.current = v*60
    startRef.current=null
    setMinutes(v)
  }, [minutes, clearTick])

  const todayCompleted = (() => {
    try {
      const sessions = focusSessions || []
      const d = new Date()
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
      const today = `${y}-${m}-${day}`
      return sessions.filter(s => {
        if (!s || !s.completed) return false
        const sd = new Date(s.startedAt)
        if(Number.isNaN(sd.getTime())) return false
        const sy = sd.getFullYear(), sm = String(sd.getMonth()+1).padStart(2,'0'), sday = String(sd.getDate()).padStart(2,'0')
        return `${sy}-${sm}-${sday}` === today
      }).length
    } catch(_e) { return 0 }
  })()

  const totalForPct= totalRef.current || minutes*60 || 1
  const pct = Math.max(0, Math.min(100, Math.round((1 - secs/totalForPct)*100)))
  const mm=String(Math.floor(secs/60)).padStart(2,'0')
  const ss=String(secs%60).padStart(2,'0')

  const ringR=54, circ=2*Math.PI*ringR, offset= circ - (pct/100)*circ
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
      <header><h2 style={{fontSize:'18px'}}>Focus</h2><p className="todo-subtitle" style={{marginBottom:0}}>Pomodoro for studying. {selectedTask? `Focusing: ${selectedTask.text.slice(0,40)}` : 'Pick a task in List/Board or just focus.'}</p></header>
      <div style={{background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'20px',padding:'28px',textAlign:'center', position:'relative'}}>
        <div style={{position:'relative', width:'140px', height:'140px', margin:'0 auto 12px'}} role="timer" aria-label={`${mm}:${ss} remaining`} aria-live="off">
          <svg width="140" height="140" style={{transform:'rotate(-90deg)'}} aria-hidden="true"><circle cx="70" cy="70" r={ringR} stroke="var(--bg-inset)" strokeWidth="7" fill="none"/><circle cx="70" cy="70" r={ringR} stroke="var(--accent)" strokeWidth="7" fill="none" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{transition:'stroke-dashoffset 0.5s linear'}} /></svg>
          <div style={{position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'32px',fontWeight:750,letterSpacing:'-0.04em',fontVariantNumeric:'tabular-nums', fontFamily:'var(--font-display)'}} aria-hidden="true">{mm}:{ss}</div>
        </div>
        <div style={{height:'6px',background:'var(--bg-inset)',borderRadius:'999px',overflow:'hidden',margin:'12px 0', opacity:0.6}} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
          <div style={{width:`${pct}%`,height:'100%',background:'var(--accent)',transition:'width 0.5s linear'}} />
        </div>
        <div style={{display:'flex',gap:'6px',justifyContent:'center',marginBottom:'14px', flexWrap:'wrap'}} role="group" aria-label="Presets">
          {PRESETS.map(p=> <button key={p} type="button" className={minutes===p?'is-active segmented':'segmented'} style={{padding:'6px 12px',borderRadius:'999px',border:'1px solid var(--border)',background: minutes===p?'var(--accent)':'var(--bg-inset)',color: minutes===p?'#fff':'var(--text)'}} onClick={()=>reset(p)} aria-pressed={minutes===p}>{p}m</button>)}
          <label style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'4px 8px', border:'1px solid var(--border)', borderRadius:'999px', background:'var(--bg-inset)', fontSize:'12px' }} title="Custom minutes 1–180">Custom <input type="number" min={1} max={180} value={minutes} onChange={e=>{ const v=Number(e.target.value); if(Number.isFinite(v)) reset(v) }} style={{ width:'56px', padding:'4px 6px', borderRadius:'6px', border:'1px solid var(--border)', background:'var(--bg-panel)' }} aria-label="Custom minutes"/> m</label>
        </div>
        <div style={{display:'flex',gap:'8px',justifyContent:'center'}}>
          {!running ? <button type="button" className="todo-add-btn" style={{padding:'10px 22px'}} onClick={start} aria-label="Start timer">Start</button> : <button type="button" className="btn" style={{padding:'10px 22px'}} onClick={pause} aria-label="Pause timer">Pause</button>}
          <button type="button" className="btn" onClick={()=>reset()} aria-label="Reset timer">Reset</button>
        </div>
        <p className="muted" style={{marginTop:'10px'}}>{todayCompleted} sessions completed today</p>
      </div>
    </div>
  )
}
export function FocusDock({ running, secs }){
  if(!running) return null
  const mm=String(Math.floor(secs/60)).padStart(2,'0'); const ss=String(secs%60).padStart(2,'0')
  return <div style={{position:'fixed',bottom:'12px',right:'12px',background:'var(--text)',color:'var(--bg)',padding:'8px 14px',borderRadius:'999px',fontVariantNumeric:'tabular-nums',fontWeight:600,fontSize:'13px',boxShadow:'var(--shadow-md)',zIndex:50}} aria-live="polite">{mm}:{ss} · focusing</div>
}
