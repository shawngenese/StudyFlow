/* eslint-disable no-undef */
import '@testing-library/jest-dom/vitest'

beforeEach(() => {
  try { localStorage.clear() } catch { /* ignore */ }
})

if (!window.matchMedia) {
  window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
}
if (!window.ResizeObserver) {
  window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
}
