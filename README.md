# StudyFlow — Student Personal OS

A warm, professional, local-first personal OS for students. Plan tasks, track habits, focus, and keep course notes — all in one fast SPA.

**Stack:** React 19 + Vite 8 · Vitest + jsdom · dnd-kit · chrono-node · marked + DOMPurify · `localStorage` persistence.

## Features

- **7 views:** Dashboard · List · Board (drag-drop with @dnd-kit) · Calendar · Habits (streaks) · Focus (Pomodoro with sessions + notifications) · Notes/Docs + Goals
- **Tasks:** estimates (15m–2h), recurring daily/weekly, subtasks, tags, priority, status (`todo/doing/done`), natural-date parsing (`tomorrow`, `fri 5pm`)
- **Composer:** quick-add `#tag !high` + date fragments, manual sort + due/priority/created sort
- **Markdown notes:** GFM + image paste (base64, guarded for quota) sanitized via DOMPurify
- **Command palette:** `Ctrl+K`, saved filters, import/export JSON, per-task Markdown export
- **UX:** undo/redo (history 30), warm paper theme (`#c45a2a` terracotta, `#e8b44a` dark accent), `content-visibility:auto` for long lists, code-split views

## Quick start

```bash
npm install --legacy-peer-deps
npm run dev      # http://localhost:5173
npm run build    # → dist/
npm run preview  # serve dist
npm run test             # 34 tests
npm run test:coverage    # v8, thresholds lines 40 / functions 30 / branches 20
npm run lint
npm run format:fix
```

Requires Node `>=18`.

## Project structure

```
src/
  components/ TodoApp.jsx (router + composer), ListView, BoardView, CalendarView, TaskDetail, BentoGrid, Dashboard, HabitTracker, FocusTimer, NotesView, CommandPalette
  state/reducer.js (24 actions, normalized tasks)
  hooks/useTodos.js (useReducer + debounced save 400ms + visibility flush)
  lib/ storage.js (STORAGE_KEY shawn-todos-v3, clamp/validation), date.js, markdown.js, id.js, bento.js, toast.js
  styles/ bento.css + index.css (tokens, overlay scrollbars)
```

## Storage

`localStorage` key `shawn-todos-v3` (version 3, always local). Shape:

```js
{ version: 3, projects: [{id, name}], tasks: [{id,text,notes,completed,createdAt,updatedAt,dueDate,priority,tags,projectId,status,subtasks,estimate,repeat}], savedFilters, habits, docs, goals, focusSessions }
```

Guards: `__proto__`/`constructor` blocked, text 200 chars, tags 20, subtasks 50, notes 50k, due `YYYY-MM-DD` validated, inbox project preserved, quota toast on overflow. Cross-tab sync via `storage` event.

## Shortcuts

- `n` new task · `/` search · `Ctrl+K` palette · `Ctrl+Z` / `Ctrl+Shift+Z` undo/redo · `?` help

## Deploy

### Vercel (recommended)

`vercel.json` already sets `framework: vite`, `outputDirectory: dist`, `installCommand: npm install --legacy-peer-deps`, asset `Cache-Control: immutable` for `/assets/*`.

1. Push to GitHub
2. Vercel → New Project → Import repo → Deploy (no env vars)
3. Preview URL is live; custom domain via Vercel → Settings → Domains

### Other static hosts

`npm run build` → upload `dist/` to Netlify/Cloudflare Pages (same `dist`).

## CI

`.github/workflows/ci.yml` on `push`/`pull_request` to `main`/`master`:

```yaml
npm ci --legacy-peer-deps
npm run lint
npm run test -- --coverage
npm run build
```

Node 20, `actions/checkout@v4` + `setup-node@v4`. ESLint ignores `dist`/`coverage`; jsx-a11y + react-hooks (purity off). Add `actions/upload-artifact` for `coverage/lcov.info` if you want.

## Performance notes

- Views (`BoardView`, `CalendarView`, `HabitTracker`, `FocusTimer`, `NotesView`, `BentoGrid`) are `React.lazy` + `Suspense`; `chrono-node` is dynamically imported on `addTask` to avoid eager bundle
- `vite.config.js` `build.target: esnext` + `manualChunks` (`vendor`, `dnd`, `chrono`, `markdown`)
- Undo history capped 30 snapshots, `content-visibility:auto` on lists/tiles/boards
- For >500 tasks consider `@tanstack/virtual` (left as next step — ask before installing)

## License

Private — not published.
