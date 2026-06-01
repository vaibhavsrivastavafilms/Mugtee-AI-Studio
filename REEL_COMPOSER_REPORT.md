# Mugtee AI Reel Composer Pass — Implementation Report

## Overview

The Reel Composer Pass transforms separate Hook, Script, Scenes, Visuals, and
Voice assets into a **synchronized, ready-to-edit reel timeline**. Creators see
what appears when, what is spoken, and how the reel flows — before export or
full Remotion render.

## Timeline Architecture

```text
Generation Pipeline (runPipeline — unchanged order)
  Hook → Script → Scenes → Visuals → Voice → Motion → Export
                                              ↓
                              composeReelTimeline()  ← AFTER motion + voice metadata
                                              ↓
                         ReelTimeline in Zustand + timeline_state JSONB
                                              ↓
                    ReelComposer / DirectorTimeline UI
                                              ↓
              Creator Pack 2.0 (timeline.json, captions.srt, storyboard.json)
```

### Core type: `ReelTimelineClip`

Each clip binds one scene beat:

| Field                            | Source                                                           |
| -------------------------------- | ---------------------------------------------------------------- |
| `sceneId`, `image`               | `GeneratedScene` + preview URL fallback                          |
| `duration`, `startSec`, `endSec` | Scene timing intelligence + voice duration                       |
| `voiceSegment`                   | Per-scene narration split from script/scene descriptions         |
| `caption`                        | Word-level cue points from narration window                      |
| `animation`                      | `motionPresetIdFromBlueprint` / `assignSceneMotion` — not random |

Persisted in `cinematic_projects.timeline_state` as `{ reelTimeline:
ReelTimeline }`.

## Synchronization Logic

### Phase 1 — Timeline engine (`lib/reel/`)

- `types.ts` — `ReelTimeline`, `ReelTimelineClip`, `ReelVoiceSegment`,
  `ReelCaptionCue`, `ReelAnimation`
- `compose-reel-timeline.ts` — maps store assets → timeline
- `parse-reel-timeline.ts` — hydration from DB

### Phase 2 — Voice sync (`voice-sync.ts`)

- Uses ElevenLabs `voiceMetadata.durationSec` when available
- Splits narration per scene via `buildVoiceSegmentsForScenes`
- `sceneDurationsFromVoiceMetadata` scales scene windows to match audio length
- Fallback: ~14 chars/sec estimate

### Phase 3 — Scene timing (`scene-timing.ts`)

- `computeSceneDurationSec` — narration weight × emotion factor × pacing role
- Suspense/tension → longer holds (up to ~1.28×)
- Action/motivation → faster cuts (~0.82–0.88×)
- Documentary → balanced (~1.05×)
- Integrates `SceneBlueprint.emotion` and `scenePacingRole`

### Phase 4 — Animation mapping

- Reuses `motionPresetIdFromBlueprint` and `assignSceneMotion`
- Suspense → `push_in`, Luxury → `luxury_reveal`, Documentary →
  `documentary_drift`, Action → `battle_tracking`
- Manual overrides via `setSceneMotionPreset` trigger re-compose

### Phase 5 — Captions (`caption-sync.ts`)

- `buildCaptionCueForSegment` — syllable-weighted word timings
- `buildSrtFromCaptionCues` — CapCut/Premiere-ready `captions.srt`

### Phase 6 — Preview (`ReelComposer.tsx`)

- Vertical storyboard frame + scrubber + voice playback
- Karaoke-style caption overlay
- Works without full MP4 render
- Mobile-friendly: 44px touch targets, responsive 9:16 preview

### Phase 7 — Timeline editing

- `updateReelTimelineClip(sceneId, patch)` — duration, animation preset, caption
  text
- `DirectorTimeline` inline editor for duration + motion preset
- Persists to `timeline_state` without full regen

### Phase 8 — Export Package 2.0

Extended `buildCreatorPackZip` when `reelTimeline` present:

| File              | Contents                                      |
| ----------------- | --------------------------------------------- |
| `voice.mp3`       | Full narration (existing)                     |
| `captions.srt`    | Scene + word-level SRT                        |
| `timeline.json`   | Full clip manifest (fps, resolution, timings) |
| `storyboard.json` | Frame manifest with narration + animation     |
| `script.txt`      | Full script (existing)                        |

### Phase 9 — Director view

- `DirectorTimeline.tsx` — Voice / Visual / Caption tracks (film-editing layout)
- `TimelineTrack.tsx`, `VoiceTrack.tsx`, `CaptionTrack.tsx`
- Wired in Export tab (`generation-stage-panel`) and results section

## Store Integration

`stores/quick-cut-generation-store.ts`:

- State: `reelTimeline: ReelTimeline | null`
- Actions: `composeReelTimeline()`, `updateReelTimelineClip()`
- Called after: motion assignment, pipeline complete, voice regen, motion preset
  change
- **Does not modify `runPipeline` step order** — compose runs after assets exist

## Remotion Integration

- Timeline `animation.presetId` aligns with `lib/motion/motion-presets.ts` →
  `ReelScene.tsx` via existing `buildReelSceneInput` / `remotionConfigForScene`
- Full MP4 export path unchanged; timeline provides edit-ready metadata for
  external NLEs
- Future: pass `ReelTimeline` directly into `ReelComposition` for frame-accurate
  render

## Files Created

```text
lib/reel/types.ts
lib/reel/scene-timing.ts
lib/reel/voice-sync.ts
lib/reel/caption-sync.ts
lib/reel/compose-reel-timeline.ts
lib/reel/parse-reel-timeline.ts
lib/reel/export-format.ts
lib/reel/index.ts

components/reel-composer/ReelComposer.tsx
components/reel-composer/TimelineTrack.tsx
components/reel-composer/VoiceTrack.tsx
components/reel-composer/CaptionTrack.tsx
components/reel-composer/DirectorTimeline.tsx
```

## Files Modified

```text
stores/quick-cut-generation-store.ts
lib/cinematic/quick-cut/project-hydration.ts
lib/cinematic-projects.ts
lib/quick-cut/creator-pack-export.client.ts
components/quick-cut/generation-results-section.tsx
components/quick-cut/generation-stage-panel.tsx
```

## Follow-ups

1. **Incremental compose after voice** (before images) — show narration timing
   early with placeholder frames
2. **Remotion render from timeline** — use clip `startSec`/`duration` in
   `ReelComposition` instead of scene.duration heuristics
3. **Word-level alignment from ElevenLabs timestamps** when API returns
   character-level timing
4. **Director workflow step** in `MISSION_STEPS` for stacked workspace
   continuity
5. **Server export route** — `/api/reels/export-package` for timeline.json + SRT
   without client ZIP

## Build Status (verification pass)

- `npx tsc --noEmit` — **passes** (no reel-composer type errors)
- `next build` — **webpack compiles successfully**; lint phase fails on
  pre-existing unrelated ESLint errors elsewhere in the repo
- `runPipeline` — **unchanged**; compose hooks remain additive post
  voice/motion/export
