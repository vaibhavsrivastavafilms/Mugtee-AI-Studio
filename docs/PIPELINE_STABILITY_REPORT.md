# Pipeline Stability Report

**Date:** 2026-06-09 (updated)  
**Scope:** Quick Cut end-to-end — Generate → Voice → Export → Download  
**Wave 1:** Paused

---

## Executive Summary

Pipeline stabilization pass #1 fixed export gating, voice skips, scene-video API noise, and job lifecycle issues. **Pass #2** fixes the new blocker:

> **Generation failed during VIDEO — "Every scene must have a generated video clip"**

**Root cause:** The reel orchestrator treated per-scene AI video clips as **mandatory by default** (`requireSceneVideos !== false`), while economics policy only requires scene video for **Cinematic + Studio**. Quick Cut / Draft / Creator runs use **image-only** scenes and Remotion still export MP4 successfully.

**Fix:** Single source of truth — `pipelineRequiresSceneVideos()` in `lib/economics/scene-video-requirement.ts`. Orchestrator now requires explicit `requireSceneVideos === true` before enforcing `scene.videoUrl`.

**Validation:** `npm run typecheck` ✅ · `npm run lint` ✅ (pre-existing warnings)

---

## Pipeline Stage Matrix

| Stage      | Status | Duration | Error Count | Notes |
| ---------- | ------ | -------- | ----------- | ----- |
| Hook       | Pass*  | —        | 0           | No change this pass; prior pipeline work stable |
| Script     | Pass*  | —        | 0           | No change this pass |
| Storyboard | Pass*  | —        | 0           | Image-only scenes OK for Quick Cut |
| Images     | Pass*  | —        | 0           | Export preflight uses `imageUrl`, not `videoUrl` |
| Voice      | Pass*  | —        | 0           | Fixed in pass #1 (200 skip + status) |
| Video      | **Fixed** | —     | 0 expected  | Was failing export preflight; now skipped for Quick Cut |
| Export     | Pass*  | —        | 0           | Remotion uses images; no scene-video requirement |
| Download   | Pending E2E | —     | —           | Requires browser verification after export |

\*Pass = code fix verified via typecheck; E2E browser run still recommended.

---

## Issue — Scene video mandatory for Quick Cut (NEW)

### Symptom

```text
Generation failed during: VIDEO — Every scene must have a generated video clip
```

Occurs at export (`renderMp4AndWait` → `validateStageOrFail('video')`) even when storyboard images and voice are present.

### Root cause

| Location | Problem |
| -------- | ------- |
| `lib/pipeline/reel-generation-orchestrator.ts:256` | `requireSceneVideos !== false` → **default true** when flag omitted |
| `lib/pipeline/reel-generation-orchestrator.client.ts` | Snapshot hardcoded `requireSceneVideos: true` |
| `lib/pipeline/reel-pipeline-runner.client.ts` | `buildPipelineSnapshotFromStore` forced `requireSceneVideos: true` |
| `lib/generation/generation-job-sync.client.ts` | Job sync derived state with `requireSceneVideos: true` |

Economics policy (`plan-economics.ts`): scene AI clips = **Studio + Cinematic only**. Quick Cut default mode = `creator`.

Export path (`orchestrate-remotion-reel.ts`, `export-api.ts`, `scene-export-validation.ts`) already validates **images + voice**, not per-scene `videoUrl`.

### Policy (single source of truth)

```typescript
// lib/economics/scene-video-requirement.ts
pipelineRequiresSceneVideos({ generationMode, planType })
```

| Mode / Plan | Scene `videoUrl` required? | Export with images? |
| ----------- | -------------------------- | ------------------- |
| Draft / Creator / Quick Cut | No | Yes |
| Cinematic + non-Studio | No | Yes |
| Cinematic + Studio | Yes | Yes (after scene clips) |

### Fix applied

1. **`lib/economics/scene-video-requirement.ts`** — shared `pipelineRequiresSceneVideos()`
2. **Orchestrator** — enforce video clips only when `requireSceneVideos === true`
3. **Snapshot builders** — derive flag from `generationMode` + `userPlanType`
4. **Store** — cache `userPlanType` from `/api/profile` at pipeline start
5. **Scene-video gate** — reuses same policy via `canInvokeSceneVideoApi()`

### Changed files (pass #2)

| File | Change |
| ---- | ------ |
| `lib/economics/scene-video-requirement.ts` | **New** — policy SSOT |
| `lib/cinematic/scene-video-gate.client.ts` | Uses shared policy |
| `lib/pipeline/reel-generation-orchestrator.ts` | Opt-in video validation (`=== true`) |
| `lib/pipeline/reel-generation-orchestrator.client.ts` | Derive `requireSceneVideos` from store |
| `lib/pipeline/reel-pipeline-runner.client.ts` | Remove forced `true`; pass plan context to job sync |
| `lib/generation/generation-job-sync.client.ts` | Derive `requireSceneVideos` from mode/plan |
| `stores/quick-cut-generation-store.ts` | `userPlanType`; profile fetch at pipeline start |
| `hooks/use-generation-job-resume.ts` | Pass mode/plan to job sync |

### Changed files (pass #1 — prior)

| File | Issue |
| ---- | ----- |
| `lib/cinematic/quick-cut/video-render-enabled.client.ts` | VIDEO_RENDER client/server mismatch |
| `lib/cinematic/scene-video-pipeline.client.ts` | Scene-video API noise |
| `app/api/quick-cut/config/route.ts` | Config flags |
| `app/api/generate-voice/route.ts` | Voice 503 → 200 skip |
| `lib/generation/stale-generation-job.client.ts` | Job lifecycle types |
| `components/sidekick/sidekick-avatar-skeleton.tsx` | React SSR crash (separate) |

---

## Locations audited for `scene.videoUrl` requirement

| File | Requires scene video? | After fix |
| ---- | ---------------------- | --------- |
| `lib/pipeline/reel-generation-orchestrator.ts` | Yes (default) | Only when `requireSceneVideos === true` |
| `lib/pipeline/reel-pipeline-runner.client.ts` | Via snapshot | Derived from policy |
| `lib/export/scene-export-validation.ts` | No — images only | Unchanged ✓ |
| `lib/reels/export-api.ts` | No — images + voice | Unchanged ✓ |
| `lib/video/orchestrate-remotion-reel.ts` | No — images via `assertAllScenesHaveExportImages` | Unchanged ✓ |
| `lib/cinematic/scene-video-pipeline.client.ts` | API queue only | Gated by `canInvokeSceneVideoApi` |
| `stores/quick-cut-generation-store.ts` | `runSceneVideoGeneration` | Gated; no fail on missing clips for Quick Cut |

---

## Success criteria checklist

| Criterion | Status |
| --------- | ------ |
| Quick Cut → Generate → Voice → Export → Download (image scenes) | **Fixed in code** — verify in browser |
| Zero "Every scene must have a generated video clip" on Quick Cut | **Fixed** |
| Cinematic + Studio still enforces scene clips before export | **Preserved** |
| Zero React crashes | SSR fix accepted pending browser validation |
| Zero export VIDEO_RENDER mismatch | Fixed pass #1 |
| Zero spurious scene-video API calls | Fixed pass #1 |
| Zero polling redirects | Fixed pass #1 |

---

## Recommended E2E verification

1. Open Quick Cut project → Generate (creator mode).
2. Confirm storyboard images + voice complete.
3. Export MP4 — **must not** fail at VIDEO stage.
4. Download reel.
5. DevTools: no `POST /api/generate-scene-video` on creator/quick routes.
6. (Optional) Studio + cinematic project: scene-video still required before export.

---

## Next steps

1. Browser E2E — fill Duration column in matrix above.
2. Do **not** start Wave 1 until full Quick Cut path passes in browser.
