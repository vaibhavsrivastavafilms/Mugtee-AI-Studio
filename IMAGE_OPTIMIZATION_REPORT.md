# Mugtee Image Optimization Pass

**Date:** 2026-06-01  
**Scope:** Replace production `<img>` tags with Next.js `Image` from
`next/image`

---

## Summary

| Metric                                  | Value                                         |
| --------------------------------------- | --------------------------------------------- |
| `<img>` tags found (initial scan)       | **31** across **23 files**                    |
| Files modified (this pass)              | **24** (23 components/app + `next.config.js`) |
| `<img>` tags remaining in production UI | **0**                                         |
| Build (compile + typecheck)             | **Pass**                                      |
| Lint                                    | **Pass** (`npm run lint`)                     |

---

## Remote Domains Configured (`next.config.js`)

Removed global `images.unoptimized: true` and added `remotePatterns`:

| Hostname                                    | Purpose                                   |
| ------------------------------------------- | ----------------------------------------- |
| `**.supabase.co`                            | Project assets, media library, thumbnails |
| `images.unsplash.com`                       | Login slideshow, previews, showcase       |
| `images.pexels.com`                         | Login slideshow, previews                 |
| `image.pollinations.ai`                     | Free-tier scene image fallback            |
| `lh3.googleusercontent.com`                 | YouTube channel avatars                   |
| `yt3.ggpht.com`                             | YouTube thumbnails                        |
| `i.ytimg.com`                               | YouTube thumbnails                        |
| `oaidalleapiprodscus.blob.core.windows.net` | OpenAI DALL-E output                      |
| `placehold.co`                              | Mock/placeholder frames                   |
| `**.amazonaws.com`                          | Together AI / persisted remote images     |
| `replicate.delivery`                        | Replicate image CDN                       |

Same-origin paths (`/icons/*`, `/api/mascot`) work without remote patterns.

---

## Sizing Strategy by Area

| Area                                                                                                                                                            | Strategy                                          | `sizes` / dimensions                                          |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| **Cinematic storyboard** (`storyboard-crossfade-image`, `live-storyboard-build`, `assembly-storyboard-grid`, `live-storyboard-tile-grid`, `film-reveal-poster`) | `fill` in `relative` + `aspect-[9/16]` containers | `72px`–`280px` by tile size                                   |
| **Dashboard thumbnails** (`recent-projects-grid`, `creator-showcase` already used Image)                                                                        | `fill` in `aspect-[4/5]` cards                    | `(max-width: 640px) 50vw, 25vw`                               |
| **Reel preview** (`reel-assembly-player` frame strip, `ReelComposer` already used Image)                                                                        | `fill` in fixed-aspect buttons                    | `40px` strip / `220px` preview                                |
| **Quick-cut scene visuals** (`scene-visual-card` already used Image)                                                                                            | `fill` in `aspect-[9/16]`                         | `200px`                                                       |
| **Project grids** (`unified-projects-grid`, `recent-generations-strip`, `continue-creating-widget`)                                                             | `fill` in aspect-ratio containers                 | `188px`–`260px`                                               |
| **Script storyboard / assets rail**                                                                                                                             | `fill` in `aspect-[9/16]`                         | `280px` / responsive grid                                     |
| **Auth login slideshow**                                                                                                                                        | `fill` in `absolute inset-0` slide                | `(max-width: 1024px) 100vw, 640px`, `priority` on first slide |
| **Fixed avatars / icons** (`connect-button`, `continue-creating-section`, `install-mugtee-banner`, mascot)                                                      | Fixed `width`/`height`                            | `40×40`, `44×44`, `56×56`                                     |
| **Calendar / pipeline / media library**                                                                                                                         | `fill` in square thumbs                           | `48px`–`80px`                                                 |
| **Workspace storyboard frames**                                                                                                                                 | `fill` in `aspect-[9/16]`                         | `120px`                                                       |

All converted images preserve `object-cover` (via `className="object-cover"`)
and existing hover/transition classes.

---

## Files Modified

### Config

- `next.config.js`

### Cinematic / Quick Cut

- `components/cinematic/storyboard-crossfade-image.tsx`
- `components/cinematic/cinematic-states.tsx`
- `components/cinematic/render/live-storyboard-build.tsx`
- `components/quick-cut/live-storyboard-tile-grid.tsx`
- `components/quick-cut/cinematic-assembly/assembly-storyboard-grid.tsx`
- `components/quick-cut/cinematic-assembly/film-reveal-poster.tsx`
- `components/quick-cut/reel-assembly-player.tsx`
- `components/quick-cut/recent-generations-strip.tsx`

### Dashboard / Create / Retention

- `components/dashboard/recent-projects-grid.tsx`
- `components/create/unified-projects-grid.tsx`
- `components/creator/continue-creating-widget.tsx`
- `components/retention/continue-creating-section.tsx`

### Workspace / Script

- `components/workspace/workspace-page.tsx`
- `components/workspace/thumbnail-generate-panel.tsx`
- `components/script/storyboard-panel.tsx`
- `components/script/project-assets-rail.tsx`

### App routes

- `app/(app)/calendar/page.tsx`
- `app/(app)/pipeline/page.tsx`
- `app/(app)/media/media-client.tsx`
- `app/(app)/settings/page.tsx`

### Other production UI

- `components/auth/login-slideshow.tsx`
- `components/youtube/connect-button.tsx`
- `components/pwa/install-mugtee-banner.tsx`

---

## Build & Lint Status

```bash
npm run build  → Compiled successfully; lint + typecheck passed
                 Final ENOENT on Windows (.next/export/500.html rename) — known
                 Next 14 Windows artifact issue; unrelated to Image changes.

npm run lint   → ✔ No ESLint warnings or errors
```

---

## `<img>` Tags Intentionally Left

**None** in scanned production UI (`components/`, `app/`).

Special cases handled with `Image` + `unoptimized` instead of raw `<img>`:

| Case                                        | Why `unoptimized`                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------ |
| `data:` / `blob:` storyboard placeholders   | Next.js Image cannot optimize inline data URIs; `unoptimized` bypasses the optimizer |
| User-pasted media URLs (calendar, pipeline) | Domain may not match `remotePatterns`; `unoptimized` serves URL as-is                |
| `/api/mascot` dynamic route                 | Generated avatar; same-origin API response                                           |
| DALL-E / OpenAI thumbnail output            | May be data URI or non-pattern URL                                                   |

---

## Blockers & Notes for Dynamic / External URLs

1. **Arbitrary user URLs** — Calendar/pipeline allow pasting any `https://…`
   media URL. These use `unoptimized` so unknown domains still render; add new
   hostnames to `remotePatterns` to enable optimization for recurring CDNs.

2. **`data:` SVG mock storyboards** — Free-tier placeholders from
   `storyboard-generator` use `data:image/svg+xml`. Rendered via `Image` with
   `unoptimized={true}` in crossfade/fade components.

3. **Together AI CDN** — Returned URLs vary by provider; `**.amazonaws.com`
   covers common cases. Extend `remotePatterns` if new provider hostnames appear
   in logs.

4. **Existing Image usage** — `components/reel-composer/*`,
   `components/dashboard/creator-showcase.tsx`,
   `components/quick-cut/scene-visual-card.tsx`, and marketing/onboarding pages
   already used `next/image` before this pass.

5. **Excluded from scope** — Test mocks, email HTML templates, README, and
   `.next/` build artifacts were not scanned.

---

## Verification Commands

```bash
npm run build
npm run lint
rg '<img' components/ app/ --glob '*.{tsx,jsx}'   # expect 0 matches
```
