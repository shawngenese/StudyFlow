import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { IconGrip } from '../Icons'
export default function Tile({ id, className='', isEditing, children, onAction }){
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, disabled: !isEditing })
  const style={ transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className={`bento-tile ${className} ${isEditing?'is-editing':''} ${isDragging?'is-dragging':''}`}>
      {isEditing && <button type="button" className="bento-handle" aria-label={`Reorder ${id}`} {...attributes} {...listeners}><IconGrip size={12} /></button>}
      {children}
    </div>
  )
}
