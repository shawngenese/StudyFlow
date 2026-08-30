import { useEffect, useState } from 'react'

export default function OfflineIndicator() {
  const [online, setOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true))
  const [showOffline, setShowOffline] = useState(false)

  useEffect(() => {
    function goOffline() {
      setOnline(false)
      setShowOffline(true)
    }
    function goOnline() {
      setOnline(true)
      setShowOffline(false)
    }
    window.addEventListener('offline', goOffline)
    window.addEventListener('online', goOnline)
    return () => {
      window.removeEventListener('offline', goOffline)
      window.removeEventListener('online', goOnline)
    }
  }, [])

  if (online && !showOffline) return null
  if (online) return null

  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
      background: 'var(--bg-panel)', border: '1px solid var(--border)', color: 'var(--text-muted)',
      padding: '6px 14px', borderRadius: '999px', fontSize: '12px', fontWeight: 500,
      boxShadow: 'var(--shadow-sm)', zIndex: 60, display: 'flex', gap: '6px', alignItems: 'center'
    }}>
      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--warning)', display: 'inline-block' }} aria-hidden="true" />
      Offline — local data saved
    </div>
  )
}
