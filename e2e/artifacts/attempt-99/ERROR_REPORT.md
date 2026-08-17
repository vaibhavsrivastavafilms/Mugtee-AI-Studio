# FIRST BLOCKER

Production ID: 3b29baa9-a45b-43e4-a479-8837c285f89e
Stage: animation
Function: advanceActiveV7ProductionsOnce / pickProductionForCronTick
Provider: NONE (worker scheduling)
Request: GitHub Actions → GET /api/cron/v7-advance
HTTP status: N/A
Exact error: Fresh E2E production script stage remained queued — cron worker prioritized older zombie productions and stale global locks instead of the active E2E production.
Browser error: Studio shows Writing screenplay / queued with no running spinner progress
Server error: completed
Checkpoint: NOT PERSISTED
Lock: RELEASED
Provider work occurred: NO on this production
Pollen spent: 0
Output persisted: NO

Screenshot files:
- C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\e2e\artifacts\attempt-99\before-error.png
- C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\e2e\artifacts\attempt-99\error-full.png
- C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\e2e\artifacts\attempt-99\error-viewport.png
- error-element.png (if present)

## Source locations
- lib/v7/background-driver.server.ts — advanceActiveV7ProductionsOnce (FIFO zombie selection)
- lib/v7/pipeline-sync.server.ts — isActivePipelineLock / getStaleRunningMs
- lib/v7/pipeline-sync.server.ts — reconcilePipelineIntegrity / recoverStaleRunningStage
