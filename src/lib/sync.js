import { supabase } from './supabase'
import { SCHEMA_VERSION, TOMBSTONE_COLLECTIONS, TOMBSTONE_TTL, mergeDeletedMaps, filterDeletedItems } from './storage'

export const SYNC_META_KEY = 'shawn-sync-meta'

export function readSyncMeta() {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (!raw) return null
    const m = JSON.parse(raw)
    if (m && typeof m === 'object' && typeof m.userId === 'string' && Number.isFinite(m.lastSavedAt)) return m
  } catch { /* ignore */ }
  return null
}

export function writeSyncMeta(meta) {
  try { localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta)) } catch { /* ignore */ }
}

export function hasWorkspaceData(workspace) {
  if (!workspace || typeof workspace !== 'object') return false
  return (
    (workspace.tasks && workspace.tasks.length) ||
    (workspace.docs && workspace.docs.length) ||
    (workspace.habits && workspace.habits.length) ||
    (workspace.goals && workspace.goals.length) ||
    (workspace.savedFilters && workspace.savedFilters.length) ||
    (workspace.focusSessions && workspace.focusSessions.length)
  )
}

export async function fetchRemoteWorkspace(userId) {
  if (!supabase) return { data: null, error: new Error('Auth not configured') }
  const { data, error } = await supabase
    .from('user_data')
    .select('workspace, updated_at')
    .eq('id', userId)
    .maybeSingle()
  if (error) return { data: null, error }
  return { data: data || null, error: null }
}

export async function pushRemoteWorkspace(userId, workspace) {
  if (!supabase) return { updated_at: null, error: new Error('Auth not configured') }
  const { data, error } = await supabase
    .from('user_data')
    .upsert({ id: userId, workspace, updated_at: new Date().toISOString() }, { onConflict: 'id' })
    .select('updated_at')
    .single()
  if (error) return { updated_at: null, error }
  return { updated_at: data?.updated_at ?? null, error: null }
}

let channelSeq = 0

export function subscribeRemote(userId, onChange) {
  if (!supabase) return () => {}
  // unique name per subscription: same-name channels are deduped by the client,
  // which breaks StrictMode remounts ('.on() after subscribe()' error)
  const name = `user-data-${userId}-${++channelSeq}`
  const channel = supabase.channel(name)
  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'user_data', filter: `id=eq.${userId}` },
      (payload) => { onChange(payload.new) }
    )
    .subscribe()
  return () => { supabase.removeChannel(channel) }
}

// ---- merge (union) semantics, so devices never clobber each other ----

function byId(list) {
  const m = new Map()
  for (const x of list) if (x && x.id) m.set(x.id, x)
  return m
}

function mergeByIdList(local, remote) {
  const m = byId(local || [])
  for (const x of remote || []) if (x && x.id && !m.has(x.id)) m.set(x.id, x)
  return [...m.values()]
}

function mergeByUpdatedAt(local, remote) {
  const m = byId(local || [])
  for (const x of remote || []) {
    if (!x || !x.id) continue
    const cur = m.get(x.id)
    if (!cur) m.set(x.id, x)
    else if ((x.updatedAt || 0) > (cur.updatedAt || 0)) m.set(x.id, x)
  }
  return [...m.values()]
}

function mergeHabits(local, remote) {
  const m = byId(local || [])
  for (const x of remote || []) {
    if (!x || !x.id) continue
    const cur = m.get(x.id)
    if (!cur) m.set(x.id, x)
    else m.set(x.id, { ...cur, completions: { ...(cur.completions || {}), ...(x.completions || {}) } })
  }
  return [...m.values()]
}

function mergeSessions(local, remote) {
  const seen = new Map()
  for (const s of [...(local || []), ...(remote || [])]) {
    if (!s || s.startedAt == null) continue
    const key = `${s.startedAt}:${s.taskId || ''}`
    if (!seen.has(key)) seen.set(key, s)
  }
  return [...seen.values()].sort((a, b) => a.startedAt - b.startedAt).slice(-200)
}

function pruneDeleted(m, now) {
  const out = {}
  for (const [k, t] of Object.entries(m)) if (now - t < TOMBSTONE_TTL) out[k] = t
  return out
}

export function mergeWorkspaces(local, remote) {
  const r = remote && typeof remote === 'object' ? remote : {}
  const tombRaw = mergeDeletedMaps(local?.deleted, r.deleted)
  const now = Date.now()
  const persisted = {}
  for (const coll of TOMBSTONE_COLLECTIONS) persisted[coll] = pruneDeleted(tombRaw[coll], now)
  return {
    version: SCHEMA_VERSION,
    projects: filterDeletedItems(mergeByIdList(local?.projects, r.projects), tombRaw.projects, null),
    tasks: filterDeletedItems(mergeByUpdatedAt(local?.tasks, r.tasks), tombRaw.tasks),
    savedFilters: filterDeletedItems(mergeByIdList(local?.savedFilters, r.savedFilters), tombRaw.savedFilters, null),
    habits: filterDeletedItems(mergeHabits(local?.habits, r.habits), tombRaw.habits, null),
    docs: filterDeletedItems(mergeByUpdatedAt(local?.docs, r.docs), tombRaw.docs),
    goals: filterDeletedItems(mergeByIdList(local?.goals, r.goals), tombRaw.goals, null),
    focusSessions: mergeSessions(local?.focusSessions, r.focusSessions),
    deleted: persisted,
  }
}

// fetch + merge only (does NOT write back)
export async function pullMergeWorkspace(userId, localWorkspace) {
  if (!supabase) return { merged: null, row: null, error: new Error('Auth not configured') }
  const { data, error } = await fetchRemoteWorkspace(userId)
  if (error) return { merged: null, row: null, error }
  const merged = data?.workspace ? mergeWorkspaces(localWorkspace, data.workspace) : localWorkspace
  return { merged, row: data || null, error: null }
}

// pull → merge → push. The row always ends up a superset of every device.
export async function syncWorkspace(userId, localWorkspace) {
  if (!supabase) return { merged: null, updated_at: null, error: new Error('Auth not configured') }
  const { merged, row, error } = await pullMergeWorkspace(userId, localWorkspace)
  if (error) return { merged: null, updated_at: null, error }
  const push = await pushRemoteWorkspace(userId, merged)
  return { merged, ...push, row }
}