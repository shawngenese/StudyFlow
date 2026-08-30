import { useMemo, useState, useCallback } from 'react'
import { todayKey } from '../lib/date'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthGrid(year, month) {
  const first = new Date(year, month, 1, 12, 0, 0)
  const startDay = first.getDay()
  const cells = []
  const start = new Date(year, month, 1 - startDay, 12, 0, 0)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i, 12, 0, 0)
    cells.push(d)
  }
  return cells
}

export default function CalendarView({ tasks, allTasks, onSelect, onCreate }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [expanded, setExpanded] = useState(null)

  const byDate = useMemo(() => {
    const source = allTasks || tasks || []
    const map = {}
    for (const t of source) {
      if (!t.dueDate) continue
      ;(map[t.dueDate] ||= []).push(t)
    }
    return map
  }, [allTasks, tasks])

  const cells = useMemo(() => monthGrid(year, month), [year, month])
  const today = todayKey()

  const move = useCallback((delta) => {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m)
    setYear(y)
    setExpanded(null)
  }, [month, year])

  const goToday = useCallback(() => {
    const n = new Date()
    setYear(n.getFullYear()); setMonth(n.getMonth()); setExpanded(null)
  }, [])

  const toggleExpand = useCallback((key, isExpanded)=> setExpanded(isExpanded ? null : key), [])

  return (
    <div className="calendar" role="grid" aria-label="Calendar">
      <header className="calendar-header">
        <button type="button" className="btn btn-ghost" onClick={() => move(-1)} aria-label="Previous month">‹</button>
        <h2 aria-live="polite" aria-atomic="true">{new Date(year, month, 12).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h2>
        <button type="button" className="btn btn-ghost" onClick={() => move(1)} aria-label="Next month">›</button>
        <button type="button" className="btn btn-ghost" onClick={goToday} aria-label="Go to today">Today</button>
      </header>
      <div className="calendar-weekdays" role="row">
        {WEEKDAYS.map((d) => <span key={d} role="columnheader">{d}</span>)}
      </div>
      <div className="calendar-grid" role="rowgroup">
        {cells.map((date) => {
          const key = todayKey(date)
          const dayTasks = byDate[key] || []
          const isOtherMonth = date.getMonth() !== month
          const isExpanded = expanded === key
          const visible = isExpanded ? dayTasks : dayTasks.slice(0, 3)
          return (
            <div key={key} role="row"><div role="gridcell" className={`calendar-cell ${isOtherMonth ? 'is-other-month' : ''} ${key === today ? 'is-today' : ''}`} aria-label={`${key}, ${dayTasks.length} tasks`}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                <span className="calendar-daynum" aria-hidden="true">{date.getDate()}</span>
                {onCreate && <button type="button" aria-label={`Add task for ${key}`} title={`Add task for ${key}`} onClick={(e)=>{ e.stopPropagation(); onCreate(key) }} style={{ fontSize: '14px', lineHeight: 1, color: 'var(--text-muted)', padding: '2px 6px', borderRadius: '6px', background: 'var(--bg-inset)', border: '1px solid var(--border)', opacity: 0.85 }}>+</button>}
              </div>
              {visible.map((t) => (
                <button key={t.id} type="button" className={`calendar-task ${t.completed ? 'is-completed' : ''}`} onClick={(e)=>{ e.stopPropagation(); onSelect(t.id)}} title={t.text} aria-label={`${t.text}${t.completed?' — completed':''}`}>
                  {t.text}
                </button>
              ))}
              {dayTasks.length > 3 && (
                <button type="button" className="calendar-more" onClick={(e)=>{ e.stopPropagation(); toggleExpand(key, isExpanded)}} aria-expanded={isExpanded} aria-label={isExpanded ? 'Show less' : `Show ${dayTasks.length-3} more tasks`}>
                  {isExpanded ? 'Show less' : `+${dayTasks.length - 3} more`}
                </button>
              )}
            </div></div>
          )
        })}
      </div>
    </div>
  )
}
