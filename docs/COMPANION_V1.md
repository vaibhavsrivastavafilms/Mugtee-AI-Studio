# Mugtee Live Companion V1

Deployment and integration guide for the Live Companion scaffold shipped in this repo.

## Overview

Live Companion V1 adds:

- **Avatar system** — state-driven R3F mascot (procedural fallback + optional GLB)
- **Home experience** — authenticated route at `/home`
- **Voice scaffolding** — push-to-talk STT stub, realtime API, pipeline interfaces
- **Memory integration** — creator profile + opportunity brief injected into brain prompts
- **Multilingual** — reuses `lib/i18n/detect-creator-language` for reply language

Public landing remains at `/`. Studio workflows, sidekick panel, and MugteeAssistant are unchanged.

## Routes

| Route | Purpose |
|-------|---------|
| `/home` | Live Companion home (avatar center, prompt bar, opportunities) |
| `/api/companion/realtime` | Brain stub — POST message, GET feature flags |

Nav: **Home** added to app header (`lib/shell/header-nav.ts`).

On `/home`, the right-rail sidekick panel and studio prompt bar are hidden to avoid duplicate UI.

## Folder structure

```
components/avatar/          # MugteeAvatar, R3F canvas, procedural + GLB models
components/home/            # Companion home page UI
stores/mugtee-companion-store.ts
services/realtime/          # Pipeline types + stub implementation
lib/companion/personality.ts
lib/companion/memory-context.ts
hooks/use-companion-language.ts
hooks/use-companion-memory-context.ts
app/(app)/home/page.tsx
app/api/companion/realtime/route.ts
public/models/mugtee.glb    # Optional — not committed yet
```

## Avatar states

`idle` · `listening` · `thinking` · `speaking` · `happy` · `celebrating` · `warning`

Controlled via `useMugteeCompanionStore` → `MugteeAvatar state={...}`.

Existing sidekick avatar (`components/sidekick/`) is untouched; companion uses `components/avatar/`.

## Adding `mugtee.glb`

1. Export your rigged Mugtee model as **GLB** (keep black hoodie, gold accents, cat ears, helmet face).
2. Place at:

   ```
   public/models/mugtee.glb
   ```

3. No code changes required. `MugteeAvatarCanvas` runs `HEAD /models/mugtee.glb`:
   - **200** → loads GLB via `@react-three/drei` `useGLTF`
   - **404/missing** → procedural Three.js mascot (same visual language as sidekick V1)

4. Optional preload: `preloadMugteeGlb()` from `@/components/avatar`.

Target load: procedural fallback renders immediately (&lt;2s); GLB adds network time on first visit.

## Environment

| Variable | Required | Notes |
|----------|----------|-------|
| `EMERGENT_LLM_KEY` | Optional | When set, `/api/companion/realtime` calls LLM with memory-enriched system prompt. When unset, returns deterministic stub reply. |

Never commit API keys. Use Vercel/host env for production.

## Voice — what is stubbed (Phase 3+)

| Feature | V1 status |
|---------|-----------|
| Text chat via realtime API | ✅ Works |
| Push-to-talk (Web Speech STT) | ✅ Browser STT in prompt bar |
| Hands-free mode | ❌ Flag only — `voiceMode: 'hands-free'` reserved |
| ElevenLabs / streaming TTS | ❌ `enableTts` stage stub in pipeline |
| Lip sync / visemes | ❌ `RealtimeTtsResponse.visemes` type only |
| WebRTC realtime session | ❌ Not implemented |

Production path: implement `RealtimeVoicePipeline` in `services/realtime/pipeline.ts`, wire ElevenLabs in TTS stage, stream visemes to avatar mouth rig.

## Memory integration

Brain prompts assemble via `buildCompanionBrainPrompt()`:

- `lib/memory/memory-prompt-injection` — creator DNA, graph, learning events
- `lib/companion/personality` — Mugtee tone preamble
- `lib/i18n/detect-creator-language` — reply language
- Opportunity hint from `buildTodaysBrief()` (same engine as sidekick)

Client hook: `useCompanionMemoryContext()`.

## Local verification

```bash
npm run typecheck
npm run build
npm run dev
# Sign in → /home
```

Smoke: submit a prompt, confirm avatar moves to `thinking` → `speaking`/`happy`, check `/api/companion/realtime` GET returns `v1-stub`.

## Deploy checklist

1. Set `EMERGENT_LLM_KEY` in production env (optional but recommended).
2. Ensure Supabase auth + `creator_profiles` table available (memory load).
3. Deploy as usual (`next build` / Vercel).
4. Optionally add `public/models/mugtee.glb` in a follow-up asset PR.

## Related systems (preserved)

- Auth + `(app)` layout
- `stores/companion-store.ts` — creative discovery / director notes (separate from live companion store)
- `components/sidekick/mugtee-sidekick-panel.tsx` — dashboard rail
- `components/mugtee/mugtee-assistant.tsx` — floating FAQ chat
