# Mugtee Production OS V3 — Real Cinematic Video Engine

Architecture (not UI patches). Progress, ETA, activity, and export success come from **real workers and verified files**.

## Pipeline

```text
Idea → Research → Creative Direction → Script → Screenplay → Storyboard
→ Shot List → Voice → Characters → Environment → Image Generation
→ Animation → Video Editing → Music → Sound Design → Captions
→ Rendering → Quality Check → Export
```

Each phase is a worker that reports: `queued | running | completed | failed | retrying | cancelled` plus progress, duration, errors, output.

## Scene-based production

`buildSceneProductionGraph()` splits the movie into independent scene units. Failed scenes regenerate individually via checkpoints — the whole movie is never restarted.

## Anti-slideshow (root fix)

| Before | After |
|--------|--------|
| Remotion only Ken-Burns stills | Camera Director assigns intentional motion every scene |
| `static_drift` allowed | Banned; min intensity 42 + particles + depth |
| `scene.videoUrl` ignored | Downloaded + played via `OffthreadVideo` when present |
| Success before `fs.stat` | MP4 verified non-empty **before** completion log |

## Key modules

| Module | Role |
|--------|------|
| `lib/production-os/v3/job-engine.ts` | In-process job runtime + worker reports |
| `lib/production-os/v3/camera-director.ts` | Lens / movement / composition per shot |
| `lib/production-os/v3/consistency.ts` | Character + environment locks |
| `lib/production-os/v3/quality-engine.ts` | Pre-success verification |
| `lib/production-os/v3/scene-graph.ts` | Per-scene units + resume pointer |
| `lib/production-os/v3/checkpoints.ts` | Client resume checkpoints |
| `lib/remotion/compositions/ReelScene.tsx` | OffthreadVideo + forced motion |

## Voice cascade

ElevenLabs → OpenAI → Emergent → Google → continue without narration (never stop production).

## Success criteria

`runQualityEngine()` must pass blocking checks (images, MP4 bytes, thumbnail/poster) before the success screen. Frame progress during render: `N / total frames` from Remotion `onProgress`.

## Env

- `VIDEO_RENDER_ENABLED=true` — real Remotion encode  
- Optional: Studio + Cinematic for AI scene video clips (otherwise Camera Director motion)  
