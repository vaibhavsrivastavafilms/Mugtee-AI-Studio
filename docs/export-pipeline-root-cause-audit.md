# Reel Export Pipeline — Root Cause Audit

**Date:** 2026-06-04  
**Scope:** POST `/api/reels/export`, storyboard persistence, video jobs, browser vs server export

## Definitive root cause: **F (combined)**

Production failures are not a single bug. They stack:

| Code | Issue | Evidence |
|------|-------|----------|
| **A** | Storyboard persistence gaps | Quick Cut save dropped `imageAssetPath`; `scenesToStore` omitted durable paths |
| **C** | Storage / URL refs | Ephemeral Pollinations/CDN URLs in `cinematic_projects.scenes`; signed URLs expire |
| **D** | Export API behavior | Validation errors returned **500** when message lacked `Cannot export reel —` prefix |
| **B** | Video jobs (secondary) | `svid-*` jobs ephemeral in `/tmp` + memory; **404 after cold start** — not required for MP4 |
| **E** | COOP/COEP (secondary) | Browser FFmpeg only; server Remotion path unaffected |

---

## Pipeline map

```
Quick Cut UI (stores/quick-cut-generation-store.ts)
  → POST /api/projects/:id/backfill-storyboard-assets (optional)
  → POST /api/reels/export (app/api/reels/export/route.ts)
    → getExportReadinessForProject (lib/export/export-readiness.server.ts)
    → queueReelExportForProject (lib/reels/export-api.ts)
      → validateExportAssets (lib/export/asset-validation.server.ts)
      → enqueueExportJob → export_jobs (0051)
      → runExportInBackground → orchestrateRemotionReel
        → uploadReelMp4 → reels bucket
  → GET /api/reels/export/:jobId (poll)
```

Scene video (`GET /api/video-job/svid-*`) is a **separate optional path** — not on the MP4 export critical path.

---

## Phase 2 — Video job 404s

| Item | Location |
|------|----------|
| ID format | `app/api/generate-scene-video/route.ts` — `` `svid-${uuid}-${Date.now()}` `` |
| Storage | `lib/video/video-job.ts` — in-memory Map + `/tmp/mugtee-scene-video-jobs` |
| GET handler | `app/api/video-job/[id]/route.ts` → 404 if missing |
| Client | `lib/cinematic/scene-video-pipeline.client.ts` — 404 → "server restarted" |

**Survives refresh/deploy?** No on Vercel. Durable output is `scene.videoUrl` in DB, not the job record.

---

## Phase 3 — Storyboard persistence

### Scene JSON shape (`cinematic_projects.scenes`)

```json
{
  "id": "scene-1",
  "imageUrl": "https://...",
  "imageAssetPath": "userId/cinematic/projectId/sb_....png",
  "storyboardImages": [{ "id": "...", "url": "...", "assetPath": "..." }],
  "activeStoryboardId": "..."
}
```

### Answers

1. **Images persisted on generate?** Often yes when `persistSceneImageAsset` succeeds; not guaranteed for Pollinations-only URLs.
2. **imageAssetPath in DB on Quick Cut save?** Was often **no** — fixed in `scenesToStore` + `buildGenerationOutput` (2026-06-04).
3. **project_assets backs export?** Yes via `hydrateScenesFromProjectAssets` + backfill.
4. **URLs refreshed on export?** Yes — `refreshAllSceneStoryboardUrls` + backfill before validation.
5. **Export with only assetPath?** Pre-queue yes if storage object exists; Remotion needs downloadable URL (refreshed first).

---

## Phase 5 — Database

| Store | Persisted? |
|-------|------------|
| `cinematic_projects.scenes` | Yes |
| `project_assets` | Yes |
| `export_jobs` | Yes (0051) |
| `lib/video/job-store.ts` | **Ephemeral** |
| `lib/video/video-job.ts` | **Ephemeral** |

Buckets: `project-assets` (stills), `reels` (final MP4).

---

## Phase 6 — Export errors

- **503** if `VIDEO_RENDER_ENABLED` not true in production.
- **400** readiness failures with `missingAssets` (pre-queue path).
- **500** was returned for messages like "Storyboard images are missing or unreachable" — **fixed** to 400 + `{ stage }` in export route.

Set `EXPORT_DEBUG=true` on Vercel for structured server logs.

---

## Phase 7 — COOP/COEP

Headers on `/studio/*` only (`next.config.js`). `crossOriginIsolated: false` on most routes affects **browser FFmpeg.wasm**, not server Remotion. WebGL context loss is avatar UI — unrelated to MP4 export.

---

## Prioritized fixes

| Priority | Fix | Status |
|----------|-----|--------|
| P0 | Structured 400 for asset validation errors | Applied |
| P0 | Persist `imageAssetPath` on Quick Cut save | Applied |
| P0 | `VIDEO_RENDER_ENABLED=true` on Vercel | **Manual** |
| P1 | Auto backfill before export | Partial (`af90acc`) |
| P1 | Remotion resolve from `imageAssetPath` when URL empty | Check `render-reel.server.ts` |
| P2 | Document `svid-*` 404 as expected after cold start | This doc |
| P2 | Fail loudly if `export_jobs` insert null | Open |

---

## Migration plan

1. Apply Supabase **0051** (`export_jobs`) in production.
2. Backfill legacy projects: `POST /api/projects/:id/backfill-storyboard-assets`.
3. Set `VIDEO_RENDER_ENABLED=true` on Vercel.
4. Redeploy latest `main` with persistence + error fixes.

---

## Risk assessment

| Risk | Severity |
|------|----------|
| Creators see 500 instead of actionable 400 | High → mitigated |
| Ephemeral storyboard URLs after save | High → mitigated |
| Video job 404 console noise | Low |
| Browser COI warnings | Low for primary funnel |
