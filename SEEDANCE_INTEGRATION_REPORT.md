# Seedance Integration Report

Mugtee AI Studio — first AI video generation provider for per-scene clips.

## Provider Architecture

```text
SceneBlueprint + Motion Presets
        ↓
buildSceneVideoPrompt() / buildSceneBlueprintInput()
        ↓
VideoProvider.generateVideo(SceneBlueprintInput)
        ↓
SeedanceProvider → Seedance REST API (async submit + poll)
        ↓
VideoResult { videoUrl, thumbnailUrl, duration, provider }
```

### Interface

```ts
interface VideoProvider {
  generateVideo(scene: SceneBlueprintInput): Promise<VideoResult>
}
```

- **Location:** `lib/video-providers/`
- **Factory:** `getVideoProvider()` selects provider via
  `VIDEO_GENERATION_PROVIDER` / `SEEDANCE_API_KEY`
- **First provider:** `SeedanceProvider`
  (`lib/video-providers/seedance-provider.ts`)
- **Future:** Kling, Runway, Luma — add providers + factory cases without
  changing workflow code

### Prompt quality

Prompts are built from `SceneBlueprint`, motion preset labels, and
`assignSceneMotion` output — not raw script paragraphs.

Example shape: *"Historical Push-In. Slow push-in, tightening frame. Elegant
cinematic pan. Luxury penthouse. Warm golden lighting…"*

## Workflow Changes

**Before:** Scenes → Images → Voice → Timeline → Export  
**After:** Scenes → Images → **Video Clips (optional)** → Voice → Timeline →
Export

### Pipeline integration

- `stores/quick-cut-generation-store.ts` — after storyboard images + motion
  assignment, calls `runSceneVideoGeneration()` **non-blocking**
- Feature gate: `sceneVideoEnabled` from `/api/quick-cut/config`
  (`SEEDANCE_API_KEY` or `VIDEO_GENERATION_ENABLED=true`)
- Progress label: `Generating video clips…` via `directingSceneLabel`
- Export / MP4 compile unchanged — `VIDEO_RENDER_ENABLED` remains separate

## Background Processing — VideoJob

| File                                      | Role                                                      |
| ----------------------------------------- | --------------------------------------------------------- |
| `lib/video/video-job.ts`                  | In-memory + `/tmp` job store (mirrors render job pattern) |
| `lib/video/process-scene-video.server.ts` | Runs provider, uploads clip, persists to project          |
| `app/api/generate-scene-video/route.ts`   | POST — queue one job per eligible scene                   |
| `app/api/video-job/[id]/route.ts`         | GET — poll job status                                     |

Flow: **Generate Clip → Queue → Poll Status → Store Result** — UI never blocks
on Seedance latency.

## Storage

**No migration required** for MVP.

Scene video metadata is stored in two places:

1. **`cinematic_projects.scenes` JSONB** — per-scene fields: `videoUrl`,
   `videoThumbnailUrl`, `videoProvider`, `videoGenerationStatus`,
   `videoGenerationTimeMs`
2. **`cinematic_projects.captions.sceneVideos`** — array of `{ sceneId,
   videoUrl, thumbnailUrl, provider, generationTimeMs, updatedAt }`

Clips uploaded to Supabase Storage:
`project-assets/{userId}/{projectId}/clips/{sceneId}_{jobId}.mp4`

Optional future migration `0047_scene_videos.sql` if querying clips outside
project JSON becomes necessary.

## Reel Timeline — Video vs Image

`lib/reel/compose-reel-timeline.ts`:

- Each clip gets `image` (always — fallback thumbnail)
- When `scene.videoUrl` exists, clip also gets `video`
- **Fallback:** if generation fails, `video` is null → composer/export uses
  static `image` + Ken Burns motion — workflow never breaks

```ts
const image = scene.imageUrl || resolveScenePreviewUrl(scene, i) || null
const video = scene.videoUrl?.trim() || null
return { ...clip, image, video }
```

Downstream consumers should prefer `clip.video ?? clip.image`.

## Fallback System

| State                   | Timeline behavior                                          |
| ----------------------- | ---------------------------------------------------------- |
| Video ready             | Use `clip.video`                                           |
| Video failed / disabled | Use `clip.image` + motion preset                           |
| Video generating        | Image until poll completes; timeline recomposed on success |

## Cost Controls

- `MUGTEE_LIMIT_DAILY_VIDEOS` (default 10)
- `MUGTEE_LIMIT_MONTHLY_VIDEOS` (default 50)
- Checked in `POST /api/generate-scene-video` via `checkSceneVideoLimit()`
- Usage tracked in tmp ledger + increments `generations` metric via
  `trackUsageMetric()`
- Returns `429` with `scene_video_limit` code when exceeded

## Environment Variables

| Variable                      | Required             | Purpose                              |
| ----------------------------- | -------------------- | ------------------------------------ |
| `SEEDANCE_API_KEY`            | Yes (for live clips) | Bearer token for Seedance API        |
| `SEEDANCE_API_BASE`           | No                   | Default `https://seedanceapi.org/v2` |
| `SEEDANCE_MODEL`              | No                   | Default `seedance-2.0`               |
| `VIDEO_GENERATION_ENABLED`    | No                   | Force on/off (`true` / `false`)      |
| `VIDEO_GENERATION_PROVIDER`   | No                   | Default `seedance` when key present  |
| `MUGTEE_LIMIT_DAILY_VIDEOS`   | No                   | Daily clip cap per user              |
| `MUGTEE_LIMIT_MONTHLY_VIDEOS` | No                   | Monthly clip cap per user            |
| `MUGTEE_LIMITS_ENABLED`       | No                   | Set `false` to bypass limits in dev  |

**Note:** `VIDEO_RENDER_ENABLED` controls final MP4 compile — separate from
scene clip generation.

## Local Setup

1. **Get an API key** from the [Seedance dashboard](https://seedanceapi.org/)
   (API Keys page). Keys look like `sk-…` and are sent as `Authorization: Bearer
   <key>`.

2. **Copy env template** (if you have not already):

   ```bash
   cp .env.example .env.local
   ```

3. **Set the key in `.env.local` only** — never commit `.env.local`:

   ```env
   SEEDANCE_API_KEY=sk-your-key-here
   ```

   Optional overrides: `SEEDANCE_API_BASE`, `SEEDANCE_MODEL`,
   `VIDEO_GENERATION_ENABLED`, `VIDEO_GENERATION_PROVIDER`.

4. **Restart the dev server** after changing env vars (`npm run dev`). Next.js
   reads `.env.local` at startup.

5. **Verify** — open Quick Cut, run a project through image generation, then
   confirm:
   - `GET /api/quick-cut/config` returns `"sceneVideoEnabled": true` and
     `"seedance": true`
   - Progress shows `Generating video clips…`
   - `GET /api/video-job/{id}` eventually returns `"status": "done"` with a
     `videoUrl`

6. **Production (Vercel)** — add `SEEDANCE_API_KEY` under Project → Settings →
   Environment Variables (same name, no quotes).

`.env.local` is listed in `.gitignore` (`.env.*` with `!.env.example`
exception). Run `git status` before committing; `.env.local` must never appear
staged.

### Seedance API (SD 2.0 v2)

Provider client: `lib/video-providers/seedance-client.ts`

| Item     | Value                                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Base URL | `https://seedanceapi.org/v2` (override via `SEEDANCE_API_BASE`)                                       |
| Auth     | `Authorization: Bearer <SEEDANCE_API_KEY>`                                                            |
| Submit   | `POST /generate` — body: `prompt`, `duration` (5/10/15), `aspect_ratio`, `model`, optional `images[]` |
| Poll     | `GET /status?task_id=…`                                                                               |
| Docs     | [seedanceapi.org/docs/v2](https://seedanceapi.org/docs/v2)                                            |

## API Routes

### `POST /api/generate-scene-video`

Request:

```json
{
  "async": true,
  "projectId": "uuid",
  "scenes": [{ "id": "...", "imageUrl": "...", "duration": 5 }],
  "sceneBlueprints": [],
  "sceneMotion": {},
  "visualStyle": null,
  "sceneIds": ["optional-filter"]
}
```

Response:

```json
{
  "jobs": [{ "jobId": "svid-…", "sceneId": "…", "pollUrl": "/api/video-job/…", "status": "queued" }],
  "provider": "seedance",
  "async": true
}
```

### `GET /api/video-job/[id]`

Returns job status, `videoUrl`, `thumbnailUrl`, `error`.

### `GET /api/quick-cut/config`

Adds: `sceneVideoEnabled`, `seedance`, `sceneVideoProvider`.

## Files Modified / Created

### Created

- `lib/video-providers/types.ts`
- `lib/video-providers/build-scene-video-prompt.ts`
- `lib/video-providers/seedance-client.ts`
- `lib/video-providers/seedance-provider.ts`
- `lib/video-providers/factory.ts`
- `lib/video-providers/index.ts`
- `lib/video/video-job.ts`
- `lib/video/scene-video-limits.ts`
- `lib/video/scene-video-storage.ts`
- `lib/video/process-scene-video.server.ts`
- `lib/cinematic/scene-video-pipeline.client.ts`
- `app/api/generate-scene-video/route.ts`
- `app/api/video-job/[id]/route.ts`
- `SEEDANCE_INTEGRATION_REPORT.md`

### Modified

- `lib/cinematic/generation.ts` — scene video fields + captions `sceneVideos`
- `lib/reel/types.ts` — `ReelTimelineClip.video`
- `lib/reel/compose-reel-timeline.ts` — video vs image selection
- `lib/reel/parse-reel-timeline.ts` — parse `video` field
- `lib/cinematic/quick-cut/project-hydration.ts` — hydrate scene videos
- `stores/quick-cut-generation-store.ts` — post-image video step
- `app/api/quick-cut/config/route.ts` — expose Seedance flags
- `lib/video/index.ts` — export video job helpers

## Migration Needed?

**No** for MVP — JSON on `scenes` + `captions.sceneVideos` is sufficient.

Optional `0047_scene_videos.sql` if you need indexed clip queries or
cross-project analytics.

## Verification

```bash
npm run build
```

Set `SEEDANCE_API_KEY` and run Quick Cut pipeline — after images, watch
`Generating video clips…` and poll `/api/video-job/{id}` until `status: done`.
