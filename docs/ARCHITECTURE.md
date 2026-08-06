# Mugtee — Architecture (MVP)

## Overview

Mugtee AI Studio is a **Next.js 14 App Router** monolith. UI, API routes, and background work all run in one deployable unit (Vercel + Supabase).

## Primary user flow (V3 MVP)

```
/v3 prompt → POST /api/v3/projects
  → Planner → Research → Script → Storyboard → Character → Location → Style
  → Prompts → Images → Videos → Voice → Music → Captions → Editor → Export (Remotion MP4)
```

State lives in Supabase:

| Table | Purpose |
|-------|---------|
| `v3_projects` | Project metadata, plan, export URLs |
| `v3_scenes` | Script + storyboard per scene |
| `v3_jobs` | Per-agent status (queued/running/completed/failed) |
| `profiles` | Plan type + monthly usage counters |
| `subscriptions` | Razorpay/Stripe subscription rows |

## Agents

Each pipeline stage is an agent under `agents/` with a matching handler in `lib/v3/orchestrator.server.ts`. Runnable order is defined in `lib/v3/pipeline.ts`.

## Billing & credits

- **Limits:** `lib/billing/plan-limits.ts` + env overrides
- **Enforcement:** `lib/usage/api-guards.ts` on API routes
- **Monthly reset:** `lib/billing/credits-engine.server.ts`
- **Payments:** Razorpay (default) or Stripe via `lib/billing/payment-provider.ts`

## Export

V3 export bridges to the legacy Remotion renderer via `lib/v3/render-bridge.server.ts` → `lib/video/orchestrate-remotion-reel.ts`.

## Auth

Supabase Auth + middleware (`middleware.ts` → `proxy.ts`). Protected routes include `/v3`, `/dashboard`, `/studio`.

## Monitoring

- **PostHog:** `lib/posthog.ts` (client + server events)
- **Sentry:** optional via `SENTRY_DSN` + `@sentry/nextjs`

See also: [MUGTEE_MVP.md](./MUGTEE_MVP.md), [DEPLOYMENT.md](./DEPLOYMENT.md)
