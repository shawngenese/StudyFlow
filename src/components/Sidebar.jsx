import { useState } from 'react'
import {
  IconLayers, IconSunHigh, IconTelescope, IconFlame, IconBolt, IconInbox, IconFolder, IconBookmark, IconSparkle,
} from './Icons'

const SMART_VIEWS = [
  { key: 'all', label: 'All tasks', Icon: IconLayers },
  { key: 'today', label: 'Today', Icon: IconSunHigh },
  { key: 'upcoming', label: 'Upcoming', Icon: IconTelescope },
  { key: 'overdue', label: 'Overdue', Icon: IconFlame },
  { key: 'high', label: 'High priority', Icon: IconBolt },
]
export default function Sidebar({
  data,
  view,
  open,
  onClose,
  onViewChange,
  onProjectAdd,
  onProjectDelete,
  onFilterDelete,
  taskCounts,
}) {
  const [newProject, setNewProject] = useState('')

  function addProject(e) {
    e.preventDefault()
    if (!newProject.trim()) return
    onProjectAdd(newProject.trim())
    setNewProject('')
  }

  return (
    <nav id="app-sidebar" className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Views and projects">
      <button type="button" className="sidebar-close" aria-label="Close menu" onClick={onClose}><span aria-hidden="true">×</span></button>
      <div className="sidebar-brand">
        <span className="logo"><IconSparkle size={16} /></span> Tasks
      </div>

      <ul className="sidebar-list">
        {SMART_VIEWS.map(({ key, label, Icon }) => (
          <li key={key}>
            <button
              type="button"
              className={`sidebar-item ${view.smart === key && !view.projectId && !view.savedFilterId ? 'is-active' : ''}`}
              onClick={() => onViewChange({ smart: key, projectId: undefined, savedFilterId: undefined })}
            >
              <span className="sidebar-icon" aria-hidden="true"><Icon size={15} /></span>
              <span>{label}</span>
              <span className="sidebar-count">{taskCounts[key]}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="sidebar-heading">
        <h4>Courses</h4>
        <form onSubmit={addProject} className="sidebar-add-form" aria-label="Add project">
          <input
            type="text"
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            placeholder="+ New"
            aria-label="New project name"
            maxLength={30}
          />
        </form>
      </div>
      <ul className="sidebar-list">
        {data.projects.map((p) => {
          const active = view.smart === null && view.projectId === p.id
          return (
            <li key={p.id} className={`sidebar-project ${active ? 'is-active' : ''}`}>
              <button
                type="button"
                className={`sidebar-item ${active ? 'is-active' : ''}`}
                onClick={() => onViewChange({ smart: null, projectId: p.id })}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  {p.id === 'inbox' ? <IconInbox size={15} /> : <IconFolder size={15} />}
                </span>
                <span>{p.name}</span>
                <span className="sidebar-count">{taskCounts.projects[p.id] || 0}</span>
              </button>
              {p.id !== 'inbox' && (
                <button
                  type="button"
                  className="sidebar-remove"
                  aria-label={`Delete project ${p.name}`}
                  title="Delete project (tasks move to Inbox)"
                  onClick={() => onProjectDelete(p)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              )}
            </li>
          )
        })}
      </ul>

      {data.savedFilters.length > 0 && (
        <>
          <div className="sidebar-heading"><h4>Saved filters</h4></div>
          <ul className="sidebar-list">
            {data.savedFilters.map((f) => (
              <li key={f.id}>
                <div className={`sidebar-item-wrap ${view.savedFilterId === f.id ? 'is-active' : ''}`}>
                  <button
                    type="button"
                    className={`sidebar-item ${view.savedFilterId === f.id ? 'is-active' : ''}`}
                    onClick={() => onViewChange({ smart: null, savedFilterId: f.id, query: f.query, tagFilter: f.tagFilter, ...f.filter })}
                  >
                    <span className="sidebar-icon" aria-hidden="true"><IconBookmark size={14} /></span>
                    <span>{f.name}</span>
                  </button>
                  <button
                    type="button"
                    className="sidebar-remove"
                    aria-label={`Remove filter ${f.name}`}
                    onClick={() => onFilterDelete(f.id)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </nav>
  )
}
