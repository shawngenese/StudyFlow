import { Component } from 'react'

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
      return (
        <div style={{ padding: 40, fontFamily: 'var(--font, sans-serif)', color: 'var(--danger, #e5484d)', maxWidth: 700, margin: '0 auto' }}>
          <h1>Something went wrong</h1>
          <pre style={{ whiteSpace: 'pre-wrap', background: 'var(--bg-inset)', padding: 12, borderRadius: 8 }}>{String(this.state.error)}</pre>
          <button type="button" className="btn" onClick={() => this.setState({ error: null })}>
            Try again
          </button>{' '}
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (!confirm('Reset all local data? This cannot be undone.')) return
              try {
                Object.keys(localStorage)
                  .filter((k) => k.startsWith('shawn-'))
                  .forEach((k) => localStorage.removeItem(k))
              } catch { /* ignore */ }
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
