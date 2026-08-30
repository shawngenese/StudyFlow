import { humanDue } from '../lib/date'
import { LIMITS } from '../lib/storage'

export default function Composer({ input, setInput, onAdd, heading, preview, inputRef }) {
  return (
    <>
      <form className="todo-input-row" onSubmit={onAdd} style={{ margin: 0, padding: '16px 16px 8px' }}>
        <label htmlFor="todo-input" className="sr-only">Add task</label>
        <input
          id="todo-input"
          ref={inputRef}
          type="text"
          className="todo-input"
          placeholder={`Add to ${heading}… (try "essay #chem !high tomorrow")`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={LIMITS.TASK_TEXT}
          aria-describedby="composer-help"
        />
        <button type="submit" className="todo-add-btn" disabled={!input.trim()} aria-label="Add task">Add</button>
      </form>
      {preview && (
        <div style={{ padding: '0 16px 8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }} aria-live="polite" aria-label="Parsed preview">
          {preview.tags.map((t) => (
            <span key={t} className="chip chip-tag">#{t}</span>
          ))}
          {preview.prio && <span className={`chip chip-priority ${preview.prio === 'High' ? 'p3' : preview.prio === 'Medium' ? 'p2' : 'p1'}`}>{preview.prio}</span>}
          {preview.due && <span className="chip chip-due">{humanDue(preview.due)} · {preview.due}</span>}
          <span className="muted" style={{ fontSize: '11px' }}>· preview</span>
        </div>
      )}
      <div id="composer-help" className="sr-only">Use #tag for tags, !high !medium !low for priority, and natural dates like tomorrow.</div>
      {!preview && input.trim() && (
        <div style={{ padding: '0 16px 8px' }} className="muted" aria-hidden="true">
          <span style={{ fontSize: '11px' }}>Hints: <code>#tag</code> <code>!high !medium !low</code> <code>tomorrow 5pm</code></span>
        </div>
      )}
    </>
  )
}
