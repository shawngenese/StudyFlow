import { useEffect, useState } from 'react'
import { getToasts, subscribeToasts, dismissToast, toast } from '../lib/toast'

export function Toasts() {
  const [items, setItems] = useState(() => getToasts())
  useEffect(() => {
    const unsub = subscribeToasts(setItems)
    const onEvent = (e) => toast(e.detail?.message, e.detail?.tone)
    window.addEventListener('app-toast', onEvent)
    return () => {
      unsub()
      window.removeEventListener('app-toast', onEvent)
    }
  }, [])

  if (!items.length) return null
  const hasError = items.some((t) => t.tone === 'error')
  return (
    <div className="toast-stack" role={hasError ? 'alert' : 'status'} aria-live={hasError ? 'assertive' : 'polite'}>
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>
          <span>{t.message}</span>
          {t.action && (
            <button
              type="button"
              className="toast-action"
              onClick={() => {
                t.action.onClick()
                dismissToast(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            className="toast-close"
            aria-label="Dismiss notification"
            onClick={() => dismissToast(t.id)}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ))}
    </div>
  )
}
