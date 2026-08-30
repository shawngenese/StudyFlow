import { useCallback, useMemo } from 'react'
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import TaskRow from './TaskRow'
import { EmptyState } from './EmptyState'

export default function ListView({ tasks, selectedId, onSelect, dispatch, onDelete, canReorder = true }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const ids = useMemo(()=> tasks.map(t=>t.id), [tasks])

  const handleDragEnd = useCallback((event) => {
    if (!canReorder) return
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = ids.indexOf(active.id)
    const newIndex = ids.indexOf(over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const ordered = arrayMove(ids, oldIndex, newIndex)
    dispatch({ type: 'task/reorderMany', ids: ordered })
  }, [canReorder, ids, dispatch])

  const handleToggle = useCallback((id) => dispatch({ type: 'task/toggle', id }), [dispatch])

  if (!tasks.length) {
    return <EmptyState />
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd} modifiers={[restrictToVerticalAxis]}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="todo-list" role="listbox" aria-label="Tasks">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              selected={selectedId === task.id}
              onSelect={onSelect}
              onToggle={handleToggle}
              onDelete={onDelete}
              canReorder={canReorder}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
