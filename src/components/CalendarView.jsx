import { useMemo, useState } from 'react'
import { todayKey } from '../lib/date'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const startDay = first.getDay()
  const cells = []
  const start = new Date(year, month, 1 - startDay)
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push(d)
  }
  return cells
}

export default function CalendarView({ tasks, allTasks, onSelect }) {
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())
  const [expanded, setExpanded] = useState(null)

  const source = allTasks || tasks || []
  const byDate = useMemo(() => {
    const map = {}
    for (const t of source) {
      if (!t.dueDate) continue
      ;(map[t.dueDate] ||= []).push(t)
    }
    return map
  }, [source])

  const cells = useMemo(() => monthGrid(year, month), [year, month])
  const today = todayKey()

  function move(delta) {
    let m = month + delta
    let y = year
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setMonth(m)
    setYear(y)
    setExpanded(null)
  }

  function goToday() {
    const n = new Date()
    setYear(n.getFullYear()); setMonth(n.getMonth()); setExpanded(null)
  }

  return (
    <div className="calendar" role="grid" aria-label="Calendar">
      <header className="calendar-header">
        <button type="button" className="btn btn-ghost" onClick={() => move(-1)} aria-label="Previous month">‹</button>
        <h2 aria-live="polite" aria-atomic="true">{new Date(year, month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <button type="button" className="btn btn-ghost" onClick={() => move(1)} aria-label="Next month">›</button>
        <button type="button" className="btn btn-ghost" onClick={goToday}>Today</button>
      </header>
      <div className="calendar-weekdays" role="row">
        {WEEKDAYS.map((d) => <span key={d} role="columnheader">{d}</span>)}
      </div>
      <div className="calendar-grid">
        {cells.map((date) => {
          const key = todayKey(date)
          const dayTasks = byDate[key] || []
          const isOtherMonth = date.getMonth() !== month
          const isExpanded = expanded === key
          const visible = isExpanded ? dayTasks : dayTasks.slice(0, 3)
          return (
            <div key={key} role="gridcell" className={`calendar-cell ${isOtherMonth ? 'is-other-month' : ''} ${key === today ? 'is-today' : ''}`}>
              <span className="calendar-daynum">{date.getDate()}</span>
              {visible.map((t) => (
                <button key={t.id} type="button" className={`calendar-task ${t.completed ? 'is-completed' : ''}`} onClick={() => onSelect(t.id)} title={t.text}>
                  {t.text}
                </button>
              ))}
              {dayTasks.length > 3 && (
                <button type="button" className="calendar-more" onClick={() => setExpanded(isExpanded ? null : key)}>
                  {isExpanded ? 'Show less' : `+${dayTasks.length - 3} more`}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
