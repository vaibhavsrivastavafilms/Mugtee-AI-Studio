# Runway Integration Plan (Phase 6)

**Date:** 2026-06-03 | **Scope:** Infrastructure reference only — not building new V5 features

---

## Current State

| Use | Code | Output |
|-----|------|--------|
| Per-scene AI video | `lib/video/render-runway-pipeline.ts`, `generate-scene-video` | Clip URL in scene JSON |
| Faceless assembly | `orchestrate-faceless-video.ts` | Optional Runway segments + FFmpeg |

**Quick Cut MP4 export does not use Runway** — Remotion assembles static images + voice.

---

## Problems

- Creators expect Runway clips inside final MP4 automatically — not wired
- Runway cost per scene unbounded without usage caps
- Separate env: `VIDEO_GENERATION_*` vs `VIDEO_RENDER_*`

---

## Root Cause

Runway integrated for **scene experimentation**, not **export assembler**.

---

## Plan (future, out of current sprint)

1. Document in UI: scene video ≠ reel MP4 unless timeline includes clips
2. Optional export mode: Remotion composition with `videoUrl` per scene (timeline MVP path)
3. Usage guard: `guardUsageLimit(..., 'runway')` on scene generation only
4. Do not block export stabilization on Runway merge

---

## Production Readiness

| Item | Status |
|------|--------|
| Runway for scene gen | YELLOW — env-dependent |
| Runway in default MP4 | N/A — not integrated |
| Export without Runway | GREEN — image + voice path |
