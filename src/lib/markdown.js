import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.use({ breaks: true, gfm: true, mangle: false, headerIds: false })

function sanitize(html) {
  if (typeof window !== 'undefined' && window.DOMPurify) {
    try { return window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'animate', 'animateTransform', 'set', 'script', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style', 'onerror', 'onload'] }) } catch { /* fallback */ }
  }
  try {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'animate', 'animateTransform', 'set', 'script', 'iframe', 'object', 'embed'], FORBID_ATTR: ['style', 'onerror', 'onload'], ALLOW_DATA_ATTR: false })
      .replace(/src\s*=\s*["']\s*data:image\/svg\+xml[^"']*["']/gi, '')
  } catch {
    let out = html
    out = out.replace(/<script[\s\S]*?<\/script>/gi, '')
    out = out.replace(/<style[\s\S]*?<\/style>/gi, '')
    out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    out = out.replace(/<object[\s\S]*?<\/object>/gi, '')
    out = out.replace(/<embed[^>]*>/gi, '')
    out = out.replace(/\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'`>]+)/gi, '')
    out = out.replace(/\s(href|src|xlink:href)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, (m) => {
      if (/^\s*(href|src|xlink:href)\s*=\s*["']?\s*(javascript|data:text\/html)/i.test(m)) return ''
      return m
    })
    out = out.replace(/javascript:/gi, '')
    return out
  }
}

export function renderMarkdown(text) {
  let html
  try {
    const src = String(text || '').slice(0, 50000)
    html = marked.parse(src)
  } catch {
    html = `<p>${String(text || '').slice(0,5000).replace(/</g, '&lt;')}</p>`
  }
  return sanitize(html)
}

function sanitizeLine(s) {
  // eslint-disable-next-line no-useless-escape
  return String(s).replace(/[\r\n]+/g, ' ').replace(/[#*_`\[\]]/g, '').trim().slice(0, 200)
}

export function exportTaskMarkdown(task, projectName) {
  const lines = []
  lines.push(`# ${sanitizeLine(task.text)}`)
  lines.push('')
  const meta = []
  meta.push(`Project: ${sanitizeLine(projectName)}`)
  if (task.dueDate) meta.push(`Due: ${sanitizeLine(task.dueDate)}`)
  const pr = ['None', 'Low', 'Medium', 'High'][task.priority]
  if (pr !== 'None') meta.push(`Priority: ${pr}`)
  if (task.tags.length) meta.push(`Tags: ${task.tags.map((t) => `#${sanitizeLine(t)}`).join(' ')}`)
  lines.push(meta.join(' · '))
  lines.push('')
  if (task.notes) {
    lines.push(String(task.notes).slice(0, 50000))
    lines.push('')
  }
  if (task.subtasks.length) {
    lines.push('## Subtasks')
    for (const s of task.subtasks) lines.push(`- [${s.completed ? 'x' : ' '}] ${sanitizeLine(s.text)}`)
    lines.push('')
  }
  lines.push(`_Exported ${new Date().toLocaleString()}_`)
  return lines.join('\n')
}
