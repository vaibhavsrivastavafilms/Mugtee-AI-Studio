# Virlo Intelligence Layer (Director Mode V7)

Virlo provides **external market intelligence** for Mugtee Director Mode. It complements the **Creator Intelligence Graph** (creator preferences) and **Director Memory** (learned habits) to produce **hybrid framework recommendations**.

> **Scope:** Director Mode only. Quick Mode continues to use `lib/virlo-engine/` (script/hook layer) and is not modified by this feature.

## Architecture

```
Creator Intelligence Graph → Director Memory → Virlo Market → Hybrid Recommendations
```

| Layer | Source | Purpose |
|-------|--------|---------|
| Creator Graph | `creator_intelligence_graph` | Framework/visual/voice affinities |
| Director Memory | `creator_memories` | Per-creator learned preferences |
| Virlo | `viral_patterns` | External trend patterns (seeded) |
| Hybrid | `hybrid-recommendation.ts` | Blends creator + market scores |

## Database

**Migration:** `supabase/migrations/0062_viral_patterns.sql`

- `viral_patterns` — seeded viral pattern rows (RLS: authenticated read)
- `creator_intelligence_graph.virlo_market_snapshots` — optional JSONB cache column

## Library (`lib/virlo/`)

| Module | Role |
|--------|------|
| `types.ts` | `ViralPattern`, `VirloAnalysis`, `VirloMarketIntelligence` |
| `analyze-pattern.ts` | Content → full analysis (LLM + heuristic fallback) |
| `framework-classifier.ts` | 7-framework classification |
| `hook-analyzer.ts` | Hook type + curiosity trigger |
| `emotion-analyzer.ts` | Dominant emotion |
| `retention-analyzer.ts` | Retention mechanics |
| `scoring.ts` | Virality/retention/share/save/story scores |
| `market-intelligence.ts` | Aggregate trends (working/emerging/fading/oversaturated) |
| `hybrid-recommendation.ts` | Creator graph + Virlo → combined scores |
| `virlo-prompt-injection.ts` | LLM context formatting |
| `viral-patterns.server.ts` | Supabase loader + seed fallback |
| `providers/virlo-provider.ts` | Platform provider interfaces (stubs) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/director/virlo/analyze` | Analyze text/url snippet (no scraping) |
| `GET` | `/api/director/virlo/market` | Aggregated market intelligence |
| `GET` | `/api/director/virlo/recommendations?projectId=` | Hybrid creator+market framework cards |

## Integration Points

### Story Framework Engine
`framework-recommendation-engine.ts` enriches each card with:
- `virloConfidence`, `creatorMatch`, `virloTrend`, `combinedScore`, `marketStatus`

### Producer
`producer-engine.ts` injects Virlo market data into analysis prompts. `ProducerPanel` shows **Market Opportunity**.

### Creative Advisor
`CreativeAdvisorPanel` shows **Trend Intelligence** (working now, fading, experiment with).

### Director Context Injection
Load order in `director-context-injection.ts`:
1. Creator Intelligence Graph
2. Virlo Market (via `directorIntelligence.virloMarket`)
3. Producer review (if approved)
4. Locked director studio state

Director Memory is injected separately in `context-injection.ts` (unchanged order relative to studio block).

## Hybrid Scoring

```
combinedScore = baseConfidence×0.35 + creatorMatch×0.35 + virloTrend×0.30
```

- **creatorMatch** — framework affinity from creator graph
- **virloTrend** — market status + avg virality from `viral_patterns`
- **virloConfidence** — alias of virloTrend for UI badges

## Platform Providers (Future)

`lib/virlo/providers/virlo-provider.ts` defines `fetchTrends()` stubs for:
- TikTok, Instagram, YouTube Shorts, X, LinkedIn

Each throws `VirloProviderNotConfiguredError` until external APIs are wired.

## Dev Seed Data

15 patterns inserted by migration + `lib/virlo/seed-patterns.ts` fallback when DB is empty.

## Verification

```bash
npx tsc --noEmit
npm run build
```
