# Mugtee.in Site UX Audit — June 2026

Production: [https://mugtee.in](https://mugtee.in)  
Repo evaluation + targeted UX fixes (no new features).

## What works

| Area | Status |
|------|--------|
| Landing / marketing | Loads; brand and pipeline copy present |
| `/home` | Live Companion shell loads for signed-in users |
| `/studio/create` | Quick Cut / studio create entry resolves |
| Auth (`/login`, `/auth`) | Standard Supabase auth flows |
| Generation pipeline | Script → hook → scenes → images → voice → preview |
| In-browser preview | Slideshow + narration works without server MP4 |
| Template gallery | Built-in templates (20 styles) work offline; API falls back to builtins |
| Unified output window | Single preview surface (preview + export tabs) |
| Export funnel tracking | Client events + `mp4_export_failures` view (migration 0048) |
| Package exports | Script, DOCX, JPG, MP3, Creator Pack when storyboard complete |

## What was fixed (this pass)

1. **MP4 export disabled clarity** — `VideoRenderDisabledNotice` in Export tab; user-facing copy (no `.env.local` jargon); publish readiness shows "Server off" instead of "Missing" for MP4.
2. **Actionable export errors** — Toasts and inline alerts use `friendlyReelRenderError()` with specific next steps.
3. **Missing scene images** — Shared `RegenerateMissingScenesBanner` in Preview and Export tabs.
4. **Scene thumbnails** — `unoptimized` on storyboard images (fixes broken Next/Image for varied CDN URLs); strip shows for single-scene reels; kept visible alongside director timeline; mobile scroll + touch targets.
5. **Export progress copy** — Phase-style labels in Export tab and Export Studio panel.
6. **Export Studio panel** — Pre-checks `/api/quick-cut/config`; disables MP4 button when render off.
7. **Publish readiness** — When `VIDEO_RENDER_ENABLED` is off, package-export-ready projects can show "Ready for publishing" without MP4.

### Files touched

- `lib/video/reel-render-errors.ts`
- `lib/quick-cut/asset-availability.ts`
- `lib/quick-cut/compile-project-mp4.client.ts`
- `components/quick-cut/video-render-disabled-notice.tsx` (new)
- `components/quick-cut/regenerate-missing-scenes-banner.tsx` (new)
- `components/quick-cut/export-tabbed-panel.tsx`
- `components/quick-cut/publish-center.tsx`
- `components/quick-cut/preview-export-tabbed-panel.tsx`
- `components/quick-cut/output-window.tsx`
- `components/quick-cut/reel-assembly-player.tsx`
- `components/cinematic/storyboard-crossfade-image.tsx`
- `components/editor/ExportStudioPanel.tsx`

## Manual ops required

### Vercel (production)

| Variable | Action |
|----------|--------|
| `VIDEO_RENDER_ENABLED` | Set to `true` for real MP4 export (currently likely **unset** → 0% MP4 completion) |
| `VIDEO_RENDER_MOCK` | Keep **unset/false** in production |
| Redeploy | Required after env change |

Verify after deploy: `GET /api/quick-cut/config` → `"videoRenderEnabled": true`.

**Note:** Remotion/FFmpeg on Vercel serverless may still need capacity tuning; see `docs/EXPORT_AUDIT.md`.

### Supabase migrations

| Migration | Purpose | Action |
|-----------|---------|--------|
| `0048_mp4_export_funnel.sql` | `mp4_export_failures` view + index | Run in SQL editor if not applied |
| `0049_style_templates.sql` | `style_templates` table + `cinematic_projects.style_template_id` | **Run before relying on DB-backed template gallery / project saves with template id** |

Run via Supabase SQL editor or CLI. Consolidated script: `supabase/RUN_IN_SQL_EDITOR.sql` (includes 0049 section).

### Founder dashboard

After 0048: query `mp4_export_failures` or use `/admin/export-funnel` to confirm `VIDEO_RENDER_DISABLED` drops after Vercel env fix.

## Still open / not in scope

- Full Remotion render reliability on Vercel (infra, not UX copy)
- R3F/cinematic atmosphere on non-studio pages (performance audit deferred)
- Buffer/YouTube publish integrations (beta)
- GIF / image-sequence export (Export Studio Phase 2)

## Verification

```bash
npm run typecheck
npm run build
```

Smoke test after deploy:

1. Complete a Quick Cut → Preview tab shows scene strip
2. Export tab → if MP4 off, amber banner + package downloads work
3. Enable `VIDEO_RENDER_ENABLED` → Compile MP4 → progress steps → download
