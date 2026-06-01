# AI Provider Migration Plan

Mugtee AI Studio uses a modular multi-provider architecture for text generation across the Idea → Hook → Script → Visual → Storyboard → Voice → Export pipeline. This document tracks migration phases and env configuration.

## Architecture

```
lib/ai/providers/
  types.ts              — AIProvider interface, task input/output types
  router.ts             — executeWithFallback(), retry + backoff
  task-routing.ts       — primary/fallback/emergency per task
  health.ts             — provider health / failure timestamps
  context-injection.ts  — memory + niche lock injection
  generation-bridge.ts  — route-facing helpers (hook/script)
  shared.ts             — JSON parse, fetch timeout, OpenAI-compatible chat
  prompt-helpers.ts     — hook/script prompt builders
  providers/
    openai-provider.ts
    gemini-provider.ts
    groq-provider.ts
    openrouter-provider.ts
    deepseek-provider.ts
  index.ts
```

## Phase 1 (current) — Architecture + hook/script routing

| Route | Status | Provider chain |
|-------|--------|----------------|
| `POST /api/generate-title` | **Migrated** | AI router for hooks; Virlo rule engine fallback |
| `POST /api/generate-script` | **Migrated** | AI router via `run-script-generation`; Anthropic legacy fallback |
| `GET /api/ai/providers/health` | **Added** | Dev/admin health snapshot |
| `POST /api/regenerate-hook` | Phase 2 | Still direct OpenAI |
| `POST /api/generate-voice` | Phase 2 | ElevenLabs / OpenAI TTS |
| Visual / storyboard routes | Phase 2 | Image providers unchanged (`lib/image-providers/`) |
| Caption / repurpose routes | Phase 2 | Stub → OpenAI via provider interface |

### Fallback order (defaults when env unset)

Keys are skipped when missing. Order is inferred from available API keys.

| Task | Primary | Fallback | Emergency |
|------|---------|----------|-----------|
| Hook | gemini | groq | openai |
| Script | openai | gemini | groq |
| Title | gemini | openai | groq |
| Caption | groq | gemini | openai |

Override with env vars, e.g. `AI_PROVIDER_SCRIPT_PRIMARY=openai`.

### Context injection

All router calls prepend:

- Parsed creator intent (`lib/input-understanding/`)
- Creator memory profile (`lib/memory/memory-prompt-injection.ts`)
- Content brief (`lib/content-director/`)
- Niche lock (`buildNicheLayer` from `lib/cinematic/niches.ts`)

### Reliability

- 2 retries per provider with 400ms / 1200ms backoff
- Timeouts: 15s hook/title/caption, 60s script/storyboard/research
- Failures logged as `[ai-router]`; user-facing copy stays friendly

## Phase 2 — Remaining routes

- Wire `/api/regenerate-hook`, caption repurpose, motion director through router
- Migrate visual/storyboard text steps (prompt expansion, scene copy)
- Deprecate direct `getOpenAIClient()` in regen paths
- Surface `useAIProviderStore` in dev toolbar

## Phase 3 — Orchestration

- Task-aware cost routing (cheap models for captions, quality for script)
- Cross-provider response caching keyed by prompt hash
- Automatic provider cooldown from health metrics

## Environment variables

See `.env.example` section **AI Provider Routing**.

Required keys (at least one for live text generation):

- `OPENAI_API_KEY`
- `GEMINI_API_KEY` (or `GOOGLE_API_KEY`)
- `GROQ_API_KEY`
- `OPENROUTER_API_KEY`
- `DEEPSEEK_API_KEY`

Optional routing overrides:

```
AI_PROVIDER_HOOK_PRIMARY=gemini
AI_PROVIDER_HOOK_FALLBACK=groq
AI_PROVIDER_HOOK_EMERGENCY=openai
AI_PROVIDER_SCRIPT_PRIMARY=openai
AI_PROVIDER_SCRIPT_FALLBACK=gemini
AI_PROVIDER_SCRIPT_EMERGENCY=groq
```

## Feature recommendations (future — not built in Phase 1)

**Viral Hook Analyzer** — Score hooks against retention heuristics (curiosity gap, specificity, banned patterns) before script generation; surface a 0–100 score and one-line fix in the Hook step. Uses the same router with a cheap model and rule-based post-check.

**Hook A/B Pack** — Generate 3 router-backed hook variants in one call, store in variation history, and let creators pick before locking script. Extends `generate-title` without new UI chrome.

**Provider Cost Dashboard** — Admin view combining `/api/ai/providers/health` with token estimates per task; helps tune `AI_PROVIDER_*_PRIMARY` for margin on free tier.

**Niche Drift Guard** — Compare parsed intent niche vs output hook/script niche tokens; auto-retry on mismatch using emergency provider with stronger niche lock injection.

**Script Quality Gate Router** — When SOP score is below threshold, re-run only the script task on the quality-tier provider (OpenAI) without replaying research/storyboard.

**Voice Provider Fallback** — Mirror text router for ElevenLabs → OpenAI TTS → mock, wired into `/api/generate-voice` in Phase 2.

**Cross-Session Hook Memory** — Persist winning hooks from memory graph into `buildProviderContext()` so repeat creators get differentiated openings without manual “avoid previous hooks” lists.
