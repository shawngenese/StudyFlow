export function TaskCheckbox({ checked, onChange, label, stopPropagation = false }) {
  const handleLabelClick = stopPropagation ? (e) => e.stopPropagation() : undefined
  const handleLabelKeyDown = stopPropagation ? (e) => e.stopPropagation() : undefined
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <label className="todo-check" onClick={handleLabelClick} onKeyDown={handleLabelKeyDown}>
      <input
        type="checkbox"
        checked={!!checked}
        onChange={onChange}
        aria-label={label}
      />
      <span className="todo-check-box" aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12">
          <path d="M3 8.5l3.2 3.2L13 4.8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </label>
  )
}
