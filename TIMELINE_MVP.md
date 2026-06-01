# Mugtee Timeline → Remotion (Phase 1 MVP)

## Route

- **Timeline editor:** `/studio/editor?project={projectId}`
- **API render:** `POST /api/timeline/render` (body: `projectId`, optional `timelineJson`)
- **Legacy export (unchanged):** `POST /api/reels/export` (optional `timelineJson` override persisted before queue)

## Migration

Run in Supabase SQL Editor:

- `supabase/migrations/0047_timeline_json.sql` — adds `cinematic_projects.timeline_json` (jsonb)
- Also appended to `supabase/RUN_IN_SQL_EDITOR.sql` comment block

> Note: `0046_performance_indexes.sql` already exists; timeline column is **0047**.

## MVP (shipped)

| Area | Status |
|------|--------|
| `types/timeline.ts` — `buildTimelineFromQuickCutStore` / `applyTimelineToStore` | Done |
| Horizontal timeline + DnD reorder (reuses `reorder-scenes`) | Done |
| Duration trim via block resize handle | Done |
| `@remotion/player` preview (`MugteeComposition`) | Done |
| TikTok / minimal caption style toggle (inspector) | Done |
| MP4 export via existing `orchestrateRemotionReel` | Done |
| Resolution presets in export panel (stored on timeline JSON) | Done |
| Persist `timeline_json` on save / quiet timeline persist | Done |
| Entry: "Open Timeline Editor" on output workspace | Done |

## Phase 2 (stubbed / not built)

- GIF / image sequence export (UI shows "coming soon")
- Full resolution-aware Remotion server render (export still uses `MugteeReel` composition dimensions for encode; preview uses selected resolution)
- Per-scene caption editor, audio waveform lanes, music track upload
- Video clip lanes (Seedance) preferred over stills in render
- Undo/redo, multi-select, split clips
- Real-time playhead sync from Player `onFrameUpdate` (MVP uses scrubber + seek)

## Files created

- `types/timeline.ts`
- `lib/timeline/to-remotion-props.ts`
- `lib/timeline/render-timeline-project.ts`
- `lib/remotion/compositions/MugteeComposition.tsx`
- `components/timeline/*` (editor, ruler, zoom, scene block)
- `components/editor/*` (PreviewPlayer, shell, panels)
- `hooks/use-timeline-editor-state.ts`
- `app/studio/(shell)/editor/page.tsx`
- `app/api/timeline/render/route.ts`
- `supabase/migrations/0047_timeline_json.sql`

## Verification

```bash
npm run typecheck
npm run build
```

Existing quick-cut export and motion engine paths are unchanged; timeline export adds a parallel API that still calls `orchestrateRemotionReel`.
