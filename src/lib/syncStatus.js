const listeners = new Set()
let status = { state: 'idle', at: 0, detail: '' }

export function getSyncStatus() {
  return status
}

export function subscribeSyncStatus(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  for (const l of [...listeners]) {
    try { l(status) } catch { /* ignore listener throw */ }
  }
}

export function setSyncStatus(next) {
  status = { at: Date.now(), ...next }
  notify()
}