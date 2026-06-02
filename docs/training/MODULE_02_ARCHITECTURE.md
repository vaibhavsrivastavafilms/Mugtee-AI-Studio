# Module 2 — Current Architecture Analysis

**Course:** Mugtee V5 Evolution (Builder + Teacher)  
**Status:** Complete (Phase 1)  
**Prerequisites:** [MODULE_01_VISION.md](./MODULE_01_VISION.md)  
**Primary artifact:** [current-architecture.md](../current-architecture.md)

---

## Objective

Learn **how Phase 1 analysis was performed**, **why each major system matters**, how systems connect to **future V5 phases**, and how to apply the **architecture evaluation framework** (0–100) to prioritize Phase 2 work.

---

## Context

Phase 1 required a **read-only scan** of the Mugtee AI Studio repo: migrations, API routes, Zustand stores, AI pipelines, persistence, export, companion/memory/agent code, and existing docs (`EXPORT_AUDIT.md`, `COMPANION_V1.md`, `AI_PROVIDER_MIGRATION.md`, `MP4_EXPORT_TRACKING.md`). The output is [current-architecture.md](../current-architecture.md) — the single source of truth until the next approved phase.

---

## How Phase 1 analysis was performed

### Method (repeatable for future audits)

| Step | Action | Tools / paths |
|------|--------|----------------|
| 1 | Inventory **migrations 0014–0048** | `supabase/migrations/*.sql` |
| 2 | Map **API surface** | `app/api/**/route.ts` (~145 files) |
| 3 | List **client state** | `stores/*.ts` (15 Zustand stores) |
| 4 | Trace **generation pipeline** | `generate-title`, `generate-script`, `generate-scenes`, `generate-images`, `generate-voice` |
| 5 | Trace **persistence** | `stores/cinematic-project.ts` → `lib/cinematic-projects` |
| 6 | Trace **export** | [EXPORT_AUDIT.md](../EXPORT_AUDIT.md), `lib/reels/export-api.ts`, Remotion |
| 7 | Trace **intelligence** | `lib/agent/*`, `lib/memory/*`, `0042`/`0043` migrations |
| 8 | Cross-check **docs vs code** | No invented features; gaps explicitly listed |
| 9 | Score & recommend | Framework below |

### Rules followed

- **Documentation only** — no code changes except `docs/`
- **No Opportunity Engine implementation**
- **No conflict** with in-flight Template Discovery subagent
- **Accurate to repo** — e.g. migration `0049` does not exist yet; latest is `0048`

---

## Why each system matters (and V5 connection)

### `cinematic_projects` + `lib/cinematic-projects`

- **Today:** Canonical JSON project row (script, scenes, voice, reel fields, story_bible, timeline_json).
- **V5:** Backbone for Story → Script → Visual; add `opportunity_id`, `market_snapshot` in Phase 2+.
- **Risk:** Legacy `content_pieces` / `projects` table still used — dual truth.

### `lib/ai/providers` (text router)

- **Today:** Hook/script on router with memory + niche injection.
- **V5:** Same router for Opportunity briefs, story scoring, learn summaries.
- **Gap:** Many routes still bypass router ([AI_PROVIDER_MIGRATION.md](../AI_PROVIDER_MIGRATION.md) Phase 2).

### Image + voice pipelines

- **Today:** Flux → Together → Pollinations; ElevenLabs on voice routes.
- **V5:** Visual phase; voice stays parallel to Script beat timing.
- **Strength:** Provider fallbacks already match V5 reliability needs.

### Remotion export + MP4 funnel

- **Today:** Primary Quick Cut MP4 path; analytics `mp4_*` + admin funnel (0048).
- **V5:** Publish phase artifact.
- **Critical weakness:** Production **~0 successful MP4 exports** per export audit — blocks credible Publish→Learn.

### Memory OS (0042) + Companion (COMPANION_V1)

- **Today:** `creator_dna`, `memory_graph`, events/journal/learning tables; `/home` brain stub.
- **V5:** Learn phase storage and prompt injection for all phases.
- **Gap:** Publish outcomes not automatically written as structured learn signals.

### Creator Agent (0043) + `opportunity-radar`

- **Today:** Template opportunities, API cache, sidekick/home brief hints.
- **V5:** Opportunity phase — **replace templates with market engine** in Phase 2+.
- **Do not confuse** with locked V5 “Opportunity Engine” product.

### Analytics + admin

- **Today:** `analytics_events`, export funnel dashboard, feature usage.
- **V5:** Measure phase conversion (opportunity picked → story started → MP4 downloaded).
- **Strength:** 0048 view gives founders actionable MP4 failure codes.

### Multiverse + mission

- **Today:** Gamification, retention, creator world metaphor.
- **V5:** Secondary to pipeline; supports habit, not replace Market→Learn.

---

## Architecture evaluation framework (0–100)

### Scoring dimensions

| Dimension | Weight | Question |
|-----------|--------|----------|
| **Data coherence** | 20% | One clear project model for AI video? |
| **Pipeline completeness** | 25% | How many V5 phases are production-viable? |
| **AI reliability** | 15% | Router, fallbacks, context injection? |
| **Publish reliability** | 20% | Does MP4 export succeed in prod? |
| **Intelligence depth** | 10% | Memory + opportunity + learn closure? |
| **Observability** | 10% | Can founders debug funnel failures? |

### Phase 1 scores (June 2026 analysis)

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Data coherence | 78 | `cinematic_projects` rich; legacy tables remain |
| Pipeline completeness | 62 | Script/Visual strong; Market/Opportunity/Learn weak |
| AI reliability | 72 | Router + providers; partial route migration |
| Publish reliability | 45 | Remotion path exists; 0 MP4 success reported |
| Intelligence depth | 70 | Schema + companion; template opportunities |
| Observability | 75 | MP4 funnel, admin dashboards |

### Weighted overall

```
Overall = 0.20×78 + 0.25×62 + 0.15×72 + 0.20×45 + 0.10×70 + 0.10×75
        ≈ 68/100
```

**Interpretation:** Architecture is **evolvable** toward V5 but **not** yet an intelligence-first product. The largest drag is **Publish reliability** and **Market→Opportunity** productization.

---

## Strengths

1. **Unified cinematic project model** with 30+ evolved columns and RLS.
2. **Multi-provider AI router** with memory/niche context — ready to extend to new tasks.
3. **End-to-end Quick Cut generation** from hook through voice in production routes.
4. **Remotion-based export design** with queue, poll, storage, and structured failure taxonomy.
5. **Memory OS + agent schema** (0042/0043) — tables and client stores exist before engine hardening.
6. **Founder observability** — export funnel view and `mp4_export_failures` (0048).
7. **Documented audits** — export and provider migration reduce rediscovery cost.

---

## Weaknesses

1. **Dual persistence** — `cinematic_projects` vs workspace `content_pieces` / `projects`.
2. **Opportunity feed is heuristic templates**, not market ingestion.
3. **MP4 export success rate** near zero in production despite working asset exports.
4. **Fragmented video pipelines** — Remotion, FFmpeg faceless, timeline render, cinematic prepare.
5. **Incomplete AI router migration** — regen and caption paths still direct provider calls.
6. **Learn loop not closed** — analytics exist; automatic memory/opportunity update does not.
7. **No migration 0049** — schema evolution may continue; docs must be re-audited after new migrations.

---

## Risks

| Risk | Impact | Mitigation (Phase 2+) |
|------|--------|---------------------|
| MP4 remains broken | Creators churn at Publish; Learn never starts | P0 export fix before Opportunity Engine UI |
| Builder adds 4th persistence path | Data corruption, lost projects | Freeze new tables; extend `cinematic_projects` only |
| Opportunity oversold | Trust loss | UI copy + Module 1 honest mapping until engine ships |
| Template Discovery conflict | Duplicate opportunity logic | Coordinate subagent; single `opportunity-radar` extension point |
| Scope explosion in Phase 2 | 25 modules at once | Ship Market→Opportunity first per course index |

---

## Recommended next step (after user approval)

**Phase 2 priority order (suggested — not implemented in Phase 1):**

1. **Publish hardening** — Remotion/Vercel/validation fixes until `mp4_completed` / `mp4_downloaded` move on founder funnel (see [MP4_EXPORT_TRACKING.md](../MP4_EXPORT_TRACKING.md)).
2. **Opportunity Engine v0** — Market signal adapters feeding `creator_opportunities` + replace template-only radar for daily feed.
3. **Story↔Opportunity link** — `cinematic_projects` foreign key + UI entry “Start from opportunity.”
4. **Router Phase 2** — per [AI_PROVIDER_MIGRATION.md](../AI_PROVIDER_MIGRATION.md).
5. **Learn closure** — on `mp4_downloaded` / YouTube publish, write `creator_learning` + update memory graph.

---

## Micro-Steps (hands-on)

1. Open [current-architecture.md](../current-architecture.md) and read §§3, 6, 8, 11.
2. Run `glob app/api/**/route.ts` locally — count routes; compare to doc §4.
3. Read `stores/cinematic-project.ts` `persistProject` — trace to `lib/cinematic-projects`.
4. Read `lib/agent/opportunity-radar.ts` — list opportunity `type` enum values.
5. Open `/admin/export-funnel` in staging/production (admin auth) — note MP4 metrics.
6. Score one dimension yourself; compare to 68 overall — discuss 5-point disagreement with team.

---

## Expected Result

You can explain to stakeholders:

- How the repo was analyzed (method table above)
- **68/100** overall readiness with dimensional breakdown
- Top 3 strengths and top 3 gaps without conflating scaffold with shipped V5

---

## Validation

| ID | Question | Expected answer |
|----|----------|-----------------|
| A1 | Where are projects persisted for Quick Cut? | `cinematic_projects` via `lib/cinematic-projects` |
| A2 | What renders final Quick Cut MP4? | Remotion `orchestrate-remotion-reel` |
| A3 | Where do opportunities come from today? | `opportunity-radar` templates + optional DB cache 0043 |
| A4 | Overall Phase 1 score? | **68/100** (weighted framework) |
| A5 | #1 recommended Phase 2 step? | Publish/MP4 hardening before Opportunity Engine UX |

---

## Common Errors

- Scoring emotional “we have lots of features” instead of **phase-viable** features.
- Ignoring EXPORT_AUDIT production MP4 data.
- Teaching Module 2 without Module 1 pipeline vocabulary.
- Planning Opportunity Engine before export works (inverts user value).

---

## Error Diagnosis & Resolution

Same pattern as Module 1: re-anchor to [current-architecture.md](../current-architecture.md), re-run one trace (persist OR export OR opportunity), re-score one dimension with evidence from file paths.

---

## Evolution Impact

Module 2 turns vision (Module 1) into **evidence-based prioritization**. Phase 2 PRs should cite dimension scores (e.g. “Publish reliability 45 → target 80”). The CustomGPT spec ([CUSTOMGPT_SPEC.md](./CUSTOMGPT_SPEC.md)) will embed this rubric for automated reviews.

---

*Next: [COURSE_INDEX.md](./COURSE_INDEX.md) — full 25-module outline*
