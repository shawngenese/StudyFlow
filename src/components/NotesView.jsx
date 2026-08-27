import { useState } from 'react'
import { renderMarkdown } from '../lib/markdown'

export default function NotesView({ docs, projects, dispatch }){
  const [active, setActive]=useState(docs[0]?.id || null)
  const [filter,setFilter]=useState('all')
  const doc = docs.find(d=>d.id===active) || null
  const [edit,setEdit]=useState(false)
  const filtered = filter==='all'? docs : docs.filter(d=>d.projectId===filter)
   return (
    <div className="notes-layout" style={{display:'flex',gap:'16px',alignItems:'flex-start'}}>
      <div className="notes-sidebar" style={{width:'240px',flexShrink:0,background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'10px',maxHeight:'60vh',overflowY:'auto'}}>
        <button type="button" className="todo-add-btn" style={{width:'100%',marginBottom:'10px'}} onClick={()=>dispatch({type:'doc/add', title:'Untitled note', projectId:'inbox'})}>+ New note</button>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={{width:'100%',marginBottom:'10px'}}>
          <option value="all">All courses</option>
          {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <ul style={{listStyle:'none',margin:0,padding:0,display:'flex',flexDirection:'column',gap:'4px'}}>
          {filtered.map(d=>(
            <li key={d.id}><button type="button" onClick={()=>{setActive(d.id); setEdit(false)}} style={{width:'100%',textAlign:'left',padding:'8px 10px',borderRadius:'8px',background: active===d.id? 'var(--accent-soft)':'transparent',color: active===d.id? 'var(--accent)':'var(--text)',fontWeight: active===d.id?600:500}}>{d.title.slice(0,32) || 'Untitled'}</button></li>
          ))}
          {filtered.length===0 && <li className="muted" style={{padding:'12px',textAlign:'center'}}>No notes — create one.</li>}
        </ul>
      </div>
      <div className="notes-main" style={{flex:1,minWidth:0,background:'var(--bg-panel)',border:'1px solid var(--border)',borderRadius:'14px',padding:'18px'}}>
        {!doc ? <p className="muted">Select or create a note.</p> : (
          <>
            <input value={doc.title} onChange={e=>dispatch({type:'doc/update', id:doc.id, patch:{title:e.target.value}})} placeholder="Title" style={{width:'100%',fontSize:'18px',fontWeight:650,border:'none',background:'transparent',padding:'4px 0',marginBottom:'8px'}} />
            <div style={{display:'flex',gap:'6px',marginBottom:'12px'}}>
              <select value={doc.projectId} onChange={e=>dispatch({type:'doc/update', id:doc.id, patch:{projectId:e.target.value}})}>{projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              <button type="button" className="btn" onClick={()=>setEdit(e=>!e)}>{edit?'Preview':'Edit'}</button>
              <button type="button" className="btn btn-danger" onClick={()=>{dispatch({type:'doc/delete', id:doc.id}); setActive(null)}}>Delete</button>
            </div>
            {edit ? (
              <textarea value={doc.body} onChange={e=>dispatch({type:'doc/update', id:doc.id, patch:{body:e.target.value}})} placeholder="Write markdown… paste images supported in task notes." style={{width:'100%',minHeight:'300px',resize:'vertical'}} />
            ) : (
              <div className="markdown-body" style={{minHeight:'200px',background:'var(--bg-inset)',borderRadius:'10px',padding:'14px'}} dangerouslySetInnerHTML={{__html: renderMarkdown(doc.body || '*No content yet — click Edit.*')}} />
            )}
          </>
        )}
      </div>
    </div>
  )
}
