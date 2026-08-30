import { describe, it, expect, vi } from 'vitest'

vi.mock('../lib/supabase', () => ({ supabase: null }))

import { mergeWorkspaces } from '../lib/sync'
import { filterDeletedItems, mergeDeletedMaps, normalizeImport } from '../lib/storage'

const base = () => ({
  version: 3,
  projects: [{ id: 'p1', name: 'inbox' }],
  tasks: [],
  savedFilters: [],
  habits: [],
  docs: [],
  goals: [],
  focusSessions: [],
  deleted: { projects: {}, savedFilters: {}, tasks: {}, habits: {}, docs: {}, goals: {} },
})

describe('mergeWorkspaces', () => {
  it('keeps tasks from both devices when each has one (union)', () => {
    const a = base()
    a.tasks = [{ id: 't1', title: 'note from A', updatedAt: 100 }]
    const b = base()
    b.tasks = [{ id: 't2', title: 'note from B', updatedAt: 200 }]
    const merged = mergeWorkspaces(a, b)
    expect(merged.tasks.map((t) => t.id).sort()).toEqual(['t1', 't2'])
  })

  it('newer updatedAt wins for the same task id', () => {
    const a = base()
    a.tasks = [{ id: 't1', title: 'old wording', updatedAt: 100 }]
    const b = base()
    b.tasks = [{ id: 't1', title: 'newer wording', updatedAt: 300 }]
    const merged = mergeWorkspaces(a, b)
    expect(merged.tasks).toHaveLength(1)
    expect(merged.tasks[0].title).toBe('newer wording')
  })

  it('never drops real local data when remote is empty', () => {
    const a = base()
    a.tasks = [{ id: 't1', title: 'keep me', updatedAt: 100 }]
    const merged = mergeWorkspaces(a, { version: 3 })
    expect(merged.tasks.map((t) => t.id)).toEqual(['t1'])
  })

  it('habit completions are merged, not replaced', () => {
    const a = base()
    a.habits = [{ id: 'h1', name: 'read', completions: { '2026-08-26': true } }]
    const b = base()
    b.habits = [{ id: 'h1', name: 'read', completions: { '2026-08-27': true } }]
    const merged = mergeWorkspaces(a, b)
    expect(merged.habits[0].completions).toEqual({ '2026-08-26': true, '2026-08-27': true })
  })

  it('two merges of the same pair are stable (no endless loop)', () => {
    const mk = (id, updatedAt) => ({ id, text: `task ${id}`, updatedAt, createdAt: 1 })
    const a = base()
    a.tasks = [mk('t1', 100)]
    const b = base()
    b.tasks = [mk('t1', 100), mk('t2', 300)]
    const once = normalizeImport(mergeWorkspaces(a, b))
    const twice = normalizeImport(mergeWorkspaces(normalizeImport(mergeWorkspaces(a, b)), b))
    expect(JSON.stringify(twice)).toBe(JSON.stringify(once))
  })

  it('a tombstone is respected even when the other side still has a stale copy', () => {
    const a = base()
    const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
    a.tasks = [{ id: 't1', title: 'stale copy on the other device', updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000 }]
    a.deleted = { ...a.deleted, tasks: { t1: twoDaysAgo } }
    const b = base()
    b.tasks = [{ id: 't1', title: 'the live copy on this device', updatedAt: 100 }]
    const merged = mergeWorkspaces(b, a)
    expect(merged.tasks).toHaveLength(0)
    expect(merged.deleted.tasks.t1).toBe(twoDaysAgo)
  })

  it('an item edited after a delete survives (resurrection allowed)', () => {
    const a = base()
    a.deleted = { ...a.deleted, tasks: { t1: 100 } }
    const b = base()
    b.tasks = [{ id: 't1', title: 'edited again after delete', updatedAt: 500 }]
    const merged = mergeWorkspaces(b, a)
    expect(merged.tasks.map((t) => t.id)).toEqual(['t1'])
  })
})

describe('tombstones', () => {
  it('filterDeletedItems drops entities without updatedAt when tombstoned', () => {
    const list = [{ id: 'p2', name: 'Project' }]
    expect(filterDeletedItems(list, { p2: 5 }, null)).toEqual([])
  })

  it('mergeDeletedMaps keeps the newer tombstone per id', () => {
    const merged = mergeDeletedMaps({ tasks: { t1: 100 } }, { tasks: { t1: 300, t2: 200 } })
    expect(merged.tasks).toEqual({ t1: 300, t2: 200 })
  })

  it('normalizeImport prunes tombstones older than the TTL', () => {
    const old = Date.now() - 200 * 24 * 60 * 60 * 1000
    const fresh = Date.now() - 1000
    const ws = base()
    ws.tasks.push({ id: 't1', title: 'gone', updatedAt: old })
    ws.deleted = { ...ws.deleted, tasks: { t1: old, t2: fresh } }
    const norm = normalizeImport(ws)
    expect(norm.tasks).toHaveLength(0)
    expect(norm.deleted.tasks.t1).toBeUndefined()
    expect(norm.deleted.tasks.t2).toBe(fresh)
  })
})