# OPENCODE.md

## Project

**StudyFlow** — a local-first student "personal OS" SPA: tasks, habits, focus timer, notes, dashboard. All data lives in `localStorage` (key `shawn-todos-v3`); no backend.

**Stack:** React 19 + Vite 8 + PWA · react-router v7 · dnd-kit · chrono-node · marked + DOMPurify · Vitest + Testing Library. Plain JS (`.js`/`.jsx`), no TypeScript, no state library — `useReducer` only.

## Commands

```bash
npm run dev            # vite dev server :5173
npm run build          # vite build → dist/
npm run test           # vitest run
npm run test:coverage  # v8; thresholds: lines 38 / functions 32 / branches 22
npm run lint           # eslint (flat config)
npm run format:fix     # prettier --write
npm run typecheck      # tsc --noEmit (loose: allowJs, strict but unused-locals off)
```

Install uses `legacy-peer-deps` (set in `.npmrc`, also pinned in CI and `vercel.json`) — always install with it.

## Structure

- `src/App.jsx` — router: `/` = public `Landing`, `/app/*` = `TodoApp` behind `ProtectedRoute`
- `src/components/TodoApp.jsx` — shell + Composer + lazy route switch; each view (`ListView`, `BoardView`, `CalendarView`, `HabitTracker`, `FocusTimer`, `NotesView`, `Dashboard`, `BentoGrid`) is `React.lazy`
- `src/state/reducer.js` — single `useReducer` (24 actions, normalized tasks, undo/redo capped at 30 snapshots); `src/hooks/useTodos.js` wraps it with 400ms debounced save + cross-tab sync
- `src/lib/` — `storage.js` (schema, `LIMITS`, validation guards), `date.js`, `id.js`, `markdown.js`, `bento.js`, `toast.js`, `auth.jsx`
- `src/pages/Landing.jsx`, `src/styles/` (bento.css + index.css tokens), `src/test/setup.js`

## Conventions

- Style: no semicolons, single quotes, trailing commas (`es5`), print width 100 (see `.prettierrc`)
- Component files are PascalCase `.jsx`; lib files camelCase `.js` (`.jsx` only if they render JSX)
- All views stay lazy-loaded; `chrono-node` is dynamically imported in the add-task path — don't import it eagerly
- No comments unless they carry intent; keep pre-existing heading-style comments as-is
- Native/vanilla CSS in `src/styles/`; theme tokens (terracotta `#c45a2a`, dark `#e8b44a`) live there — no Tailwind/shadcn

## Gotchas

- Never change the storage key, schema shape, or add fields without bumping `SCHEMA_VERSION` in `src/lib/storage.js` and handling migrate in `loadData`; imports are validated against `LIMITS` (blocked keys: `__proto__`, `constructor`)
- Auth is a stub: `AUTH_ENABLED = false` in `src/lib/auth.jsx`; `ProtectedRoute` only blocks `/app` when flipped on
- Tests colocate-free in `src/__tests__/` (`app.test.jsx`, `lib.test.jsx`, `reducer.test.jsx`, `reducer.extra.test.jsx`); keep new tests there
- ESLint ignores `dist`/`coverage`; several react-hooks strict rules are disabled — keep `rules-of-hooks` = error
- `manualChunks` in `vite.config.js` buckets vendor/dnd/chrono/markdown — add new heavy deps to their own chunk
- Package is private; never commit secrets or keys.