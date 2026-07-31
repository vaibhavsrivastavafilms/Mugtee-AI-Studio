# Mugtee Production OS V2

Real job-based pipeline: progress, ETA, Live Activity, and export readiness are driven by phase events and asset counters — not fake timers.

## What changed

| Area | Behaviour |
|------|-----------|
| Progress | Weighted from completed phases + image/animation/render counters; **100% only when ready** |
| ETA | `computeProductionOsV2Eta` — updates every second; **never "Calculating…"** |
| Live Activity | Studio messages from phase events + SSE `/api/production-os/events` |
| Voice | Cascade ElevenLabs → OpenAI → Emergent → Google → Edge → continue without narration |
| Timeline | Builds **without** voice URL (soft-optional) |
| Creator Pack | Ready when script + scene images exist (voice not required) |
| Success UI | **Movie Complete** with Watch / MP4 / MOV / Screenplay / Storyboard / Creator Pack |

## Key modules

- `lib/production-os/v2/events.ts` — phase event contract  
- `lib/production-os/v2/eta.ts` — real ETA  
- `lib/production-os/v2/progress.ts` — real progress  
- `lib/production-os/v2/event-bus.client.ts` — client bus → activity + SSE POST  
- `app/api/production-os/events/route.ts` — SSE stream  
- `lib/voice/tts-cascade.ts` — voice fallback chain  

## Still improving (next iterations)

- Full Remotion motion language (dolly / lip-sync / particles) beyond Ken Burns  
- FFmpeg stderr frame/fps parse surfaced in UI  
- Persistent job queue with cancel / resume / concurrent workers  
- Auto-regenerate failed scene assets before export  

## Verify

1. Start a Quick Cut generation  
2. ETA should show `Xm Ys` within 1s (never Calculating…)  
3. Live Activity should show research → screenplay → images → voice → render  
4. Kill voice keys → one amber notice → pipeline continues → Movie Complete  
