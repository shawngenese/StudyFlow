import { useEffect, useState } from 'react'
import { getSyncStatus, subscribeSyncStatus } from '../lib/syncStatus'
import { useAuth } from '../lib/auth'

export default function SyncStatus() {
  const { user } = useAuth()
  const [status, setStatus] = useState(() => getSyncStatus())

  useEffect(() => subscribeSyncStatus(setStatus), [])

  if (!user) return null
  if (status.state === 'idle') return null

  const time =
    status.state === 'synced'
      ? new Date(status.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`sync-pill sync-${status.state}`}
      title={status.detail || (status.state === 'error' ? 'Last sync failed — retrying' : '')}
    >
      <span className="sync-dot" aria-hidden="true" />
      {status.state === 'synced' ? `Synced · ${time}` : status.state === 'syncing' ? 'Syncing…' : 'Sync error'}
    </div>
  )
}