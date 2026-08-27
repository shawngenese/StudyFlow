import { useEffect, useReducer, useRef } from 'react'
import { initialState, reducer } from '../state/reducer'
import { saveData } from '../lib/storage'

export function useTodos() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const first = useRef(true)
  const timer = useRef(null)
  const latest = useRef(state.present)
  useEffect(()=>{ latest.current=state.present },[state.present])

  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => saveData(latest.current), 400)
    return () => clearTimeout(timer.current)
  }, [state.present])

  useEffect(() => {
    const flush = () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
      try { saveData(latest.current) } catch { /* ignore */ }
    }
    const onVis = () => { if (document.visibilityState === 'hidden') flush() }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'shawn-todos-v3' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (parsed) dispatch({ type: '__hydrate', data: parsed })
        } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return [state.present, dispatch]
}
