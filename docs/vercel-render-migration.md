# Vercel Render Migration Plan (Phase 5)

**Date:** 2026-06-03

---

## Current State

- Export routes: `export const maxDuration = 300` in route files
- `vercel.json` sets 300s only for `generate-script`, `deep-research`
- `runExportInBackground` uses `@vercel/functions` `waitUntil`
- Remotion bundles traced via `next.config.js` `outputFileTracingIncludes`

---

## Problems

- Render may exceed 300s wall clock
- `waitUntil` does not extend hard platform kill
- No dedicated function region/memory tuning for export

---

## Root Cause

Treating long CPU work as **synchronous serverless** instead of **async worker**.

---

## Migration Phases

### Phase A (now — incremental)

1. ✅ Durable `export_jobs` for poll/resume
2. Add to `vercel.json`:

```json
{
  "functions": {
    "app/api/reels/export/route.ts": { "maxDuration": 300, "memory": 3008 },
    "app/api/export/start/route.ts": { "maxDuration": 300, "memory": 3008 },
    "app/api/render/reel/route.ts": { "maxDuration": 300, "memory": 3008 }
  }
}
```

3. Keep `waitUntil` until worker exists

### Phase B (worker)

1. API only enqueues — returns in <2s
2. Worker runs Remotion
3. Reduce API `maxDuration` to 60s for export start

### Phase C (cleanup)

1. Remove in-process render from Vercel
2. Deprecate `job-store` disk persistence

---

## Rollback

If worker fails, feature flag `EXPORT_WORKER_URL` empty → fallback to current in-process render (guard in `queueReelExportForProject`).
