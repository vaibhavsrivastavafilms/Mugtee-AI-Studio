# Video Pipeline Map (Phase 2)

**Date:** 2026-06-03

---

## Current State

```
┌─────────────────────────────────────────────────────────────────┐
│                        CREATOR UI (Quick Cut)                    │
└────────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴────────┬──────────────────┬─────────────────────┐
    ▼                 ▼                  ▼                     ▼
 Script/Hook      Scene images       Voice (ElevenLabs)    MP4 Export
 lib/ai/*         generate-scene-*   generateVoice         POST /api/reels/export
                  project-assets     voice bucket          export_jobs + Remotion
    │                 │                  │                     │
    └────────┬────────┴──────────────────┴─────────────────────┘
             ▼
      cinematic_projects (scenes JSON, voice, reel_url)
             │
             ▼
      Supabase Storage (images, audio, final-reel.mp4)
```

---

## Pipelines

| Pipeline | Entry API | Renderer | Output |
|----------|-----------|----------|--------|
| **Quick Cut MP4** | `/api/reels/export`, `/api/export/start` | Remotion h264 | `reels/{projectId}/final-reel.mp4` |
| Direct reel | `/api/render/reel` | Remotion | Local or storage |
| Timeline | `/api/timeline/render` | Remotion | Project reel |
| Faceless | `/api/render-video` | FFmpeg + optional Runway | project-assets |
| Scene clip AI | `/api/ai/runway-video` | Runway/Seedance | Per-scene video URL |
| Cinematic prepare | `/api/cinematic/render/prepare` | Metadata only | No MP4 |

---

## Problems

- Multiple overlapping render entry points confuse operators
- Faceless path lacks `VIDEO_RENDER_ENABLED` gate
- Scene AI video ≠ final MP4 assembly (creators may confuse)

---

## Root Cause

Feature growth added pipelines without consolidating on **one blessed MP4 path** (`/api/export/start`).

---

## Target (v2)

Single user-facing MP4 path → `export_jobs` → worker → `reels` bucket. Other pipelines remain for power users but documented as secondary.
