import { useEffect, useRef, useState, useCallback } from 'react'
import { DndContext, closestCenter, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PRIORITIES, STATUS_LABELS } from '../state/reducer'
import { parseDueDate, humanDue, relativeUpdated } from '../lib/date'
import { renderMarkdown, exportTaskMarkdown } from '../lib/markdown'
import { toast } from '../lib/toast'
import { IconLayers, IconGrip } from './Icons'
import { TaskCheckbox } from './TaskCheckbox'
import { LIMITS } from '../lib/storage'

const MAX_IMAGE_BYTES = LIMITS.IMAGE_BYTES
const MAX_NOTES_LEN = LIMITS.NOTES_LEN

function SortableSubtask({ taskId, subtask, dispatch }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: subtask.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : undefined }
  return (
    <li ref={setNodeRef} style={style} className={subtask.completed ? 'is-done' : ''}>
      <button type="button" className="todo-drag-handle" aria-label={`Reorder ${subtask.text.slice(0,20)}`} {...attributes} {...listeners} style={{ opacity: 0.6 }}>
        <IconGrip size={10} />
      </button>
      <TaskCheckbox checked={subtask.completed} onChange={() => dispatch({ type: 'subtask/toggle', taskId, subId: subtask.id })} label={subtask.text} />
      <span title={subtask.text}>{subtask.text}</span>
      <button type="button" className="todo-icon-btn delete" aria-label={`Delete subtask ${subtask.text.slice(0, 30)}`} onClick={() => dispatch({ type: 'subtask/delete', taskId, subId: subtask.id })}>×</button>
    </li>
  )
}

function SubtaskList({ task, dispatch }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = task.subtasks.map((s) => s.id)
  const handleDragEnd = useCallback((e) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return
    const ordered = arrayMove(ids, oldIndex, newIndex)
    dispatch({ type: 'subtask/reorder', taskId: task.id, ids: ordered })
  }, [ids, dispatch, task.id])
  if (!task.subtasks.length) return null
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul>
          {task.subtasks.map((s) => (
            <SortableSubtask key={s.id} taskId={task.id} subtask={s} dispatch={dispatch} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}

export default function TaskDetail({ task, project, projects, dispatch }) {
  const [notesMode, setNotesMode] = useState('edit')
  const [tagInput, setTagInput] = useState('')
  const [dueInput, setDueInput] = useState(task?.dueDate || '')
  const [subInput, setSubInput] = useState('')
  const [localTitle, setLocalTitle] = useState(task?.text || '')
  const [localNotes, setLocalNotes] = useState(task?.notes || '')
  const notesRef = useRef(null)
  const titleRef = useRef(null)
  const dueRef = useRef(null)
  const titleTimer = useRef(null)
  const notesLatest = useRef(task?.notes || '')
  const notesTimer = useRef(null)
  const notesTaskId = useRef(task?.id || null)
  const pendingTitle = useRef(task?.text || '')
  const selTaskId = useRef(task?.id || null)
  const taskTextRef = useRef(task?.text || '')
  const taskNotesRef = useRef(task?.notes || '')

  // keep refs in sync when task id changes
  useEffect(() => {
    selTaskId.current = task?.id || null
    taskTextRef.current = task?.text || ''
    taskNotesRef.current = task?.notes || ''
    setLocalTitle(task?.text || '')
    pendingTitle.current = task?.text || ''
    if (titleTimer.current) { clearTimeout(titleTimer.current); titleTimer.current=null }
  }, [task?.id])

  useEffect(() => {
    setLocalNotes(task?.notes || '')
    notesLatest.current = task?.notes || ''
    notesTaskId.current = task?.id || null
    taskNotesRef.current = task?.notes || ''
    if (notesTimer.current){ clearTimeout(notesTimer.current); notesTimer.current=null }
  }, [task?.id])

  // external sync when not typing — also keep mirror refs updated
  useEffect(() => {
    taskNotesRef.current = task?.notes || ''
    if (!notesTimer.current && task && task.notes !== notesLatest.current) {
      setLocalNotes(task.notes || '')
      notesLatest.current = task.notes || ''
    }
  }, [task?.notes])

  useEffect(() => {
    taskTextRef.current = task?.text || ''
    if (!titleTimer.current && task && task.text !== pendingTitle.current) {
      setLocalTitle(task.text || '')
      pendingTitle.current = task.text || ''
    }
  }, [task?.text])

  // cleanup timers on unmount
  useEffect(() => () => {
    if (titleTimer.current) clearTimeout(titleTimer.current)
    if (notesTimer.current) clearTimeout(notesTimer.current)
  }, [])

  // flush pending edits when switching tasks — uses refs to avoid stale closure on task.text/notes
  useEffect(() => {
    return () => {
      // flush is handled in the id-change effects above; this cleanup flushes last task before unmount
      if (titleTimer.current && selTaskId.current) {
        clearTimeout(titleTimer.current)
        titleTimer.current = null
        const v = pendingTitle.current
        if (v && v.trim() && v !== taskTextRef.current) {
          dispatch({ type: 'task/update', id: selTaskId.current, patch: { text: v } })
        }
      }
      if (notesTimer.current && selTaskId.current) {
        clearTimeout(notesTimer.current)
        notesTimer.current = null
        const pending = notesLatest.current
        const id = notesTaskId.current || selTaskId.current
        if (id && typeof pending === 'string' && pending !== taskNotesRef.current) {
          dispatch({ type: 'task/update', id, patch: { notes: pending } })
        }
      }
    }
  }, [task?.id, dispatch])

  useEffect(() => {
    if (document.activeElement === dueRef.current) return
    setDueInput(task?.dueDate || '')
  }, [task?.id, task?.dueDate])

  useEffect(() => {
    if (!task) return
    const el = titleRef.current
    if (!el) return
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content')) return
    requestAnimationFrame(() => {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    })
  }, [task?.text, task?.id])
  useEffect(() => {
    if (!task || notesMode !== 'edit') return
    const el = notesRef.current
    if (!el) return
    if (typeof CSS !== 'undefined' && CSS.supports && CSS.supports('field-sizing', 'content')) return
    requestAnimationFrame(() => {
      el.style.height = 'auto'
      el.style.height = `${Math.max(110, el.scrollHeight)}px`
    })
  }, [task?.notes, task?.id, notesMode])

  const flushNotes = useCallback(() => {
    if (notesTimer.current) {
      clearTimeout(notesTimer.current)
      notesTimer.current = null
    }
    const pending = notesLatest.current
    const id = notesTaskId.current || task?.id
    if (id && typeof pending === 'string' && pending !== task?.notes) {
      dispatch({ type: 'task/update', id, patch: { notes: pending } })
    }
  }, [dispatch, task?.id, task?.notes])

  const patchTitle = useCallback((v) => {
    setLocalTitle(v)
    pendingTitle.current = v
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      titleTimer.current=null
      if (v.trim() && task && pendingTitle.current === v && v !== task.text) patch({ text: v })
    }, 400)
  }, [task])

  const flushTitle = useCallback(() => {
    if (titleTimer.current) { clearTimeout(titleTimer.current); titleTimer.current = null }
    const v = pendingTitle.current ?? localTitle
    if (v && v.trim() && task && v !== task.text) patch({ text: v })
  }, [localTitle, task])

  if (!task) {
    return (
      <aside className="detail-panel detail-empty" aria-label="Task details">
        <div className="todo-empty-icon" aria-hidden="true"><IconLayers size={40} /></div>
        <p>Select a task to see its details.</p>
      </aside>
    )
  }

  const patch = (p) => dispatch({ type: 'task/update', id: task.id, patch: p })

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
    if (raw.length > LIMITS.TAG_LEN) { toast(`Tag too long (max ${LIMITS.TAG_LEN})`, 'error'); return }
    if (/\s/.test(raw)) { toast('Tags cannot contain spaces', 'error'); return }
    if (!/^[a-z0-9_-]+$/.test(raw)){ toast('Tags can only use letters, numbers, - and _','error'); return }
    if (task.tags.includes(raw)) { setTagInput(''); return }
    if (task.tags.length >= LIMITS.TAG_COUNT){ toast('Max tags reached','error'); return }
    patch({ tags: [...task.tags, raw] })
    setTagInput('')
  }

  function handlePaste(e) {
    const files = e.clipboardData?.files
    if (!files || files.length===0) return
    const file = Array.from(files).find((f) => f.type.startsWith('image/'))
    if (!file) return
    e.preventDefault()
    if (file.size > MAX_IMAGE_BYTES) {
      toast(`Image too large (max ~${Math.round(MAX_IMAGE_BYTES/1024)}KB for local notes)`, 'error')
      return
    }
    if ((notesLatest.current||'').length > MAX_NOTES_LEN - 2000){
      toast('Notes nearly full — remove some content first','error')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => toast('Failed to read image', 'error')
    reader.onload = () => {
      const base = String(reader.result || '')
      if (base.length > MAX_NOTES_LEN - 1000) { toast('Image too large after encoding', 'error'); return }
      const md = `\n![image](${base})\n`
      const nextNotes = (notesLatest.current || '') + md
      if (nextNotes.length > MAX_NOTES_LEN) { toast('Notes would exceed limit', 'error'); return }
      setLocalNotes(nextNotes)
      notesLatest.current = nextNotes
      notesTaskId.current = task.id
      // debounce instead of immediate to respect quota
      if (notesTimer.current) clearTimeout(notesTimer.current)
      notesTimer.current = setTimeout(()=>{ notesTimer.current=null; if(nextNotes !== task.notes) dispatch({type:'task/update', id: task.id, patch:{notes: nextNotes}})}, 300)
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
    a.rel='noopener'
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { URL.revokeObjectURL(url); a.remove() }, 500)
    toast('Exported as Markdown')
  }

  const subDone = task.subtasks.filter((s) => s.completed).length
  const subPct = task.subtasks.length ? Math.round((subDone / task.subtasks.length) * 100) : 0

  return (
    <aside className="detail-panel" aria-label="Task details" onPaste={handlePaste}>
      <label htmlFor="detail-title" className="sr-only">Task title</label>
      <textarea
        id="detail-title"
        ref={titleRef}
        className="detail-title"
        value={localTitle}
        maxLength={LIMITS.TASK_TEXT}
        rows={1}
        aria-label="Task title"
        placeholder="Task title"
        onChange={(e) => patchTitle(e.target.value)}
        onBlur={flushTitle}
      />

      <div className="detail-grid">
        <label className="detail-field">
          <span className="detail-label">Project</span>
          <select value={projects.some((p) => p.id === task.projectId) ? task.projectId : 'inbox'} onChange={(e) => patch({ projectId: e.target.value })} aria-label="Project">
            {projects.map((p) => (
              <option key={p.id} value={p.id}>📁 {p.name}</option>
            ))}
          </select>
        </label>
        <label className="detail-field">
          <span className="detail-label">Status</span>
          <select value={task.status} onChange={(e) => dispatch({ type: 'task/setStatus', id: task.id, status: e.target.value })} aria-label="Status">
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="detail-field">
          <span className="detail-label">Priority</span>
          <select value={task.priority} onChange={(e) => patch({ priority: Number(e.target.value) })} aria-label="Priority">
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
            aria-label="Due date (natural language)"
          />
        </label>
        <details style={{ gridColumn: 'span 2' }}><summary className="detail-label" style={{ cursor: 'pointer', listStyle: 'none' }}>⋯ Advanced — Estimate & Repeat</summary>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
            <label className="detail-field">
              <span className="detail-label">Estimate</span>
              <select value={task.estimate || 0} onChange={(e) => patch({ estimate: Number(e.target.value) })} aria-label="Estimate">
                <option value={0}>—</option><option value={15}>15m</option><option value={30}>30m</option><option value={60}>1h</option><option value={120}>2h</option>
              </select>
            </label>
            <label className="detail-field">
              <span className="detail-label">Repeat</span>
              <select value={task.repeat || ''} onChange={(e) => patch({ repeat: e.target.value || null })} aria-label="Repeat">
                <option value="">No repeat</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
        </details>
      </div>

      <div className="detail-tags">
        <div className="chip-row" aria-label="Tags">
          {task.tags.map((tag) => (
            <button key={tag} type="button" className="chip chip-tag is-removable" title="Remove tag" aria-label={`Remove tag ${tag}`} onClick={() => patch({ tags: task.tags.filter((t) => t !== tag) })}>
              #{tag} ×
            </button>
          ))}
        </div>
        <label htmlFor="detail-tag-input" className="sr-only">Add tag</label>
        <input
          id="detail-tag-input"
          type="text"
          className="detail-tag-input"
          placeholder="+ add tag (Enter)"
          value={tagInput}
          maxLength={LIMITS.TAG_LEN}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          aria-label="Add tag"
        />
      </div>

      <section className="detail-subtasks" aria-label="Subtasks">
        <header>
          <h3>Subtasks {task.subtasks.length > 0 && <span className="muted">{subDone}/{task.subtasks.length}</span>}</h3>
        </header>
        {task.subtasks.length > 0 && (
          <div className="subtask-progress" role="progressbar" aria-valuenow={subPct} aria-valuemin={0} aria-valuemax={100} aria-label={`Subtasks ${subPct}% complete`}>
            <div className="subtask-progress-fill" style={{ width: `${subPct}%` }} />
          </div>
        )}
        <SubtaskList task={task} dispatch={dispatch} />
        <form onSubmit={(e) => { e.preventDefault(); const t = subInput.trim().slice(0, LIMITS.SUBTASK_TEXT); if (!t) return; if(task.subtasks.length >= LIMITS.SUBTASK_COUNT){ toast('Max subtasks reached','error'); return } dispatch({ type: 'subtask/add', taskId: task.id, text: t }); setSubInput('') }}>
          <label htmlFor="subtask-input" className="sr-only">New subtask</label>
          <input id="subtask-input" type="text" placeholder="+ Add subtask" value={subInput} maxLength={LIMITS.SUBTASK_TEXT} onChange={(e) => setSubInput(e.target.value)} aria-label="New subtask" disabled={task.subtasks.length >= LIMITS.SUBTASK_COUNT} />
        </form>
      </section>

      <section className="detail-notes" aria-label="Notes">
        <header className="notes-header">
          <h3>Notes <span className="hint">markdown · paste images</span></h3>
          <div className="segmented" role="tablist" aria-label="Notes mode">
            <button type="button" role="tab" aria-selected={notesMode === 'edit'} className={notesMode === 'edit' ? 'is-active' : ''} onClick={() => { flushNotes(); setNotesMode('edit') }}>Edit</button>
            <button type="button" role="tab" aria-selected={notesMode === 'preview'} className={notesMode === 'preview' ? 'is-active' : ''} onClick={() => { flushNotes(); setNotesMode('preview') }}>Preview</button>
          </div>
        </header>
        {notesMode === 'edit' ? (
          <textarea
            ref={notesRef}
            className="detail-notes-input"
            placeholder="Write anything — **markdown** supported. Paste an image to attach it."
            value={localNotes}
            onChange={(e) => {
              const v = e.target.value.slice(0, MAX_NOTES_LEN)
              setLocalNotes(v)
              notesLatest.current = v
              notesTaskId.current = task.id
              if (notesTimer.current) clearTimeout(notesTimer.current)
              notesTimer.current = setTimeout(() => { notesTimer.current=null; if (v !== task.notes) patch({ notes: v }) }, 600)
            }}
            onBlur={flushNotes}
            rows={4}
            aria-label="Task notes"
          />
        ) : (
          <div className="detail-notes-preview markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(localNotes) }} />
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
              const title = task.text.slice(0,30)
              dispatch({ type: 'task/delete', id: task.id })
              toast(`Deleted "${title}"`, 'info', { label: 'Undo', onClick: () => dispatch({ type: 'undo' }) })
            }}
          >
            Delete
          </button>
        </div>
      </footer>
    </aside>
  )
}
