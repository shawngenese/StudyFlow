import { memo, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { PRIORITIES } from '../state/reducer'
import { humanDue, isOverdue } from '../lib/date'
import { IconCalendar, IconWarning, IconGrip, IconPencil, IconTrash, IconCheckSquare, IconFlag } from './Icons'

const PRIORITY_SHORT = { 1: 'Low', 2: 'Med', 3: 'High' }

function PriorityFlag({ level }) {
  if (!level) return null
  return (
    <span className={`chip chip-priority p${level}`} title={`${PRIORITIES[level]} priority`} aria-label={`${PRIORITIES[level]} priority`}>
      <IconFlag size={11} />
      {PRIORITY_SHORT[level]}
    </span>
  )
}

function TaskRow({
  task,
  selected,
  onSelect,
  onToggle,
  onDelete,
  done = 0,
  total = 0,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const overdue = isOverdue(task)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }
  const onRowKey = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(task.id) }
  }, [onSelect, task.id])

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`todo-item ${task.completed ? 'is-completed' : ''} ${selected ? 'is-selected' : ''}`}
      onClick={() => onSelect(task.id)}
      role="option"
      tabIndex={0}
      onKeyDown={onRowKey}
      aria-selected={selected}
    >
      <button
        type="button"
        className="todo-drag-handle"
        aria-label={`Reorder ${task.text.slice(0,30)}`}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <IconGrip size={14} />
      </button>

      <label className="todo-check" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={task.completed} onChange={() => onToggle(task.id)} aria-label={`Mark ${task.text.slice(0,40)} ${task.completed ? 'incomplete' : 'complete'}`} />
        <span className="todo-check-box" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="12" height="12">
            <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </label>

      <div className="todo-item-body">
        <span className="todo-text">{task.text}</span>
        <div className="todo-meta">
          {total > 0 && (
            <span className={`chip chip-progress ${done === total ? 'is-done' : ''}`}>
              <IconCheckSquare size={11} /> {done}/{total}
            </span>
          )}
          <PriorityFlag level={task.priority} />
          {task.dueDate && (
            <span className={`chip chip-due ${overdue ? 'is-overdue' : ''}`}>
              {overdue ? <IconWarning size={11} /> : <IconCalendar size={11} />} {humanDue(task.dueDate)}
            </span>
          )}
          {task.estimate > 0 && <span className="chip">⏱ {task.estimate}m</span>}
          {task.repeat && <span className="chip">↻ {task.repeat}</span>}
          {task.tags.map((tag) => (
            <span key={tag} className="chip chip-tag">#{tag}</span>
          ))}
        </div>
      </div>

      <div className="todo-actions" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="todo-icon-btn edit" title="Edit (opens detail)" aria-label={`Edit ${task.text.slice(0,40)}`} onClick={() => onSelect(task.id)}>
          <IconPencil size={16} />
        </button>
        <button type="button" className="todo-icon-btn delete" title="Delete" aria-label={`Delete ${task.text.slice(0,40)}`} onClick={() => onDelete(task)}>
          <IconTrash size={16} />
        </button>
      </div>
    </li>
  )
}

export default memo(TaskRow)
