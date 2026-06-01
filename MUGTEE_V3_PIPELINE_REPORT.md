# Mugtee V3 — Cinematic AI Creation Pipeline

Multi-stage AI production system: creator directs a film with an AI sidekick. **Integrates existing modules** — does not replace `runPipeline`.

## Feature flag

```bash
MUGTEE_V3_PIPELINE=true
```

Optional LLM enhancement for Creative Director (server API only):

```bash
MUGTEE_V3_CREATIVE_LLM=true   # or CONTENT_BRIEF_LLM=true
```

When flag is **off**, behavior is unchanged — legacy `runPipeline` only.

When flag is **on**:

- `/api/quick-cut/config` returns `v3PipelineEnabled: true`
- Store runs Creative Director after content brief (rules sync + optional `/api/v3/creative-director`)
- `syncV3PipelineState()` builds scene plan, visual bible, flux prompts, motion, voice plan, timeline tracks at pipeline end
- `CreatorEditor` can show V3 stage strip

## 10-stage mapping

| Stage | V3 ID | Existing implementation | Status |
|-------|--------|----------------------|--------|
| 1 Creative Director | `creative_director` | `lib/content-director/creative-director-brief.ts`, `/api/v3/creative-director` | **Shipped** |
| 2 Scene Planner | `scene_planner` | `lib/cinematic/scene-blueprint.ts`, `/api/generate-scenes` | **Integrated** |
| 3 Visual Bible | `visual_bible` | `lib/cinematic/visual-bible.ts` | **Shipped** |
| 4 Flux Image Engine | `flux_image_engine` | `buildBlueprintImagePrompt` + `/api/generate-images` (FluxAPI Kontext → Together schnell) | **Integrated** |
| 5 Seedance Motion | `seedance_motion` | `lib/video-providers/*`, `runSceneVideoGeneration` | **Integrated** |
| 6 Voice Director | `voice_director` | `lib/voice/voiceDirector.ts`, `/api/generate-voice` | **Integrated** |
| 7 Timeline Composer | `timeline_composer` | `lib/reel/compose-reel-timeline.ts`, `DirectorTimeline` | **Partial** — music track placeholder |
| 8 Creator Editor | `creator_editor` | `components/editor/creator-editor.tsx` | **Partial** — shell + reorder/trim/regen |
| 9 Memory System | `memory_system` | `lib/memory/v3-creator-preferences.ts` | **Partial** — in-session; no DB persist yet |
| 10 Export Studio | `export_studio` | `lib/quick-cut/creator-pack-export.client.ts` | **Integrated** |

## Architecture

```
runPipeline (unchanged entry)
    │
    ├─ MUGTEE_V3_PIPELINE=false → legacy flow only
    │
    └─ MUGTEE_V3_PIPELINE=true
           ├─ generateRulesCreativeDirectorBriefSync (client)
           ├─ POST /api/v3/creative-director (optional LLM)
           ├─ … existing hook/script/scenes/images/voice/export …
           └─ syncV3PipelineState() → V3PipelineState snapshot
```

Orchestrator: `lib/pipeline/v3-cinematic-pipeline.ts`

- `runV3Stage(stage, ctx)` — run one stage against existing functions
- `syncV3StateFromContext(ctx)` — non-destructive sync from store snapshot
- `V3_STAGE_IMPLEMENTATION_MAP` — documents module ownership

Types: `lib/pipeline/v3-types.ts`

## Files created

| File | Purpose |
|------|---------|
| `lib/pipeline/v3-types.ts` | Stage types and pipeline state |
| `lib/pipeline/v3-feature-flag.ts` | `MUGTEE_V3_PIPELINE` helper |
| `lib/pipeline/v3-cinematic-pipeline.ts` | Orchestrator + stage runners |
| `lib/pipeline/index.ts` | Barrel exports |
| `lib/cinematic/visual-bible.ts` | Visual Bible generate/merge |
| `lib/content-director/creative-director-brief.ts` | Full CreativeDirectorBrief |
| `lib/memory/v3-creator-preferences.ts` | creator_style, preferred_hooks, etc. |
| `app/api/v3/creative-director/route.ts` | LLM creative director API |
| `components/editor/creator-editor.tsx` | CapCut-style editor shell |
| `MUGTEE_V3_PIPELINE_REPORT.md` | This document |

## Files modified

| File | Change |
|------|--------|
| `stores/quick-cut-generation-store.ts` | V3 state, `syncV3PipelineState`, `runV3Stage`, pipeline hooks |
| `app/api/quick-cut/config/route.ts` | Expose `v3PipelineEnabled` |

## FluxAPI image setup (local)

1. Copy `FLUXAPI_KEY=` from `.env.example` into `.env.local` (never commit `.env.local`).
2. Set the key from [FluxAPI.ai](https://fluxapi.ai/) dashboard → API Key Management.
3. Restart `npm run dev` so Next.js loads the new env.
4. Provider chain: `lib/image-providers/index.ts` → FluxAPI Kontext → Together `FLUX.1-schnell` → Pollinations.

Optional: `FLUXAPI_MODEL` (default `flux-kontext-pro`), `FLUXAPI_ASPECT_RATIO` (default `9:16`). Alias: `FLUX_API_KEY`.

## Environment variables

| Variable | Stage | Required |
|----------|-------|----------|
| `MUGTEE_V3_PIPELINE` | All V3 | Yes (to enable) |
| `OPENAI_API_KEY` | Creative Director LLM, script fallback | Optional |
| `ANTHROPIC_API_KEY` | Script generation | Optional |
| `GEMINI_API_KEY` | Script (free tier) | Optional |
| `FLUXAPI_KEY` | Flux Kontext Pro images (FluxAPI.ai) | Preferred for images |
| `TOGETHER_API_KEY` | FLUX.1-schnell images (Together) | Fallback when FluxAPI unset/fails |
| `ELEVENLABS_API_KEY` | Voice Director | For voice |
| `SEEDANCE_API_KEY` or `VIDEO_GENERATION_ENABLED` | Scene video clips | Optional |
| `MUGTEE_V3_CREATIVE_LLM` | Creative Director AI pass | Optional |
| `CONTENT_BRIEF_LLM` | Also enables creative LLM | Optional |
| `VIDEO_RENDER_ENABLED` | MP4 export | Optional |

## Migration from `runPipeline`

1. **No breaking changes** — `runPipeline` remains the entry point.
2. Enable `MUGTEE_V3_PIPELINE=true` in env.
3. V3 artifacts populate `v3PipelineState`, `creativeDirectorBrief`, `visualBible` on the store.
4. For stage-only execution: `useQuickCutGenerationStore.getState().runV3Stage('visual_bible')`.
5. For full custom orchestration: import `runV3Stage` from `@/lib/pipeline` with a `V3PipelineContext`.

### `runPipeline` step → V3 stage map

| Generation step | V3 stages |
|-----------------|-----------|
| `analyzing`, `title`, `hook` | `creative_director` |
| `script` | `creative_director`, `scene_planner` |
| `scenes` | `scene_planner`, `visual_bible` |
| `images` | `flux_image_engine` |
| `motion` | `seedance_motion` |
| `voice` | `voice_director` |
| `render` | `timeline_composer` |
| `complete` | `export_studio`, `memory_system` |

## What ships now vs phase 2

### Ships now (V3 alpha)

- [x] Pipeline types and orchestrator
- [x] Creative Director brief (rules + optional API LLM)
- [x] Visual Bible module merged with scene blueprints
- [x] Flux / Seedance / Voice / Timeline stage adapters (call existing code)
- [x] Store adapter with feature flag
- [x] Creator Editor shell (reorder, trim, scene regen, voice regen)
- [x] Config API flag exposure
- [x] Master report

### Phase 2 follow-ups

- [ ] Persist `v3PipelineState` / `visualBible` to `cinematic_projects` JSONB
- [ ] Per-scene voice regen API (today: full voice regen only)
- [ ] Music track generation / library integration
- [ ] Creator Editor in main studio tab (wire into `WorkflowStackedPanel`)
- [ ] Storyboard PDF export dedicated route (creator-pack already includes assets)
- [x] Flux Kontext provider (`lib/image-providers/fluxapi.ts`, `FLUXAPI_KEY`)
- [ ] V3 mission steps in `WorkflowTimeline` (10 steps vs 9)
- [ ] Memory persist to Supabase creator profile

## Success criteria checklist

- [ ] `MUGTEE_V3_PIPELINE=true` → config returns `v3PipelineEnabled: true`
- [ ] Quick Cut generation completes with flag on (backward compatible)
- [ ] `creativeDirectorBrief` populated with unique `runId` / `uniquenessToken`
- [ ] `visualBible` merges with scene blueprints after generation
- [ ] `CreatorEditor` renders scenes with drag reorder + trim + regen buttons
- [ ] `npm run build` passes
- [ ] Flag off → zero V3 API calls, legacy pipeline unchanged
- [ ] Creator pack export still produces MP4/SRT/script/storyboard assets

## Usage examples

```tsx
import { CreatorEditor } from '@/components/editor/creator-editor'

<CreatorEditor showV3Stages />
```

```ts
import { runV3Stage, isV3PipelineEnabled } from '@/lib/pipeline'

if (isV3PipelineEnabled()) {
  const result = await runV3Stage('visual_bible', ctx)
}
```

```ts
// Store
const { v3PipelineEnabled, syncV3PipelineState, runV3Stage } = useQuickCutGenerationStore()
```
