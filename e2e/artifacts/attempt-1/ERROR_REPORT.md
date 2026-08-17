# FIRST BLOCKER

Production ID: 1b9a1b9d-9a24-4c10-af3e-da65279dc5ac
Stage: script (queued — worker never advanced)
Function: advanceActiveV7ProductionsOnce / findGloballyLockedV7Production
Provider: NONE (worker scheduling)
Request: GitHub Actions → GET /api/cron/v7-advance
HTTP status: N/A
Exact error: Fresh E2E production remained at script:queued while cron worker spent ticks on older zombie productions (75858f79 world lock, 9d700687 render lock, FIFO updated_at ascending).
Browser error: Studio visible progress stuck at "Writing screenplay" ~10% with no running stage spinner — queue wait exceeded legitimate window (>8 min).
Server error: script stage status=queued, pipeline_lock.locked=false on E2E production; other productions hold stale global locks.
Checkpoint: NOT PERSISTED
Lock: RELEASED on E2E production; HELD on zombie productions (75858f79/world, 9d700687/render)
Provider work occurred: NO on E2E production
Pollen spent: 0
Output persisted: NO

Screenshot files:
- e2e/artifacts/attempt-1/error-full.png
- e2e/artifacts/attempt-1/error-viewport.png
- e2e/artifacts/attempt-1/before-error.png

## Source locations

- `lib/v7/background-driver.server.ts` — cron picked oldest producing row / global lock holder instead of drive-ready production
- `lib/v7/pipeline-sync.server.ts` — `isActivePipelineLock` used flat 30m TTL; text stages need shorter stale window
- `lib/v7/pipeline-sync.server.ts` — `getStaleRunningMs` / `recoverStaleRunningStage`

## Fix applied (minimum)

1. `TEXT_STALE_RUNNING_MS` (150s) for OpenRouter text stages in `getStaleRunningMs`
2. `isActivePipelineLock` uses stage-aware stale TTL via `getStaleRunningMs(lock.stage)`
3. `pickProductionForCronTick` — reconcile + prefer newest production that can drive
