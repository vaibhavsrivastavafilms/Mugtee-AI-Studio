# Mugtee — Environment Audit

**Date:** 2026-06-09  
**Source:** `.env.example`, `PRODUCTION_SETUP.md`, codebase grep  
**Auth note:** Mugtee uses **Supabase Auth**, not NextAuth. `NEXTAUTH_SECRET` from the launch spec is **not used** — omit or replace with Supabase-managed secrets.

---

## 1. Validation Status

| Capability | Status |
|------------|--------|
| Centralized env schema (Zod / t3-env) | ❌ Missing |
| Build-time validation | ❌ Missing |
| Runtime startup fail-fast | ❌ Missing |
| Launch auto-probes | ✅ `lib/admin/launch-readiness.ts` (partial) |
| Public health endpoint | ❌ Missing |

**Recommendation:** Add `lib/env/server.ts` + `lib/env/client.ts` with Zod; fail in `instrumentation.ts` when `NODE_ENV=production` and required vars missing.

---

## 2. Production-Critical Variables

### Must be set (fail fast if missing)

| Variable | Purpose | Used in |
|----------|---------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Auth, DB, storage |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + server user-scoped access | `lib/supabase/*` |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin metrics, usage tracker, billing sync, webhooks | `lib/supabase/service.ts`, admin APIs |
| `NEXT_PUBLIC_BASE_URL` | OAuth redirects, export URLs | `app/auth/callback`, export paths |

### Strongly recommended (launch)

| Variable | Purpose |
|----------|---------|
| `ADMIN_EMAILS` or `ADMIN_USER_IDS` | Admin dashboard access |
| `GEMINI_API_KEY` or `OPENAI_API_KEY` | Core generation (at least one AI provider) |
| `VIDEO_RENDER_ENABLED` | Must be `true` for MP4 |
| `RAZORPAY_KEY_ID` | Live billing |
| `RAZORPAY_KEY_SECRET` | Live billing |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics (launch checklist expects this) |

### AI providers (plan-dependent)

| Variable | Used for |
|----------|----------|
| `OPENAI_API_KEY` | Script, TTS (Free/Creator), images |
| `GEMINI_API_KEY` | Script fallback |
| `ANTHROPIC_API_KEY` | Script |
| `TOGETHER_API_KEY` | Draft images |
| `ELEVENLABS_API_KEY` | Pro/Studio voice |
| `PERPLEXITY_API_KEY` | Creator/Cinematic research |
| `RUNWAY_API_KEY` | Studio cinematic scene video |

---

## 3. Dangerous Defaults (must NOT ship to production)

| Variable | `.env.example` default | Risk |
|----------|------------------------|------|
| `VIDEO_RENDER_MOCK` | `true` | Fake MP4 URLs |
| `NEXT_PUBLIC_DEV_UNLOCK_EXPORT` | `true` | Bypasses export/plan gates |
| `FREE_TIER_ONLY` | `true` | Restricts paid providers |
| `MUGTEE_LIMITS_ENABLED` | unset (enabled) | Setting `false` disables all limits |
| `NODE_ENV` | `development` locally | Triggers dev export unlock via code |

**Production values:**

```env
VIDEO_RENDER_MOCK=false
NEXT_PUBLIC_DEV_UNLOCK_EXPORT=false   # or unset
FREE_TIER_ONLY=false                  # if paid tiers live
MUGTEE_LIMITS_ENABLED=true            # or unset
NODE_ENV=production                   # set by Vercel
```

---

## 4. Billing Environment

| Variable | Purpose | Status in `.env.example` |
|----------|---------|--------------------------|
| `RAZORPAY_KEY_ID` | API auth | ✅ Documented |
| `RAZORPAY_KEY_SECRET` | API auth | ✅ Documented |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook HMAC | ✅ Documented |
| `RAZORPAY_PLAN_CREATOR` | Plan ID override | ⚠️ Optional |
| `RAZORPAY_PLAN_AGENCY` | Plan ID override | ⚠️ Optional |
| `RAZORPAY_AMOUNT_CREATOR` | Amount override | ⚠️ May conflict with catalog |
| `RAZORPAY_AMOUNT_AGENCY` | Amount override | ⚠️ May conflict with catalog |

**Webhook URL (production):** `https://mugtee.in/api/billing/webhook`

---

## 5. Usage Limit Overrides

All optional; defaults in `lib/billing/plan-limits.ts`.

| Prefix | Example |
|--------|---------|
| `MUGTEE_LIMIT_*` | Free tier |
| `MUGTEE_CREATOR_LIMIT_*` | Creator tier |
| `MUGTEE_PRO_LIMIT_*` | Pro tier |
| `MUGTEE_STUDIO_LIMIT_*` | Studio tier |
| `MUGTEE_UNLIMITED_PRO` | Pro unlimited override |

---

## 6. Feature Flags

| Variable | Effect |
|----------|--------|
| `VIDEO_RENDER_ENABLED` | MP4 export |
| `PIPELINE_DEBUG` | Verbose generation logs |
| `MUGTEE_UNLIMITED_PRO` | Pro tier unlimited metrics |

---

## 7. Analytics & Monitoring

| Variable | Purpose | Required? |
|----------|---------|-----------|
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog | Recommended |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host | Optional |
| Sentry DSN | Crash reporting | ❌ Not configured |
| Datadog keys | APM | ❌ Not configured |

---

## 8. Ads

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_ADSENSE_CLIENT` | Publisher ID |
| `NEXT_PUBLIC_ADSENSE_SLOT_*` | Placement slots |

**Warning:** Layout falls back to hardcoded publisher ID if env unset.

---

## 9. Storage & Export

| Variable | Purpose |
|----------|---------|
| `SUPABASE_STORAGE_BUCKET` | Asset storage |
| `REMOTION_*` | Render config (if used) |

---

## 10. Recommended Startup Validation Schema

Proposed required set for `NODE_ENV=production`:

```typescript
const productionRequired = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_BASE_URL',
  'ADMIN_EMAILS', // or ADMIN_USER_IDS
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
] as const

const productionForbidden = [
  { key: 'VIDEO_RENDER_MOCK', value: 'true' },
  { key: 'NEXT_PUBLIC_DEV_UNLOCK_EXPORT', value: 'true' },
] as const
```

At least **one** of: `OPENAI_API_KEY`, `GEMINI_API_KEY` should be required for generation.

---

## 11. Verification Checklist

Run before launch (manual):

- [ ] Vercel production env matches section 3 safe values
- [ ] `GET /api/generation/jobs/health` returns OK (authenticated)
- [ ] Admin user can load `/admin` (403 without `ADMIN_EMAILS`)
- [ ] Razorpay webhook test event reaches `/api/billing/webhook`
- [ ] OAuth redirect uses correct `NEXT_PUBLIC_BASE_URL`
- [ ] No secrets committed to git (`.env.local` gitignored)

---

## 12. Gap Summary

| Gap | Priority |
|-----|----------|
| No automated env validation at boot | High |
| Dangerous defaults in `.env.example` | High |
| No Sentry/Datadog env vars | Medium |
| NEXTAUTH_SECRET not applicable — document Supabase instead | Info |

---

*Generated by launch audit Phase 10. No application code was modified.*
