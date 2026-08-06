# Mugtee MVP

Production-ready SaaS path: **one prompt → cinematic MP4 download**.

## User flow

```
Login → /v3/dashboard → /v3 (prompt) → Generate → /v3/[projectId] (live timeline) → Download MP4
```

## Pipeline (automated)

```
Planner → Script → Storyboard → Prompts → Images → Videos → Voice → Music → Captions → Editor → Export
```

Research, character, location, and style agents still run today for quality; they are not required for the MVP UX contract.

## APIs

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/projects` | List projects (MVP alias) |
| `POST` | `/api/projects` | Create project + planner |
| `POST` | `/api/projects/[id]/generate` | Advance pipeline |
| `GET` | `/api/projects/[id]/download` | MP4 / script download |
| `DELETE` | `/api/projects/[id]` | Delete project |

V3-native routes under `/api/v3/projects/*` remain equivalent.

## Environment

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
V3_IMAGE_PROVIDER=gpt-image
V3_VIDEO_PROVIDER=veo
VIDEO_RENDER_MOCK=true          # local MP4 without FFmpeg (set false in prod)
MVP_ROYALTY_FREE_MUSIC_URL=     # optional background music MP3 URL
```

## Migrations

Apply through `0076_mugtee_v3_mvp_export.sql` (adds `reel_url`, `voice_url`, captions, timeline, export status).

## Success criteria

A signed-in user can enter one prompt, click Generate, watch live progress through export, preview the reel, and download MP4 without manual steps.
