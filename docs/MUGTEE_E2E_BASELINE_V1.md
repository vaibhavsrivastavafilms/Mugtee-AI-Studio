# Mugtee E2E Baseline V1

**Status:** VERIFIED — first complete end-to-end production  
**Locked:** 2026-08-16  
**Tag:** `mugtee-e2e-baseline-v1`  
**Production deployment:** `dpl_7s5ZtD1q6AXw4qKjafD1tPET3bJT` → https://mugtee.in

---

## Verified production

| Field | Value |
|-------|--------|
| Production ID | `e23710d6-b009-4c4e-9b26-6d3a7b0e4aeb` |
| Final MP4 | https://oikvspgxllujvgyxatbb.supabase.co/storage/v1/object/public/reels/e23710d6-b009-4c4e-9b26-6d3a7b0e4aeb/final-reel.mp4 |
| Resolution | **1080×1920** (9:16 — from creative brief, not forced 1920×1080) |
| FPS | 30 |
| Video codec | H.264 High |
| Audio | AAC LC, 48 kHz stereo |
| Duration | 48.04 s |
| File size | 19,375,041 bytes (~18.5 MB) |
| DB status | `completed` |

---

## Verified pipeline ordering

```
idea → research → creative → script → voice → character → world → storyboard
→ image (6/6) → animation / I2V (6/6) → music → sound → edit → quality → render → export → download
```

Voice-first invariant: `script.completed_at < voice.started_at < voice.completed_at` before visual stages.

Primary AI provider: **Pollinations** (text, image, video, music, SFX). No duplicate pipelines.

---

## Baseline code fixes (do not regress)

### 1. Music availability gate

**File:** `lib/v7/provider-availability.server.ts`

`assertV7MusicProviderConfigured()` now accepts `POLLINATIONS_API_KEY`, matching the existing `resolveV7MusicUrl()` cascade (Pollinations → MusicGen → royalty-free). Do **not** require `MUSICGEN_URL` when Pollinations is configured.

### 2. QA media probe duration

**File:** `lib/v7/media-probe.server.ts`

QA uses probed I2V `videoMetadata.durationSec` (e.g. wan-fast ~5.06 s), not screenplay editorial timing (~10 s). Prevents false `duration_mismatch` without regenerating clips.

### 3. I2V / animation (included in baseline)

| File | Fix |
|------|-----|
| `next.config.js` | `outputFileTracingIncludes` for ffmpeg-static on V7 routes |
| `lib/video/ffmpeg-path.server.ts` | Resolve ffmpeg in Vercel `/var/task` bundle |
| `lib/pollinations/client.server.ts` | Numeric cache-bust seed on video requests |
| `lib/v7/providers/providers/pollinations-video.server.ts` | Decode + min 3 s duration; probed duration for checkpoint |
| `lib/v7/video-scene.server.ts` | `validateSceneVideoQuality()` accepts I2V clip ≠ screenplay timing |

---

## Format intelligence (preserved behaviour)

| Brief | Expected output |
|-------|-----------------|
| YouTube landscape | 16:9 (e.g. 1920×1080) |
| Instagram Reel / vertical | 9:16 (e.g. 1080×1920) |

Aspect ratio and duration derive from the **production brief**, not global constants.

---

## Repeatability gate (hardening milestone)

Before further feature work, prove **3 successful productions**:

1. **#1** — `e23710d6-b009-4c4e-9b26-6d3a7b0e4aeb` ✅
2. **#2** — abandoned restaurants documentary
3. **#3** — 30 s Table Tales monsoon Reel (9:16)

Plus: multilingual (Gujarati), regression tests PASS, each final MP4 ffprobe-validated on download.

---

## Do not change without evidence

- Orchestrator, provider registry, Pollinations integration, fallback order
- Image pipeline, I2V pipeline, voice-first ordering, screenplay, timeline
- Remotion, FFmpeg, FFprobe, checkpoints, recovery, production viewer

Optimise speed/cost/parallelism **after** repeatability is proven.
