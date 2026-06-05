# AI Story Director (Director Mode V2)

Hollywood AI Studio intelligence layer that produces a full cinematic story package — not generic content.

## Enable

Set `NEXT_PUBLIC_DIRECTOR_STUDIO_V2=true`. Story Director appears as the **Story Package** stage in the Director workflow rail (`/studio/director`).

Quick Mode paths are unchanged.

## Architecture

| Module | Role |
|--------|------|
| `lib/ai/prompts/director/story-director-system.ts` | System prompt + Creator DNA placeholders |
| `lib/ai/prompts/director/story-frameworks.ts` | Seven frameworks + auto-selector |
| `lib/ai/director/story-director-engine.ts` | Prompt builder, DNA mapping, output parser |
| `app/api/director/story-package/route.ts` | POST — generate + persist package |
| `components/studio/director/StoryPackagePanel.tsx` | Framework selector, generate, collapsible sections |

## Creator DNA sources

Mapped to `{{NICHE}}`, `{{STYLE}}`, `{{TONE}}`, etc. from:

- `buildStyleFingerprint()` / `lib/ai/style-fingerprint.ts`
- Creator memory profile (`creator_memory_profiles`)
- Director store: `activeStoryDirection`, `directorTreatment`, `characterBible`
- Project topic and niche lock

## Seven frameworks

1. **Belief Shift** — false belief → evidence → new lens  
2. **Transformation Story** — before → struggle → after  
3. **Failure To Wisdom** — mistake → fallout → extracted rule  
4. **Experiment Story** — hypothesis → test → verdict  
5. **Contrarian Reveal** — sacred cow → inversion → reframe  
6. **Creator Spotlight** — spark → craft → reveal  
7. **Evolution Story** — v1 → iterations → present standard  

**Auto-select:** keyword scoring on idea + niche, with deterministic hash fallback. Override via UI or API `framework` field.

## Output (10 sections)

1. Story Analysis  
2. Cinematic Hook Options (10 ranked)  
3. Story Structure (Act 1–3)  
4. Full Cinematic Script  
5. Scene Generation (8–15 scenes)  
6. Cinematic Visual Direction per scene  
7. Storyboard frames per scene  
8. Voiceover Direction  
9. Caption System  
10. Virality Analysis  

Persisted on `director_project_state.story_director_package`.

## Context injection

When a story package exists, `formatDirectorStudioForPrompt()` includes framework, analysis, hook, script excerpt, and retention beats. Injected into provider context for `/api/director/story-package` and `/api/generate-script` (when Director context is present).

## Apply to Blueprint

**Apply to Blueprint** syncs hook, script, scene beats, storyboard plan, and voice profile into the director store, and hook/script/scenes into the quick-cut generation store for the approved asset pipeline.

## API

```http
POST /api/director/story-package
Content-Type: application/json

{
  "projectId": "uuid",
  "userIdea": "Your premise",
  "framework": "belief-shift"  // optional — omit for auto-select
}
```

Response: `{ package, provider, frameworkId }`

Auth required (same as other director routes).
