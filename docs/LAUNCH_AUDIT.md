# Mugtee — Launch Readiness Audit

**Date:** 2026-06-09  
**Scope:** Production public launch candidate  
**Readiness score (pre-fix):** ~8.5/10  
**Rule:** No product redesign. Revenue protection, billing correctness, export
reliability, cost visibility, abuse prevention, observability, user trust.

---

## Executive Summary

Mugtee has a **strong core product**: Quick Cut generation, durable
`generation_jobs` / `export_jobs`, Remotion MP4 export, first-party analytics,
and a broad admin suite. **Launch blockers** cluster around:

1. **Revenue leakage** — unauthenticated AI/render routes and no distributed
   rate limiting
2. **Billing → entitlements gap** — Razorpay checkout does not reliably update
   `profiles.plan_type` (server limits source of truth)
3. **Export economics incomplete** — `recordExportRenderMetrics` never called;
   admin unit-economics under-reports
4. **Watermark policy mismatch** — marketed on Free tier for exports; MP4
   pipeline has no burn-in
5. **`generationMode` not persisted** — refresh/regen silently reverts to
   `creator`
6. **Production observability** — no Sentry/Datadog; env validation not
   centralized

**Recommendation:** Resolve all **Critical** and **High** items before public
launch. Medium items can ship in first post-launch patch if explicitly accepted.

---

## 1. Authentication

### What exists

| Component | Location | Status |
| ----------- | ---------- | -------- |
| Supabase session middleware | `middleware.ts`, `lib/supabase/middleware.ts` | ✅ Page routes protected |
| Public route allowlist | `lib/auth/public-routes.ts` | ✅ Narrow API exceptions |
| Per-route auth | `lib/auth/require-auth.ts` | ✅ Used inconsistently |
| Admin allowlist | `lib/admin/is-admin.ts` | ✅ Env-based |
| Profile RLS + billing hardening | `0010_profile_trial.sql`, `0067_billing_rls_hardening.sql` | ✅ Blocks client tampering |
| OAuth + trial grant | `app/auth/callback/route.ts` | ✅ 7-day PRO_TRIAL on first login |

### Gaps

- Middleware **does not gate `/api/*`** except 4 public paths; ~210 API routes
  rely on per-handler auth.
- `secureGenerationRoute` (`lib/auth/secure-route.ts`) — auth + rate limit
  wrapper — **never used**.
- Dual plan systems: server (`profiles` + `usage-tracker`) vs client
  (`lib/usage.tsx` localStorage).

---

## 2. Billing

### What exists

| Component | Location | Status |
| ----------- | ---------- | -------- |
| Razorpay SDK + plan IDs | `lib/razorpay.ts` | ⚠️ Amounts may not match catalog |
| Create subscription | `app/api/billing/create-subscription/route.ts` | ⚠️ User-scoped DB writes |
| Client verify | `app/api/billing/verify/route.ts` | ❌ Does not sync `profiles.plan_type` |
| Webhook | `app/api/billing/webhook/route.ts` | ✅ Calls `syncSubscriptionEntitlements` |
| Entitlement sync | `lib/billing/sync-subscription-entitlements.server.ts` | ✅ Service role |
| Plan limits | `lib/billing/plan-limits.ts` | ✅ Free/Creator/Pro/Studio caps |
| Plan catalog | `lib/billing/plan-catalog.ts` | ⚠️ Creator still "waitlist" in UI copy |
| Subscriptions schema | `migrations/0001_billing.sql` | ⚠️ Not in `supabase/migrations/` |

### Critical billing flows

```text
Checkout success → POST /api/billing/verify → subscriptions.status = active
                                              → profiles.plan_type UNCHANGED ❌

Webhook → syncSubscriptionEntitlements → profiles.plan_type updated ✅
         (only if webhook configured + delivered)
```

Server usage limits read **`profiles.plan_type`** via
`lib/usage/usage-tracker.ts`. Paid users who only hit `/verify` may **remain on
FREE limits** while Razorpay shows active.

After migration **0067**, authenticated users **cannot insert/update**
`subscriptions` — `create-subscription` and `verify` may **fail silently or
500** unless refactored to service role.

---

## 3. Usage Limits

### Configured caps (`lib/billing/plan-limits.ts`)

| Plan | Generations | Exports/Renders |
| ------ | ------------- | ----------------- |
| Free | 5 | 1 |
| Creator | 30 | 5 |
| Pro | 100 | 20 |
| Studio | 300 | 50 |

### Enforcement

- `guardUsageLimit()` used in **~19 API route files** (grep count).
- Many AI/voice/image/render routes **lack guards** (e.g.
  `app/api/ai/generate`, `app/api/ai/runway-video`, `app/api/render-video`,
  director routes).
- `MUGTEE_LIMITS_ENABLED=false` disables all limits globally.
- `PRO_TRIAL` treated as **unlimited** via `isUnlimitedPlan()`.
- Counters in `profiles.*_count` are **lifetime**, not monthly — marketing copy
  says "/ month" (`plan-catalog.ts`).
- Dev bypass: `NEXT_PUBLIC_DEV_UNLOCK_EXPORT=true` or `NODE_ENV=development`
  (`lib/export/export-entitlement.ts`).

---

## 4. Generation Pipeline

### What exists

| Component | Location | Status |
| ----------- | ---------- | -------- |
| Client orchestrator | `stores/quick-cut-generation-store.ts` (`runPipeline`) | ✅ |
| Stage machine | `lib/pipeline/reel-generation-orchestrator.ts` | ✅ |
| Durable jobs | `generation_jobs` (0064, 0065) | ⚠️ Must be applied in prod |
| Job sync API | `app/api/generation/jobs/*` | ✅ |
| Provider routing by mode | `lib/economics/provider-routing.server.ts` | ✅ |
| Generation modes UI | `components/studio/quick-create-controls.tsx` | ✅ |
| Mode in API bodies | `generate-images`, `generate-voice`, `deep-research` | ✅ Request-only |

### Gaps

- **`generationMode` not in database** — no column on `cinematic_projects`,
  not in archive/hydration (`lib/cinematic/quick-cut/project-hydration.ts`).
- Regen spreads `INITIAL` → mode resets to `creator`.
- Recent fix work on job polling/404 redirect (in progress) — verify before launch.
- Migrations 0064–0065 required; pipeline throws if health check fails.

---

## 5. Export Pipeline

### What exists

| Component | Location | Status |
| ----------- | ---------- | -------- |
| Queue + Remotion | `lib/reels/export-api.ts`, `lib/video/orchestrate-remotion-reel.ts` | ✅ In-process |
| Durable jobs | `export_jobs` (0051), economics cols (0068) | ⚠️ Metrics unwired |
| Poll clients | `lib/reels/export-poll.client.ts` | ✅ Timeout/stuck handling |
| Active job dedup | `findActiveExportJobForProject` | ✅ |
| Usage guard on export | `app/api/reels/export/route.ts` | ✅ |
| State labels | `lib/reels/export-stages.ts` | ✅ pending→rendering→uploading→completed/failed |

### Gaps

- **`recordExportRenderMetrics` defined but never called** — `render_seconds`,
  `cost_estimate_usd` stay null.
- `retryExportJob` resets row but **does not re-invoke render**.
- No external worker; Vercel function timeout risk on long renders.
- `enqueueExportJob` failure logged but render may continue without durable row.
- No 30-minute stale job watchdog writing `failed` + reason (Phase 7 requirement).
- Browser FFmpeg export path bypasses `export_jobs`.

---

## 6. Watermark Enforcement

| Surface | Free tier watermark | Location |
| --------- | --------------------- | ---------- |
| Script TXT | ✅ | `lib/quick-cut/download-script.ts` |
| DOCX | ✅ | `lib/export-docx.ts` |
| MP4 / Remotion | ❌ None | `lib/remotion/compositions/ReelComposition.tsx` |
| Export API | ❌ No plan-based burn-in | `orchestrate-remotion-reel.ts` |

**Policy mismatch:** Free tier is **blocked from MP4** via compile guard rather
than receiving watermarked MP4. Plan catalog promises "Watermarked exports" —
implementation is text-only.

---

## 7. Admin Dashboards

### Existing routes (`/admin/*`)

| Route | Purpose |
| ------- | --------- |
| `/admin` | Founder KPIs |
| `/admin/unit-economics` | COGS, margins, export costs |
| `/admin/launch-readiness` | Auto-probes + checklist |
| `/admin/health` | Job health (ops-like) |
| `/admin/export-funnel` | MP4 funnel |
| `/admin/analytics` | Conversion |
| + 9 more | Referrals, feedback, ecosystem, etc. |

### Missing (per launch spec)

| Required | Status |
| ---------- | -------- |
| `/admin/ops` unified dashboard | ❌ Split across health/ecosystem |
| Export Health Panel (filterable) | ❌ Partial data in unit-economics |
| `/admin/launch` metrics (MRR, conversion) | ⚠️ Partial in founder dashboard |

**Security gap:** Admin **pages** lack server-side `isAdminUser` redirect
(only APIs return 403). Exception: `/studio/admin`.

---

## 8. Database Migrations

**70 files** in `supabase/migrations/` (0001–0068).

### Launch-critical (verify applied in production Supabase)

| Migration | Purpose |
| ----------- | --------- |
| 0051 | `export_jobs` |
| 0064–0065 | `generation_jobs` + pipeline columns |
| 0067 | Billing RLS hardening (**P0 security**) |
| 0068 | Unit economics + export metrics columns |
| 0001_billing (root `migrations/`) | `subscriptions` table — **manual** |

**Health check:** `GET /api/generation/jobs/health` (auth required).

---

## 9. Environment Variables

See **`ENVIRONMENT_AUDIT.md`** for full inventory.

**Critical gaps:**

- No centralized startup validation (no `@t3-oss/env` / Zod schema).
- `.env.example` contains dangerous defaults (`VIDEO_RENDER_MOCK=true`,
  `NEXT_PUBLIC_DEV_UNLOCK_EXPORT=true`).
- Project uses **Supabase Auth**, not NextAuth — `NEXTAUTH_SECRET` is **not
  applicable** (use Supabase JWT secret via platform).

---

## 10. Error Tracking & Analytics

### Analytics — strong

- `trackEvent` / `trackError` → `analytics_events` table
- Optional PostHog dual-write
- 40+ catalogued events in `lib/analytics/events.ts`
- Admin conversion + export funnel dashboards

### Error tracking — weak

| Tool | Status |
| ------ | -------- |
| Sentry | ❌ Not installed |
| Datadog APM | ❌ Not integrated |
| First-party `analytics_error` | ✅ Dashboard only, no paging |

---

## 11. Ads Integration

| Component | Status |
| ----------- | -------- |
| AdSense script in layout | ⚠️ Hardcoded publisher fallback |
| `AdSlot` component | ❌ Not mounted anywhere |
| `WatchAdBanner` | ⚠️ Simulated 5s ad, not real AdMob |
| Sponsored placements (DB + admin) | ⚠️ Component not mounted on pages |

---

## 12. Abuse Prevention

| Control | Status |
| --------- | -------- |
| In-memory rate limiter | ⚠️ `lib/auth/rate-limit.ts` — per-instance only |
| `secureGenerationRoute` | ❌ Unused |
| Guest hook server limit | ❌ Public `app/api/guest-hook` — no throttle |
| RLS on user data | ✅ |
| Billing column trigger (0067) | ✅ |

---

## Issue Register

### 🔴 Critical (launch blockers)

| ID | Area | Issue | Primary files |
| ---- | ------ | ------- | --------------- |
| C1 | Auth | Unauthenticated AI spend (`/api/ai/generate`, `/api/ai/rewrite`, `/api/ai/runway-video`) | `app/api/ai/*` |
| C2 | Auth | Unauthenticated render (`/api/render-video`) | `app/api/render-video/route.ts` |
| C3 | Billing | `/api/billing/verify` does not update `profiles.plan_type` | `app/api/billing/verify/route.ts` |
| C4 | Billing | `create-subscription` / `verify` use user client; fail after 0067 RLS | `app/api/billing/create-subscription/route.ts` |
| C5 | Billing | `CREATOR` plan_type may violate DB CHECK (`FREE`, `PRO_TRIAL`, `PRO` only in 0010) | `0010_profile_trial.sql`, sync entitlements |
| C6 | Limits | Paid checkout may not unlock server limits (C3 cascade) | `lib/usage/usage-tracker.ts` |
| C7 | Abuse | No production-grade API rate limiting | `lib/auth/secure-route.ts` (unused) |
| C8 | Export | Render metrics never persisted | `recordExportRenderMetrics` uncalled |
| C9 | Migrations | Prod may be missing 0051, 0064–0068, 0067 | Supabase console |
| C10 | Env | Dev export unlock flags can bypass paid gates in prod | `lib/export/export-entitlement.ts` |

### 🟠 High priority

| ID | Area | Issue | Primary files |
| ---- | ------ | ------- | --------------- |
| H1 | Limits | ~190 API routes without `guardUsageLimit` | Most `app/api/**` |
| H2 | Limits | Dual client/server limit systems disagree | `lib/usage.tsx` vs `usage-tracker.ts` |
| H3 | Limits | PRO_TRIAL = unlimited server-side | `lib/billing/plan-limits.ts` |
| H4 | Billing | Razorpay amounts (₹599/₹999) vs catalog (₹999/₹2499/₹4999) | `lib/razorpay.ts`, `plan-catalog.ts` |
| H5 | Billing | Pricing UI "waitlist" for Creator while checkout exists | `plan-catalog.ts` |
| H6 | Watermark | No MP4 watermark for Free tier | Remotion + export API |
| H7 | Mode | `generationMode` not persisted across refresh | Store only |
| H8 | Export | No stale job cleanup (30 min timeout) | `export-job-service.ts` |
| H9 | Export | `enqueueExportJob` failure non-fatal | `lib/reels/export-api.ts` |
| H10 | Admin | Admin pages not server-guarded | `app/(app)/admin/**` |
| H11 | Observability | No Sentry/crash reporting | — |
| H12 | Generation | Job poll 404 → redirect to Projects (fix in progress) | `use-quick-cut-project-hydration.ts` |

### 🟡 Medium priority

| ID | Area | Issue |
| ---- | ------ | ------- |
| M1 | Limits | Lifetime counters vs "/ month" marketing |
| M2 | Billing | Webhook idempotency / replay protection |
| M3 | Billing | `subscriptions` table outside standard migration path |
| M4 | Export | Dual poll endpoints (`/api/reels/export/` vs `/api/export/status/`) |
| M5 | Export | No external render worker (Vercel timeout) |
| M6 | Analytics | Unauthenticated analytics POST spam |
| M7 | Ads | Hardcoded AdSense publisher IDs |
| M8 | Auth | Auth callback trial upsert may fail on update after 0067 |
| M9 | Admin | Ops dashboards not linked from `/admin` hub |
| M10 | Env | No public `/api/health` for uptime monitors |

### 🟢 Nice-to-have

| ID | Item |
| ---- | ------ |
| N1 | Consolidate `/admin/ops` from health + ecosystem |
| N2 | Wire or remove unused `AdSlot` / sponsored placement slots |
| N3 | Monthly usage reset cron |
| N4 | Per-creator render compute cap (cost-model doc) |
| N5 | Update stale `docs/infrastructure-audit.md` migration count |
| N6 | Distributed rate limit via Upstash Redis |

---

## Success Criteria Mapping

| Criterion | Pre-fix status |
| ----------- | ---------------- |
| Billing production-safe | ❌ C3–C6 |
| Export pipeline stable | ⚠️ H8–H9 |
| Watermarks enforced | ❌ H6 |
| Usage limits not bypassable | ❌ C1–C2, H1 |
| Generation modes persist | ❌ H7 |
| Cost metrics visible | ❌ C8 |
| Monitoring operational | ❌ H11 |
| Razorpay subscriptions work | ⚠️ Webhook-only entitlements |
| No critical audit issues | ❌ 10 critical open |
| E2E tests pass | ❌ See LAUNCH_CHECKLIST.md |

---

## References

- `docs/QA_AUDIT_FULL.md` — prior security findings (partially addressed)
- `docs/EXPORT_AUDIT.md` — export pipeline detail
- `docs/cost-model.md` — unit economics targets
- `docs/LAUNCH_READINESS.md` — existing readiness doc
- `ENVIRONMENT_AUDIT.md` — env inventory
- `LAUNCH_CHECKLIST.md` — validation checklist

---

*Generated by launch audit Phase 1. No application code was modified.*
