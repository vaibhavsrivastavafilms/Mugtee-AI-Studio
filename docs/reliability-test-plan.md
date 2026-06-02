# Reliability Test Plan (Phase 9)

**Date:** 2026-06-03

---

## Current State

- Unit tests: sparse (`e2e/example.spec.ts` stub)
- Manual staging on mugtee.in
- `mp4_*` analytics events for funnel

---

## Problems

No automated export regression suite; production MP4 completion historically 0%.

---

## Root Cause

Remotion render too heavy for default CI without mock mode.

---

## Test Matrix

| ID | Scenario | Steps | Pass criteria |
|----|----------|-------|---------------|
| R1 | Happy path mock | `VIDEO_RENDER_MOCK=true`, POST `/api/export/start` | `export_jobs.status=completed`, download 200 |
| R2 | Poll durable | Kill memory (simulate): poll `/api/export/status/:id` | Reads DB progress |
| R3 | Refresh resume | Start export, reload page | `GET /api/export/active` returns jobId |
| R4 | Duplicate start | POST start twice | Same jobId, `resumed: true` |
| R5 | Validation fail | Missing voice | 400, no `export_jobs` row |
| R6 | Cold poll | Wait >5 min, poll | Status advances or failed with error |
| R7 | Signed URL expiry | Expired scene URL | 400 at validation with clear message |
| R8 | Usage limit | Exceed renders | 429 from guard |
| R9 | Completed idempotent | POST start when `reel_url` set | `completed` + URL |
| R10 | typecheck + build | `npm run typecheck`, `npm run build` | Exit 0 |

---

## Staging checklist (production)

1. Apply migration `0051`
2. Confirm `VIDEO_RENDER_ENABLED=true`
3. One real 3-scene export with voice
4. Verify `export_jobs` row lifecycle
5. Download via `/api/reels/download/:id/file`
6. Check Vercel logs for timeout

---

## Automation (next)

```bash
VIDEO_RENDER_MOCK=true npm run test:e2e -- export-smoke.spec.ts
```

(Add spec in follow-up — not in this sprint scope beyond stub.)

---

## Root Cause of past failures

Config gate + serverless timeout + non-durable jobs — addressed incrementally by 0051 and status API.
