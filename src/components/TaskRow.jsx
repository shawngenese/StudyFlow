import { memo, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconGrip, IconPencil, IconTrash } from './Icons'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskMeta } from './TaskMeta'

function TaskRow({
  task,
  selected,
  onSelect,
  onToggle,
  onDelete,
  canReorder = true,
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !canReorder,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  }
  const onRowKey = useCallback((e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(task.id) }
  }, [onSelect, task.id])

  const handleSelect = useCallback(()=> onSelect(task.id), [onSelect, task.id])
  const handleDelete = useCallback((e)=>{ e.stopPropagation(); onDelete(task) }, [onDelete, task])
  const handleEdit = useCallback((e)=>{ e.stopPropagation(); onSelect(task.id) }, [onSelect, task.id])
  const handleToggle = useCallback(()=> onToggle(task.id), [onToggle, task.id])

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`todo-item ${task.completed ? 'is-completed' : ''} ${selected ? 'is-selected' : ''}`}
      onClick={handleSelect}
      role="option"
      tabIndex={0}
      onKeyDown={onRowKey}
      aria-selected={selected}
      aria-label={`${task.text.slice(0,60)}${task.completed?' — completed':''}${selected?' — selected':''}`}
    >
      <button
        type="button"
        className="todo-drag-handle"
        aria-label={canReorder ? `Reorder ${task.text.slice(0,30)}` : 'Reordering disabled — switch to Manual sort'}
        title={canReorder ? 'Drag to reorder' : 'Switch to Manual sort to reorder'}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        style={!canReorder ? { opacity: 0.25, cursor: 'not-allowed' } : undefined}
        disabled={!canReorder}
        tabIndex={canReorder ? 0 : -1}
      >
        <IconGrip size={14} />
      </button>

      <TaskCheckbox
        checked={task.completed}
        onChange={handleToggle}
        label={`Mark ${task.text.slice(0, 40)} ${task.completed ? 'incomplete' : 'complete'}`}
        stopPropagation
      />

      <div className="todo-item-body">
        <span className="todo-text">{task.text}</span>
        <TaskMeta task={task} />
      </div>

      <div className="todo-actions">
        <button type="button" className="todo-icon-btn edit" title="Edit (opens detail)" aria-label={`Edit ${task.text.slice(0,40)}`} onClick={handleEdit}>
          <IconPencil size={16} />
        </button>
        <button type="button" className="todo-icon-btn delete" title="Delete" aria-label={`Delete ${task.text.slice(0,40)}`} onClick={handleDelete}>
          <IconTrash size={16} />
        </button>
      </div>
    </li>
  )
}

export default memo(TaskRow)
