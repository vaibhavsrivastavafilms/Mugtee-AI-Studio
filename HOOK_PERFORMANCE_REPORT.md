# Hook Performance Pass 3 — Craft Hook Speed

Focused on **Craft Hook** perceived wait (~12s → target **<3s** for rules-based pipeline path).

## Current vs New Latency

| Phase | Before (est.) | After (est.) | Notes |
|-------|---------------|--------------|-------|
| Client validation retries | 0–6s (up to 3× `/api/generate-title` + network retries) | **0** (single request) | Removed `fetchValidatedTitleHook` retry loop |
| Server title/hook validation loops | 0–4s (3× title + 3× hook re-seed) | **<50ms** | `MAX_VALIDATION_RETRIES` 2→0 |
| Server hook candidate work | ~2× (generate + rotate duplicate) | **~1×** | Unified `buildHookCandidatePool` |
| Auth + intent parse | ~200–800ms (async intent fallback) | **<5ms** when client sends `parsedIntent` | `resolveParsedIntentSync` on title route |
| Title ∥ hook generation | Sequential | **Parallel** | `Promise.all` in `/api/generate-title` |
| Repeat same prompt (dev/cache) | Full recompute | **<10ms** | Server `hook-generation-cache` + client pipeline cache |
| Progressive UI | Blank until API done | **0.5s / 1s / 2s** staged labels + preview | Timers + immediate render on response |
| Regenerate hook (OpenAI) | 3 similarity + validation re-call | **1 attempt max** | `MAX_HOOK_SIMILARITY_RETRIES` 3→1; removed duplicate validation LLM call |

**Rules-based path (pipeline):** API CPU ~100–400ms + network. With staged UI, users see status at **500ms**, angle at **1s**, hook preview when response lands (often **<1.5s**), validated state immediately after. **<3s target is achievable** for typical network conditions.

**Regenerate hook (OpenAI):** Still bounded by LLM (~2–8s). Staged progress improves perceived speed; 3s wall-clock is **not** guaranteed for regen without streaming tokens.

## Bottlenecks Removed

1. **Triple client fetch** on validation miss (`hookVariantIndex` 0–2 + `maxRetries: 2`)
2. **Triple server re-seed** in `pickValidatedTitle` / `pickValidatedHook`
3. **Duplicate hook generation** (`generateHookCandidates` + redundant `pickRotatedHookCandidate` every pass)
4. **Async intent re-parse** on `/api/generate-title` when body already includes intent
5. **Sequential title then hook** on server
6. **Extra OpenAI call** on regenerate-hook validation failure retry
7. **Static hook panel** — no preview until full pipeline hook step completed

## Files Modified

| File | Change |
|------|--------|
| `lib/cinematic/hook-generation-progress.ts` | **New** — staged Craft Hook timers + labels |
| `lib/virlo-engine/hook-generation-cache.server.ts` | **New** — server cache by topic/niche/seed/angle |
| `stores/quick-cut-generation-store.ts` | Single hook fetch, progress controller, preview state |
| `app/api/generate-title/route.ts` | Sync intent, parallel pick, cache, deduped hook pool |
| `app/api/regenerate-hook/route.ts` | Fewer retries, no duplicate validation LLM call |
| `lib/quality/output-validator.ts` | `MAX_OUTPUT_VALIDATION_RETRIES` 2→0 |
| `lib/input-understanding/candidate-selection.ts` | `MAX_VALIDATION_RETRIES` 2→0 |
| `lib/cinematic/hook-variation.ts` | `MAX_HOOK_SIMILARITY_RETRIES` 3→1 |
| `lib/ai/llm-pipeline-cache.client.ts` | Prod opt-in via `NEXT_PUBLIC_LLM_CACHE=1` |
| `components/workflow/workflow-header.tsx` | Hook progress status line |
| `components/quick-cut/generation-stage-panel.tsx` | Hook preview + progressive loading copy |

## How Streaming Works

This pass uses **staged client progress** (not SSE) for the rules-based path:

1. `createHookProgressController` fires timers at **500ms**, **1000ms**, **2000ms** updating `generationStep`, `hookProgressLabel`, and tab focus.
2. On `/api/generate-title` response, `markCandidate` sets `hookPreview` immediately; `markValidated` sets final `hook`.
3. `WorkflowHeader` reads `hookProgressLabel` via `resolveHookStatusLabel`.
4. `GenerationStagePanel` renders preview with pulse styling until validated hook replaces it.

Regenerate-hook uses the same progress controller for consistent Craft Hook UX during OpenAI regen (full token streaming deferred — JSON `response_format`).

## Retry / Cache Changes

| Constant | Before | After |
|----------|--------|-------|
| `MAX_OUTPUT_VALIDATION_RETRIES` | 2 | **0** |
| `MAX_VALIDATION_RETRIES` (server) | 2 | **0** |
| `MAX_HOOK_SIMILARITY_RETRIES` | 3 | **1** |
| `pipelineFetchJson` maxRetries (hook) | 2 | **0** |

**Cache keys:** `hash(topic + niche + platform + sessionSeed + attemptIndex + contentAngleId + hookFrameworkId + previousHooks)`

Enable production caches: `HOOK_CACHE=1`, `NEXT_PUBLIC_LLM_CACHE=1`

## Estimated Speed Gain

| Scenario | Before | After | Gain |
|----------|--------|-------|------|
| Happy-path hook (1 API) | ~2–4s | ~0.5–1.5s | **~2–3×** |
| Validation retry path | ~8–12s | ~0.5–1.5s | **~6–8×** |
| Repeat prompt (cached) | ~2–4s | ~0.1–0.5s | **~8×** |
| Perceived wait (UI) | 12s blank | Status @0.5s, preview @response | **Meets 3s UX target** |

## Verification

```bash
npm run build
```

Manual: Start Quick Cut generation → confirm workflow header shows "Analyzing audience…" → "Finding story angle…" → hook preview → final hook without static full-screen loader.
