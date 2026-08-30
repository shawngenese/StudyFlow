import { describe, it, expect, beforeEach } from 'vitest'
import { todayKey, parseDueDate, humanDue, isOverdue, relativeUpdated } from '../lib/date'
import { normalizeTask } from '../lib/storage'
import { renderMarkdown, exportTaskMarkdown } from '../lib/markdown'
import { toast, getToasts, dismissToast } from '../lib/toast'

describe('date lib', () => {
  it('todayKey formats', () => {
    expect(todayKey(new Date(2026,0,5))).toBe('2026-01-05')
  })
  it('parseDueDate guards non-string', () => {
    expect(parseDueDate(null)).toBeNull()
    expect(parseDueDate('')).toBeNull()
    expect(parseDueDate(123)).toBeNull()
  })
  it('humanDue guards invalid key', () => {
    expect(humanDue('')).toBe('')
    expect(humanDue('foo')).toBe('')
    expect(humanDue(null)).toBe('')
  })
  it('isOverdue false for invalid', () => {
    expect(isOverdue({ dueDate:'foo', completed:false})).toBe(false)
  })
  it('relativeUpdated guards', () => {
    expect(relativeUpdated(undefined)).toBe('')
    expect(relativeUpdated(Date.now()+10000)).toBe('just now')
  })
})

describe('storage normalize', () => {
  it('clamps priority and dedupes tags', () => {
    const t = normalizeTask({ text:'a', priority: 99, tags: ['A','a',' B '] })
    expect(t.priority).toBe(3)
    expect(t.tags).toEqual(['a','b'])
  })
  it('rejects bad dueDate', () => {
    expect(normalizeTask({ text:'a', dueDate:'foo'}).dueDate).toBeNull()
  })
})

describe('markdown', () => {
  it('strips script and on* handlers', () => {
    const html = renderMarkdown('<script>alert(1)</script><img src=x onerror="alert(2)">hi')
    expect(html).not.toContain('<script')
    expect(html).not.toContain('onerror')
  })
  it('strips javascript: href', () => {
    const html = renderMarkdown('[x](javascript:alert(1))')
    expect(html.toLowerCase()).not.toContain('javascript:')
  })
  it('export sanitizes newlines', () => {
    const md = exportTaskMarkdown({ text: 'a\n# injected', notes:'', tags:[], priority:0, dueDate:null, subtasks:[] }, 'Proj\nX')
    expect(md).not.toContain('\n# injected')
  })
})

describe('toast', () => {
  beforeEach(() => { getToasts().slice().forEach(t=>dismissToast(t.id)) })
  it('dedupes same message', () => {
    const a = toast('hello')
    toast('hello')
    expect(a).toBeDefined()
    expect(getToasts()).toHaveLength(1)
  })
  it('caps at 4', () => {
    for(let i=0;i<6;i++) toast('m'+i)
    expect(getToasts().length).toBeLessThanOrEqual(4)
  })
  it('dismiss non-existent no-ops', () => {
    const before = getToasts().length
    dismissToast('nope')
    expect(getToasts()).toHaveLength(before)
  })
})
