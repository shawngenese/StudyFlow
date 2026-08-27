import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../App'

vi.mock('../lib/date', async (orig) => ({
  ...(await orig()),
  todayKey: () => '2026-08-26',
}))

describe('App smoke test', () => {
  it('mounts without crashing and shows the main UI', () => {
    render(<App />)
    expect(screen.getAllByText('All tasks').length).toBeGreaterThan(0)
    expect(screen.getByPlaceholderText(/Add to/)).toBeInTheDocument()
  })
})
