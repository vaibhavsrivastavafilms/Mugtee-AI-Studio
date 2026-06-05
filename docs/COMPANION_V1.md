# Mugtee Story Companion V1

Deployment and integration guide for the Live Companion scaffold shipped in this repo. **Story Companion** extends the cinematic creator studio — it is not a separate product.

## Positioning

- **Primary journey:** Studio → Create → Storyboard → Export (`/studio/quick`, Director Mode)
- **Story Companion:** Optional enhancement at `/home` — avatar, memory-enriched prompts, opportunity briefs
- **Not:** A generic AI assistant, chatbot, or productivity app

## Overview

Story Companion V1 adds:

- **Avatar system** — state-driven R3F mascot (procedural fallback + optional GLB)
- **Home experience** — authenticated route at `/home` (gated)
- **Voice scaffolding** — push-to-talk browser STT; experimental hands-free / mugtee-os voice gated
- **Memory integration** — creator profile + opportunity brief injected into brain prompts (creator output only)
- **Multilingual** — reuses `lib/i18n/detect-creator-language` for reply language

Public landing remains at `/`. Studio workflows, sidekick panel, and workflow discovery UI are unchanged.

## Feature flag & access

| Variable | Default | Who sees Companion |
|----------|---------|-------------------|
| `NEXT_PUBLIC_COMPANION_ENABLED` | `false` | Everyone when `true` |
| `ADMIN_USER_IDS` / `ADMIN_EMAILS` | unset | Admins always |
| `BETA_TESTER_USER_IDS` / `BETA_TESTER_EMAILS` | unset | Beta testers |
| `user_metadata.beta_tester` | — | `true` grants access |

Client: `useCompanionAccess()` · Server: `canAccessLiveCompanion(user)` from `lib/companion/access.ts`.

When disabled, `/home` and `/mugtee-os` redirect to `/studio`; header **Companion** nav and sidekick link are hidden.

## Routes

| Route | Purpose |
|-------|---------|
| `/home` | Story Companion home (avatar center, prompt bar, opportunities) |
| `/mugtee-os` | Agent command center (same access gate) |
| `/api/companion/realtime` | Brain — POST message, GET feature flags |
| `/api/companion/access` | GET whether current user may use Companion UI |

Nav: **Companion** in app header when access is granted (`lib/shell/header-nav.ts`).

On `/home`, the right-rail sidekick panel and studio prompt bar are hidden to avoid duplicate UI.

Optional studio entry points when enabled: sidebar **Story Companion** footer, Cmd+K **Open Story Companion**.

## Folder structure

```
components/avatar/          # MugteeAvatar, R3F canvas, procedural + GLB models
components/home/            # Companion home page UI
stores/mugtee-companion-store.ts
services/realtime/          # Pipeline types + stub implementation
lib/companion/personality.ts
lib/companion/memory-context.ts
lib/companion/access.ts
lib/companion/analytics.ts
hooks/use-companion-access.ts
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
| `NEXT_PUBLIC_COMPANION_ENABLED` | No | `true` enables Companion for all signed-in users |
| `NEXT_PUBLIC_COMPANION_EXPERIMENTAL_VOICE` | No | `true` enables hands-free mode + mugtee-os floating STT |
| `COMPANION_EXPERIMENTAL_VOICE` | No | Server alias for experimental voice |
| `BETA_TESTER_USER_IDS` / `BETA_TESTER_EMAILS` | No | Early access when public flag is off |
| `EMERGENT_LLM_KEY` | Optional | When set, `/api/companion/realtime` calls LLM with memory-enriched system prompt. When unset, returns deterministic stub reply. |

Never commit API keys. Use Vercel/host env for production.

## Voice — what is stubbed

| Feature | V1 status |
|---------|-----------|
| Text chat via realtime API | ✅ Works |
| Push-to-talk (Web Speech STT) | ✅ Browser STT in prompt bar |
| Hands-free mode | ❌ Gated — `COMPANION_EXPERIMENTAL_VOICE` |
| mugtee-os floating voice button | ❌ Same experimental flag |
| ElevenLabs / streaming TTS | ❌ `enableTts` stage stub in pipeline |
| Lip sync / visemes | ❌ `RealtimeTtsResponse.visemes` type only; UI not exposed |
| WebRTC realtime session | ❌ Not implemented |

Production path: implement `RealtimeVoicePipeline` in `services/realtime/pipeline.ts`, wire ElevenLabs in TTS stage, stream visemes to avatar mouth rig.

## Memory integration

Brain prompts assemble via `buildCompanionBrainPrompt()`:

- `lib/memory/memory-prompt-injection` — creator DNA, graph, learning events
- `lib/companion/personality` — Mugtee cinematic guide preamble (creator scope only)
- `lib/i18n/detect-creator-language` — reply language
- Opportunity hint from `buildTodaysBrief()` (same engine as sidekick)

Client hook: `useCompanionMemoryContext()`.

Memory is for **story generation, niche locking, visual direction, and creator consistency** — not life coaching or generic chat.

## Success metrics (workflow lift)

Events in `lib/analytics/events.ts`, fired via `lib/companion/analytics.ts`:

| Event | When |
|-------|------|
| `companion_used` | User sends a message on `/home` or studio Story Companion footer |
| `story_generated_after_companion` | Quick Cut `generation_completed` within 24h of `companion_used` (same browser session) |
| `export_completed_after_companion` | Export completes while companion session marker is active |

Goal: measure pipeline completion lift, not message count. Dual-writes to PostHog when `NEXT_PUBLIC_POSTHOG_KEY` is set (via `trackEvent`).

## Local verification

```bash
npm run typecheck
npm run build
npm run dev
# Sign in → enable flag or add your user to BETA_TESTER_* / ADMIN_*
# → /home
```

Smoke: submit a prompt, confirm avatar moves to `thinking` → `speaking`/`happy`, check `/api/companion/realtime` GET returns `v1-stub`.

## Deploy checklist

1. Keep `NEXT_PUBLIC_COMPANION_ENABLED=false` until ready; use beta/admin lists for dogfood.
2. Set `EMERGENT_LLM_KEY` in production env (optional but recommended).
3. Ensure Supabase auth + `creator_profiles` table available (memory load).
4. Deploy as usual (`next build` / Vercel).
5. Optionally add `public/models/mugtee.glb` in a follow-up asset PR.

## Related systems (preserved)

- Auth + `(app)` layout
- `stores/companion-store.ts` — creative discovery / director notes (workflow extension, not live home store)
- `components/sidekick/mugtee-sidekick-panel.tsx` — dashboard rail
- `components/mugtee/mugtee-assistant.tsx` — floating FAQ chat (separate from Story Companion)

## AI Story Director (Director Mode V2)

When `NEXT_PUBLIC_DIRECTOR_STUDIO_V2=true`, the **Story Package** stage runs the AI Story Director engine — full cinematic packages (framework, hooks, script, scenes, visual direction, virality). See [STORY_DIRECTOR.md](./STORY_DIRECTOR.md) for modules, API, and Creator DNA wiring. Quick Mode is unaffected.
