import { useState, useCallback, useMemo } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { STATUS_LABELS } from '../state/reducer'
import { TaskCheckbox } from './TaskCheckbox'
import { TaskMeta } from './TaskMeta'

const COLUMNS = ['todo', 'doing', 'done']

function BoardCard({ task, onSelect, dispatch, canReorder = true }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, disabled: !canReorder && false /* keep draggable for status moves */ })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : undefined }
  const onKey = useCallback((e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(task.id) } }, [onSelect, task.id])
  const onToggle = useCallback((e) => {
    if(e && e.stopPropagation) e.stopPropagation()
    dispatch({ type: 'task/toggle', id: task.id })
  }, [dispatch, task.id])
  const handleSelect = useCallback(()=> onSelect(task.id), [onSelect, task.id])
  return (
    <div ref={setNodeRef} style={style} className={`board-card ${task.completed ? 'is-completed' : ''}`} onClick={handleSelect} onKeyDown={onKey} tabIndex={0} role="button" aria-label={`${task.text.slice(0,60)} — ${STATUS_LABELS[task.status]}`} {...attributes} {...listeners}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <TaskCheckbox
          checked={task.completed}
          onChange={onToggle}
          label={`Mark ${task.text.slice(0, 40)} ${task.completed ? 'incomplete' : 'complete'}`}
          stopPropagation
        />
        <span className="board-card-text" style={{ flex: 1, minWidth: 0 }}>{task.text}</span>
      </div>
      <TaskMeta task={task} compact />
    </div>
  )
}

function Column({ status, tasks, dragActive, onSelect, dispatch, canReorder = true }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col:${status}` })
  const ids = useMemo(()=> tasks.map(t=>t.id), [tasks])
  return (
    <section
      ref={setNodeRef}
      className={`board-column ${dragActive ? 'is-target' : ''} ${isOver ? 'is-over' : ''}`}
      aria-label={STATUS_LABELS[status]}
    >
      <header className="board-column-header">
        <h3>{STATUS_LABELS[status]}</h3>
        <span className="board-count" aria-label={`${tasks.length} tasks`}>{tasks.length}</span>
      </header>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="board-column-body" role="list" aria-label={`${STATUS_LABELS[status]} tasks`}>
          {tasks.map((task) => (
            <BoardCard key={task.id} task={task} onSelect={onSelect} dispatch={dispatch} canReorder={canReorder} />
          ))}
          {tasks.length === 0 && <p className="board-drop-hint" role="status">{dragActive ? 'Drop here' : 'No tasks'}</p>}
        </div>
      </SortableContext>
    </section>
  )
}

export default function BoardView({ tasks, dispatch, onSelect, canReorder = true }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )
  const [dragId, setDragId] = useState(null)

  const columns = useMemo(()=> {
    const map={ todo:[], doing:[], done:[] }
    for(const t of tasks){ if(map[t.status]) map[t.status].push(t); else map.todo.push(t) }
    return map
  }, [tasks])

  const handleDragEnd = useCallback((e) => {
    setDragId(null)
    const { active, over } = e
    if (!over) return
    const activeTask = tasks.find((t) => t.id === active.id)
    if (!activeTask) return
    const overIdStr = String(over.id)
    const overTask = tasks.find((t) => t.id === overIdStr)
    // intra-column reorder takes precedence over status move — reorder within filtered column (scoped)
    if (overTask && active.id !== over.id && overTask.status === activeTask.status) {
      if (!canReorder) return
      const colIds = columns[activeTask.status]?.map((t) => t.id) || []
      const from = colIds.indexOf(String(active.id))
      const to = colIds.indexOf(overIdStr)
      if (from === -1 || to === -1) return
      // Build ordered ids for this column only
      const ordered = [...colIds]
      const [moved] = ordered.splice(from, 1)
      ordered.splice(to, 0, moved)
      // Use scoped reorder to avoid shifting global order of other columns / filtered views
      dispatch({ type: 'task/reorderFiltered', ids: ordered, filterIds: colIds })
      return
    }
    const targetStatus = overTask ? overTask.status : overIdStr.startsWith('col:')
      ? overIdStr.slice(4)
      : null
    if (targetStatus && COLUMNS.includes(targetStatus) && targetStatus !== activeTask.status) {
      dispatch({ type: 'task/setStatus', id: active.id, status: targetStatus })
    }
  }, [tasks, canReorder, dispatch, columns])

  const handleDragStart = useCallback((e)=> setDragId(e.active.id), [])
  const handleCancel = useCallback(()=> setDragId(null), [])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleCancel}>
      <div className="board" role="list" aria-label="Board">
        {COLUMNS.map((col) => (
          <Column
            key={col}
            status={col}
            tasks={columns[col]}
            dragActive={!!dragId}
            onSelect={onSelect}
            dispatch={dispatch}
            canReorder={canReorder}
          />
        ))}
      </div>
    </DndContext>
  )
}
