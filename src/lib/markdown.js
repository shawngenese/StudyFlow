import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.use({ breaks: true, gfm: true })

function sanitize(html) {
  if (typeof window !== 'undefined' && window.DOMPurify) {
    try { return window.DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'animate', 'animateTransform', 'set'], FORBID_ATTR: ['style'] }) } catch { /* fallback */ }
  }
  try {
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, FORBID_TAGS: ['style', 'animate', 'animateTransform', 'set'], FORBID_ATTR: ['style'], ALLOW_DATA_ATTR: false })
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
  let html = ''
  try {
    html = marked.parse(text || '')
  } catch {
    html = `<p>${String(text || '').replace(/</g, '&lt;')}</p>`
  }
  return sanitize(html)
}

function sanitizeLine(s) {
  return String(s).replace(/[\r\n]+/g, ' ').trim()
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
    lines.push(task.notes)
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
