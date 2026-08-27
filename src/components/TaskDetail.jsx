import { useEffect, useRef, useState } from 'react'
import { PRIORITIES, STATUS_LABELS } from '../state/reducer'
import { parseDueDate, humanDue, relativeUpdated } from '../lib/date'
import { renderMarkdown, exportTaskMarkdown } from '../lib/markdown'
import { toast } from '../lib/toast'
import { IconLayers } from './Icons'

const MAX_IMAGE_BYTES = 400 * 1024

export default function TaskDetail({ task, project, projects, dispatch }) {
  const [notesMode, setNotesMode] = useState('edit')
  const [tagInput, setTagInput] = useState('')
  const [dueInput, setDueInput] = useState(task?.dueDate || '')
  const [subInput, setSubInput] = useState('')
  const notesRef = useRef(null)
  const titleRef = useRef(null)
  const dueRef = useRef(null)

  useEffect(() => {
    if (document.activeElement === dueRef.current) return
    setDueInput(task?.dueDate || '')
  }, [task?.id, task?.dueDate])

  useEffect(() => {
    const el = titleRef.current
    if (!el) return
    const supportsFieldSizing = CSS.supports && CSS.supports('field-sizing', 'content')
    if (supportsFieldSizing) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [task?.text, task?.id])

  useEffect(() => {
    if (notesMode !== 'edit') return
    const el = notesRef.current
    if (!el) return
    const supportsFieldSizing = CSS.supports && CSS.supports('field-sizing', 'content')
    if (supportsFieldSizing) return
    el.style.height = 'auto'
    el.style.height = `${Math.max(110, el.scrollHeight)}px`
  }, [task?.notes, task?.id, notesMode])


  const [localTitle,setLocalTitle]=useState(task?.text || '')
  useEffect(()=>{ setLocalTitle(task?.text || '') },[task?.id, task?.text])
  const titleTimer=useRef(null)
  function patchTitle(v){
    setLocalTitle(v)
    if(titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current=setTimeout(()=>{ if(v.trim()) patch({text:v}) }, 400)
  }
  useEffect(()=>()=>{ if(titleTimer.current) clearTimeout(titleTimer.current) },[])

  if (!task) {
    return (
      <aside className="detail-panel detail-empty">
        <div className="todo-empty-icon" aria-hidden="true"><IconLayers size={40} /></div>
        <p>Select a task to see its details.</p>
      </aside>
    )
  }

  const patch = (p) => dispatch({ type: 'task/update', id: task.id, patch: p })
  const notesLatest=useRef(task?.notes || '')
  useEffect(()=>{ notesLatest.current=task?.notes || '' },[task?.notes])
  const notesTimer=useRef(null)
  useEffect(()=>()=>{ if(notesTimer.current) clearTimeout(notesTimer.current) },[])

  function applyNaturalDate() {
    if (!dueInput.trim()) return patch({ dueDate: null })
    const parsed = parseDueDate(dueInput)
    if (parsed) {
      patch({ dueDate: parsed })
      toast(`Due ${humanDue(parsed)}`)
    } else {
      toast('Could not understand that date', 'error')
    }
  }

  function addTag() {
    const raw = tagInput.trim().replace(/^#/, '').toLowerCase()
    if (!raw) return
    if (raw.length > 20) { toast('Tag too long (max 20)', 'error'); return }
    if (/\s/.test(raw)) { toast('Tags cannot contain spaces', 'error'); return }
    if (task.tags.includes(raw)) { setTagInput(''); return }
    patch({ tags: [...task.tags, raw] })
    setTagInput('')
  }

  function handlePaste(e) {
    const files = e.clipboardData?.files
    if (!files) return
    const file = Array.from(files).find((f) => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    if (file.size > MAX_IMAGE_BYTES) {
      toast('Image too large (max ~400KB for local storage)', 'error')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => toast('Failed to read image', 'error')
    reader.onload = () => {
      const baseLen=String(reader.result||'').length
      if(baseLen>50000){ toast('Image too large after encoding','error'); return }
      const md = `\n![image](${reader.result})\n`
      patch({ notes: (notesLatest.current || '') + md })
      toast('Image added to notes')
    }
    reader.readAsDataURL(file)
  }

  function exportMd() {
    const md = exportTaskMarkdown(task, project?.name || 'Inbox')
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${task.text.replace(/[^\w\- ]+/g, '').slice(0, 40) || 'task'}.md`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 500)
    toast('Exported as Markdown')
  }

  const subDone = task.subtasks.filter((s) => s.completed).length
  const subPct = task.subtasks.length ? Math.round((subDone / task.subtasks.length) * 100) : 0

  return (
    <aside className={`detail-panel ${notesMode === 'preview' ? '' : ''}`} aria-label="Task details" onPaste={handlePaste}>
      <textarea
        ref={titleRef}
        className="detail-title"
        value={localTitle}
        maxLength={200}
        rows={1}
        aria-label="Task title"
        placeholder="Task title"
        onChange={(e) => patchTitle(e.target.value)}
        onBlur={()=>{ if(localTitle.trim() && localTitle!==task.text) patch({text: localTitle}) }}
      />

      <div className="detail-grid">
        <label className="detail-field">
          <span className="detail-label">Project</span>
          <select value={projects.some((p)=>p.id===task.projectId) ? task.projectId : 'inbox'} onChange={(e) => patch({ projectId: e.target.value })}>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.emoji || '📁'} {p.name}</option>
            ))}
          </select>
        </label>
        <label className="detail-field">
          <span className="detail-label">Status</span>
          <select value={task.status} onChange={(e) => dispatch({ type: 'task/setStatus', id: task.id, status: e.target.value })}>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="detail-field">
          <span className="detail-label">Priority</span>
          <select value={task.priority} onChange={(e) => patch({ priority: Number(e.target.value) })}>
            {[3, 2, 1, 0].map((p) => (
              <option key={p} value={p}>{PRIORITIES[p]}</option>
            ))}
          </select>
        </label>
        <label className="detail-field">
          <span className="detail-label">Due</span>
          <input
            ref={dueRef}
            type="text"
            placeholder="tomorrow, fri 5pm…"
            value={dueInput}
            onChange={(e) => setDueInput(e.target.value)}
            onBlur={applyNaturalDate}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyNaturalDate() } }}
          />
        </label>
        <details style={{gridColumn:'span 2'}}><summary className="detail-label" style={{cursor:'pointer',listStyle:'none'}}>⋯ Advanced — Estimate & Repeat</summary>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginTop:'10px'}}>
            <label className="detail-field">
              <span className="detail-label">Estimate</span>
              <select value={task.estimate||0} onChange={e=> patch({ estimate:Number(e.target.value)})}>
                <option value={0}>—</option><option value={15}>15m</option><option value={30}>30m</option><option value={60}>1h</option><option value={120}>2h</option>
              </select>
            </label>
            <label className="detail-field">
              <span className="detail-label">Repeat</span>
              <select value={task.repeat||''} onChange={e=> patch({ repeat: e.target.value || null })}>
                <option value="">No repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
              </select>
            </label>
          </div>
        </details>
      </div>

      <div className="detail-tags">
        <div className="chip-row">
          {task.tags.map((tag) => (
            <button key={tag} type="button" className="chip chip-tag is-removable" title="Remove tag" aria-label={`Remove tag ${tag}`} onClick={() => patch({ tags: task.tags.filter((t) => t !== tag) })}>
              #{tag} ×
            </button>
          ))}
        </div>
        <input
          type="text"
          className="detail-tag-input"
          placeholder="+ add tag (Enter)"
          value={tagInput}
          maxLength={20}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
        />
      </div>

      <section className="detail-subtasks">
        <header>
          <h3>Subtasks {task.subtasks.length > 0 && <span className="muted">{subDone}/{task.subtasks.length}</span>}</h3>
        </header>
        {task.subtasks.length > 0 && (
          <div className="subtask-progress" role="progressbar" aria-valuenow={subPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Subtasks ${subPct}% complete`}>
            <div className="subtask-progress-fill" style={{ width: `${subPct}%` }} />
          </div>
        )}
        <ul>
          {task.subtasks.map((s) => (
            <li key={s.id} className={s.completed ? 'is-done' : ''}>
              <input type="checkbox" checked={s.completed} onChange={() => dispatch({ type: 'subtask/toggle', taskId: task.id, subId: s.id })} aria-label={s.text} />
              <span title={s.text}>{s.text}</span>
              <button type="button" className="todo-icon-btn delete" aria-label={`Delete subtask ${s.text.slice(0,30)}`} onClick={() => dispatch({ type: 'subtask/delete', taskId: task.id, subId: s.id })}>×</button>
            </li>
          ))}
        </ul>
        <form onSubmit={(e) => { e.preventDefault(); const t = subInput.trim().slice(0,200); if (!t) return; dispatch({ type: 'subtask/add', taskId: task.id, text: t }); setSubInput('') }}>
          <input type="text" placeholder="+ Add subtask" value={subInput} maxLength={200} onChange={(e) => setSubInput(e.target.value)} aria-label="New subtask" />
        </form>
      </section>

      <section className="detail-notes">
        <header className="notes-header">
          <h3>Notes <span className="hint">markdown · paste images</span></h3>
          <div className="segmented" role="tablist" aria-label="Notes mode">
            <button type="button" role="tab" aria-selected={notesMode === 'edit'} className={notesMode === 'edit' ? 'is-active' : ''} onClick={() => setNotesMode('edit')}>Edit</button>
            <button type="button" role="tab" aria-selected={notesMode === 'preview'} className={notesMode === 'preview' ? 'is-active' : ''} onClick={() => setNotesMode('preview')}>Preview</button>
          </div>
        </header>
        {notesMode === 'edit' ? (
          <textarea
            ref={notesRef}
            className="detail-notes-input"
            placeholder="Write anything — **markdown** supported. Paste an image to attach it."
            value={task.notes}
            onChange={(e) => { const v=e.target.value; notesLatest.current=v; if(notesTimer.current) clearTimeout(notesTimer.current); notesTimer.current=setTimeout(()=> patch({ notes: v }), 350)}}
            rows={4}
            aria-label="Task notes"
          />
        ) : (
          <div className="detail-notes-preview markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(task.notes) }} />
        )}
      </section>

      <footer className="detail-footer">
        <span className="muted">Created {relativeUpdated(task.createdAt)} · Updated {relativeUpdated(task.updatedAt)}</span>
        <div>
          <button type="button" className="btn btn-ghost" onClick={exportMd}>Export .md</button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              dispatch({ type: 'task/delete', id: task.id })
              toast('Task deleted', 'info', { label: 'Undo', onClick: () => dispatch({ type: 'undo' }) })
            }}
          >
            Delete
          </button>
        </div>
      </footer>
    </aside>
  )
}
