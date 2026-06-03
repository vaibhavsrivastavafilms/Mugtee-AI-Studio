# Export Image Persistence Audit

**Date:** 2026-06-04  
**Issue:** `export_jobs.error = "Missing Images"`, `stage = "queue"` — fails before Remotion/render  
**Example project:** `55f1e701-fc9e-48e8-aab4-2ddf2c625ac8` — `project_assets` has only `kind=voiceover`, no `kind=image` rows

---

## 1. "Missing Images" — source, function, validation

| Item | Detail |
|------|--------|
| **Analytics label** | `Mp4ExportErrorCode.MISSING_IMAGES = 'Missing Images'` in `lib/analytics/mp4-export-events.ts` |
| **Classifier** | `classifyMp4ExportError()` — matches messages containing `storyboard image`, `add storyboard images`, `missing export image` |
| **Primary validation** | `findScenesMissingExportImages()` in `lib/export/scene-export-validation.ts` |
| **Resolution helper** | `resolveSceneExportImageUrl(scene)` — checks `scene.imageUrl`, then `storyboardImages[activeStoryboardId]`, then first storyboard variant |
| **Required count** | **One reachable still per scene** (`requiredImages === sceneCount`) |
| **Required types** | Scene JSON fields: `imageUrl` and/or `storyboardImages[].url` (not `project_assets` kind alone) |
| **User-facing message** | `missingScenesExportMessage()` — e.g. *"Cannot export reel — scene 2 is missing storyboard image…"* |
| **Pre-queue gate** | `queueReelExportForProject()` → `buildExportReadiness()` → throws before `enqueueExportJob` |
| **Secondary gate** | `validateExportAssets()` — HEAD/GET reachability on resolved image URLs |

**Note:** Analytics stores `"Missing Images"` even when the thrown message is the detailed scene list — classification collapses to the enum label.

---

## 2. Flow map (asset queries only)

```
User Export Click
  → POST /api/export/start  OR  POST /api/reels/export
  → loadOwnedCinematicProject (cinematic_projects.*)
  → GET /api/export/readiness (optional pre-check)
  → getExportReadinessForProject
       → loadProjectAssetCounts (project_assets WHERE kind IN image, voiceover)
       → resolveProjectScenes (cinematic_projects.scenes | storyboard JSON)
       → backfillProjectAssetsFromScenes (legacy: scenes → project_assets)
       → hydrateScenesFromProjectAssets (legacy: project_assets → scene.imageUrl)
       → findScenesMissingExportImages
  → [FAIL validation] → 400 + { canExport, imageCount, requiredImages, missingAssets[] }
  → queueReelExportForProject
       → logExportAssetCounts (observability)
       → validateExportAssets (URL reachability)
       → enqueueExportJob (export_jobs)
       → orchestrateRemotionReel (NOT modified in this fix)
```

**Asset write paths (generation):**

| Path | Writes `project_assets`? | kind | Scene linkage |
|------|--------------------------|------|---------------|
| `POST /api/ai/image` | ✅ | `image` | `metadata.sequence_index` |
| `POST /api/generate-images` → `generateSceneImages` | ✅ (fixed) | `image` | `metadata.scene_id`, `sequence_index` |
| `POST /api/cinematic/storyboard` → `generateSceneStoryboardImages` | ✅ (fixed) | `image` | primary variant only, `metadata.scene_id` |
| `POST /api/enhance-storyboard` | ✅ (via same generator) | `image` | same |
| Voice routes | ✅ | `voiceover` | — |
| Remotion reel upload | ✅ | `video` | — |

---

## 3. All `project_assets` writes

| File | Operation | kind |
|------|-----------|------|
| `app/api/ai/image/route.ts` | insert | `image` |
| `lib/project-assets/persist-scene-image.server.ts` | insert | `image` |
| `lib/cinematic/generate-scene-images.ts` | via persistSceneImageAsset | `image` |
| `lib/cinematic/storyboard-generator.ts` | via persistSceneImageAsset | `image` |
| `lib/voice/generateVoice.ts` | insert | `voiceover` |
| `app/api/ai/voice/route.ts` | insert | `voiceover` |
| `app/api/ai/voiceover/route.ts` | insert | `voiceover` |
| `lib/video/storage-upload.ts` | insert | `video` |
| `lib/video/reel-storage-upload.ts` | insert | `video` |
| `app/api/workspace/exports/route.ts` | insert | `export` |

No upsert pattern — each generation creates a new row.

---

## 4. Root cause — why some projects have images vs voiceover only

**Working projects (image count = 3):**

- Used `/api/ai/image` or `/api/generate-images`, which always inserted `project_assets` rows, **or**
- Ran storyboard generation **after** this fix, **or**
- Had scene JSON with `imageUrl` / `storyboardImages` that passed validation even without asset rows

**Broken projects (voiceover only):**

- Quick Cut / cinematic flow used `generateSceneStoryboardImages` (`/api/cinematic/storyboard`)
- Images uploaded to Supabase Storage and returned to the client
- Client persisted URLs into `cinematic_projects.scenes` via Zustand `persistProject`
- **Server never inserted `project_assets` rows** for storyboard stills
- If client persist failed, tab closed early, or scenes JSON was cleared/overwritten → **no durable image record anywhere**
- Voice path always wrote `project_assets` → asymmetry visible in SQL

---

## 5. Storyboard generation — uploads and rows

1. `generateStoryboardImageUrl()` → `generateSceneImage()` → storage path `{userId}/cinematic/{projectId}/sb_{scene}_{variant}_{ts}.png`
2. Returns public URL to client as `storyboardImages[]`
3. **After fix:** primary variant (`i === 0`, non-SVG) → `persistSceneImageAsset()` with:
   - `kind: 'image'`
   - `metadata.source: 'cinematic-storyboard'`
   - `metadata.scene_id`, `metadata.sequence_index`
   - `metadata.storyboard_image_id`

Placeholder SVG mocks (`data:image/svg`) are **not** persisted (export-invalid).

---

## 6. Asset filter alignment

| Context | Filter / field |
|---------|----------------|
| Export validation | `resolveSceneExportImageUrl` on scene JSON |
| `loadProjectAssetCounts` | `kind IN ('image', 'voiceover')` only |
| `project_assets` schema | `kind IN ('image', 'voiceover', 'video', 'music', 'export', 'prompt')` |
| **Not used** | `storyboard`, `scene_image`, `visual` — these kinds do not exist in schema |
| Legacy hydration | Match by `metadata.scene_id` or `metadata.sequence_index` |

Validator and persistence both use **`kind = 'image'`** with scene linkage in metadata.

---

## 7. Fix summary

1. **`persistSceneImageAsset`** — shared insert helper (`lib/project-assets/persist-scene-image.server.ts`)
2. **Storyboard + generate-images** — call persist on successful real PNG upload
3. **`resolveExportScenes`** — hydrate scenes from `project_assets`; backfill assets from scene JSON for legacy
4. **`GET /api/export/readiness`** — structured `{ canExport, imageCount, requiredImages, missingAssets[] }`
5. **Export routes** — return structured 400 instead of generic failure
6. **Observability** — `[export] pre-export asset counts` log before queue

**Out of scope (per task):** FFmpeg.wasm, Remotion worker, render worker architecture.

---

## 8. Verify project `55f1e701-fc9e-48e8-aab4-2ddf2c625ac8`

### Current state

```sql
-- Asset rows by kind
SELECT kind, count(*)
FROM project_assets
WHERE project_id = '55f1e701-fc9e-48e8-aab4-2ddf2c625ac8'
GROUP BY kind;

-- Scene image fields in project JSON
SELECT
  jsonb_array_length(COALESCE(scenes, '[]'::jsonb)) AS scene_count,
  (
    SELECT count(*)
    FROM jsonb_array_elements(COALESCE(scenes, storyboard, '[]'::jsonb)) AS s
    WHERE (s->>'imageUrl') IS NOT NULL
       OR jsonb_array_length(COALESCE(s->'storyboardImages', '[]'::jsonb)) > 0
  ) AS scenes_with_images
FROM cinematic_projects
WHERE id = '55f1e701-fc9e-48e8-aab4-2ddf2c625ac8';
```

### After backfill (if scene JSON still has URLs)

Deploy the fix, then trigger export readiness or export once — `backfillProjectAssetsFromScenes` runs automatically when scene JSON has more images than `project_assets`.

Manual backfill SQL (only if scene JSON contains URLs):

```sql
-- Inspect scene URLs first
SELECT
  ordinality AS scene_index,
  elem->>'id' AS scene_id,
  elem->>'imageUrl' AS image_url,
  elem->'storyboardImages'->0->>'url' AS first_storyboard_url
FROM cinematic_projects,
     jsonb_array_elements(COALESCE(scenes, storyboard, '[]'::jsonb)) WITH ORDINALITY AS t(elem, ordinality)
WHERE id = '55f1e701-fc9e-48e8-aab4-2ddf2c625ac8';

-- If URLs exist, re-run export or call GET /api/export/readiness?projectId=55f1e701-fc9e-48e8-aab4-2ddf2c625ac8
-- to trigger server-side backfill inserts.

-- Confirm image rows after backfill
SELECT id, kind, url, metadata->>'scene_id' AS scene_id, metadata->>'sequence_index' AS seq
FROM project_assets
WHERE project_id = '55f1e701-fc9e-48e8-aab4-2ddf2c625ac8'
  AND kind = 'image'
ORDER BY created_at;
```

If scene JSON has **no** image URLs, regenerate storyboard frames in the UI — new generations will persist to both scene JSON and `project_assets`.

---

## 9. Observability

Log line (always on in all envs):

```
[export] pre-export asset counts {"projectId":"…","assetCount":N,"imageCount":N,"voiceoverCount":N,"sceneCount":N,"hydratedFromAssets":N}
```

Also logged via `exportLog.assetValidation` after reachability checks.

---

## 10. Export readiness API

```
GET /api/export/readiness?projectId={uuid}&includeVoiceover=true
```

Response:

```json
{
  "canExport": false,
  "imageCount": 0,
  "requiredImages": 3,
  "voiceoverCount": 1,
  "assetCount": 1,
  "sceneCount": 3,
  "hasVoice": true,
  "missingAssets": [
    { "kind": "image", "sceneIndex": 1, "sceneId": "…", "message": "Hook is missing a storyboard image." }
  ],
  "message": "Cannot export reel — scenes 1, 2 and 3 are missing storyboard images…"
}
```
