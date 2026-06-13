# Mugtee — Pipeline Stability Audit

**Date:** 2026-06-09  
**Scope:** Core Quick Cut path — Generate → Export → Download  
**Status:** Investigation only — **no code changes applied**  
**Blocks:** Wave 1 launch work until pipeline fixes are approved and verified

---

## Executive Summary

The screenshot failures trace to **five independent failure modes** in the generation/export pipeline. None are billing-related. The highest-impact issues:

| Priority | Issue | Root cause (one line) |
|----------|-------|------------------------|
| P0 | Generation job 404 | Job row missing or poll before insert; redirect side-effects on hydration |
| P0 | Voice 503 | Missing `OPENAI_API_KEY` and/or synthesis failure; pipeline treats 503 as soft-skip but voice may be empty for export |
| P0 | Scene video 400 | `QUICK_CUT_V2_TEXT_TO_VIDEO` calls scene-video API; server rejects scenes without `imageUrl` |
| P0 | Export EXPORT_FAILED | Client/server `VIDEO_RENDER_*` env mismatch or server gate off while UI shows export enabled |
| P1 | Redirect to Projects | `loadSavedProject` + hydration effect during active generation |

---

## Pipeline Flow (Reference)

```text
User clicks Generate (V2 project page)
  → useQuickCutProjectHydration (loadSavedProject → optional autorun runPipeline)
  → runPipeline (stores/quick-cut-generation-store.ts)
      → syncPipelineJob → POST /api/generation/jobs (creates gen_* id)
      → parallel script / storyboard / voice
      → runSceneVideoGeneration (conditional)
      → renderMp4AndWait → POST /api/reels/export
  → useReelPipelineJobPoll (GET /api/generation/jobs/{gen_*})
  → useGenerationJobResume (sync + restore)
```

---

# Issue 1 — Generation Job 404

## Observed

```http
GET /api/generation/jobs/99a4d839-912c-47a0-988b-b0eeda55fc47
404 Not Found
```

Value matches **`cinematic_projects.id`** (project UUID), not a `gen_*` generation job id.

## What the API expects

| Layer | Expectation | File |
|-------|-------------|------|
| Job creation | `gen_{20-char}` prefix | `app/api/generation/jobs/route.ts` L102 |
| Poll route | `generation_jobs.id` + `user_id` match | `app/api/generation/jobs/[jobId]/route.ts` |
| DB lookup | `.eq('id', jobId)` | `lib/generation/generation-job-service.ts` L205–217 |
| Valid client id | Must start with `gen_` | `lib/generation/generation-job-id.ts` |

## Where polling begins

| Step | Component | File:line |
|------|-----------|-----------|
| 1 | Mount on project page | `components/quick-cut/v2/quick-cut-project-page-client.tsx` — calls `useReelPipelineJobPoll()` |
| 2 | Poll hook reads store | `hooks/use-reel-pipeline-poll.ts` L24 — `pipelineJobId` |
| 3 | Guard | L30 — `isValidGenerationJobId(pipelineJobId)` — **must be `gen_*` to poll** |
| 4 | HTTP | `lib/pipeline/reel-generation-orchestrator.client.ts` L94 |
| 5 | Resume sync also sets id | `hooks/use-generation-job-resume.ts` L144–151 via `syncGenerationJobProgress` |

## Where job id is stored

| Store | Field | Set by |
|-------|-------|--------|
| Zustand | `pipelineJobId` | `syncPipelineJob`, `useGenerationJobResume`, `applyActiveGenerationJobToStore`, poll responses |
| sessionStorage | `mugtee:generation-job-id:v1` map[projectId]→jobId | `writeStoredGenerationJobId` |
| Database | `generation_jobs.id` | POST `/api/generation/jobs` |

## Root cause analysis

### A. Poll with project UUID (observed symptom)

**Current code should NOT emit `GET /api/generation/jobs/{projectUuid}`.**

`pollGenerationJobOrchestrator` validates `gen_` prefix **before** fetch (`reel-generation-orchestrator.client.ts` L82–90). A project UUID should hit the `invalid-id` branch and log `[JOB_POLL_REQUEST]` without a network call.

**If 404 with project UUID still appears in Network tab:**

1. **Stale browser bundle** — hard refresh required after recent guard additions  
2. **Session storage corruption** — old builds may have written project UUID as job id; current code clears on read (`use-generation-job-resume.ts` L67–76)  
3. **Misidentified request** — confirm it is path-style poll, not `GET /api/generation/jobs?projectId=...` (后者 returns 200 + `{ job: null }`, not 404)

**Static analysis finding:** No remaining code path assigns `pipelineJobId = savedProjectId`. All writers use API-returned `gen_*` ids.

### B. Poll 404 with valid `gen_*` id (likely concurrent failure)

Even with correct id, 404 occurs when:

| Cause | Why | File |
|-------|-----|------|
| **Migration not applied** | `createGenerationJob` insert fails; no row | `0064_generation_jobs.sql`, `ensureGenerationJobsMigration()` |
| **Race** | Poll starts before POST completes | `syncPipelineJob` is async; poll hook keyed on `pipelineJobId` |
| **Wrong user** | RLS + `.eq('user_id', userId)` hides row | `generation-job-service.ts` L214 |

`runPipeline` now calls `syncPipelineJob` early (`quick-cut-generation-store.ts` L2826–2832), but poll hook can still run before `pipelineJobId` is set if job creation fails silently.

### C. Redirect to Projects (user-visible consequence)

| Trigger | Mechanism | File |
|---------|-----------|------|
| Hydration re-run | `loadSavedProject` returned `false` | `hooks/use-quick-cut-project-hydration.ts` L49–55 |
| `isGenerating` guard | Previously returned false during active gen (partial fix at L4706–4708) | `stores/quick-cut-generation-store.ts` |
| Stale job cleanup | `clearStaleGenerationJobReference` could set `isGenerating: false` on 404 (partially mitigated) | `lib/generation/stale-generation-job.client.ts` |

404 → stale cleanup → `isGenerating: false` → hydration/load failure → **`router.replace(STUDIO.projects)`**.

## Recommended fix

1. **Server:** Reject non-`gen_*` ids on GET with 400 + `[JOB_NOT_FOUND]` log (already partially done in `[jobId]/route.ts`)  
2. **Client:** Never fetch poll URL unless `pipelineJobId` is valid; on 404 **retry with backoff**, show `jobPollWarning`, **never navigate away** (partially in `use-reel-pipeline-poll.ts`)  
3. **Create-before-poll:** `await syncPipelineJob` before setting `isGenerating` or before mounting poll hook  
4. **Fail loud** if `createGenerationJob` returns null (surface UI error, not silent 404 loop)  
5. **Remove redirect** on hydration failure when `isGenerating && savedProjectId === projectId` (partial fix exists)

## Regression risk

| Change | Risk |
|--------|------|
| Stricter poll guards | Low — prevents invalid traffic |
| Retry on 404 | Low — may delay stale-job detection |
| Block navigation on 404 | Low — improves UX during migration deploy |
| Await job create | Medium — adds latency to pipeline start; test autorun path |

---

# Issue 2 — Voice Generation 503

## Observed

```http
POST /api/generate-voice
503 Service Unavailable
```

Pipeline stops or continues without audio during **voice** stage.

## Request path

```text
runPipeline
  → pipelineFetchJson('/api/generate-voice', { generationMode, scenes, ... })
  → app/api/generate-voice/route.ts
  → resolveProviderRouting({ generationMode, planType })
  → generateVoice(..., preferElevenLabs)
  → synthesizeWithDirector → ElevenLabs or synthesizeSpeechBuffer (OpenAI TTS)
```

**Key files:**

- `stores/quick-cut-generation-store.ts` L3397–3416 (caller)
- `app/api/generate-voice/route.ts`
- `lib/economics/provider-routing.server.ts`
- `lib/voice/generateVoice.ts` L153–176, L256–260
- `lib/ai/synthesize-speech.ts`
- `lib/ai/free-tier.ts` (`buildQuickCutProviderConfig`, `allowOpenAITts`)

## 503 trigger points

### Path 1 — No provider configured (L62–80)

```typescript
const voiceConfigured = providers.elevenlabs || providers.openai || providers.emergent
if (!voiceConfigured) return 503
```

**Occurs when:** `OPENAI_API_KEY` missing AND (free tier blocks ElevenLabs OR ElevenLabs key missing) AND Emergent unavailable.

**Free/Creator requirement:** needs **`OPENAI_API_KEY`** for TTS (`tts-1`).

### Path 2 — Synthesis returned no audio (L118–142)

After routing, if `!result.buffer && !result.audioUrl` → 503 with `VOICE_SYNTHESIS_FAILED`.

**Occurs when:** OpenAI TTS throws, empty narration, or ElevenLabs fails AND OpenAI fallback returns null.

## Plan routing (current behavior)

| Plan | `resolveProviderRouting().voice` | `preferElevenLabs` |
|------|----------------------------------|--------------------|
| Free | `openai_tts` | false |
| Creator | `openai_tts` | false |
| Pro / PRO_TRIAL | `elevenlabs` | **true** |
| Studio | `elevenlabs` | **true** |

ElevenLabs path in `synthesizeWithDirector` (`generateVoice.ts` L158–175):

- If `preferElevenLabs && allowElevenLabsVoice() && key` → try ElevenLabs  
- Else → `synthesizeSpeechBuffer` (OpenAI TTS fallback)

**Gap:** For Pro without ElevenLabs key, `preferElevenLabs` is still true but ElevenLabs branch skipped; fallback **should** run. 503 implies **OpenAI TTS also failed or key missing**.

## Pipeline handling of 503

`quick-cut-generation-store.ts` L3453–3498:

- Treats 503 as **skipped** (not hard fail)  
- Sets `voiceStepStatus = 'completed'` when 503  
- **`voiceUrl` stays null**  
- Pipeline continues to storyboard/export

**Downstream impact:** Export preflight requires voice (`reelExportReadiness`) → export fails or package-only mode.

## Recommended fix

1. **Env:** Document that `OPENAI_API_KEY` is **required** for all tiers (Free/Creator primary; Pro/Studio fallback)  
2. **Route:** For Pro/Studio, if ElevenLabs fails, **force** OpenAI fallback and only 503 if both fail — add explicit log of which provider failed  
3. **Route:** Return **200 + skipped** instead of 503 for recoverable provider-missing (503 reserved for true outage) — reduces pipeline confusion  
4. **Store:** If voice skipped, set section status **warning** not **completed**; block export with clear message  
5. **`preferElevenLabs`:** Set false when `!getElevenLabsApiKey()` regardless of plan (avoid wasted ElevenLabs attempts)

## Regression risk

| Change | Risk |
|--------|------|
| Force OpenAI fallback | Low — aligns with product policy |
| Status code 200 for skip | Medium — clients parsing 503 need update |
| Block export without voice | Low — correct behavior |

---

# Issue 3 — Scene Video 400

## Observed

```http
POST /api/generate-scene-video
400 Bad Request
```

Policy after economics refactor: **Studio + Cinematic only**.

## Call chain

```text
runPipeline
  → runSceneVideoGeneration (quick-cut-generation-store.ts L1242)
  → queueSceneVideos (lib/cinematic/scene-video-pipeline.client.ts L63)
  → POST /api/generate-scene-video
```

**Trigger sites in runPipeline:**

| Condition | Line | Notes |
|-----------|------|-------|
| After storyboard motion | L3701 | Normal path |
| `QUICK_CUT_V2_TEXT_TO_VIDEO` | L3703–3714 | **Always attempts scene video after storyboard** |
| `videoRenderEnabled && export step` | L3718–3720 | **Second call before export** |

## Gate logic mismatch (root cause)

### Client gate (`runSceneVideoGeneration` L1246–1248)

```typescript
const requireVideos = get().videoRenderEnabled
const cinematicMode = get().generationMode === 'cinematic'
if ((!sceneVideoEnabled && !requireVideos) || !cinematicMode) return
```

When **`videoRenderEnabled === true`** and **`generationMode === 'cinematic'`**, client **calls API** regardless of plan tier.

### Server gate (`generate-scene-video/route.ts` L47–57)

```typescript
if (!isSceneVideoGenerationEnabled({ generationMode, planType })) {
  return 403  // not 400
}
```

Requires **Studio plan + cinematic** (`plan-economics.ts` L126–128).

### Why 400 specifically?

403 = plan/mode blocked. **400** = request reached processing but:

```typescript
if (jobs.length === 0) {
  return 400 // "No eligible scenes with images for video generation"
}
```

(`generate-scene-video/route.ts` L138–142)

**Root cause:** `QUICK_CUT_V2_TEXT_TO_VIDEO = true` (`lib/quick-cut/quick-cut-v2-config.ts` L2)

- Client `queueSceneVideos` includes scenes with **text prompts only** (no `imageUrl`) when flag is true (`scene-video-pipeline.client.ts` L52–55)  
- Server loop **skips** scenes without `imageUrl` (L96–97)  
- All scenes skipped → **jobs.length === 0** → **400**

Also: **`generationMode` is not sent** in POST body (`scene-video-pipeline.client.ts` L66–73) — server defaults to `creator`, which would cause **403** not 400. So observed 400 implies cinematic mode on server from a different code path OR scenes had images but all failed eligibility.

## Additional bug: export-stage re-entry

L3718–3720 calls `runSceneVideoGeneration` whenever `videoRenderEnabled` before export — duplicates work and errors even in creator/draft modes (client returns early if not cinematic, but still adds confusion).

## Recommended fix

1. **Client:** Gate `runSceneVideoGeneration` with shared helper:

   ```typescript
   generationMode === 'cinematic' && planType === 'STUDIO' && sceneVideoEnabled
   ```

   Use **`/api/quick-cut/config`** or profile plan snapshot — **never call API otherwise**

2. **Client:** Pass `generationMode` in `queueSceneVideos` body  
3. **Client:** Disable `QUICK_CUT_V2_TEXT_TO_VIDEO` scene-video path unless Studio+cinematic, OR align server to accept text-to-video scenes  
4. **Client:** Remove duplicate L3718–3720 pre-export call  
5. **Server:** Return **204/no-op** or don't register route for non-eligible — optional

## Regression risk

| Change | Risk |
|--------|------|
| Skip API for non-Studio | Low — intended policy |
| Disable V2 text-to-video scene path | Medium — verify Studio cinematic still works |
| Remove pre-export call | Low — reduces duplicate requests |

---

# Issue 4 — Export Failure (VIDEO_RENDER_ENABLED)

## Observed

```text
EXPORT_FAILED
export requires VIDEO_RENDER_ENABLED
```

Pipeline reaches export; MP4 compile fails.

## Export path

```text
runPipeline (videoRenderEnabled branch)
  → renderMp4AndWait
  → requestVideoRender → POST /api/reels/export
  → queueReelExportForProject → orchestrateRemotionReel
```

**Key files:**

- `stores/quick-cut-generation-store.ts` L3758–3814, L1844–1972
- `app/api/reels/export/route.ts` L75–88
- `lib/cinematic/quick-cut/video-render-enabled.ts` (server)
- `lib/cinematic/quick-cut/video-render-enabled.client.ts` (client)
- `lib/video/orchestrate-remotion-reel.ts` L107

## Root cause: client/server env divergence

| Check | Server | Client |
|-------|--------|--------|
| Env vars | `VIDEO_RENDER_ENABLED`, `VIDEO_RENDER_MOCK` | `NEXT_PUBLIC_VIDEO_RENDER_*` |
| Dev default | `devMockRenderDefault()` if `NODE_ENV=development` | Separate `devMockRenderDefault()` using **NEXT_PUBLIC_** prefix |
| Config API | `GET /api/quick-cut/config` → `videoRenderEnabled: isVideoRenderEnabled()` | Store uses `isClientVideoRenderEnabled(cfg.videoRenderEnabled)` |

**Failure mode:**

1. Client `videoRenderEnabled = true` (dev default or cached config)  
2. `runPipeline` enters export branch (`if (videoRenderEnabled)`)  
3. Server `isVideoRenderEnabled() === false` (e.g. `.env` has `VIDEO_RENDER_ENABLED=false`)  
4. `POST /api/reels/export` → **503** `{ code: 'EXPORT_FAILED', error: '...VIDEO_RENDER_ENABLED...' }`  
5. `failPipeline` / `renderError` surfaced in UI

**Secondary causes:**

| Cause | File |
|-------|------|
| `blockMp4CompileIfNeeded` blocks Free tier | `lib/export/mp4-compile-guard.client.ts` — shows Pro toast, not VIDEO_RENDER message |
| Missing Remotion deps | `isRemotionRenderAvailable()` |
| `retryVideoRender` when `!videoRenderEnabled` runs mock zip only | L4480–4493 |

## UI gap

When `videoRenderEnabled` false, runPipeline **skips** MP4 (L3812–3827) and marks timeline complete — but **manual retry/export buttons** may still attempt `/api/reels/export` if store flag stale.

`components/quick-cut/video-render-disabled-notice.tsx` exists but may not block all export entry points.

## Recommended fix

1. **Single source of truth:** Client `videoRenderEnabled` **only** from `GET /api/quick-cut/config` — remove client-side dev default divergence  
2. **Align env:** Document server `VIDEO_RENDER_*`; remove reliance on `NEXT_PUBLIC_VIDEO_RENDER_*` for gating OR mirror values in `.env.local`  
3. **UI:** When server says disabled, disable export buttons + show `video-render-disabled-notice`; never call `/api/reels/export`  
4. **Production:** Set `VIDEO_RENDER_ENABLED=true`, `VIDEO_RENDER_MOCK=false`  
5. **Free tier policy (locked):** Allow export with watermark (Wave 3) — today Free may be blocked by `isMp4ExportEntitled` separately from VIDEO_RENDER gate

## Regression risk

| Change | Risk |
|--------|------|
| Remove client dev default | Medium — local dev must set env explicitly |
| Disable export buttons | Low |
| Server-only gate | Low — correct architecture |

---

# Issue 5 — End-to-End Quick Cut Validation

## Current predicted outcome (without fixes)

| Step | Expected result | Blocker |
|------|-----------------|---------|
| Create project | ✅ | — |
| Generate hook/script | ✅ | — |
| Generate storyboard/images | ✅ | — |
| Generate voice | ⚠️ 503 if no OPENAI_API_KEY | Issue 2 |
| Scene video | ❌ 400/403 | Issue 3 |
| Poll generation job | ⚠️ 404 / redirect | Issue 1 |
| Export reel | ❌ EXPORT_FAILED | Issue 4 |
| Download | ❌ No MP4 | Issue 4 |

## Validation checklist (post-fix)

Run on `/projects/{id}?autorun=1` with DevTools Network + Console open:

- [ ] No `GET /api/generation/jobs/{uuid-without-gen-prefix}`  
- [ ] `POST /api/generation/jobs` returns `gen_*` before first poll  
- [ ] No `POST /api/generate-scene-video` in creator/draft mode  
- [ ] `POST /api/generate-voice` returns 200 with `audioUrl` OR explicit skip UI  
- [ ] `POST /api/reels/export` returns job id or `reelUrl`, not 503 VIDEO_RENDER  
- [ ] No navigation to `/studio/projects` mid-generation  
- [ ] Zero uncaught console errors  

---

# Cross-Issue Dependency Map

```text
Issue 2 (no voice) ──► Issue 4 (export preflight fails)
Issue 3 (scene 400) ──► noise / optional failPipeline if videoRenderEnabled
Issue 1 (job 404) ──► redirect ──► pipeline appears "reset"
Issue 4 (env mismatch) ──► EXPORT_FAILED at end of otherwise successful run
```

---

# Recommended Fix Order (for implementation phase)

| Order | Issue | Rationale |
|-------|-------|-----------|
| 1 | **Issue 4** — Align VIDEO_RENDER gating | Unblocks export verification |
| 2 | **Issue 2** — Voice provider fallback + OPENAI requirement | Unblocks audio + export preflight |
| 3 | **Issue 3** — Stop spurious scene-video calls | Removes 400 noise / failures |
| 4 | **Issue 1** — Job lifecycle + poll retry + no redirect | Stabilizes progress UX |
| 5 | **Issue 5** — Full E2E smoke test | Confirm zero errors |

---

# Files Index (primary)

| File | Issues |
|------|--------|
| `hooks/use-reel-pipeline-poll.ts` | 1 |
| `hooks/use-quick-cut-project-hydration.ts` | 1 |
| `hooks/use-generation-job-resume.ts` | 1 |
| `stores/quick-cut-generation-store.ts` | 1, 2, 3, 4 |
| `lib/pipeline/reel-generation-orchestrator.client.ts` | 1 |
| `lib/generation/generation-job-service.ts` | 1 |
| `app/api/generation/jobs/route.ts` | 1 |
| `app/api/generation/jobs/[jobId]/route.ts` | 1 |
| `app/api/generate-voice/route.ts` | 2 |
| `lib/economics/provider-routing.server.ts` | 2, 3 |
| `lib/voice/generateVoice.ts` | 2 |
| `lib/cinematic/scene-video-pipeline.client.ts` | 3 |
| `app/api/generate-scene-video/route.ts` | 3 |
| `lib/quick-cut/quick-cut-v2-config.ts` | 3 |
| `app/api/reels/export/route.ts` | 4 |
| `lib/cinematic/quick-cut/video-render-enabled.ts` | 4 |
| `lib/cinematic/quick-cut/video-render-enabled.client.ts` | 4 |

---

# Next step

Review this audit. After approval, implement fixes in the order above and produce **`PIPELINE_STABILITY_REPORT.md`** with before/after verification.

**Wave 1 (security/billing) remains paused** until Issue 5 passes.
