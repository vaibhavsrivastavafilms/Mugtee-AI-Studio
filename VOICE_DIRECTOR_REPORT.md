# Mugtee ElevenLabs Voice Director Pass — Implementation Report

## Overview

Voice generation is now a **Cinematic Voice Director** layer in the Mugtee workflow:

**Idea → Script → Scenes → Visual Direction → Voice Direction → Storyboard → Export**

When `ELEVENLABS_API_KEY` is set server-side, ElevenLabs is the primary TTS provider. Without it, the stack falls back to OpenAI TTS → Emergent TTS → browser SpeechSynthesis (client).

---

## Architecture

```
lib/voice/
├── voiceProfiles.ts    # 5 curated cinematic narrator profiles + niche/brief selection
├── voiceDirector.ts    # Per-scene direction, pause/emphasis, blueprint merge
├── generateVoice.ts    # Synthesis, cache, Supabase upload
└── index.ts            # Public exports

app/api/
├── generate-voice/     # Pipeline voice step (extended)
├── regenerate-voice/   # Voice-only regen (new)
├── ai/voice/           # Project library voice (uses lib/voice)
└── ai/voiceover/       # Cinematic flow (ElevenLabs via lib/voice)
```

### Data flow

1. **Profile selection** — `selectVoiceProfile()` from niche lock, tone, `contentBrief`, or `parsedIntent`.
2. **Scene direction** — `buildVoiceDirectorPlan()` derives emotion, pacing, tension, pause points, emphasis words, and narration speed per scene.
3. **Script shaping** — `applyVoicePausesToScript()` inserts natural pauses (ellipsis) before pivot/emphasis words.
4. **Synthesis** — ElevenLabs when configured; otherwise existing `synthesizeSpeechBuffer()` chain.
5. **Cache** — SHA-256 key over `script + profileId + niche + voiceId`; hits stored `project_assets.metadata.voice_cache_key`.
6. **Persistence** — MP3 in `project-assets` bucket; metadata on `cinematic_projects.voice.metadata` (JSON, no migration).

---

## ElevenLabs Integration

| Item | Detail |
|------|--------|
| API key | `ELEVENLABS_API_KEY` (aliases: `ELEVENLABS_KEY`, `ELEVEN_API_KEY`, `XI_API_KEY`) |
| Default voice | `ELEVENLABS_VOICE_ID` or Rachel (`21m00Tcm4TlvDq8ikWAM`) |
| Model | `ELEVENLABS_MODEL_ID` or `eleven_turbo_v2_5` |
| Server-only | Key read via `getElevenLabsApiKey()` in server routes / `lib/voice` only |
| Voice catalog | Existing `/api/elevenlabs/voices` + `VoiceSelectionModule` |

---

## Voice Profile System

| Profile ID | Label | Niche mapping |
|------------|-------|---------------|
| `documentary_narrator` | Documentary Narrator | documentary, storytelling |
| `psychology_storyteller` | Psychology Storyteller | psychology, spirituality |
| `luxury_narrator` | Luxury Narrator | luxury, finance |
| `motivation_speaker` | Motivation Speaker | motivation, fitness |
| `faceless_reel_voice` | Faceless Reel Voice | faceless reels |

Each profile defines: default ElevenLabs voice ID, speaking style, speed, stability/style TTS settings, and picker category.

---

## Scene-Level Direction

`SceneVoiceDirection` per scene:

- `emotion`, `pacing`, `tension`, `mood`
- `pausePoints`, `emphasisWords`, `narrationSpeed`
- `directionNote` (e.g. suspense: slow pause before “mistake”, lower tone)

Optional fields merged onto `SceneBlueprint` for OUTPUT_ALIGNMENT persistence:

- `voiceEmotion`, `voicePausePoints`, `voiceEmphasisWords`, `voiceNarrationSpeed`

---

## Workflow Integration

- **Pipeline** — Voice step runs after visual direction (`stepShouldRun(resumeFrom, 'voice')` unchanged).
- **Quick Cut store** — `voiceProfileId`, `voiceMetadata`, `regenerateVoice()`, scene blueprint voice fields updated after generation.
- **Preview** — `CinematicVoicePreview`: “Listen Voiceover”, play / pause / replay / regen (no download in preview).
- **Workflow map** — `workflow-step-map.ts` voice step unchanged (`visuals` → `voice` → `render`).

---

## Export Integration

Creator Pack ZIP now includes:

| File | Notes |
|------|-------|
| `voice.mp3` | Alias of narration audio |
| `narration.mp3` | Existing |
| `script.txt` | Existing |
| `captions.txt` | Script text for caption workflows |
| `storyboard.json` | Existing |

---

## Regeneration

**POST `/api/regenerate-voice`**

- Body: `script`, `scenes`, `sceneBlueprints`, `niche`, `tone`, `elevenLabsVoiceId`, `voiceProfileId`, `project_id`
- Skips cache (`skipCache: true`)
- Does **not** regenerate script, scenes, or storyboard
- Updates `cinematic_projects.voice` + `scene_blueprints` when `project_id` provided

Store action: `useQuickCutGenerationStore.getState().regenerateVoice()`

---

## Fallback Behavior

| Condition | Behavior |
|-----------|----------|
| No `ELEVENLABS_API_KEY` | OpenAI TTS → Emergent TTS → 503 / browser fallback |
| ElevenLabs rate limit / error | Automatic fallback via `synthesizeSpeechBuffer()` |
| No TTS keys at all | `/api/ai/voice` returns `fallback: 'browser'`; cinematic voiceover returns narration-only |
| Cache hit | Returns stored URL; no re-synthesis |

---

## Environment Variables

```env
ELEVENLABS_API_KEY=          # Primary ElevenLabs (required for EL voice)
ELEVENLABS_VOICE_ID=          # Optional default voice
ELEVENLABS_MODEL_ID=          # Optional model (default eleven_turbo_v2_5)
OPENAI_API_KEY=               # TTS fallback
EMERGENT_LLM_KEY=             # LLM narration rewrite + Emergent TTS fallback
```

---

## Files Modified

### New
- `lib/voice/voiceProfiles.ts`
- `lib/voice/voiceDirector.ts`
- `lib/voice/generateVoice.ts`
- `lib/voice/index.ts`
- `app/api/regenerate-voice/route.ts`
- `VOICE_DIRECTOR_REPORT.md`

### Updated
- `lib/cinematic/scene-blueprint.ts` — optional voice direction fields
- `app/api/generate-voice/route.ts`
- `app/api/ai/voice/route.ts`
- `app/api/ai/voiceover/route.ts`
- `lib/cinematic/quick-cut/synthesize-voice.ts`
- `lib/cinematic/quick-cut/project-hydration.ts`
- `stores/quick-cut-generation-store.ts`
- `stores/cinematic-project.ts` — `CinematicVoice.metadata`
- `components/quick-cut/cinematic-voice-preview.tsx`
- `components/quick-cut/generation-stage-panel.tsx`
- `lib/quick-cut/creator-pack-export.client.ts`

---

## Performance Impact

- **Cache hits** avoid ElevenLabs/OpenAI calls (~1–3s saved per regen with identical script/profile).
- **Voice-only regen** skips full pipeline (script/scenes/storyboard unchanged).
- **Storage** reuses existing `project-assets` bucket and `project_assets` table metadata JSON.
- **No new DB migration** — voice metadata stored in existing `cinematic_projects.voice` JSON column.

---

## Follow-ups (optional migration)

1. **`voice_assets` table** — Dedicated cache index on `cache_key` if cross-project cache volume grows.
2. **SSML breaks** — ElevenLabs `<break>` tags for precise pause timing vs ellipsis heuristic.
3. **Per-scene audio stems** — Separate MP3 per scene for advanced assembly (not in scope).
4. **Voice settings passthrough** — Wire profile `stability` / `style` into `synthesizeElevenLabsSpeech()` body.
5. **Captions timing file** — Export `.srt` from `word-timing` engine alongside `captions.txt`.
