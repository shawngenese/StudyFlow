import { IconLayers, IconList, IconBoard, IconCalendar, IconBookmark, IconBolt, IconSun } from './Icons'

const VIEW_TABS = [
  ['dashboard', IconLayers, 'Dashboard'],
  ['list', IconList, 'List'],
  ['board', IconBoard, 'Board'],
  ['calendar', IconCalendar, 'Calendar'],
  ['habits', IconBolt, 'Habits'],
  ['focus', IconSun, 'Focus'],
  ['notes', IconBookmark, 'Notes'],
]

export default function ViewHeader({ heading, activeCount, visibleTasksLength, view, setView, onHelp }) {
  return (
    <div className="bento-tile tile-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ minWidth: 0, flex: '1 1 200px' }}>
        <h1 style={{ fontSize: '28px', margin: 0, fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>{heading}</h1>
        <p className="todo-subtitle" style={{ margin: '2px 0 0' }}>
          {visibleTasksLength === 0 ? 'Nothing here yet.' : `${activeCount} tasks to focus on.`}
          <button type="button" onClick={onHelp} aria-label="Help" title="Shortcuts (?)" style={{ marginLeft: '6px', fontSize: '11px', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '999px', padding: '1px 7px', background: 'var(--bg-inset)' }}>?</button>
        </p>
      </div>
      <div className="segmented" role="tablist" aria-label="View mode">
        {VIEW_TABS.map(([key, Icon, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={(view.viewMode || 'list') === key}
            aria-label={label}
            type="button"
            className={(view.viewMode || 'list') === key ? 'is-active' : ''}
            onClick={() => setView((v) => ({ ...v, viewMode: key }))}
            aria-controls="task-panel"
          >
            <Icon size={14} /><span className="view-label">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
