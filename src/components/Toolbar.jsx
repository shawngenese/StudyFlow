import { IconBookmark } from './Icons'
import { estimateStorageSize } from '../lib/storage'

export default function Toolbar({
  query,
  setQuery,
  sort,
  setSort,
  tagFilter,
  setTagFilter,
  allTags,
  sorts,
  onSaveFilter,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  data,
  searchRef,
  onExport,
  onImport,
}) {
  const storageLabel = (() => {
    const s = estimateStorageSize(data)
    const kb = Math.round(s / 1024)
    const pct = Math.min(100, Math.round((s / 4800000) * 100))
    return `${kb}KB · ${pct}%`
  })()

  return (
    <div className="toolbar">
      <div className="toolbar-search">
        <input ref={searchRef} type="search" placeholder="Search…  ( / )" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search tasks" />
      </div>
      <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort order">
        {sorts.map((s) => (
          <option key={s.key} value={s.key}>Sort: {s.label}</option>
        ))}
      </select>
      <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} aria-label="Filter by tag">
        <option value="">All tags</option>
        {allTags.map((tag) => (
          <option key={tag} value={tag}>#{tag}</option>
        ))}
      </select>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={onSaveFilter}
        disabled={!query && !tagFilter}
        title={query || tagFilter ? 'Save current search + tag as filter' : 'Add a search or tag filter first'}
        aria-disabled={!query && !tagFilter}
        style={!query && !tagFilter ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
      >
        <IconBookmark size={13} /> Save filter
      </button>
      <button type="button" className="btn btn-ghost" onClick={onUndo} disabled={!canUndo} title={canUndo ? 'Undo (Ctrl+Z)' : 'Nothing to undo'} aria-disabled={!canUndo} style={!canUndo ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>↩ Undo</button>
      <button type="button" className="btn btn-ghost" onClick={onRedo} disabled={!canRedo} title={canRedo ? 'Redo (Ctrl+Shift+Z)' : 'Nothing to redo'} aria-disabled={!canRedo} style={!canRedo ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}>↪ Redo</button>
      <span className="muted" style={{ fontSize: '11px', alignSelf: 'center', whiteSpace: 'nowrap' }} title="Local storage usage">{storageLabel}</span>
      <details style={{ position: 'relative' }}>
        <summary className="btn btn-ghost" style={{ listStyle: 'none', cursor: 'pointer' }} aria-label="More actions">⋯</summary>
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '12px', padding: '6px', display: 'flex', flexDirection: 'column', gap: '4px', boxShadow: 'var(--shadow-md)', zIndex: 10, minWidth: '140px' }}>
          <button type="button" className="btn btn-ghost" style={{ justifyContent: 'flex-start' }} onClick={onExport}>Export JSON</button>
          <label className="btn btn-ghost" style={{ cursor: 'pointer', justifyContent: 'flex-start' }}>
            Import<input type="file" accept=".json,application/json" hidden onChange={onImport} />
          </label>
        </div>
      </details>
    </div>
  )
}
