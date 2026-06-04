# Voice → Storyboard Pipeline Stall Audit

**Date:** 2026-06-04  
**Symptom:** Generation reaches hook, script, visual_direction, voice — then
stops. No storyboard / save / export logs, no visible UI error.

---

## STEP 1 — Master orchestrator

| Role | File | Function |
| ------ | ------ | ---------- |
| **Primary orchestrator** | `stores/quick-cut-generation-store.ts` | `runPipeline` (~L2231) |
| Resume entry | same | `resumeGeneration` → `runPipeline({ resumeFrom: lastCompletedStep })` |
| Step gating | `lib/cinematic/generation-state.ts` | `stepShouldRun`, `PERSISTED_STEP_ORDER` |
| Persist per step | `lib/cinematic/generation-persist.ts` | `persistStepComplete` |
| V3 parallel track | `lib/pipeline/v3-cinematic-pipeline.ts` | `runV3Stage` / `executeV3Stage` (UI sync only; Quick Cut MP4 path is `runPipeline`) |
| Scene SOP (script phase) | `lib/cinematic/storyboard-sop-engine.ts` | `runStoryboardSop` |
| Multi-frame stills API | `lib/cinematic/storyboard-generator.ts` | `generateSceneStoryboardImages` |
| Quick Cut image gen | `stores/quick-cut-generation-store.ts` | `fetchSceneImages` → `POST /api/generate-images` |

### Call graph (Quick Cut `runPipeline`)

```text
runPipeline(input)
├── hook + script (Promise.all)
├── persist hook / script
├── Promise.all  ← [TRACE_ENTER] parallel_visual_voice
│   ├── visual_direction → POST /api/generate-scenes (timeout 90s)
│   └── voice            → POST /api/generate-voice (timeout 60s)
│       └── [STEP_COMPLETE] voice { nextStep: storyboard }
│       └── armPipelineWatchdog('post_voice_await_storyboard', 30s)
├── [TRACE_EXIT] parallel_visual_voice
├── [STEP_SHOULD_RUN] storyboard
├── if storyboardShouldRun
│   ├── [TRACE_ENTER] storyboard
│   ├── foreach scene → fetchSceneImages → POST /api/generate-images (timeout 60s)
│   ├── persistStepComplete('storyboard') (timeout 60s)
│   ├── motion + composeReelTimeline
│   └── [TRACE_EXIT] storyboard
├── assembly presentation
└── export (if stepShouldRun export)
```text
There is no separate `generateProject` / `runGenerationPipeline` symbol —
**`runPipeline` is the master**.

---

## Root cause (definitive)

### Category: **state machine / resume gating** (not timeout, not API swallow)

**File:** `lib/cinematic/generation-state.ts`  
**Functions:** `PERSISTED_STEP_ORDER` (L13–20), `stepShouldRun` (L31–39),
`inferLastCompletedStep` (L42–59)

**Runtime order** in `runPipeline` (comment L2217–2222):

1. visual_direction ∥ voice  
2. **storyboard** (images)  
3. motion → export  

**Bug (before fix):** persisted order listed `storyboard` **before** `voice`:

```ts
// OLD (wrong)
['hook','script','visual_direction','storyboard','voice','export']
```text
So when `resumeFrom === 'voice'` (after voice persisted, or `resumeGeneration`):

```ts
stepShouldRun('voice', 'storyboard')
// storyboard index 3, voice index 4 → 3 > 4 → false
```text
**Execution stopped at:** `stores/quick-cut-generation-store.ts` **~L3108** —
`if (stepShouldRun(resumeFrom, 'storyboard'))` never entered.

**Secondary bug:** `inferLastCompletedStep` returned `'voice'` before checking
for scene `imageUrl`, so reopen/resume always thought storyboard was done when
only voice existed.

### Secondary stall scenario: **hanging** (Promise.all)

If `visual_direction` never settles, `await Promise.all([...])` at **~L2919**
blocks even after voice logs complete. Mitigation: `withStepTimeout` on both
branches (60–90s) + `[PIPELINE_STALLED]` watchdog 30s after voice.

---

## Fixes applied

1. **`PERSISTED_STEP_ORDER`** — `voice` before `storyboard` (matches runtime).
2. **`inferLastCompletedStep`** — prefer `storyboard` when scenes have
`imageUrl`, then `voice`.
3. **Instrumentation** — `lib/pipeline/pipeline-trace.ts`,
`lib/pipeline/with-step-timeout.ts`.
4. **Store** — trace enter/exit, step should-run decision, watchdog, timeouts on
voice/visual/storyboard/save.

---

## Debug log reference (dev / `PIPELINE_DEBUG=true`)

| Tag | Meaning |
| ----- | --------- |
| `[TRACE_ENTER]` / `[TRACE_EXIT]` | Before/after awaited pipeline segment |
| `[STEP_START]` / `[STEP_SUCCESS]` / `[STEP_FAILURE]` | Wrapped `runTracedStep` |
| `[STEP_COMPLETE] voice { nextStep: storyboard }` | Voice boundary |
| `[STEP_SHOULD_RUN]` | Resume gate decision |
| `[PIPELINE_STALLED]` | 30s after voice with no storyboard start |
| `[TIMEOUT] stepName` | `withStepTimeout` exceeded |
| `[STORYBOARD_*]` | SOP / generator entry points |
| `[STATE_TRANSITION]` | Zustand `generationStep` changes |

---

## Verification

```bash
npx tsc --noEmit
```text
1. Fresh Quick Cut generate — expect `[TRACE_EXIT] parallel_visual_voice` then
`[TRACE_ENTER] storyboard`.
2. Stop after voice, click Resume — `[STEP_SHOULD_RUN] storyboard true`.
3. If stall persists, check for `[TIMEOUT] visual_direction` (hang) vs
`[STEP_SHOULD_RUN] storyboard false` (state).
