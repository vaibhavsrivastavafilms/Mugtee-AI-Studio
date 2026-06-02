# MP4 Export Tracking (Manual v1.0)

First-party funnel events live in Supabase `analytics_events` (`event` text + `metadata` jsonb). PostHog is optional; this table is the source of truth for founder review.

## Event taxonomy

| Event | When it fires |
| --- | --- |
| `user_signup` | OAuth callback after session exchange (`app/auth/callback/route.ts`) |
| `project_created` | `POST /api/projects/create`, `POST /api/workspace/save`; client also fires `project_created` from quick-cut store |
| `story_generated` | `POST /api/generate-title` (hook), `generate-script`, `generate-scenes` |
| `storyboard_generated` | `POST /api/generate-scenes`, `generate-images` (scene + image counts in metadata) |
| `voice_generated` | `POST /api/generate-voice` (provider, duration_sec) |
| `export_clicked` | Unified export menu + export tabbed panel when user starts MP4 download/compile |
| `mp4_started` | `queueReelExportForProject` (`lib/reels/export-api.ts`), `POST /api/render/reel` |
| `mp4_completed` | Successful Remotion orchestration (`lib/video/orchestrate-remotion-reel.ts`) |
| `mp4_downloaded` | Browser download success (`lib/export/export-diagnostics.ts`) or `GET /api/reels/download/[projectId]/file` |
| `mp4_failed` | Validation/render/download failures with structured `error_code` (never "Unknown Error") |

Canonical names and classifiers: `lib/analytics/mp4-export-events.ts`.

### `mp4_failed` payload

```json
{
  "projectId": "uuid",
  "stage": "validation | queue | render_segments | upload | download | …",
  "error_code": "FFmpeg Failed",
  "message": "human-readable detail",
  "route": "POST /api/reels/export"
}
```

SQL view: `public.mp4_export_failures` (migration `0048_mp4_export_funnel.sql`).

## Error codes

`classifyMp4ExportError()` maps messages to stable codes, including:

- Export Timeout, FFmpeg Failed, Missing Audio, Storage Upload Failed
- Memory Limit Exceeded, Queue Failed, Remotion Bundle Failed
- VIDEO_RENDER_DISABLED, Missing Scenes, Missing Images
- Asset Validation Failed, Download Failed, Export Request Failed

## Founder dashboard

**URL:** `/admin/export-funnel`  
**API:** `GET /api/admin/export-funnel?days=7` (requires `ADMIN_USER_IDS` or `ADMIN_EMAILS` + `SUPABASE_SERVICE_ROLE_KEY`)

Shows window totals, daily table (signup → download), success rate (downloads / started), and top `mp4_failed` codes.

### Daily review (5 minutes)

1. Open `/admin/export-funnel` (7-day default).
2. Check **MP4 downloaded** vs **Export clicks** — large gap means drop-off after click (compile, poll, or download).
3. Read **#1 failure** — fix the highest-volume `error_code` first.
4. Scan the daily row for today: if `mp4_started` is 0 but clicks > 0, server export never queued (auth, `VIDEO_RENDER_ENABLED`, validation).
5. Optional SQL: `select * from mp4_export_failures where date = current_date order by created_at desc limit 50;`

Legacy conversion view remains at `/admin/analytics`.

## Client vs server

- **Client:** `trackMp4ExportClient()` → batched `POST /api/analytics/events`
- **Server:** `lib/analytics/mp4-export-track.server.ts` → direct `analytics_events` insert

## Related files

- `lib/analytics/compute-export-funnel.ts` — aggregation for admin API
- `components/admin/export-funnel-dashboard.tsx` — UI
- `lib/export/export-diagnostics.ts` — download KPI + client failures
- `lib/reels/export-api.ts`, `app/api/reels/export/route.ts`, `app/api/render/reel/route.ts` — server pipeline
