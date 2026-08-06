# Mugtee V3 — AI Production Operating System

Greenfield architecture aligned with the [Master Development Roadmap](./MUGTEE_V3_ROADMAP.md). Legacy Quick Cut routes remain but are **not** part of V3.

## Entry points

| Route | Purpose |
|-------|---------|
| [`/v3`](http://localhost:3000/v3) | Home — one prompt, one Generate button |
| [`/v3/dashboard`](http://localhost:3000/v3/dashboard) | User project list |
| [`/v3/[projectId]`](http://localhost:3000/v3) | Live production timeline |

## API

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/v3/projects` | List user projects |
| `POST` | `/api/v3/projects` | Create project + run Planner |
| `GET` | `/api/v3/projects/[id]` | Poll timeline, scenes, characters, locations |
| `POST` | `/api/v3/projects/[id]/run` | Advance queued agents |
| `POST` | `/api/v3/projects/[id]/prompts` | Run Prompt Engineering Engine |
| `POST` | `/api/v3/projects/[id]/images` | Generate all scene master frames |
| `POST` | `/api/v3/projects/[id]/images/regenerate` | Regenerate one scene (keeps history) |
| `POST` | `/api/v3/projects/[id]/videos` | Generate all scene cinematic clips |
| `POST` | `/api/v3/projects/[id]/videos/regenerate` | Regenerate one scene clip (keeps history) |

## Pipeline (implemented)

```
Planner → … → Prompts → Images → Video → [queued: Voice … Export]
```

Agents communicate **only via structured JSON**. Only the Planner reads raw user input.

## Folder layout

| Path | Purpose |
|------|---------|
| `agents/planner/` | Production plan |
| `agents/research/` | Research brief |
| `agents/script/` | Screenplay |
| `agents/storyboard/` | Shot lists |
| `agents/character/` | Character profiles + reference portraits |
| `agents/location/` | Reusable locations |
| `agents/style/` | Project cinematic identity |
| `agents/prompts/` | Deterministic image/video prompt engine |
| `agents/image/` | Pluggable image generation (GPT Image default) |
| `agents/video/` | Pluggable video generation (Veo default) |
| `types/v3/` | Shared contracts |
| `lib/v3/` | DB, orchestrator, pipeline |
| `features/v3/` | UI |
| `app/v3/` | App Router pages |

## Database migrations

Apply in Supabase SQL editor (in order):

1. `supabase/migrations/0071_mugtee_v3_production.sql`
2. `supabase/migrations/0072_mugtee_v3_locations_style.sql`
3. `supabase/migrations/0073_mugtee_v3_prompt_engine.sql`
4. `supabase/migrations/0074_mugtee_v3_image_generation.sql`
5. `supabase/migrations/0075_mugtee_v3_video_generation.sql`

Tables: `v3_projects`, `v3_jobs`, `v3_scenes`, `v3_characters`, `v3_locations`, `v3_scene_prompts`, `v3_scene_images`, `v3_scene_videos`, `v3_assets`

## Roadmap status

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | ✅ `/v3`, auth, schema, dashboard, prompt UI |
| 2 | Planner | ✅ ProductionPlan JSON |
| 3 | Research | ✅ Research brief JSON |
| 4 | Script | ✅ Screenplay scenes in `v3_scenes` |
| 5 | Storyboard | ✅ Shots per scene |
| 6 | Character | ✅ Profiles, seeds, reference images |
| 7 | Location | ✅ Location memory + scene refs |
| 8 | Style | ✅ `cinematic_style` on project |
| 9 | Prompt Engineering | ✅ `v3_scene_prompts`, deterministic engine |
| 10 | Image Generation | ✅ `v3_scene_images`, pluggable providers |
| 11 | Video Generation | ✅ `v3_scene_videos`, Veo default, Runway optional |
| 12+ | Voice generation … | ⬜ Next |

## Environment

```env
GEMINI_API_KEY=...
V3_VIDEO_PROVIDER=veo
V3_IMAGE_PROVIDER=gpt-image
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Character reference portraits use the existing image pipeline (`generateSceneImage`).

## Development rules

- TypeScript everywhere
- No mock exports or fake progress
- Each agent = single responsibility + JSON I/O
- Async advance via `POST …/run` while UI polls
