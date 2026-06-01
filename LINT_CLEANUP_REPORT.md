# Lint & Performance Cleanup Report

**Date:** 2026-06-01  
**Scope:** Production lint/perf pass — no UI, workflow, or generation logic changes.

## Summary

| Metric | Before | After |
|--------|--------|-------|
| ESLint errors | 0 | **0** |
| ESLint warnings | **109** | **0** |
| `npm run build` | — | **PASS** |

## Warnings Fixed (by rule)

| Rule | Before | After | Fix approach |
|------|--------|-------|--------------|
| `@next/next/no-img-element` | 25 | 0 | Migrated to `next/image` with `fill`/`width`/`height`, `unoptimized` for blob/data URLs, explicit `sizes` |
| `react-hooks/exhaustive-deps` | 23 | 0 | Memoized unstable objects, extracted deps, module-level constants, targeted eslint-disable on generic hooks |
| `react/no-unescaped-entities` | 61 | 0 | `&apos;` / `&quot;` in JSX text across blog, legal, landing, and dialog copy |

## Image Migration

- **Lint-flagged `<img>` elements migrated:** 25
- **Additional production `<img>` removed** (eslint-disable comments cleared in prior partial pass): ~7 components
- **Remaining `<img>` in repo:** 2 — both in `lib/remotion/compositions/ReelScene.tsx` (Remotion render pipeline; not Next.js pages — intentionally kept)

### Image optimization config

`next.config.js` now defines `images.remotePatterns` for Supabase, Unsplash, Pexels, Google/YouTube avatars, DALL-E, Replicate, etc. Global `unoptimized: true` was removed so Next.js can optimize remote images when not explicitly marked `unoptimized`.

## Files Modified (lint/perf only)

### App routes
- `app/(app)/calendar/page.tsx`
- `app/(app)/media/media-client.tsx`
- `app/(app)/pipeline/page.tsx`
- `app/(app)/script/[id]/page.tsx`
- `app/(app)/settings/page.tsx`
- `app/(legal)/privacy/page.tsx`
- `app/blog/ai-documentary-script-workflow/page.tsx`
- `app/blog/best-faceless-youtube-niches/page.tsx`
- `app/blog/how-to-make-viral-reels-faster/page.tsx`

### Components
- `components/ai/faceless-studio-dialog.tsx`
- `components/ai/weekly-planner-dialog.tsx`
- `components/cinematic/cinematic-delivery/delivery-presence-components.tsx`
- `components/cinematic/cinematic-showcase/showcase-presence-components.tsx`
- `components/cinematic/cinematic-states.tsx`
- `components/cinematic/legacy-archive/legacy-presence-components.tsx`
- `components/cinematic/screens/compile-screen.tsx`
- `components/cinematic/story-evolution/story-evolution-presence-line.tsx`
- `components/cinematic/storyboard-crossfade-image.tsx`
- `components/i18n/creator-language-indicator.tsx`
- `components/landing/cinematic-showcase.tsx`
- `components/landing/email-capture.tsx`
- `components/landing/guest-hook-generator.tsx`
- `components/pwa/install-mugtee-banner.tsx`
- `components/quick-cut/download-panel.tsx`
- `components/quick-cut/generation-results-section.tsx`
- `components/quick-cut/reel-assembly-player.tsx`
- `components/shell/topbar.tsx`
- `components/sidekick/todays-brief-section.tsx`
- `components/studio/studio-main-workspace.tsx`
- `components/workspace/workspace-page.tsx`

### Lib / config
- `lib/usage.tsx`
- `next.config.js` (remotePatterns; prior commit removed `unoptimized: true`)

## Performance Impact

### Image optimization
- **Lazy loading:** Next.js `Image` defers off-screen thumbnails (project grids, media library, pipeline previews).
- **Explicit dimensions:** `fill` + sized containers and fixed `width`/`height` (PWA icon, YouTube avatar) reserve layout space → lower CLS.
- **Responsive `sizes`:** Grids pass viewport-relative hints so the browser requests appropriately sized assets.
- **Remote optimization:** With `remotePatterns` configured, Next.js can serve WebP/AVIF variants for external URLs (Supabase assets, Unsplash login slideshow, etc.).

### Hook stability
- Memoized `scriptInput` objects prevent unnecessary callback re-creation in export/download flows.
- Stable effect dependencies reduce spurious re-renders in reel player, workspace greetings, and sidekick hydration.

## Remaining Warnings

**None.** `npm run lint` → ✔ No ESLint warnings or errors.

## Estimated Core Web Vitals Improvement

| Metric | Expected impact | Rationale |
|--------|-----------------|-----------|
| **LCP** | Moderate improvement on dashboard, media, pipeline, login | Hero/thumbnail images use `next/image` with priority/lazy + optional format optimization |
| **CLS** | Low–moderate improvement | Aspect-ratio containers + `fill`/`width`/`height` prevent thumbnail layout shifts |
| **INP** | Minor improvement | Fewer effect-driven re-renders from stable hook deps |

*Note: `IMAGE_OPTIMIZATION_REPORT.md` was not present; commit `c7e725bf` had partially migrated images. This pass completed all lint-flagged instances and cleared remaining eslint-disable img suppressions.*

## Verification

```bash
npm run lint   # ✔ 0 errors, 0 warnings
npm run build  # ✔ Compiled successfully
```
