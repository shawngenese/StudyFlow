import { describe, it, expect } from 'vitest'
import { reducer, initialState } from '../state/reducer'

function makeState() { return initialState() }

describe('reducer extra guards', () => {
  it('rejects invalid setStatus', () => {
    let s = makeState()
    s = reducer(s, { type:'task/add', text:'t' })
    const id = s.present.tasks[0].id
    const before = s
    s = reducer(s, { type:'task/setStatus', id, status:'garbage'})
    expect(s).toBe(before)
  })
  it('no history on missing id update', () => {
    let s = makeState()
    s = reducer(s, { type:'task/update', id:'nope', patch:{text:'x'}})
    expect(s.past).toHaveLength(0)
  })
  it('task/add clamps priority', () => {
    let s = reducer(makeState(), { type:'task/add', text:'a', priority:99})
    expect(s.present.tasks[0].priority).toBe(3)
  })
  it('reorderMany rejects duplicates', () => {
    let s = makeState()
    s = reducer(s, { type:'task/add', text:'a'})
    s = reducer(s, { type:'task/add', text:'b'})
    const ids = s.present.tasks.map(t=>t.id)
    const dup = [ids[0], ids[0]]
    const before = s
    s = reducer(s, { type:'task/reorderMany', ids: dup })
    expect(s).toBe(before)
  })
  it('project/add rejects duplicate name', () => {
    let s = reducer(makeState(), { type:'project/add', name:'Work'})
    const before = s
    s = reducer(s, { type:'project/add', name:'work'})
    expect(s).toBe(before)
  })
  it('project/rename protects inbox', () => {
    let s = makeState()
    const before = s
    s = reducer(s, { type:'project/rename', id:'inbox', name:'Nope'})
    expect(s).toBe(before)
  })
  it('filter/save id not overwritable', () => {
    let s = reducer(makeState(), { type:'filter/save', filter:{ name:'F', id:'evil', query:'q'}})
    expect(s.present.savedFilters[0].id).not.toBe('evil')
  })
  it('completed/clear needs array', () => {
    const s0 = makeState()
    expect(reducer(s0, { type:'completed/clear', ids:'abc'})).toBe(s0)
  })
  it('history limit capped', () => {
    let s = makeState()
    for(let i=0;i<110;i++) s = reducer(s, { type:'task/add', text:'t'+i})
    expect(s.past.length).toBeLessThanOrEqual(100)
  })
  it('task/update rejects empty text', () => {
    let s = reducer(makeState(), { type:'task/add', text:'a'})
    const id = s.present.tasks[0].id
    const before = s
    s = reducer(s, { type:'task/update', id, patch:{text:'   '}})
    expect(s).toBe(before)
  })
})
