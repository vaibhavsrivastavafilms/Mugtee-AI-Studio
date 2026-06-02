# FFmpeg Production Plan (Phase 7)

**Date:** 2026-06-03

---

## Current State

| Path | FFmpeg role |
|------|-------------|
| Quick Cut MP4 | **Indirect** — Remotion `renderMedia` uses internal ffmpeg |
| `/api/render-video` | **Direct** — `lib/video/render-pipeline.ts`, `ffmpeg-static` |
| Mock dev | `VIDEO_RENDER_MOCK=true` — tiny mock MP4 |
| Motion presets DB | `ffmpeg_filter` column — future |

`lib/video/ffmpeg-path.server.ts` documents serverless binary limits.

---

## Problems

- `isFfmpegAvailable()` often false on Vercel for direct FFmpeg routes
- Logging says `ffmpegStarted` for Remotion stages (misleading)
- Faceless pipeline enabled without same gates as reel export

---

## Root Cause

Two render stacks (Remotion vs raw FFmpeg) with **different deployment requirements**.

---

## Plan

### Production (reel export)

1. Rely on Remotion + NFT tracing — no separate ffmpeg-static on Vercel for primary path
2. Keep `VIDEO_RENDER_MOCK` for CI/staging only

### Production (faceless — secondary)

1. Gate with `isVideoRenderEnabled()` (align with reel)
2. Move to worker with full `ffmpeg-static` binary
3. Or disable on Vercel with clear 503 message

### Worker deployment

- Include `ffmpeg-static` + Chromium in container image
- Validate with `ffmpeg -version` health check

---

## Signed URL / asset fetch

FFmpeg and Remotion download scene assets via HTTP — ensure URLs valid at render time (12s timeout in validation). Prefer stable public `project-assets` URLs over short-lived signed URLs in persisted scene JSON.
