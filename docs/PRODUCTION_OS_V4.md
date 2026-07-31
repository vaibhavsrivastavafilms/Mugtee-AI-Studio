# Mugtee Production OS V4 — AI Creative Companion

Mugtee is not an AI generator. It is an **invisible production studio**.

> Creator: “Here’s my idea.”  
> Mugtee: researches, writes, directs, casts, designs, animates, scores, captions, renders, and exports a cinematic film (≤ 180s).

## Philosophy

The creator never thinks about prompts, models, APIs, providers, FFmpeg, or timelines.  
The Thinking Engine speaks only in companion language.

## Master pipeline (19 stages)

Idea Discovery → Deep Research → Creative Direction → Script → Screenplay → Storyboard → Shot List → **Character Bible** → **Environment Bible** → Voice → Images → Animation → Editing → Music → Sound Design → Captions → Rendering → Quality Check → Export

## Architecture modules

| Module | Role |
|--------|------|
| `lib/production-os/v4/pipeline.ts` | Phase contract + max 180s |
| `lib/production-os/v4/input.ts` | Multi-input: idea, voice, image, PDF, website, YouTube, brand brief |
| `lib/production-os/v4/thinking-engine.ts` | Natural status lines (no tech leaks) |
| `lib/production-os/v4/character-bible.ts` | Identity lock across scenes |
| `lib/production-os/v4/environment-bible.ts` | World lock across scenes |
| `lib/production-os/v4/provider-router.ts` | Runway → Seedance → Veo/Luma/Kling/… → Remotion cinematic |
| `lib/production-os/v4/companion.ts` | One-request production plan |
| `lib/production-os/v4/export-catalog.ts` | Full Creator Pack deliverables |

Built on Production OS V3 (jobs, camera director, quality engine, OffthreadVideo).

## Provider router

Official adapters only. Automatic fallback. Final path is always **Mugtee Cinematic Motion** (Remotion Camera Director) — production never dies because a third-party key is missing.

## Storage policy

| Temporary (auto-retain / purge) | Permanent (never auto-delete) |
|--------------------------------|-------------------------------|
| Storyboard stills, previews, caches, intermediate renders | Projects, scripts, research, briefs, brand kits, bibles, preferences |

## Success criteria

One idea → polished MP4/MOV + Creator Pack, with real progress, real ETA, companion Live Activity, and verified exports — feeling like a full film studio, not a tool chain.
