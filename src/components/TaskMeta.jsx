import { PRIORITIES } from '../state/reducer'
import { humanDue, isOverdue } from '../lib/date'
import { IconCalendar, IconWarning, IconCheckSquare, IconFlag } from './Icons'

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

export function TaskMeta({ task, compact = false }) {
  if (!task) return null
  const overdue = isOverdue(task)
  const done = task.subtasks?.filter((s) => s.completed).length || 0
  const total = task.subtasks?.length || 0
  const tags = compact ? task.tags.slice(0, 3) : task.tags
  const moreTags = compact ? task.tags.length - tags.length : 0
  return (
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
      {tags.map((tag) => (
        <span key={tag} className="chip chip-tag">#{tag}</span>
      ))}
      {moreTags > 0 && <span className="chip">+{moreTags}</span>}
    </div>
  )
}
