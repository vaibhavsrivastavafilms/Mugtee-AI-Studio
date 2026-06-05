# Creator Intelligence Graph (Mugtee V6)

Unified director-mode intelligence layer that answers **"What kind of creator is this?"** and **"What works best for this creator?"**

## Relationship to Director Memory

| System | Scope | Storage | Purpose |
|--------|-------|---------|---------|
| **Director Memory** (V4) | Per-dimension frequency aggregates | `creator_memories` JSONB columns | Raw learned instincts — frameworks, camera, voice, motion counts |
| **Creator Intelligence Graph** (V6) | Unified creative dossier | `creator_intelligence_graph.graph_data` + `insights` | Merged view across memory, producer reports, frameworks, projects, DNA |
| **AI Producer** (V5) | Per-project executive review | `producer_reports` | Strategic scoring before production |

Director Memory **feeds** the Intelligence Graph — it does not replace it. Memory stores granular frequency maps; the graph merges those with producer scores, `story_frameworks` selections, `cinematic_projects` history, and `creator_profiles.creator_dna` into percentage affinities and rule-based insights.

Quick Mode is **not** affected. All intelligence paths require Director Mode context (`directorStudioContext`).

## graph_data structure

```json
{
  "creatorProfile": { "identityLabel", "projectCount", "memoryDepth", ... },
  "frameworkAffinity": { "belief-shift": 61, "transformation-story": 22, ... },
  "visualAffinity": { "shotTypes", "lighting", "colorPalettes", ... },
  "voiceAffinity": { ... },
  "motionAffinity": { ... },
  "producerAffinity": { "avgRetentionScore", "topStrengths", ... },
  "audienceAffinity": { "niche", "platform", "emotionalGoal", ... },
  "evolutionHistory": [{ "at", "event", "summary", ... }]
}
```

## How sources merge

`lib/intelligence/merge-sources.ts` pulls from existing tables without duplicating learning logic:

1. **`creator_memories`** — story/visual/voice/motion frequency maps via `getOrCreateCreatorMemory`
2. **`producer_reports`** — scores, strengths, suggestions, acceptance counts
3. **`story_frameworks`** — active framework selections weighted by confidence
4. **`cinematic_projects` + `director_project_state`** — approved project count
5. **`creator_profiles`** — niche, platform, content_style, creator_dna

`build-creator-graph.ts` converts frequency maps to percentage affinities and computes identity labels. `generate-insights.ts` produces rule-based insight strings (e.g. "Belief Shift 61%", "Warm Gold 78% of approved projects").

## Rebuild triggers

| Trigger | Location |
|---------|----------|
| Manual | `POST /api/director/intelligence/rebuild` |
| Memory learn complete | `trigger-learning.server.ts`, `/api/director/memory/learn` |
| Producer report saved | `upsertProducerReport` in `producer-db.server.ts` |

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/director/intelligence` | Load graph + insights |
| POST | `/api/director/intelligence/rebuild` | Recompute graph |

## Prompt injection

`formatIntelligenceGraphForPrompt()` in `lib/intelligence/graph-prompt-injection.ts` is injected via `formatDirectorStudioForPrompt()` **before** Story Direction, Framework, Treatment, Producer, Blueprint, and Story Package sections.

Loaded server-side in `generate-script` and `story-package` via `resolveDirectorIntelligenceGraph`.

## UI

`components/studio/director/CreativeAdvisorPanel.tsx` — cinematic gold/black creative dossier (not analytics dashboard). Rail stage **Creative Advisor** appears after Memory.

## Store

`stores/creator-intelligence-store.ts` — `intelligenceGraph`, `insights`, `graphLoaded`, `lastRebuild`, `loadIntelligence()`, `rebuildGraph()`.

## Future extensions

Stubs in `lib/intelligence/extensions.ts`: `VirloIntelligence`, `AudienceFeedback`, `PerformanceLearning`, `PublishingAnalytics`.

## Database

Migration: `supabase/migrations/0061_creator_intelligence_graph.sql`
