# Export System Audit

**Date:** 2026-06-03  
**Scope:** MP4 reel export pipeline (Quick Cut / `cinematic_projects`)  
**Production:** https://mugtee.in

---

## Current State

| Layer | Implementation |
|-------|----------------|
| Client queue | `POST /api/reels/export`, `POST /api/export/start` (canonical alias) |
| Background | `runExportInBackground` → Vercel `waitUntil` |
| Orchestration | `orchestrateRemotionReel` → `renderRemotionReel` |
| Ephemeral progress | `lib/video/job-store.ts` (memory + `/tmp` JSON) |
| Durable progress | **`export_jobs`** (migration `0051`) — source of truth for status |
| Project mirror | `cinematic_projects.reel_job_id`, `reel_status` — legacy compat only |
| Poll | `GET /api/export/status/[jobId]` (primary), `GET /api/reels/export/[jobId]` (legacy) |
| Storage | `reels/{projectId}/final-reel.mp4` — **path in metadata**, public URL at completion |
| Resume | `GET /api/export/active?projectId=`, `useReelExportAutoResume` |

See also [EXPORT_AUDIT.md](./EXPORT_AUDIT.md) for route inventory and historical metrics.

---

## Problems

| ID | Severity | Issue |
|----|----------|-------|
| E1 | P0 | Serverless cold start drops in-memory `job-store` jobs |
| E2 | P0 | `waitUntil` + 300s `maxDuration` may not cover full Remotion render |
| E3 | P1 | Dual status sources (`reel_status` vs jobs) caused poll drift |
| E4 | P1 | Signed/expired asset URLs fail pre-flight validation |
| E5 | P2 | `/api/render/reel/status` has no DB fallback |
| E6 | P2 | No external worker — render runs inside API function |

---

## Root Cause

1. **Ephemeral job store** on Vercel isolates — poll 404 after cold start unless DB fallback existed on project row only.
2. **Project row as queue** mixed export lifecycle with project editing state (`reel_status=completed` without `reel_url` → stuck `uploading`).
3. **Monolithic serverless render** — Remotion bundle + Chromium + encode in one function; timeout and memory pressure.
4. **Historical gate** — `VIDEO_RENDER_ENABLED` blocked production exports (now enabled per QA audit).

---

## File Map (authoritative)

| Concern | File |
|---------|------|
| Queue + validation | `lib/reels/export-api.ts` |
| Durable jobs | `lib/export/export-job-service.ts` |
| Queue facade | `lib/queue/render-queue.ts` |
| Background | `lib/export/export-background.server.ts` |
| Render | `lib/remotion/render-reel.server.ts`, `lib/video/orchestrate-remotion-reel.ts` |
| Upload | `lib/video/reel-storage-upload.ts` |
| Ephemeral jobs | `lib/video/job-store.ts` |
| Poll client | `lib/reels/export-poll.client.ts` |
| Resume | `lib/export/export-resume.client.ts`, `use-reel-export-auto-resume.client.ts` |

---

## Reel Status Flow (before → after)

**Before:** `POST export` → `reel_status` + `job-store` → poll memory → fallback `reel_job_id` on project.

**After:** `POST export` → **`export_jobs`** + `job-store` (progress cache) → poll **`export_jobs`** → memory fallback → project row last.

---

## Signed URL Audit

| Pattern | Verdict |
|---------|---------|
| `getPublicUrl(storagePath)` on upload | OK — store path in `export_jobs.metadata.storagePath`, not signed URL |
| `reel_url` / `video_url` on project | Public URL only after upload; same-origin download fallback |
| Scene/voice validation HEAD | Risk — expired signed URLs in scene JSON; validate storage paths where possible |
| Persist signed URLs in DB | **Avoid** — sign at access time in download routes |

---

## Unification Decision: `export_jobs` vs `render_jobs`

**Decision:** Use **`export_jobs`** for all MP4/reel exports. Defer separate `render_jobs` table.

| Job type | Table |
|----------|-------|
| Reel MP4 (Quick Cut) | `export_jobs` (`jobType: reel-mp4`) |
| Timeline render | `export_jobs` (`jobType: timeline`) — future |
| Faceless FFmpeg | `export_jobs` (`jobType: faceless`) — future |
| Direct `/api/render/reel` | Ephemeral `job-store` until project bound |

`render_jobs` would duplicate schema; worker dequeue uses `export_jobs` with service role.

---

## Production Readiness (export)

| Scenario | Mitigation |
|----------|------------|
| Page refresh | `GET /api/export/active`, durable `export_jobs` |
| Worker restart | N/A until external worker; Vercel function retry via client stuck logic |
| Cold start | Poll reads `export_jobs`, not memory |
| Queue delay | Status `queued` in `export_jobs` |
| URL expiry | `storagePath` in metadata; regenerate public URL or same-origin `/api/reels/download/.../file` |

---

## Remaining Gaps

1. External render worker (see `render-worker-architecture.md`)
2. Heartbeat watchdog for stuck `rendering` > 15 min
3. Apply migration `0051` on production Supabase
4. Service-role policy for worker `dequeue` (not in 0051 — user RLS only)
