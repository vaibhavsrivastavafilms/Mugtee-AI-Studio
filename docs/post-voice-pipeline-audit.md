# Post-Voice Pipeline Audit

**Date:** 2026-06-04  
**Project under test:** `5c61292f-5733-4c9f-8e50-f8be2f87be2b`  
**Confirmed working upstream:** hook → script → story_bible → visual_direction →
voice

## Pipeline trace (Quick Cut + Cinematic)

```text
voice complete
  → storyboard / image generation (fetchSceneImages, generate-scene-images, cinematic storyboard API)
  → frame creation (GeneratedScene.imageUrl + imageAssetPath in memory)
  → asset persistence (persistSceneImageAsset → project_assets + Supabase storage)
  → project persistence (persistStepComplete → archiveGeneratedProject → scenesToStore → cinematic_projects.scenes)
  → project reload (loadProject → rowToState → storeScenesToGenerated → buildQuickCutHydrationFromRow)
  → export (POST /api/reels/export → refresh URLs → Remotion render-reel.server.ts)
```text
Director/Cinematic path after voice: `voiceover-screen.tsx` → `persistProject` →
`scenes-screen.tsx` storyboard loop → same persistence stack.

## First persistence break point

| # | Stage | Status | Evidence |
| --- | -------- | -------- | ---------- |
| 1 | Voice → DB | OK | `persistStepComplete('voice', …)` at `stores/quick-cut-generation-store.ts:3077` |
| 2 | Image gen in memory | OK | `lib/cinematic/generate-scene-images.ts:356-357` sets `imageUrl` + `imageAssetPath` |
| 3 | project_assets row | OK | `lib/project-assets/persist-scene-image.server.ts:38-53` |
| 4 | **Project JSON save** | **BROKEN (fixed)** | **`lib/cinematic/generation.ts:824`** — `scenesToStore` wrote `imageUrl` only; **`imageAssetPath` was dropped** before DB write |
| 5 | Reload | Downstream of #4 | `storeScenesToGenerated` at `generation.ts:877-879` reads `imageAssetPath` only if present in JSON |
| 6 | Export (stale URL) | Secondary | `lib/remotion/render-reel.server.ts:105-109` (pre-fix) required `imageUrl`; expired Pollinations/CDN URLs failed even when storage path existed |

### Definitive first break (pre-fix)

**File:line:** `lib/cinematic/generation.ts:824` (`scenesToStore`)

At HEAD before this audit, the mapper ended with:

```ts
imageUrl: scene.imageUrl ?? undefined,
// imageAssetPath NOT copied → cinematic_projects.scenes lost durable paths
```text
**Secondary gap:** `stores/quick-cut-generation-store.ts:932`
(`buildGenerationOutput`) omitted `imageAssetPath` from archived scenes, so
`persistStepComplete('storyboard', …)` at line 3183 saved URLs without storage
paths.

**Fix applied:** spread `imageAssetPath` in `scenesToStore` and
`buildGenerationOutput`; Remotion resolves signed URL from `imageAssetPath` when
`imageUrl` is empty.

## Structured logging

Dev-only unless `PIPELINE_DEBUG=true` (same guard as `NODE_ENV !==
'production'`).

| Tag | Stage | Location |
| ----- | -------- | ---------- |
| `[STEP_START]` | storyboard, assets, storage, project_save, project_reload, export | `lib/cinematic/generation-logger.ts` |
| `[STEP_COMPLETE]` | same + per-frame JSON | wired in storyboard generator, generate-scene-images, persist-scene-image, generation-persist, project-hydration, export route, render-reel |
| `[STEP_ERROR]` | any stage | generation-persist, export route, render-reel |

Per storyboard frame:

```json
{ "frameId", "imageUrl", "storagePath", "persisted" }
```text
Per video job:

```json
{ "videoJobId", "persisted", "retrievable" }
```text
Existing `[STEP_COMPLETE]` for generation steps (`hook`, `script`, `voice`, …)
unchanged in `generation-persist.ts`.

## Verification matrix (code + log points)

| Check | Expected | Evidence |
| ------- | ---------- | ---------- |
| 1. Close/reopen project | Voice + script + scenes reload from `cinematic_projects` | `loadSavedProject` → `buildQuickCutHydrationFromRow` → `[STEP_START] project_reload` |
| 2. Storyboard after reload | Images if `imageAssetPath` or refreshable URL in JSON | Frame logs: `persisted: true` when `imageAssetPath` present; else run backfill |
| 3. Video jobs after refresh | **Ephemeral** — `svid-*` in memory + `/tmp`; 404 after cold start | `lib/video/video-job.ts`; `[STEP_COMPLETE]` asset log `retrievable: false` on 404 |
| 4. Export after page refresh | Works if DB has path or refreshed signed URL | Export route `[STEP_START] export`; readiness + backfill in `export-readiness.server.ts` |
| 5. Export one day later | Needs `imageAssetPath` + `refreshStoryboardUrl`; ephemeral URLs expire | `storyboard-url-service.server.ts` `[STEP_START] storage`; Remotion fallback at `render-reel.server.ts` |

## Video jobs (documented ephemeral)

- IDs: `app/api/generate-scene-video/route.ts` → `svid-{uuid}-{timestamp}`
- Store: `lib/video/video-job.ts` (in-memory + temp files)
- Durable clip: `scene.videoUrl` on project row after job completes, not the job
record
- After deploy/refresh: poll returns 404 — expected; image export path
unaffected

## Related fixes in this change set

- Export route 400 mapping for asset validation messages
(`app/api/reels/export/route.ts`)
- `imageAssetPath` in `scenesToStore` + `buildGenerationOutput`
- Remotion download from `imageAssetPath` when `imageUrl` empty
(`render-reel.server.ts`)

## Manual test steps (project `5c61292f-5733-4c9f-8e50-f8be2f87be2b`)

1. Open Quick Cut / studio with `PIPELINE_DEBUG=true` or local dev; complete or
resume past voice.
2. Generate storyboard frames; grep console for `[STEP_COMPLETE]` with `stage:
storyboard` and frame `persisted: true`.
3. `saveProject` or wait for `persistStepComplete('storyboard')`; confirm
`[STEP_COMPLETE] project_save`.
4. Close tab, reopen project from library; confirm `[STEP_START] project_reload`
and per-frame logs with `storagePath` populated.
5. `POST /api/reels/export` with `projectId`; confirm export job queued and
Remotion `[STEP_START] export` / `storage` refresh logs.
6. (Optional) Enable scene video; refresh page during poll — expect
`retrievable: false` on job 404; `scene.videoUrl` still on row if job finished
before restart.

## See also

- [export-pipeline-root-cause-audit.md](./export-pipeline-root-cause-audit.md)
