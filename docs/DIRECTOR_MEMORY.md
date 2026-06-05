# Director Memory Engine (Mugtee V4)

Director Mode learns from **completed director projects** — how a creator thinks (frameworks, camera, voice, motion), not just what they generated.

## Relationship to Companion / Creator Twin

| System | Scope | Storage | Injection |
|--------|-------|---------|-----------|
| **Director Memory** (`creator_memories`) | Director Mode aggregate instincts | `story_memory`, `visual_memory`, `voice_memory`, `motion_memory`, `creator_preferences` JSONB | `formatDirectorCreatorMemoryForPrompt` — only when `directorStudioContext` is present |
| **Creator Twin** (`lib/memory/creator-twin.ts`) | Companion + cross-mode memory retrieval | `creator_profiles`, `agent_memories`, `creator_patterns` (migrations 0042, 0052) | `formatCreatorMemoryForPrompt` via `buildProviderContext` |

Director Memory does **not** duplicate the twin. The twin stays the companion-wide retrieval layer; Director Memory is a director-specific frequency aggregate optimized for Hollywood AI Studio stages.

Quick Mode is **not** affected — learning triggers only when `director_project_state.director_approved = true`.

## Flow

```
Project complete → analyzeDirectorProject → updateCreatorMemory → prompt injection on next project
```

## Database

Migration: `supabase/migrations/0059_creator_memories.sql`

- One row per user (`user_id` unique)
- RLS: owner read/write only

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/director/memory` | Load profile + scores |
| POST | `/api/director/memory/learn` | `{ projectId }` — run analysis after completion |

## Learning triggers

1. **Export complete** — `lib/export/export-job-service.ts` calls `triggerDirectorMemoryLearning` when export status becomes `completed` and project is director-approved.
2. **Generation complete** — `DirectorStudioWorkflow` watches `isComplete` from the generation store (Director Mode only) and POSTs to `/api/director/memory/learn`.

## Prompt injection

- `lib/director/memory/memory-prompt-injection.ts` — `formatDirectorCreatorMemoryForPrompt`
- `lib/ai/providers/context-injection.ts` — injected only when `directorStudioContext` is set (Director Mode)
- Loaded server-side in `generate-script` and `story-package` routes via `resolveDirectorCreatorMemory`

## UI

`components/studio/director/DirectorMemoryPanel.tsx` — cinematic gold/black profile (not analytics dashboard). Accessible from the Director workflow rail under **Memory**.

## Future extensions

Stubs in `lib/director/memory/extensions.ts`:

- `VirloPatternLearning` — trend pattern ingestion
- `AudienceResponseLearning` — post-publish performance feedback

## Store

`stores/director-memory-store.ts` — `creatorMemory`, `memoryScore`, `memoryLoaded`, `lastLearningRun`, `loadMemory()`, `refreshScores()`, `runLearning(projectId)`.
