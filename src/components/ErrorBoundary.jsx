import { Component } from 'react'
import { clearAllAppStorage } from '../lib/bento'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (this.state.error) {
      const isProd = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'production'
      const msg = this.state.error && this.state.error.message ? this.state.error.message : String(this.state.error)
      return (
        <div style={{ padding: 40, fontFamily: 'var(--font, sans-serif)', color: 'var(--danger, #e5484d)', maxWidth: 700, margin: '0 auto' }}>
          <h1>Something went wrong</h1>
          <p className="muted" style={{color:'var(--text-muted)'}}>An unexpected error occurred. Try again or reset local data.</p>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-inset)', padding: 12, borderRadius: 8, overflowX:'auto', maxHeight:'40vh' }}>{isProd ? msg.slice(0, 500) : String(this.state.error).slice(0, 2000)}</pre>
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>{' '}
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (!confirm('Reset all local data? This cannot be undone. Export first if needed.')) return
              try { clearAllAppStorage() } catch { /* ignore */ }
              location.reload()
            }}
          >
            Reset app data
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
