import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import TaskRow from './TaskRow'
import { IconSparkle } from './Icons'

export default function ListView({ tasks, selectedId, onSelect, dispatch, onDelete, canReorder = true }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event) {
    if (!canReorder) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = tasks.map((t) => t.id)
    const oldIndex = ids.indexOf(active.id)
    const newIndex = ids.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const ordered = arrayMove(ids, oldIndex, newIndex)
    dispatch({ type: 'task/reorderMany', ids: ordered })
  }

  if (!tasks.length) {
    return (
      <div className="todo-empty" role="status">
        <div className="todo-empty-icon" aria-hidden="true"><IconSparkle size={40} /></div>
        <p className="todo-empty-text">Nothing here — enjoy the calm.</p>
      </div>
    )
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <ul className="todo-list" aria-label="Tasks">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedId === task.id}
              onSelect={onSelect}
              onToggle={(id) => dispatch({ type: 'task/toggle', id })}
              onDelete={onDelete}
              done={task.subtasks.filter((s) => s.completed).length}
              total={task.subtasks.length}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
