# React Crash Audit — "Something interrupted your session"

**Date:** 2026-06-09  
**Status:** Root cause identified and fixed

---

## Summary

The global error boundary (`app/error.tsx`) was triggered by a **server-side render (SSR) exception** in the sidekick 3D avatar stack. The crash was **not** caused by missing `LayoutGroupContext`, null profile data, or a Zustand hydration race on the current dev build.

| Field | Value |
|-------|-------|
| **Root cause** | Static import of `SidekickAvatarSkeleton` from a module that top-level-imports `@react-three/fiber` |
| **Exception** | `TypeError: Cannot read properties of undefined (reading 'S')` |
| **Primary component** | `MugteeSidekickAvatar` |
| **Throw site (module load)** | `components/sidekick/mugtee-sidekick-3d-viewer.tsx:4` (`import { Canvas } from '@react-three/fiber'`) |
| **Trigger import** | `components/sidekick/mugtee-sidekick-avatar.tsx:9` |
| **Shell mount** | `components/shell/cinematic-app-shell.tsx:93` → `MugteeSidekickPanel` |
| **Undefined value** | React Three Fiber / Three.js internals (`undefined.S` during SSR webpack eval) |

---

## Error boundary flow

| File | Role | Message shown |
|------|------|---------------|
| `app/error.tsx` | Next.js route error boundary (client) | **"Something interrupted your session"** |
| `app/global-error.tsx` | Root layout crash | "Mugtee is temporarily unavailable" |
| `components/quick-cut/export-error-boundary.tsx` | Export panel only | Export-specific fallback (not this crash) |

This incident hit **`app/error.tsx`**, not `global-error.tsx`.

---

## Stack trace (dev server)

```text
TypeError: Cannot read properties of undefined (reading 'S')
  at eval (./components/sidekick/mugtee-sidekick-3d-viewer.tsx:10:76)
  at eval (./components/sidekick/mugtee-sidekick-avatar.tsx:16:104)
  at eval (./components/mugtee/mugtee-orb.tsx:9:101)
  at eval (./components/sidekick/mugtee-sidekick-panel.tsx:16:87)
  at eval (./components/shell/cinematic-app-shell.tsx:12:100)
```

Digest: `2935562581` (also seen on `/studio/quick` as `557841751`).

---

## Why `LayoutGroupContext` appeared in logs

DevTools requested source maps such as:

```text
GET /_next/static/chunks/app/studio/(shell)/LayoutGroupContext.mjs.map → 404
```

These come from **framer-motion** (`motion.main`, `AnimatePresence` in `cinematic-app-shell.tsx` / `mugtee-sidekick-panel.tsx`). They are **missing source-map assets**, not runtime exceptions. Not the crash root cause.

---

## Failure chain (detailed)

1. `CinematicAppShell` statically imports `MugteeSidekickPanel` (`cinematic-app-shell.tsx:9`).
2. `MugteeSidekickPanel` imports `MugteeOrb` and `MugteeSidekickAvatar` (`mugtee-sidekick-panel.tsx:8–9`).
3. `MugteeSidekickAvatar` uses `next/dynamic(..., { ssr: false })` for `MugteeSidekick3DViewer` — **correct for the Canvas**.
4. **Bug:** `MugteeSidekickAvatar` also **statically** imports `SidekickAvatarSkeleton` from `mugtee-sidekick-3d-viewer.tsx` (`mugtee-sidekick-avatar.tsx:9`).
5. That file top-level-imports `@react-three/fiber` (`mugtee-sidekick-3d-viewer.tsx:4`).
6. During SSR, webpack evaluates the module → R3F/Three.js access browser-only APIs → `undefined.S` → Next error boundary.

Even when `MugteeSidekickPanel` returns `null` (e.g. Quick Cut routes), the **import graph still loads** because `CinematicAppShell` imports the panel module at the top level.

---

## What was ruled out

| Suspected cause | Result |
|-----------------|--------|
| Missing `LayoutGroupContext` provider | Not applicable — framer-motion provides its own context; 404s are source maps only |
| `profile.name` / null creator profile | `MugteeSidekickPanel` initializes `profile` as `{}` and uses optional chaining |
| Empty array index access in sidekick | No unsafe `[0]` access in sidekick panel |
| Store hydration race in sidekick | Sidekick uses `useShallow` for store selector (safe) |
| React #185 infinite loop (historical) | Separate issue fixed in `ReelCompletionCenter`; not the current SSR stack trace |

---

## Reproduction steps

1. Run `npm run dev`.
2. Open any studio shell route that loads `CinematicAppShell`, e.g. `/studio/create?mode=quick`, `/studio/quick`, or `/dashboard`.
3. Observe dev server log before fix:

   ```text
   TypeError: Cannot read properties of undefined (reading 'S')
   at ... mugtee-sidekick-3d-viewer.tsx
   ```

4. Client shows `app/error.tsx` — **"Something interrupted your session"**.

---

## Fix applied

**Extract `SidekickAvatarSkeleton` into a Three.js-free module** so SSR never loads `@react-three/fiber` through the avatar import graph.

| Change | File |
|--------|------|
| New skeleton-only module | `components/sidekick/sidekick-avatar-skeleton.tsx` |
| Import skeleton from new module | `components/sidekick/mugtee-sidekick-avatar.tsx` |
| Re-export skeleton; keep R3F isolated | `components/sidekick/mugtee-sidekick-3d-viewer.tsx` |

`MugteeSidekick3DViewer` remains `dynamic(..., { ssr: false })` — unchanged and correct.

### Optional hardening (not required for this fix)

- `dynamic(() => import('.../mugtee-sidekick-panel'), { ssr: false })` in `cinematic-app-shell.tsx` to shrink the studio shell SSR bundle on Quick Cut routes.

---

## Fix validation checklist

- [x] `npm run lint` passes (warnings only, pre-existing)
- [x] No new linter errors in sidekick files
- [x] Dev server recompiles without `Cannot read properties of undefined (reading 'S')` after fix
- [ ] Studio loads without error boundary (verify in authenticated browser session)
- [ ] Quick Cut loads without error boundary (verify in authenticated browser session)
- [ ] Projects page loads without error boundary (verify in authenticated browser session)
- [ ] Sidekick panel renders on desktop `/dashboard` or `/studio` routes
- [ ] `npm run typecheck` — **pre-existing failures** in `lib/generation/stale-generation-job.client.ts` (unrelated to this fix)

---

## Related historical issue

**React error #185** ("Maximum update depth exceeded") after `[GENERATION_SUCCESS]` was traced to `ReelCompletionCenter` returning a new Zustand object each render without `useShallow`. That is a **separate client-side loop**, fixed in Phase 3.2. If it recurs, audit completion-state `useEffect` dependencies in Quick Cut panels — not the sidekick SSR path documented here.
