import { IconSparkle } from './Icons'

export function EmptyState({ message = 'Nothing here — enjoy the calm.', iconSize = 40, compact = false }) {
  return (
    <div className="todo-empty" role="status" style={compact ? { padding: '18px 0' } : undefined}>
      <div className="todo-empty-icon" aria-hidden="true"><IconSparkle size={iconSize} /></div>
      <p className="todo-empty-text" style={compact ? { fontSize: '13px' } : undefined}>{message}</p>
    </div>
  )
}
