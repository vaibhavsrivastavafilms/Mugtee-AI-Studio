# Wave 1 — Security + Billing Implementation Plan

**Status:** Awaiting approval — no code changes until approved  
**Date:** 2026-06-09  
**Scope:** Launch blockers only (audit items C1–C7 + Wave 1 items 1–5)  
**Locked decisions applied:** Monthly usage reset · Free export allowed (watermark in Wave 3)

---

## Prerequisites (read before implementation)

- [`docs/LAUNCH_AUDIT.md`](./LAUNCH_AUDIT.md) — Critical C1–C10
- [`docs/ENVIRONMENT_AUDIT.md`](./ENVIRONMENT_AUDIT.md) — Prod env requirements
- [`docs/LAUNCH_CHECKLIST.md`](./LAUNCH_CHECKLIST.md) — Validation template

---

## Wave 1 Goals

| # | Goal | Done when |
|---|------|-----------|
| 1 | All cost routes require auth + plan + limits | Zero unauthenticated AI/render/export spend |
| 2 | Usage enforced on every generation/export | Quota consumed + recorded; monthly reset works |
| 3 | Billing sync always correct | Payment ↔ `profiles.plan_type` ↔ limits |
| 4 | Razorpay production-ready | ₹999 / ₹2499 / ₹4999 + audit log |
| 5 | Immutable ledgers | `generation_events` + `export_events` append-only |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Cost API Route                                              │
│    secureCostRoute()  → auth + rate limit + project owner    │
│    guardUsageLimit()  → monthly quota check                  │
│    handler            → business logic                       │
│    recordGenerationEvent() / recordExportEvent()  → ledger   │
│    trackUsageMetric() → profiles counter cache (optional)  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Billing                                                     │
│    Razorpay checkout → verify (service role)                 │
│                     → syncSubscriptionEntitlements           │
│                     → writeBillingAuditLog                   │
│    Webhook (same path + idempotency)                         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Monthly usage                                               │
│    usage_period_start on profiles OR ledger COUNT window     │
│    ensureUsagePeriod(userId) resets counters at month edge   │
└─────────────────────────────────────────────────────────────┘
```

---

## New Shared Modules (create first)

### `lib/auth/secure-cost-route.ts` *(new)*

Consolidates auth + rate limit + optional project ownership for all cost routes.

| Export | Purpose |
|--------|---------|
| `secureCostRoute(options)` | Returns `{ user }` or `NextResponse` error |
| `CostRouteOptions` | `rateLimitKey`, `max`, `windowMs`, `projectId`, `requireAuth: true` |

**Implementation:** Extend/refactor `lib/auth/secure-route.ts` (rename export to `secureCostRoute` for clarity; keep backward alias).

### `lib/usage/cost-route-policy.ts` *(new)*

Single registry mapping route patterns → `{ metric, requiresProject }`.

Used by tests to assert every cost route is covered.

### `lib/usage/usage-period.server.ts` *(new)*

Monthly reset logic (locked product decision).

| Function | Behavior |
|----------|----------|
| `ensureUsagePeriod(userId)` | If `now >= usage_period_end`, reset `*_count` to 0, roll period forward |
| `getUsagePeriodBounds(userId)` | Returns `{ start, end }` for ledger queries |

### `lib/usage/usage-ledger.server.ts` *(new)*

Append-only writes to `generation_events` / `export_events`.

| Function | When called |
|----------|-------------|
| `recordGenerationEvent(...)` | After successful generation API (or at start + update — prefer once at success) |
| `recordExportEvent(...)` | After export queue / completion |
| `countGenerationsInPeriod(userId)` | Optional cross-check vs profiles counter |

### `lib/billing/billing-audit.server.ts` *(new)*

| Function | Purpose |
|----------|---------|
| `writeBillingAuditLog(entry)` | Insert into `billing_audit_log` (service role) |
| `BillingAuditEventType` | `checkout_created`, `payment_verified`, `webhook_*`, `entitlement_sync`, `downgrade`, etc. |

### `lib/billing/resolve-effective-plan.server.ts` *(new)*

Single read path: merge `subscriptions.status` + `profiles.plan_type` + trial expiry.

Used by guards instead of raw `profiles.plan_type`.

---

## Migrations (apply in order)

### `supabase/migrations/0069_wave1_billing_schema.sql`

**Purpose:** Fix schema gaps blocking production billing.

Changes:

1. Expand `profiles.plan_type` CHECK → `'FREE','PRO_TRIAL','CREATOR','PRO','STUDIO'`
2. Expand `subscriptions.plan` CHECK → `'free','creator','pro','studio'` (migrate `agency` → `pro`)
3. Expand `subscriptions.status` CHECK → include `'halted'`
4. Add columns to `profiles`:
   - `usage_period_start timestamptz not null default date_trunc('month', now())`
   - `usage_period_end timestamptz` (computed or stored)
   - `subscription_id text` (mirror Razorpay sub id for support)
   - `billing_status text` (mirror subscriptions.status)
   - `renewal_date timestamptz`
5. Copy `migrations/0001_billing.sql` into supabase chain if table missing (idempotent `create table if not exists`)

**RLS:** No client writes to new billing columns (extend `protect_profiles_billing_columns` trigger).

### `supabase/migrations/0070_billing_audit_log.sql`

```sql
create table public.billing_audit_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subscription_id text,
  event_type text not null,
  status text,
  plan text,
  payload jsonb default '{}',
  created_at timestamptz not null default now()
);
-- RLS: service role insert only; admin read via service role
-- NO delete policy (immutable)
```

### `supabase/migrations/0071_usage_ledgers.sql`

```sql
create table public.generation_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.cinematic_projects(id) on delete set null,
  plan_type text not null,
  generation_mode text,
  provider text,
  estimated_cost_usd numeric(12,6),
  route text,
  created_at timestamptz not null default now()
);

create table public.export_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid,
  export_job_id text,
  plan_type text not null,
  render_seconds numeric(12,3),
  estimated_cost_usd numeric(12,6),
  status text,
  route text,
  created_at timestamptz not null default now()
);

-- Indexes: (user_id, created_at desc), (project_id, created_at desc)
-- RLS: users select own rows; inserts service role only
-- NO delete/update policies
```

### `supabase/migrations/0072_usage_monthly_reset.sql`

- Update column comments on `profiles.*_count` → "Current billing period (resets monthly)"
- Extend `protect_profiles_billing_columns` to also protect `usage_period_start`, `usage_period_end`
- Optional RPC `reset_usage_period_if_due(p_user_id uuid)` callable from service role

---

## Item 1 — Secure All Cost-Producing Routes

### Tier A — CRITICAL (no auth today)

| File | Current | Change |
|------|---------|--------|
| `app/api/ai/generate/route.ts` | No auth | `secureCostRoute` + `guardUsageLimit('generations')` + ledger |
| `app/api/ai/rewrite/route.ts` | No auth | Same |
| `app/api/ai/runway-video/route.ts` | No auth | Same + Studio plan gate (Runway) |
| `app/api/ai/motion-director/route.ts` | No auth | Same |
| `app/api/quality/review/route.ts` | No auth | Auth + generation limit |
| `app/api/elevenlabs/preview/route.ts` | No auth | Auth + strict rate limit (no full generation metric unless preview counts) |

### Tier B — Auth present, no enforcement

| File | Current | Change |
|------|---------|--------|
| `app/api/render-video/route.ts` | Optional `user` | Require auth; `guardUsageLimit('renders')`; ledger |
| `app/api/content-director/brief/route.ts` | Guard only if user | Require auth always |
| `app/api/ai/image/route.ts` | Auth only | Add `guardUsageLimit('generations')` + ledger |
| `app/api/ai/voice/route.ts` | Auth only | Add guard + ledger |
| `app/api/ai/voiceover/route.ts` | Auth only | Add guard + ledger |
| `app/api/ai/video-generator/route.ts` | Auth only | Add guard + ledger |
| `app/api/generate-series/route.ts` | Auth only | Add guard + ledger |
| `app/api/cinematic/render/prepare/route.ts` | Auth only | Add render guard |
| `app/api/cinematic/render/output/[...path]/route.ts` | Auth only | Verify project ownership |

### Tier C — Director / agent AI surface (19 routes)

All under `app/api/director/**` — audit each file; pattern:

```ts
const auth = await secureCostRoute({ rateLimitKey: 'director', projectId })
if (auth.response) return auth.response
const blocked = await guardUsageLimit(auth.user.id, 'generations')
if (blocked) return blocked
```

Priority files (LLM-heavy):

- `director/video/generate/route.ts`
- `director/creative-team/run/route.ts`
- `director/creative-team/agent/route.ts`
- `director/producer/analyze/route.ts`
- `director/virlo/analyze/route.ts`
- `director/story-package/route.ts`
- `director/treatment/route.ts`
- `director/story-directions/route.ts`

Lower cost (still auth required):

- `director/memory/route.ts`, `director/studio-state/route.ts`, etc.

### Tier D — Already guarded (verify + add ledger only)

| File | Metric | Add ledger |
|------|--------|------------|
| `app/api/generate-script/route.ts` | generations | ✅ |
| `app/api/generate-scenes/route.ts` | generations | ✅ |
| `app/api/generate-images/route.ts` | generations | ✅ |
| `app/api/generate-voice/route.ts` | generations | ✅ |
| `app/api/generate-title/route.ts` | generations | ✅ |
| `app/api/generate-scene-video/route.ts` | generations | ✅ |
| `app/api/regenerate-*/route.ts` | generations | ✅ |
| `app/api/enhance-*/route.ts` | generations | ✅ |
| `app/api/ai/deep-research/route.ts` | generations | ✅ |
| `app/api/reels/export/route.ts` | renders | ✅ export_events |
| `app/api/export/start/route.ts` | renders | ✅ |
| `app/api/compile-video/route.ts` | renders | ✅ |
| `app/api/timeline/render/route.ts` | renders | ✅ + trackUsageMetric if missing |

### Tier E — Export/render poll routes (auth, no spend)

| File | Change |
|------|--------|
| `app/api/reels/export/[jobId]/route.ts` | Require auth + job ownership |
| `app/api/export/status/[jobId]/route.ts` | Same |
| `app/api/render/reel/status/[jobId]/route.ts` | Same |
| `app/api/render-video/status/[jobId]/route.ts` | Same |
| `app/api/reels/download/[projectId]/**` | Auth + project owner |

### Tier F — Public exceptions (keep public, harden)

| File | Change |
|------|--------|
| `app/api/guest-hook/route.ts` | IP rate limit (5/day); no LLM if over limit; never counts as generation |
| `app/api/quick-cut/config/route.ts` | Keep public (no cost) |
| `app/api/ai/providers/health/route.ts` | Require admin OR auth (no provider calls) |

### Bypass paths to close in Wave 1

| File | Issue | Fix |
|------|-------|-----|
| `lib/export/export-entitlement.ts` | `isDevExportUnlocked()` in prod if env set | Gate bypass: only `NODE_ENV=development` AND explicit env; never `NEXT_PUBLIC_*` alone in prod |
| `lib/export/export-entitlement.ts` | Free blocked from MP4 | **Deferred to Wave 3** (watermark). Wave 1: allow Free export with limit=1; watermark not yet enforced |
| `lib/billing/plan-limits.ts` | `PRO_TRIAL` unlimited | Cap trial: use Free limits or dedicated trial caps |
| `lib/usage.tsx` | Client localStorage limits | Wave 1: fetch `/api/usage` as source of truth in UI (minimal change) |

---

## Item 2 — Usage Enforcement

### Files to modify

| File | Change |
|------|--------|
| `lib/usage/usage-tracker.ts` | Call `ensureUsagePeriod()` before `checkLimit` / `incrementUsage` |
| `lib/usage/api-guards.ts` | Add `guardAndTrackUsage(userId, metric, ctx)` → check + increment + ledger hook |
| `lib/usage/usage-period.server.ts` | **New** — monthly reset |
| `lib/usage/usage-ledger.server.ts` | **New** — append events |
| `app/api/usage/route.ts` | Return `usage_period_start/end`; block client arbitrary increment except admin |

### Monthly reset algorithm

```
On checkLimit / incrementUsage:
  1. Load profile.usage_period_start
  2. If now >= start + 1 calendar month:
       SET projects_count, generations_count, exports_count, renders_count = 0
       SET usage_period_start = date_trunc('month', now())
  3. Proceed with check/increment
```

Alternative validation: `COUNT(*) FROM generation_events WHERE user_id AND created_at >= period_start`.

### Metric mapping (canonical)

| Action | Metric | Ledger table |
|--------|--------|--------------|
| Script, images, voice, research, director AI | `generations` | `generation_events` |
| MP4 export, compile, timeline render | `renders` | `export_events` |
| Download package / workspace export | `exports` | `export_events` |
| New project create | `projects` | optional `generation_events` with route=`project_create` |

### Tests to add

| File | Covers |
|------|--------|
| `tests/usage/usage-period.test.ts` | Month rollover resets counters |
| `tests/usage/plan-limits.test.ts` | Free/Creator/Pro/Studio caps |
| `tests/usage/cost-route-coverage.test.ts` | Registry lists all Tier A–D routes |

---

## Item 3 — Billing Sync Fix

### Root cause (from audit)

- `POST /api/billing/verify` updates `subscriptions` only — **not** `profiles.plan_type`
- `create-subscription` uses user-scoped client — **fails after 0067**
- `planKeyToProfilePlanType`: `agency` → `PRO` only; **Studio tier missing**

### Files to modify

| File | Change |
|------|--------|
| `app/api/billing/verify/route.ts` | After signature OK → `syncSubscriptionEntitlements()` via service role; `writeBillingAuditLog`; return effective plan |
| `app/api/billing/create-subscription/route.ts` | Service role upsert pending subscription; audit log; support 3 plans |
| `app/api/billing/webhook/route.ts` | Audit log on every handled event; idempotency via `(subscription_id, event_type, razorpay_event_id)` |
| `lib/billing/sync-subscription-entitlements.server.ts` | Map `creator→CREATOR`, `pro→PRO`, `studio→STUDIO`; set `profiles.renewal_date`, `billing_status`, `subscription_id`; downgrade on `cancelled`/`halted`/`past_due` |
| `lib/billing/resolve-effective-plan.server.ts` | **New** — used by `usage-tracker` |
| `lib/usage/usage-tracker.ts` | Read plan via `resolveEffectivePlan(userId)` not raw profile |
| `app/auth/callback/route.ts` | Trial grant via service role (avoid 0067 trigger block on update) |
| `app/api/billing/me/route.ts` | Return `plan_type`, `billing_status`, `renewal_date`, usage period |

### Entitlement sync matrix

| subscriptions.status | profiles.plan_type |
|---------------------|-------------------|
| `active` | CREATOR / PRO / STUDIO (from plan) |
| `pending` | FREE (or previous until active) |
| `cancelled`, `halted`, `past_due`, `expired` | FREE |

### Expiry handling

- Cron or webhook `subscription.cancelled` / `subscription.halted` → sync to FREE
- `app/api/billing/me/route.ts` checks `current_period_end < now()` → treat as expired even if status stale

---

## Item 4 — Razorpay Production Wiring

### Files to modify

| File | Change |
|------|--------|
| `lib/razorpay.ts` | Add `PlanKey = 'creator' | 'pro' | 'studio'`; amounts **99900 / 249900 / 499900** paise; env overrides `RAZORPAY_*_PLAN_ID` |
| `lib/billing/plan-catalog.ts` | Creator CTA → checkout (remove waitlist); align copy |
| `components/billing/razorpay-checkout-button.tsx` | Support 3 plans; hide test label when `RAZORPAY_KEY_ID` live prefix |
| `app/api/billing/create-subscription/route.ts` | Accept `creator | pro | studio` |
| `app/api/billing/webhook/route.ts` | Parse 3 plan keys from notes |
| `.env.example` | Document live plan IDs + amounts |

### Razorpay plan mapping

| Product tier | Razorpay plan key | Price | profiles.plan_type |
|--------------|-------------------|-------|-------------------|
| Creator | `creator` | ₹999/mo | CREATOR |
| Pro | `pro` | ₹2499/mo | PRO |
| Studio | `studio` | ₹4999/mo | STUDIO |

**Note:** Retire `agency` key; migration maps existing rows.

### Webhook events to handle

| Event | Action |
|-------|--------|
| `subscription.activated` | active + audit |
| `subscription.charged` | active + renewal_date + audit |
| `subscription.pending` | pending + audit |
| `subscription.halted` | FREE + audit |
| `subscription.cancelled` | FREE + audit |
| `payment.failed` | past_due + audit (add handler) |

---

## Item 5 — Generation & Export Ledger

### Write points

| Trigger location | Table | Fields |
|------------------|-------|--------|
| Each guarded generation route (after success) | `generation_events` | user, project, plan, mode, provider, cost, route |
| `lib/reels/export-api.ts` `queueReelExportForProject` | `export_events` | user, project, job id, plan, status=`queued` |
| `lib/video/orchestrate-remotion-reel.ts` on complete | `export_events` | render_seconds, cost, status=`completed` |
| Export failure paths | `export_events` | status=`failed` |

### Cost estimation

Reuse `lib/economics/cost-estimates.ts`:

- `estimateGenerationCostUsd(mode, provider)` — **new helper**
- `estimateExportCostUsd(durationSec)` — existing

### Admin read (minimal in Wave 1)

- Extend `app/api/admin/unit-economics/route.ts` to include ledger aggregates (full Export Health Panel is Wave 2)

---

## Implementation Sequence (within Wave 1)

| Step | Work | Est. files |
|------|------|------------|
| **W1.1** | Migrations 0069–0072 | 4 SQL |
| **W1.2** | Shared libs (secure-cost-route, usage-period, ledger, billing-audit, resolve-plan) | 6 TS |
| **W1.3** | Billing sync (verify, create-sub, webhook, sync entitlements) | 5 TS |
| **W1.4** | Razorpay 3-tier pricing | 4 TS |
| **W1.5** | Tier A critical routes (6 files) | 6 TS |
| **W1.6** | Tier B routes (8 files) | 8 TS |
| **W1.7** | Tier C director routes (19 files) | 19 TS |
| **W1.8** | Tier D ledger wiring (existing guarded routes) | ~15 TS |
| **W1.9** | Tier E poll/download auth | 6 TS |
| **W1.10** | Bypass closure + PRO_TRIAL caps | 3 TS |
| **W1.11** | Tests + `LAUNCH_IMPLEMENTATION_REPORT.md` | 4+ files |

**Total touched:** ~70 files (mostly small additive changes per route)

---

## Verification (Wave 1 complete)

Run after implementation:

```bash
npm run typecheck
npm run lint
npm run test
```

Manual smoke:

1. Anonymous POST to `/api/ai/generate` → **401**
2. Free user: 6th generation → **429** `plan_limit`
3. Razorpay test checkout → `/api/billing/verify` → `profiles.plan_type = CREATOR`
4. Cancel webhook → `profiles.plan_type = FREE`
5. `generation_events` row after successful generate
6. Usage counters reset when `usage_period_start` rolled (unit test)

---

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| 0067 already applied in prod; billing writes fail today | W1.3 is first code change after migrations |
| `CREATOR` CHECK violation on profile update | 0069 migration before any sync |
| Free MP4 still blocked until Wave 3 watermark | Update `isMp4ExportEntitled` in W1.10 to allow Free (limit only) |
| Director route sweep is large | Scripted grep test prevents misses |
| Monthly reset vs Razorpay billing cycle misaligned | Document: usage resets calendar month; subscription renews on Razorpay cycle |

---

## Out of Scope (Wave 2+)

- Watermark burn-in (Wave 3)
- Export stale job cron (Wave 2)
- Render metrics columns (Wave 2)
- `/admin/ops`, `/admin/launch` (Wave 4)
- Upstash rate limiting (Wave 5)
- `generationMode` DB persistence (Wave 4)
- Env startup validation (Wave 5)

---

## Approval Checklist

Before implementation, confirm:

- [ ] Approve migration numbers 0069–0072
- [ ] Approve 3-tier Razorpay mapping (`creator` / `pro` / `studio`)
- [ ] Approve calendar-month usage reset (vs billing-cycle reset)
- [ ] Approve allowing Free MP4 export in Wave 1 (limit enforced; watermark Wave 3)
- [ ] Approve PRO_TRIAL cap strategy (recommend: Free-tier limits, not unlimited)
- [ ] Approve retiring `agency` plan key

**Reply "approved" to begin Wave 1 implementation.**
