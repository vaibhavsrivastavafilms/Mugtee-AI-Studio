# MP4 Export War Room Report

**Date:** 2026-06-05  
**Repo:** Mugtee-AI-Studio  
**Branch:** main @ pre-commit (base `9c84ada`)

---

## Executive summary

POST `/api/reels/export` returned **500** after the client pipeline succeeded (backfill → payload). The failure was in the **synchronous queue path**, not Remotion/FFmpeg (those run in `runExportInBackground` after HTTP 200).

**Root cause:** Triple heavy storyboard backfill on one POST request, plus fragile dynamic `import()` of server modules. After readiness passed, `queueReelExportForProject` ran full `resolveExportScenes` again, and `validateExportAssets` ran it a **third** time with `allowRegenerate: true` (OpenAI/storage recovery). That amplified latency and surfaced bundler/import failures as uncaught exceptions → **500** with `friendlyReelRenderError` masking the raw message.

A secondary issue: `resolveProjectScenes` preferred a non-empty but **image-empty** `scenes[]` over a populated `storyboard[]`, so merged client snapshots could be ignored when the DB row had stale empty scene shells.

---

## Root cause (file:line)

| Item | Detail |
|------|--------|
| **Primary** | `lib/export/asset-validation.server.ts` ~75 — `validateExportAssets` called `resolveExportScenes()` without using scenes already hydrated by the route/queue |
| **Amplifier** | `lib/reels/export-api.ts` ~305 — `queueReelExportForProject` always called `resolveExportScenes` even when route had just run `getExportReadinessForProject` |
| **Historical** | `lib/export/export-readiness.server.ts` ~175–200 — dynamic `import()` of persist/backfill modules (fixed in `9c84ada` for sanitize client import; static imports now used) |
| **Data** | `lib/cinematic-projects.ts` ~445 — `resolveProjectScenes` did not prefer `storyboard` when `scenes` existed but lacked stills |

**Typical exception (inferred from code path + prior prod audits):**

```
Error: Storyboard recovery is unavailable on this server.
  at resolveExportScenes (lib/export/export-readiness.server.ts)
  at validateExportAssets (lib/export/asset-validation.server.ts)
  at queueReelExportForProject (lib/reels/export-api.ts)
  at POST (app/api/reels/export/route.ts)
```

Or minified dynamic-import failure (pre-`9c84ada`):

```
TypeError: X is not a function
  at resolveExportScenes → backfillProjectAssetsFromScenes destructuring
```

---

## Fix applied

1. **Single hydration per POST** — Route passes `hydratedScenes` from readiness into `queueReelExportForProject`; queue skips second full backfill.
2. **Light validation** — `validateExportAssets` uses `hydratedScenes` or `resolveExportScenes(..., { skipHeavyBackfill: true })` (URL refresh only, no regen).
3. **Static server imports** — `backfillProjectAssetsFromScenes` / `backfillStoryboardAssetsForProject` imported statically in `export-readiness.server.ts`.
4. **Scene source selection** — `resolveProjectScenes` prefers `storyboard` when `scenes` has no exportable stills.
5. **Early 400s** — Payload structure + `collectPayloadMissingAssets` before DB/backfill; `missingAssets` in JSON.
6. **War-room logging** — `[EXPORT API] step:*`, `[EXPORT API FATAL]`, `[REMOTION]`, `[FFMPEG]`; 500 responses include raw `error` + `stack`.

---

## Files modified

| File | Change |
|------|--------|
| `app/api/reels/export/route.ts` | Checkpoints, payload summary/table, early asset 400, raw fatal JSON |
| `lib/export/export-api-checkpoints.server.ts` | **New** — shared checkpoint helpers |
| `lib/export/export-schema.ts` | `safeExportSceneRows`, `summarizeExportPayload`, `validateExportPayloadStructure` |
| `lib/export/export-payload-assets.server.ts` | **New** — payload missing-asset collector |
| `lib/export/export-readiness.server.ts` | Static imports, `skipHeavyBackfill`, checkpoints |
| `lib/export/asset-validation.server.ts` | `hydratedScenes`, skip duplicate backfill |
| `lib/reels/export-api.ts` | `hydratedScenes` param, queue checkpoints |
| `lib/cinematic-projects.ts` | Smarter scenes vs storyboard selection |
| `lib/remotion/render-reel.server.ts` | Composition lookup/found/missing logging |
| `lib/video/orchestrate-remotion-reel.ts` | remotion/ffmpeg/upload checkpoints |
| `lib/export/export-background.server.ts` | Background fatal logging |

---

## Validation checklist

- [ ] `npx tsc --noEmit` — clean
- [ ] `npm run build` — clean
- [ ] Local: Quick Cut project with 8 scenes + voice → POST `/api/reels/export` → **200** + `jobId`
- [ ] Vercel logs: `[EXPORT API] step: payload_validated` with `sceneCount` / `storyboardCount` > 0
- [ ] No second `[EXPORT API] step: storyboard_processing` with full backfill after readiness
- [ ] Poll job → completed MP4 download
- [ ] Malformed payload (scenes without `id`) → **400** + `missingAssets` / validation issues
- [ ] `VIDEO_RENDER_ENABLED=true` on production

---

## Remaining risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Vercel **300s** limit on in-process Remotion | High | External render worker (`docs/render-worker-architecture.md`) |
| Remotion bundle cold start / memory | Medium | `outputFileTracingIncludes` in `next.config.js`; monitor `[REMOTION] composition_missing` |
| Ephemeral image URLs failing HEAD in validation | Medium | 400 with reachable message; backfill route before export |
| `export_jobs` migration not on prod DB | Medium | Apply `0051_export_jobs.sql` |
| FFmpeg path on Vercel (mock path) | Low | `VIDEO_RENDER_MOCK` for dev; prod uses Remotion h264, not separate FFmpeg assemble for Quick Cut reel |

---

## Log grep guide (production)

```text
[EXPORT API] step: request_received
[EXPORT API] payload summary
[EXPORT API] step: payload_validated
[EXPORT API] missing_asset
[EXPORT API FATAL]
[EXPORT API] step: completed
[REMOTION] composition_found
[REMOTION] composition_missing
[FFMPEG] loaded
```

---

## Commit

Message: `fix: MP4 export server 500 root cause and war room instrumentation`  
**Do not push** until operator approves.
