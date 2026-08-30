import { useEffect, useReducer, useRef, useCallback } from 'react'
import { initialState, reducer } from '../state/reducer'
import { saveData, normalizeImport, STORAGE_KEY, SCHEMA_VERSION } from '../lib/storage'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { pullMergeWorkspace, pushRemoteWorkspace, subscribeRemote, writeSyncMeta } from '../lib/sync'
import { setSyncStatus } from '../lib/syncStatus'
import { toast } from '../lib/toast'

export function useTodos() {
  const { user } = useAuth()
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const first = useRef(true)
  const timer = useRef(null)
  const latest = useRef(state.present)
  const prevVersion = useRef(state.present.version ?? SCHEMA_VERSION)

  // --- cloud sync refs ---
  const cloudTimer = useRef(null)
  const pushing = useRef(false)
  const pendingPush = useRef(false)
  const pendingHydrate = useRef(null)
  const lastCloudTs = useRef(0)
  const lastPushedJson = useRef('')

  const canon = useCallback((ws) => {
    const n = normalizeImport(ws)
    return n ? JSON.stringify(n) : ''
  }, [])

  useEffect(()=>{ latest.current=state.present },[state.present])
  // track version to allow hydration merge comparison
  useEffect(()=>{ prevVersion.current = state.present.version ?? SCHEMA_VERSION }, [state.present.version])

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null }
    try { saveData(latest.current) } catch { /* ignore */ }
  }, [])

  // serialized sync: pull → merge → push. Never clobbers; pushes back only
  // when we hold unsynced edits or the merge corrected the server copy.
  const reconcileCloud = useCallback(async (opts = {}) => {
    if (!supabase || !user) return
    pendingPush.current = true
    if (pushing.current) return
    pushing.current = true
    try {
      while (pendingPush.current) {
        pendingPush.current = false
        const cur = latest.current
        const curJson = canon(cur)
        const remoteDirty = curJson !== lastPushedJson.current
        // nothing to do unless we have unsynced local edits, or we were
        // asked to reconcile against a cross-device change
        if (!remoteDirty && !opts.force) break
        setSyncStatus({ state: 'syncing' })
        const { merged, row, error } = await pullMergeWorkspace(user.id, cur)
        if (error) {
          setSyncStatus({ state: 'error', detail: error?.message || 'pull failed' })
          toast('Sync failed — will retry automatically', 'error')
          break
        }
        const mergedJson = canon(merged)
        const serverJson = row?.workspace ? canon(row.workspace) : ''
        const needPush = remoteDirty || (serverJson && mergedJson !== serverJson)
        let updatedAt
        if (needPush) {
          const push = await pushRemoteWorkspace(user.id, merged)
          if (push.error || !push.updated_at) {
            setSyncStatus({ state: 'error', detail: push.error?.message || 'push failed' })
            toast('Sync failed — will retry automatically', 'error')
            break
          }
          updatedAt = push.updated_at
        } else {
          // absorbed a peer's change without echoing a write back
          updatedAt = row?.updated_at
        }
        lastCloudTs.current = new Date(updatedAt).getTime()
        lastPushedJson.current = mergedJson
        writeSyncMeta({ userId: user.id, lastSavedAt: lastCloudTs.current })
        setSyncStatus({ state: 'synced' })
        // apply merged remote items when nothing is being typed right now,
        // otherwise queue them so local edits win and the next pass converges
        if (mergedJson !== curJson) {
          if (timer.current || cloudTimer.current) pendingHydrate.current = merged
          else dispatch({ type: '__hydrate', data: merged })
        }
        opts.force = false
      }
    } finally {
      pushing.current = false
    }
  }, [user, canon])

  // apply a deferred merge once the user is idle (no in-flight edits)
  useEffect(() => {
    if (timer.current || cloudTimer.current || !pendingHydrate.current) return
    const data = pendingHydrate.current
    pendingHydrate.current = null
    dispatch({ type: '__hydrate', data })
  }, [state.present])

  // debounced local save (unchanged behavior)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      try { saveData(latest.current) } catch { /* ignore */ }
    }, 400)
    return () => {
      if (timer.current) { clearTimeout(timer.current); timer.current = null }
    }
  }, [state.present])

  // debounced + offline-safe cloud push after every change
  useEffect(() => {
    if (!supabase || !user) return
    if (cloudTimer.current) clearTimeout(cloudTimer.current)
    cloudTimer.current = setTimeout(() => {
      cloudTimer.current = null
      reconcileCloud()
    }, 800)
    return () => {
      if (cloudTimer.current) { clearTimeout(cloudTimer.current); cloudTimer.current = null }
    }
  }, [state.present, user, reconcileCloud])

  // self-heal: reconcile local vs last-pushed periodically (covers missed pushes)
  useEffect(() => {
    if (!supabase || !user) return
    const id = setInterval(() => {
      if (canon(latest.current) !== lastPushedJson.current) reconcileCloud()
    }, 15000)
    return () => clearInterval(id)
  }, [user, reconcileCloud, canon])

  // flush on page hide/unload and on unmount (local + cloud)
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'hidden') { flush(); reconcileCloud() } }
    const onPageHide = () => { flush(); reconcileCloud() }
    window.addEventListener('beforeunload', flush)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('beforeunload', flush)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVis)
      flush()
      reconcileCloud()
    }
  }, [flush, reconcileCloud])

// retry a failed push when connectivity returns
  useEffect(() => {
    if (!supabase) return
    const onOnline = () => reconcileCloud()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [reconcileCloud])

  // bootstrap: on login/session, reconcile (pull → merge → push).
  // Merge semantics guarantee nothing is ever lost or clobbered.
  useEffect(() => {
    if (!supabase || !user) return
    let cancelled = false
    setSyncStatus({ state: 'syncing' })
    ;(async () => {
      await reconcileCloud()
      if (cancelled) return
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, dispatch])

  // realtime: another device pushed → reconcile (fused via merge, not clobbered)
  useEffect(() => {
    if (!supabase || !user) return
    const off = subscribeRemote(user.id, (row) => {
      if (!row || !row.updated_at) return
      const ts = new Date(row.updated_at).getTime()
      if (ts <= lastCloudTs.current) return // own echo
      if (timer.current || cloudTimer.current) return // unsaved local edits win for now
      reconcileCloud({ force: true })
    })
    return off
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, dispatch])

  // cross-tab sync with version guard
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue)
          if (!parsed || typeof parsed !== 'object') return
          // only hydrate if incoming version is newer or has more tasks and not overwriting unsaved local edits
          const localVer = latest.current.version ?? 0
          const incomingVer = parsed.version ?? 0
          if (incomingVer < localVer) return
          // if timer pending, don't overwrite unsaved edits — defer
          if (timer.current) return
          dispatch({ type: '__hydrate', data: parsed })
        } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return [state.present, dispatch, state]
}