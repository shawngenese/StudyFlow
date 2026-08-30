import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// in-memory supabase (a single user_data row + realtime fan-out)
const fake = vi.hoisted(() => {
  const store = new Map() // userId -> { workspace, updated_at }
  const listeners = new Set()
  let seq = 1_700_000_000_000
  const nextTs = () => new Date(++seq).toISOString()
  const clone = (x) => JSON.parse(JSON.stringify(x))
  return {
    pushCount: 0,
    fetchCount: 0,
    store,
    emit(payload) { for (const l of listeners) l(payload) },
    remoteWrite(workspace) {
      const row = { workspace, updated_at: nextTs() }
      store.set('u1', clone(row))
      fake.emit({ new: clone(row) })
    },
    serverWorkspace() { return clone(store.get('u1')?.workspace || {}) },
    reset() { store.clear(); listeners.clear(); this.pushCount = 0; this.fetchCount = 0 },
    supabase: {
      from() {
        return {
          select: () => ({
            eq: (k, v) => ({
              maybeSingle: async () => {
                fake.fetchCount++
                const row = store.get(v)
                return { data: row ? clone(row) : null, error: null }
              },
            }),
          }),
          upsert: (obj) => {
            fake.pushCount++
            const updated_at = nextTs()
            store.set(obj.id, { workspace: clone(obj.workspace), updated_at })
            fake.emit({ new: { workspace: clone(obj.workspace), updated_at } })
            return { select: () => ({ single: async () => ({ data: { updated_at }, error: null }) }) }
          },
        }
      },
      channel(_name) {
        const ch = {
          _l: null,
          on(_evt, _cfg, cb) { ch._l = cb; return ch },
          subscribe() { if (ch._l) listeners.add(ch._l); return ch },
        }
        return ch
      },
      removeChannel(ch) { if (ch._l) listeners.delete(ch._l) },
    },
  }
})

vi.mock('../lib/auth', () => ({
  useAuth: () => ({ user: { id: 'u1', email: 'dev@example.com' } }),
}))
vi.mock('../lib/supabase', () => ({ supabase: fake.supabase }))

import { useTodos } from '../hooks/useTodos'

const wait = async (t) => { await act(async () => { await vi.advanceTimersByTimeAsync(t) }) }

beforeEach(() => {
  localStorage.clear()
  fake.reset()
  vi.useFakeTimers()
})

describe('useTodos cloud sync (two devices, fake supabase)', () => {
  it('converges after edits and writes NOTHING while idle (no endless loop)', async () => {
    const { result } = renderHook(() => useTodos())
    await wait(50) // bootstrap reconcile

    const countAfterMount = fake.pushCount
    act(() => result.current[1]({ type: 'task/add', text: 'hello from A' }))
    await wait(1500)
    const countAfterAdd = fake.pushCount
    expect(countAfterAdd).toBeGreaterThan(countAfterMount)

    // idle for 3 full self-heal intervals — must stay perfectly quiet
    for (let i = 0; i < 4; i++) await wait(15000)
    expect(fake.pushCount).toBe(countAfterAdd)

    // one more edit still converges and then goes quiet again
    act(() => result.current[1]({ type: 'task/add', text: 'second task' }))
    await wait(1500)
    const countAfterSecond = fake.pushCount
    expect(countAfterSecond).toBeGreaterThan(countAfterAdd)
    await wait(15000)
    expect(fake.pushCount).toBe(countAfterSecond)
  })

  it('pulls a task created on "another device" and keeps both', async () => {
    const { result } = renderHook(() => useTodos())
    await wait(50)

    act(() => result.current[1]({ type: 'task/add', text: 'note from A' }))
    await wait(1500)

    // simulate the other device writing its own task
    const remote = fake.serverWorkspace()
    remote.tasks = [...(remote.tasks || []), { id: 't-remote', text: 'note from incognito', createdAt: Date.now(), updatedAt: Date.now(), projectId: 'inbox', priority: 0, status: 'todo', completed: false, tags: [], subtasks: [], estimate: 0, repeat: null, notes: '', dueDate: null }]
    fake.remoteWrite(remote)
    await wait(2000)

    const ids = result.current[0].tasks.map((t) => t.id).sort()
    expect(ids).toContain('t-remote')
    expect(ids.length).toBe(2)
    expect(fake.serverWorkspace().tasks.length).toBe(2)
  })

  it('a delete on this device is NOT resurrected by a stale push from the other device', async () => {
    const { result } = renderHook(() => useTodos())
    await wait(50)

    act(() => result.current[1]({ type: 'task/add', text: 'will be deleted' }))
    await wait(1500)
    const tId = result.current[0].tasks[0].id

    // other device pulls a copy (has the task) — fine, we still have it there too
    const saved = fake.serverWorkspace()

    // this device deletes it
    act(() => result.current[1]({ type: 'task/delete', id: tId }))
    await wait(1500)
    expect(result.current[0].tasks).toHaveLength(0)
    expect(fake.serverWorkspace().deleted.tasks[tId]).toBeTypeOf('number')

    // other device pushes a STALE copy that still contains the deleted task
    fake.remoteWrite({ ...saved, tasks: [saved.tasks[0]] })
    await wait(2000)

    expect(result.current[0].tasks).toHaveLength(0)
    expect(fake.serverWorkspace().tasks.filter((t) => t.id === tId)).toHaveLength(0)
  })
})