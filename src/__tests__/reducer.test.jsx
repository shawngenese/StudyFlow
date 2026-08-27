import { describe, it, expect } from 'vitest'
import { reducer, initialState } from '../state/reducer'

function withTask(text = 'task') {
  let state = initialState()
  state = reducer(state, { type: 'task/add', text })
  return state
}

describe('todos reducer', () => {
  it('adds a task at the top', () => {
    const state = withTask('hello')
    expect(state.present.tasks).toHaveLength(1)
    expect(state.present.tasks[0].text).toBe('hello')
    expect(state.present.tasks[0].projectId).toBe('inbox')
    expect(state.past).toHaveLength(1)
  })

  it('ignores empty task text', () => {
    const state = reducer(initialState(), { type: 'task/add', text: '   ' })
    expect(state.present.tasks).toHaveLength(0)
    expect(state.past).toHaveLength(0)
  })

  it('toggles completion and syncs status', () => {
    let state = withTask('a')
    const id = state.present.tasks[0].id
    state = reducer(state, { type: 'task/toggle', id })
    expect(state.present.tasks[0].completed).toBe(true)
    expect(state.present.tasks[0].status).toBe('done')
    state = reducer(state, { type: 'task/toggle', id })
    expect(state.present.tasks[0].completed).toBe(false)
    expect(state.present.tasks[0].status).toBe('todo')
  })

  it('deletes tasks', () => {
    let state = withTask('a')
    const id = state.present.tasks[0].id
    state = reducer(state, { type: 'task/delete', id })
    expect(state.present.tasks).toHaveLength(0)
  })

  it('reorders tasks', () => {
    let state = reducer(initialState(), { type: 'task/add', text: 'first' })
    state = reducer(state, { type: 'task/add', text: 'second' })
    const ids = state.present.tasks.map((t) => t.text)
    state = reducer(state, { type: 'task/reorder', activeId: state.present.tasks[1].id, overId: state.present.tasks[0].id })
    expect(state.present.tasks.map((t) => t.text)).toEqual([ids[1], ids[0]])
  })

  it('manages subtasks and computes nothing lost on delete', () => {
    let state = withTask('parent')
    const taskId = state.present.tasks[0].id
    state = reducer(state, { type: 'subtask/add', taskId, text: 'step 1' })
    expect(state.present.tasks[0].subtasks).toHaveLength(1)
    const subId = state.present.tasks[0].subtasks[0].id
    state = reducer(state, { type: 'subtask/toggle', taskId, subId })
    expect(state.present.tasks[0].subtasks[0].completed).toBe(true)
    state = reducer(state, { type: 'subtask/delete', taskId, subId })
    expect(state.present.tasks[0].subtasks).toHaveLength(0)
  })

  it('supports undo and redo across actions', () => {
    let state = withTask('one')
    state = reducer(state, { type: 'task/add', text: 'two' })
    expect(state.present.tasks).toHaveLength(2)
    state = reducer(state, { type: 'undo' })
    expect(state.present.tasks).toHaveLength(1)
    state = reducer(state, { type: 'redo' })
    expect(state.present.tasks).toHaveLength(2)
  })

  it('undo is a no-op with empty history', () => {
    const state = reducer(initialState(), { type: 'undo' })
    expect(state.future).toHaveLength(0)
  })

  it('clears completed but keeps incomplete tasks', () => {
    let state = withTask('done-thing')
    const id = state.present.tasks[0].id
    state = reducer(state, { type: 'task/toggle', id })
    state = reducer(state, { type: 'task/add', text: 'open-thing' })
    const doneId = state.present.tasks.find((t) => t.text === 'done-thing').id
    state = reducer(state, { type: 'completed/clear', ids: [doneId] })
    expect(state.present.tasks.map((t) => t.text)).toEqual(['open-thing'])
  })

  it('deleting a project moves its tasks to inbox and protects inbox', () => {
    let state = initialState()
    state = reducer(state, { type: 'project/add', name: 'Work' })
    const workId = state.present.projects.find((p) => p.name === 'Work').id
    state = reducer(state, { type: 'task/add', text: 'spec', projectId: workId })
    state = reducer(state, { type: 'project/delete', id: workId })
    expect(state.present.projects.find((p) => p.id === workId)).toBeUndefined()
    expect(state.present.tasks[0].projectId).toBe('inbox')
    state = reducer(state, { type: 'project/delete', id: 'inbox' })
    expect(state.present.projects.some((p) => p.id === 'inbox')).toBe(true)
  })
})
