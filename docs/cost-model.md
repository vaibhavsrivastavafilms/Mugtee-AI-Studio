# Cost Model (Phase 8)

**Date:** 2026-06-03 | **Assumption:** 1000 active creators/month

---

## Current State

| Cost driver | Billing unit | Guard |
|-------------|--------------|-------|
| LLM script/visual | Tokens | Router + `FREE_TIER_ONLY` |
| ElevenLabs voice | Characters | Usage limits |
| Scene images | DALL-E / provider | Per-generation |
| Runway clips | Per-second video | Scene-level only |
| Remotion export | Vercel GB-sec + duration | `guardUsageLimit(..., 'renders')` |
| Supabase | Storage + egress | Public reels bucket |

---

## Problems

- Export cost unbounded if retries loop (stuck export auto-retry)
- No per-creator monthly render cap in `export_jobs`
- Runway + Remotion double spend if creators generate clips then export static reel

---

## Root Cause

Usage guards exist for **renders** count but not **compute seconds** or **retry budget**.

---

## Estimates (order of magnitude)

| Scenario | Monthly $ (rough) |
|----------|-------------------|
| 1000 creators × 4 exports × 90s Vercel @ 3GB | $150–400 Vercel compute |
| 1000 × 4 × ElevenLabs 30s voice | $200–600 (plan dependent) |
| 1000 × 8 scene images | $400–1200 (model dependent) |
| Storage 1000 × 50MB reel | ~50GB → $1–5 Supabase |

**Dominant risk:** failed retries + long Remotion runs on Vercel Pro.

---

## Recommendations

1. Worker with fixed concurrency (cap parallel renders)
2. `export_jobs` max retries = 2; exponential backoff
3. Alert on `mp4_failed` rate > 10% (view `0048`)
4. Keep scene Runway off critical path until MP4 stable

---

## Savings from worker migration

Moving render off Vercel API → Railway/Fly **dedicated CPU** typically 40–60% lower $/minute for same throughput vs serverless overages.
