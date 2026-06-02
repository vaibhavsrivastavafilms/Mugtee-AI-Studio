# Infrastructure Audit (Phase 1)

**Date:** 2026-06-03 | **Production:** mugtee.in

---

## Current State

| Component | Hosting | Notes |
|-----------|---------|-------|
| Web app | Vercel (Next.js 14 App Router) | `maxDuration: 300` on export routes |
| Database | Supabase Postgres + RLS | 51 migrations through `0051` |
| Object storage | Supabase (`reels`, `project-assets`) | Public read on `reels` |
| Auth | Supabase Auth | Session cookies for API |
| AI | OpenAI, Anthropic, Gemini, Groq, ElevenLabs | Router in `lib/ai` |
| Video render | Remotion in-serverless | Not separate worker yet |
| Analytics | `analytics_events`, `mp4_export_failures` view | Migration `0048` |

---

## Problems

| ID | Area | Issue |
|----|------|-------|
| I1 | Export | No dedicated render worker — function timeouts |
| I2 | Export | Ephemeral job store until `export_jobs` deployed |
| I3 | Observability | Limited structured export tracing in Datadog |
| I4 | CI | Playwright stub only; no export integration tests |
| I5 | Config | Env flags scattered (`VIDEO_RENDER_*`, `FREE_TIER_ONLY`) |
| I6 | Scale | ~25 users reported; 0 historical MP4 completions |

---

## Root Cause

Infrastructure grew as a **monolithic Next.js deployment** with heavy work (Remotion, FFmpeg faceless) colocated in API routes. Serverless constraints (memory, duration, cold start) conflict with minute-long video encodes.

---

## Recommendations (in scope)

1. ✅ `export_jobs` durable queue (0051)
2. Document worker split (`render-worker-architecture.md`)
3. Explicit `vercel.json` function config for export paths
4. Reliability test plan before 1000-creator scale
5. **Out of scope:** Opportunity Engine, Companion DNA, Network Intelligence

---

## Dependencies

- Supabase migrations applied in order
- `VIDEO_RENDER_ENABLED=true` on production
- Remotion NFT tracing in `next.config.js` (commit 3ba10a1)
