import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../App'

vi.mock('../lib/date', async (orig) => ({
  ...(await orig()),
  todayKey: () => '2026-08-26',
}))

vi.mock('../lib/supabase', () => ({ supabase: null }))

describe('App smoke test', () => {
  it('mounts without crashing and shows the main UI at /app', () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getAllByText('All tasks').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText(/Add to/)).toBeInTheDocument()
  })

  it('shows landing at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { level: 1, name: /in flow/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /Open App/i }).length).toBeGreaterThan(0)
  })
})
