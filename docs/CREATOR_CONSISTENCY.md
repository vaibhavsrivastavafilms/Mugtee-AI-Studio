# Creator Consistency Layer (Phase 2)

Cross-provider style fingerprinting keeps hook, script, and caption outputs aligned with one cinematic voice — regardless of whether Gemini, OpenAI, or Groq handled the task.

## Flow

```
Intent → Memory → Niche Lock → Style Fingerprint → Provider
                                    ↓
                          Post-gen consistency score
                                    ↓
                    (if &lt; 70) one retry on fallback provider
```

## Modules

| File | Role |
|------|------|
| `lib/ai/style-fingerprint.ts` | Build + format fingerprint for prompts |
| `lib/ai/style-fingerprint-validation.ts` | Heuristic 0–100 score (`STYLE_CONSISTENCY_THRESHOLD = 70`) |
| `lib/ai/providers/style-consistency.ts` | `executeWithStyleGuard` — router + drift retry |
| `lib/ai/providers/context-injection.ts` | Injects fingerprint into every `buildProviderContext()` call |
| `lib/ai/style-fingerprint-analytics.ts` | Server event `style_fingerprint_drift` |

## Fingerprint fields

- `niche`, `pacing`, `emotionalIntensity`, `sentenceRhythm`, `hookStyle`, `visualTone`, `ctaStyle`

Derived from project state (topic, duration, visual style), creator memory/DNA, and niche profile defaults.

## Analytics

Event: `style_fingerprint_drift` (`AnalyticsEvents.STYLE_FINGERPRINT_DRIFT`)

Metadata: `step`, `provider`, `fingerprint_score`, `retry_count`, `retry_reason`, `projectId`, `task`

## Router entry points

- `generateHookViaRouter` — hook/title path
- `generateScriptViaRouter` — script path (Quick Cut `run-script-generation`)
- `generateCaptionViaRouter` — caption path (ready for repurpose migration)

See also `docs/AI_PROVIDER_MIGRATION.md` for provider chains and env overrides.
