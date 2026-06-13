# Mugtee — Pre-Launch Checklist

**Date:** 2026-06-09  
**Status:** Pre-implementation baseline (most items **NOT RUN** or **FAIL** pending fixes)  
**Run after:** Critical issues in `LAUNCH_AUDIT.md` are resolved.

Legend: ✅ Pass · ⚠️ Partial · ❌ Fail · ⬜ Not tested

---

## A. Infrastructure

| # | Check | Result | Notes |
|---|-------|--------|-------|
| A1 | All 70 Supabase migrations applied (incl. 0051, 0064–0068, 0067) | ⬜ | Verify in Supabase SQL history |
| A2 | `subscriptions` table exists (0001_billing) | ⬜ | Manual migration path |
| A3 | `GET /api/generation/jobs/health` → OK | ⬜ | Requires auth |
| A4 | Production env vars set per `ENVIRONMENT_AUDIT.md` | ⬜ | |
| A5 | `VIDEO_RENDER_MOCK=false` in production | ⬜ | |
| A6 | `NEXT_PUBLIC_DEV_UNLOCK_EXPORT` unset/false | ⬜ | |
| A7 | `ADMIN_EMAILS` configured | ⬜ | |
| A8 | Razorpay webhook URL configured | ⬜ | `/api/billing/webhook` |

---

## B. User Journey (Manual E2E)

| # | Step | Result | Notes |
|---|------|--------|-------|
| B1 | Signup (email/OAuth) | ⬜ | |
| B2 | Create Quick Cut project | ⬜ | `/studio/quick` or V2 flow |
| B3 | Select generation mode (draft/creator/cinematic) | ⬜ | |
| B4 | Generate reel (script → storyboard → voice) | ⬜ | |
| B5 | Refresh browser mid-generation — progress resumes | ⬜ | H12 fix required |
| B6 | Refresh after generation — mode unchanged | ❌ | H7: mode not persisted |
| B7 | Export reel (MP4) | ⬜ | Plan-dependent |
| B8 | Download MP4 | ⬜ | |
| B9 | Upgrade plan (Razorpay checkout) | ⬜ | |
| B10 | Post-upgrade limits reflect new tier | ❌ | C3: verify may not sync profile |

---

## C. Billing

| # | Check | Result | Notes |
|---|-------|--------|-------|
| C1 | Creator checkout ₹999/mo | ⚠️ | Catalog vs Razorpay amounts may differ |
| C2 | Pro checkout ₹2499/mo | ⚠️ | Mapped to Razorpay `agency` plan |
| C3 | Studio checkout ₹4999/mo | ⚠️ | Verify plan mapping |
| C4 | Webhook signature verification | ⬜ | |
| C5 | Subscription activation → `profiles.plan_type` | ❌ | Verify path broken; webhook OK |
| C6 | Cancellation handled | ⬜ | Webhook events |
| C7 | Renewal handled | ⬜ | |
| C8 | Failed payment → grace/halt | ⬜ | |
| C9 | Downgrade restores Free limits | ⬜ | |
| C10 | Billing audit log entries | ❌ | Not implemented (Phase 6) |

---

## D. Usage Limits

| # | Plan | Generations | Exports | Result |
|---|------|-------------|---------|--------|
| D1 | Free | 5 max | 1 max | ⬜ | Server enforcement |
| D2 | Creator | 30 max | 5 max | ⬜ | |
| D3 | Pro | 100 max | 20 max | ⬜ | |
| D4 | Studio | 300 max | 50 max | ⬜ | |
| D5 | 429 returned when limit exceeded | ⬜ | `plan_limit` code |
| D6 | Limits not bypassable via unauthenticated API | ❌ | C1–C2 |

---

## E. Watermark Rules

| # | Plan | MP4 watermark | Result |
|---|------|---------------|--------|
| E1 | Free | Required ON | ❌ Not in Remotion |
| E2 | Creator | OFF | ⬜ |
| E3 | Pro | OFF | ⬜ |
| E4 | Studio | OFF | ⬜ |
| E5 | Cannot disable via API tampering | ❌ No server burn-in |
| E6 | Script TXT/DOCX watermark (Free) | ✅ | Implemented |

---

## F. Generation Mode Persistence

| # | Check | Result |
|---|-------|--------|
| F1 | Mode saved to DB on project create/update | ❌ |
| F2 | Mode restored on project load | ❌ |
| F3 | Mode sent on regenerate | ⚠️ Resets on regenFresh |
| F4 | Mode available during export API | ⚠️ Request body only |
| F5 | Invalid mode rejected server-side | ✅ `normalizeGenerationMode` |

---

## G. Export Reliability

| # | Check | Result | Notes |
|---|-------|--------|-------|
| G1 | Export state machine (queued→rendering→uploading→completed/failed) | ⚠️ | Partial |
| G2 | No infinite polling | ⚠️ | Client timeouts exist |
| G3 | Duplicate export prevented | ✅ | Active job dedup |
| G4 | Stale jobs fail after 30 min | ❌ | Phase 7 |
| G5 | `render_seconds` populated | ❌ | C8 |
| G6 | `cost_estimate_usd` populated | ❌ | C8 |
| G7 | `retry_count` accurate | ❌ | Manual retry only |
| G8 | Export Health Panel in admin | ❌ | Phase 3 |

---

## H. Abuse Prevention

| # | Check | Result |
|---|-------|--------|
| H1 | Authenticated rate limits on AI routes | ❌ |
| H2 | Anonymous routes strictly limited | ❌ |
| H3 | Guest hook server throttled | ❌ |
| H4 | Suspicious activity logged | ❌ |

---

## I. Monitoring & Admin

| # | Check | Result |
|---|-------|--------|
| I1 | `/admin/unit-economics` loads | ⬜ |
| I2 | `/admin/ops` dashboard | ❌ Not built |
| I3 | `/admin/launch` dashboard | ⚠️ Partial (`launch-readiness`) |
| I4 | Sentry/Datadog capturing errors | ❌ |
| I5 | Generation/export failures in analytics | ⚠️ First-party only |
| I6 | Admin pages server-guarded | ❌ |

---

## J. Automated Tests (to create — Phase 12)

| # | Test suite | Status |
|---|------------|--------|
| J1 | `plan-limits.test.ts` — limitForMetric per tier | ❌ Not created |
| J2 | `billing-entitlements.test.ts` — verify + webhook sync | ❌ |
| J3 | `generation-mode-persistence.test.ts` | ❌ |
| J4 | `watermark-policy.test.ts` | ❌ |
| J5 | `export-state-machine.test.ts` | ❌ |
| J6 | E2E Playwright: signup → generate → export | ❌ |

---

## Launch Gate

**Do not launch publicly until:**

- [ ] All **Critical** items in `LAUNCH_AUDIT.md` resolved
- [ ] Sections B, C, D, E automated or manually verified ✅
- [ ] Production env validated (Section A)
- [ ] At least J1–J3 unit tests passing

---

## Test Run Log

| Date | Tester | Sections passed | Blockers |
|------|--------|-----------------|----------|
| 2026-06-09 | Audit (automated review) | 0 / 60 | See LAUNCH_AUDIT.md |

---

*Generated by launch audit Phase 12 template. Re-run and update Result column after fixes.*
