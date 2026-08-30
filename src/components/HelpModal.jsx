import { useEffect, useRef } from 'react'

const SHORTCUTS = [
  { keys: ['N'], desc: 'New task — focuses composer' },
  { keys: ['/'], desc: 'Search tasks' },
  { keys: ['⌘', 'K'], desc: 'Command palette' },
  { keys: ['?'], desc: 'This help' },
  { keys: ['Ctrl', 'Z'], desc: 'Undo' },
  { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Redo' },
  { keys: ['Esc'], desc: 'Close menu / palette / detail' },
]

const TIPS = [
  { code: 'essay #chem !high tomorrow', desc: '#tag, !p1–p3/!high, natural dates parse' },
  { code: 'Drag handle', desc: 'Reorder when Sort is Manual' },
  { code: 'Board', desc: 'Drag cards to change status' },
]

export default function HelpModal({ open, onClose }) {
  const closeRef = useRef(null)
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => closeRef.current?.focus(), 30)
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
    }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(id); window.removeEventListener('keydown', onKey) }
  }, [open, onClose])

  if (!open) return null
  return (
    <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <button type="button" onClick={onClose} aria-label="Close help" style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,14,0.55)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: 'none' }} />
      <div style={{ position: 'relative', background: 'var(--bg-panel)', border: '1px solid var(--border)', borderRadius: '16px', width: 'min(560px, 92vw)', boxShadow: 'var(--shadow-lg)', overflow: 'hidden', animation: 'slide-up 0.28s var(--ease-premium)', maxHeight: '90vh', overflowY: 'auto' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ margin: 0, fontSize: '16px' }}>Shortcuts & tips</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" style={{ padding: '6px 10px', borderRadius: '8px', background: 'var(--bg-inset)', border: '1px solid var(--border)' }}>✕</button>
        </header>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '13px', margin: '0 0 8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Keyboard</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {SHORTCUTS.map((s) => (
                <div key={s.desc} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ display: 'inline-flex', gap: '4px', minWidth: '120px' }}>
                    {s.keys.map((k) => (
                      <kbd key={k} style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', borderBottomWidth: '2px', padding: '2px 6px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{k}</kbd>
                    ))}
                  </span>
                  <span style={{ color: 'var(--text-soft)' }}>{s.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: '13px', margin: '0 0 8px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Composer</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {TIPS.map((t) => (
                <div key={t.code} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '13px', flexWrap: 'wrap' }}>
                  <code style={{ background: 'var(--bg-inset)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: '6px', fontSize: '11px' }}>{t.code}</code>
                  <span style={{ color: 'var(--text-soft)' }}>{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="muted" style={{ margin: 0, fontSize: '12px' }}>Tip: In List, switch Sort to Manual to enable drag reordering. Use <code>#tag</code> and <code>!high</code> in the composer — they’re stripped automatically.</p>
        </div>
      </div>
    </div>
  )
}
