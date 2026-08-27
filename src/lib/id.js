export const newId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const a = new Uint8Array(16); crypto.getRandomValues(a)
      return [...a].map(b=>b.toString(16).padStart(2,'0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5')
    }
  } catch { /* ignore */ }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}
