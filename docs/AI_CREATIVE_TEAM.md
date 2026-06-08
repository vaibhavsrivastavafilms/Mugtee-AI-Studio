# AI Creative Team (Director Mode V8)

Orchestrates six specialist agents under the creator-as-Director model. The creative team runs **after Treatment** and **before Blueprint** in the Director workflow.

## Workflow order

```
Idea → Memory → Creative Advisor → Story Direction → Framework → Treatment
  → Creative Team Review → Story Package → Blueprint → Producer Review → …
```

### Producer Review vs Creative Team

- **Creative Team Review** is the orchestration UI — all six agents run sequentially here.
- **Executive Producer** runs inside Creative Team and syncs to `producer_reports`.
- **Producer Review** (post-blueprint) reuses that report for deep-dive feedback (accept/dismiss suggestions, approve refinement). It does **not** re-run analysis unless the director regenerates the producer agent.

## Agents (`lib/creative-team/agents/`)

| Agent | Output | Wraps |
|-------|--------|-------|
| Story Strategist | Story Strategy Report | `framework-recommendation-engine`, story direction context |
| Executive Producer | Producer Report | `lib/director/producer/producer-engine` |
| Screenwriter | Blueprint Package | `blueprint-from-framework`, Story Director hints |
| Cinematographer | Visual Direction Package | Camera language / `camera_profiles` shape |
| Voice Director | Voice Package | `voice_profiles` shape |
| Music Director | Music Package | `music_profiles` shape |

## Orchestrator

`lib/creative-team/orchestrator.ts` runs agents in order:

**Strategist → Producer → Screenwriter → Cinematographer → Voice → Music**

Returns `CreativeTeamPackage` + `CreativeAlignmentScore` (story, visuals, voice, music, audience fit).

## Prompt routing

`lib/creative-team/prompt-router.ts` injects:

- Director Memory
- Creator Intelligence Graph (0061)
- Virlo market intelligence (0062)

## API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/director/creative-team?projectId=` | Load saved package |
| POST | `/api/director/creative-team/run` | Full team or `{ agentId }` single agent |
| PATCH | `/api/director/creative-team/agent` | `{ reportId, agentId, action: accept\|reject\|regenerate }` |

## Database

Migration: `supabase/migrations/0063_creative_team_reports.sql`

Table: `creative_team_reports` — JSONB columns per agent + `alignment_score` + `agent_states`. RLS owner-only.

## State

`stores/creative-team-store.ts` — `creativeTeamPackage`, `alignmentScore`, `agentStates`, `runCreativeTeam()`, `acceptAgent()`, `rejectAgent()`, `regenerateAgent()`.

Accepted outputs sync into `director-studio-store` (blueprint, camera, voice, music, producer).

## UI

`components/studio/director/CreativeTeamPanel.tsx` — cinematic gold/black roster with status badges and alignment score.

## Future

`lib/creative-team/extensions.ts` — `AgentDebate`, `MultiPassRefinement` interfaces (stubs only).

## Scope

- **Director Mode only** — does not modify Quick Mode.
- Builds on existing engines; does not duplicate producer/framework/blueprint logic.
