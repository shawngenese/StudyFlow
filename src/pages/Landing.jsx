import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'
import LoginModal from '../components/LoginModal'

export default function Landing() {
  const { isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [loginOpen, setLoginOpen] = useState(false)

  // auto both: respect stored theme, otherwise prefers-color-scheme
  useEffect(() => {
    try {
      const stored = localStorage.getItem('shawn-theme')
      if (stored === 'light' || stored === 'dark') {
        document.documentElement.setAttribute('data-theme', stored)
        return
      }
    } catch { /* ignore */ }
    const mql = window.matchMedia?.('(prefers-color-scheme: light)')
    const apply = () => {
      document.documentElement.setAttribute('data-theme', mql?.matches ? 'light' : 'dark')
    }
    apply()
    mql?.addEventListener?.('change', apply)
    return () => mql?.removeEventListener?.('change', apply)
  }, [])

  const handleAuth = () => {
    if (isAuthenticated) {
      navigate('/app')
    } else {
      setLoginOpen(true)
    }
  }

  // a session appearing (e.g. after a magic-link redirect) drops you into the app
  useEffect(() => {
    if (isAuthenticated) navigate('/app')
  }, [isAuthenticated, navigate])

  return (
    <div className="landing-crafted">
      {/* 100vh shell */}
      <div className="landing-shell">
        <nav className="landing-nav" aria-label="Primary">
          <Link to="/" className="landing-logo" aria-label="StudyFlow home">
            <span className="landing-mark" aria-hidden="true">◐</span> StudyFlow
          </Link>
          <div className="landing-cta">
            <button type="button" className="landing-btn landing-btn-ghost" onClick={handleAuth}>
              {isAuthenticated ? 'Go to app' : 'Sign in'}
            </button>
            {isAuthenticated && (
              <button type="button" className="landing-btn landing-btn-ghost" onClick={logout}>Sign out</button>
            )}
            <button type="button" className="landing-btn landing-btn-primary" onClick={handleAuth}>Open App →</button>
          </div>
        </nav>

        <section className="landing-hero" aria-labelledby="hero-title">
          <div className="landing-hero-copy">
            <div className="landing-mono"><i aria-hidden="true" /> 001 — STUDENT OS · LOCAL-FIRST</div>
            <h1 id="hero-title">
              <span>Your student</span>
              <span>life, in <em>flow.</em></span>
            </h1>
            <p>
              Not another todo. <b>StudyFlow is a desk, not a dashboard</b> — tasks, habits, focus and notes share one surface. Type{' '}
              <code>essay #chem !high tomorrow</code> and it lands where it belongs. Sign in with Google, GitHub, or an emailed code — sync across devices.
            </p>
            <div className="landing-actions">
              <button type="button" className="landing-btn landing-btn-primary landing-btn-lg" onClick={handleAuth}>Open App — free</button>
              <a href="#how" className="landing-btn landing-btn-ghost">▶ How it works</a>
            </div>
            <div className="landing-micro" aria-label="Quick features">
              <span>⌘K to jump</span> <code>#tag</code> <code>!p1–p3</code> <code>tomorrow 5pm</code> · <span>local-first</span>
            </div>
          </div>

          <div className="landing-window" aria-hidden="true">
            <div className="landing-wbar">
              <div className="landing-dots2">
                <span style={{ background: '#ff5f56' }} />
                <span style={{ background: '#ffbd2e' }} />
                <span style={{ background: '#27c93f' }} />
              </div>{' '}
              All tasks — StudyFlow{' '}
              <span className="landing-wpill">List · Board · Calendar</span>
            </div>
            <div className="landing-wcontent">
              <div className="landing-wside">
                <b>Filters</b>
                <div className="landing-witem active">
                  ● All tasks <span>12</span>
                </div>
                <div className="landing-witem">○ Today <span>4</span></div>
                <div className="landing-witem">○ Overdue</div>
                <b style={{ marginTop: '8px' }}>Courses</b>
                <div className="landing-witem">▭ Chem 201</div>
                <div className="landing-witem">▭ Thesis</div>
              </div>
              <div className="landing-wmain">
                <div className="landing-composer">
                  <span>Add “distillation essay #chem !high tomorrow”</span>
                  <i>Add</i>
                </div>
                <div className="landing-task">
                  <span className="landing-chk done">✓</span>
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: 500 }}>Distillation essay — ch.4</span>
                  <span className="landing-tag accent">today · P3</span>
                </div>
                <div className="landing-task">
                  <span className="landing-chk" />
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: 500 }}>Anki + problem set</span>
                  <span className="landing-tag">45m</span>
                </div>
                <div className="landing-task" style={{ opacity: 0.6 }}>
                  <span className="landing-chk" />
                  <span style={{ flex: 1, fontSize: '12px', textDecoration: 'line-through' }}>Submit grant form</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>done</span>
                </div>
                <div className="landing-wfoot">
                  <span>8 left</span>
                  <span>Board →</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="landing-cred" role="note" aria-label="Trust signals">
          <span><strong>Local-first</strong> — works offline</span>
          <span className="sep" aria-hidden="true" />
          <span><strong>~130kB</strong> · code-split</span>
          <span className="sep" aria-hidden="true" />
          <span><strong>cloud sync</strong> · export JSON</span>
          <span style={{ marginLeft: 'auto' }}>local-first · sync on sign-in</span>
        </div>
      </div>

      {/* Below the fold — minimal */}
      <section id="how" className="landing-section">
        <div className="landing-kicker">01 — How it works</div>
        <h2>Three habits, one surface.</h2>
        <p className="landing-lede">Type it like you say it. No forms, no context switching. Everything you capture appears where you need it.</p>
        <div className="landing-steps">
          <div className="landing-step">
            <span className="step-num">01</span>
            <h3>Capture</h3>
            <p><code>essay #chem !high tomorrow 5pm</code> — <code>#tag</code>, <code>!p1–p3</code> and natural dates parse automatically.</p>
          </div>
          <div className="landing-step">
            <span className="step-num">02</span>
            <h3>Organize</h3>
            <p>Same task in List, Board and Calendar. Drag columns, filter by tag, <code>⌘K</code> to jump.</p>
          </div>
          <div className="landing-step">
            <span className="step-num">03</span>
            <h3>Flow</h3>
            <p>25m Focus bound to a task, 7-day habit strip, Markdown notes — all local.</p>
          </div>
        </div>
        <div className="landing-preview-grid">
          <div className="landing-mini">
            <div className="landing-mini-bar"><span>Board — Chem 201</span><span className="mini-pill">● 3 columns</span></div>
            <div className="landing-board">
              <div className="landing-col"><h4>Todo <span>4</span></h4><div className="landing-card">Write intro</div><div className="landing-card">Methods — fig.2</div></div>
              <div className="landing-col"><h4>Doing <span>1</span></h4><div className="landing-card" style={{ borderLeft: '3px solid var(--accent)' }}>Distillation essay</div></div>
              <div className="landing-col"><h4>Done <span>3</span></h4><div className="landing-card" style={{ opacity: 0.6, textDecoration: 'line-through' }}>Grant form</div></div>
            </div>
          </div>
          <div className="landing-mini focus-mini">
            <div className="landing-ring"><b>14:42</b></div>
            <div style={{ fontSize: '12px', fontWeight: 600 }}>Distillation essay — focusing</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>25m · 3/4 today</div>
          </div>
        </div>
      </section>

      <section id="faq" className="landing-section" style={{ paddingTop: 8 }}>
        <div className="landing-kicker">02 — FAQ</div>
        <h2>Zero lock-in.</h2>
        <div className="landing-faq">
          <div className="landing-faq-col">
            <h4>Privacy & data</h4>
            <div className="landing-faq-item"><b>Is it private?</b><p>Each user has a private row protected by your account — sign in with Google, GitHub, or an emailed code. Export JSON anytime.</p></div>
            <div className="landing-faq-item"><b>Offline?</b><p>After first load it works offline. No service worker yet — export to back up.</p></div>
          </div>
          <div className="landing-faq-col">
            <h4>Workflow</h4>
            <div className="landing-faq-item"><b>Quick-add?</b><p><code>chrono-node</code> parses <code>tomorrow</code>, <code>fri 5pm</code>; <code>#tag</code> + <code>!high</code> set meta.</p></div>
            <div className="landing-faq-item"><b>Views?</b><p>Dashboard, List, Board, Calendar, Habits, Focus, Notes. <code>⌘K</code> palette, <code>n</code> new, <code>/</code> search.</p></div>
          </div>
        </div>
      </section>

      <div className="landing-ctaFull">
        <div>
          <h3>Flow starts with one task.</h3>
          <p>Type it like you’d say it. No form, no friction.</p>
        </div>
        <div className="landing-field">
          <input placeholder='Try: "thesis wed 4pm #uni !high"' aria-label="Example task" readOnly />
          <button type="button" className="landing-btn landing-btn-primary" onClick={handleAuth}>Open App →</button>
        </div>
      </div>

      <footer className="landing-footer">
        <span><strong style={{ color: 'var(--text)' }}>StudyFlow</strong> — React 19 + Vite · local-first</span>
        <span>100% local · ⌘K · <button type="button" className="landing-linkbtn" onClick={handleAuth}>Go to app</button> {isAuthenticated ? '· signed in' : '· sign in to sync'}</span>
      </footer>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
