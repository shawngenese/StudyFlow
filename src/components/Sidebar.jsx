import { useState, useCallback, useEffect, useRef } from 'react'
import {
  IconLayers, IconSunHigh, IconTelescope, IconFlame, IconBolt, IconInbox, IconFolder, IconBookmark, IconSparkle,
} from './Icons'
import { LIMITS } from '../lib/storage'
import { useAuth } from '../lib/auth'
import { loadData } from '../lib/storage'
import { fetchRemoteWorkspace, hasWorkspaceData, syncWorkspace } from '../lib/sync'
import { toast } from '../lib/toast'

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
  const navRef = useRef(null)
  const { user, logout } = useAuth()

  const signOut = useCallback(async () => {
    await logout()
  }, [logout])

  const syncNow = useCallback(async () => {
    if (!user) return
    toast('Syncing…', 'info')
    const { merged, updated_at, error } = await syncWorkspace(user.id, loadData())
    if (error || !updated_at) {
      toast(`Sync failed: ${error?.message || 'no response'}`, 'error')
    } else {
      toast(merged ? 'Pushed — nothing lost, everything merged' : 'Pushed your data to the server')
    }
  }, [user])

  const checkServer = useCallback(async () => {
    if (!user) return
    const { data: row, error } = await fetchRemoteWorkspace(user.id)
    if (error) {
      toast(`Server check failed: ${error.message}`, 'error')
      return
    }
    if (!row) {
      toast('No server row for this account yet — tap Sync now')
      return
    }
    toast(hasWorkspaceData(row.workspace) ? 'Server row HAS your data ✓' : 'Server row is EMPTY ✗', hasWorkspaceData(row.workspace) ? 'info' : 'error')
  }, [user])

  const addProject = useCallback((e) => {
    e.preventDefault()
    const name = newProject.trim()
    if (!name) return
    if (name.length > LIMITS.PROJECT_NAME) return
    onProjectAdd(name)
    setNewProject('')
  }, [newProject, onProjectAdd])

  // Focus trap when sidebar is open on mobile
  useEffect(() => {
    if (!open) return
    const nav = navRef.current
    if (!nav) return
    // focus close button or first focusable
    const focusable = nav.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    // initial focus
    const active = document.activeElement
    if (!nav.contains(active)) {
      // delay to avoid stealing focus from palette
      setTimeout(() => first?.focus(), 30)
    }
    function onKey(e) {
      if (e.key !== 'Tab' || !nav.contains(document.activeElement)) return
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last?.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <nav ref={navRef} id="app-sidebar" className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Views and projects" aria-hidden={open ? undefined : undefined}>
      <button type="button" className="sidebar-close" aria-label="Close menu" onClick={onClose}><span aria-hidden="true">×</span></button>
      <div className="sidebar-brand">
        <span className="logo" aria-hidden="true"><IconSparkle size={16} /></span> StudyFlow
      </div>

      <ul className="sidebar-list" role="list">
        {SMART_VIEWS.map(({ key, label, Icon }) => {
          const isActive = view.smart === key && !view.projectId && !view.savedFilterId
          return (
            <li key={key}>
              <button
                type="button"
                className={`sidebar-item ${isActive ? 'is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`${label}, ${taskCounts[key] ?? 0} tasks`}
                onClick={() => onViewChange({ smart: key, projectId: undefined, savedFilterId: undefined })}
              >
                <span className="sidebar-icon" aria-hidden="true"><Icon size={15} /></span>
                <span>{label}</span>
                <span className="sidebar-count" aria-hidden="true">{taskCounts[key] ?? 0}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <div className="sidebar-heading">
        <h4 id="projects-heading">Projects</h4>
        <form onSubmit={addProject} className="sidebar-add-form" aria-labelledby="projects-heading">
          <input
            type="text"
            value={newProject}
            onChange={(e) => setNewProject(e.target.value)}
            placeholder="+ New"
            aria-label="New project name"
            maxLength={LIMITS.PROJECT_NAME}
          />
        </form>
      </div>
      <ul className="sidebar-list" role="list" aria-labelledby="projects-heading">
        {data.projects.map((p) => {
          const active = view.smart === null && view.projectId === p.id
          return (
            <li key={p.id} className={`sidebar-project ${active ? 'is-active' : ''}`}>
              <button
                type="button"
                className={`sidebar-item ${active ? 'is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                aria-label={`Project ${p.name}, ${taskCounts.projects[p.id] || 0} tasks`}
                onClick={() => onViewChange({ smart: null, projectId: p.id })}
              >
                <span className="sidebar-icon" aria-hidden="true">
                  {p.id === 'inbox' ? <IconInbox size={15} /> : <IconFolder size={15} />}
                </span>
                <span>{p.name}</span>
                <span className="sidebar-count" aria-hidden="true">{taskCounts.projects[p.id] || 0}</span>
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
          <div className="sidebar-heading"><h4 id="filters-heading">Saved filters</h4></div>
          <ul className="sidebar-list" role="list" aria-labelledby="filters-heading">
            {data.savedFilters.map((f) => {
              const isActive = view.savedFilterId === f.id
              return (
                <li key={f.id}>
                  <div className={`sidebar-item-wrap ${isActive ? 'is-active' : ''}`}>
                    <button
                      type="button"
                      className={`sidebar-item ${isActive ? 'is-active' : ''}`}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={`Filter ${f.name}`}
                      onClick={() => onViewChange({ savedFilterId: f.id, smart: f.smart ?? null, projectId: f.projectId || undefined, query: f.query, tagFilter: f.tagFilter })}
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
              )
            })}
          </ul>
        </>
      )}
    {user && (
        <div className="sidebar-user">
          <span className="sidebar-user-email" title={user.email}>{user.email}</span>
          <span className="sidebar-user-id" title={user.id}>uid {user.id.slice(0, 13)}…</span>
          <div className="sidebar-syncbtns">
            <button type="button" className="sidebar-signout-thin" onClick={syncNow}>Sync now</button>
            <button type="button" className="sidebar-signout-thin" onClick={checkServer}>Check server</button>
          </div>
          <button type="button" className="sidebar-signout" onClick={signOut}>Sign out</button>
        </div>
      )}
    </nav>
  )
}
