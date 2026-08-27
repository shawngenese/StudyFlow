import { useState, useCallback } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { STATUS_LABELS } from '../state/reducer'
import { IconCalendar, IconCheckSquare, IconFlag } from './Icons'

const COLUMNS = ['todo', 'doing', 'done']
const PRIORITY_SHORT = { 1: 'Low', 2: 'Med', 3: 'High' }

function BoardCard({ task, onSelect }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : undefined }
  const onKey = useCallback((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(task.id) } }, [onSelect, task.id])
  return (
    <div ref={setNodeRef} style={style} className={`board-card ${task.completed ? 'is-completed' : ''}`} onClick={() => onSelect(task.id)} onKeyDown={onKey} tabIndex={0} role="button" aria-label={task.text.slice(0,40)} {...attributes} {...listeners}>
      <span className="board-card-text">{task.text}</span>
      <div className="todo-meta">
        {task.priority > 0 && (
          <span className={`chip chip-priority p${task.priority}`}>
            <IconFlag size={11} /> {PRIORITY_SHORT[task.priority]}
          </span>
        )}
        {task.dueDate && <span className="chip chip-due"><IconCalendar size={11} /></span>}
        {task.subtasks.length > 0 && (
          <span className="chip chip-progress">
            <IconCheckSquare size={11} /> {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length}
          </span>
        )}
      </div>
    </div>
  )
}

function Column({ status, tasks, dragActive, onSelect }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${dragActive ? 'is-target' : ''} ${isOver ? 'is-over' : ''}`}
      aria-label={STATUS_LABELS[status]}
    >
      <header className="board-column-header">
        <h3>{STATUS_LABELS[status]}</h3>
        <span className="board-count">{tasks.length}</span>
      </header>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="board-column-body">
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} onSelect={onSelect} />
          ))}
          {tasks.length === 0 && <p className="board-drop-hint">{dragActive ? 'Drop here' : 'Empty'}</p>}
        </div>
      </SortableContext>
    </section>
  )
}

export default function BoardView({ tasks, dispatch, onSelect, canReorder = true }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const [dragId, setDragId] = useState(null)

  function handleDragEnd(e) {
    setDragId(null)
    const { active, over } = e
    if (!over) return
    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return
    const overTask = tasks.find((t) => t.id === over.id)
    // intra-column reorder takes precedence over status move
    if (overTask && active.id !== over.id && overTask.status === activeTask.status) {
      if (!canReorder) return
      dispatch({ type: 'task/reorder', activeId: active.id, overId: over.id })
      return
    }
    const targetStatus = overTask ? overTask.status : String(over.id).startsWith('col:')
      ? String(over.id).slice(4)
      : null
    if (targetStatus && COLUMNS.includes(targetStatus) && targetStatus !== activeTask.status) {
      dispatch({ type: 'task/setStatus', id: active.id, status: targetStatus })
    }
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={(e) => setDragId(e.active.id)} onDragEnd={handleDragEnd} onDragCancel={() => setDragId(null)}>
      <div className="board" role="list" aria-label="Board">
        {COLUMNS.map((col) => (
          <Column
            key={col}
            status={col}
            tasks={tasks.filter((t) => t.status === col)}
            dragActive={!!dragId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </DndContext>
  )
}
