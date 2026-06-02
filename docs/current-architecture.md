# Mugtee AI Studio — Current Architecture (Phase 1 Analysis)

**Date:** 2026-06-03  
**Scope:** Read-only repository analysis for V5 Evolution (Builder + Teacher mode). No implementation changes.  
**Latest migration:** `0048_mp4_export_funnel.sql` (no `0049` in repo at analysis time).  
**Related audits:** [EXPORT_AUDIT.md](./EXPORT_AUDIT.md), [COMPANION_V1.md](./COMPANION_V1.md), [AI_PROVIDER_MIGRATION.md](./AI_PROVIDER_MIGRATION.md), [MP4_EXPORT_TRACKING.md](./MP4_EXPORT_TRACKING.md)

---

## 1. Product foundation (what exists today)

Mugtee AI Studio is a **Next.js 14** faceless-creator platform (production: https://mugtee.in) that takes a creator from **idea → hook → script → storyboard/scenes → voice → export/publish**, with parallel **intelligence layers** (memory, companion, agent opportunities, missions, multiverse).

### Primary creator surfaces

| Surface | Route(s) | Role |
|---------|----------|------|
| **Quick Cut / Cinematic workflow** | `/quick-cut`, `/cinematic/*`, `/create/[projectId]/*`, `/studio/(shell)/create/*` | Main AI video pipeline: generation, scenes, voice, export |
| **Studio shell** | `/studio/*` | Workspace, projects, editor, growth, knowledge |
| **Legacy Production OS** | `/workspace`, `/pipeline`, `/shoots`, `/crew`, `/calendar` | Table Tales kanban (content_pieces, shoots, crew) — still wired to Supabase |
| **Live Companion** | `/home` | Avatar + realtime brain stub; memory-enriched prompts |
| **Sidekick / Mugtee Assistant** | Dashboard rail, floating FAQ | Discovery, director notes (separate from live companion store) |
| **Admin / founder** | `/admin/*`, `/admin/export-funnel` | Metrics, validation, MP4 funnel, referrals |
| **Public** | `/`, `/showcase`, `/pricing`, blog | Marketing + showcase |

### Tech stack

- **Framework:** Next.js 14.2, React, TypeScript, Tailwind, Radix UI
- **Auth + DB:** Supabase (Postgres + RLS + Storage)
- **State:** Zustand (15 stores under `stores/`)
- **Video export:** Remotion (`@remotion/renderer`) — primary Quick Cut MP4 path
- **Mobile:** Capacitor Android (`@capacitor/*`)
- **3D:** React Three Fiber (companion avatar, sidekick)
- **Legacy note:** `mongodb` in package.json; primary persistence is Supabase, not Mongo

### What Mugtee delivers today (pipeline)

```
Idea/Prompt → Hook (generate-title) → Script (generate-script) → Scenes (generate-scenes)
  → Images (generate-images) → Voice (generate-voice) → Export (reels/export Remotion)
  → Optional: YouTube upload, Buffer queue, analytics events
```

Intelligence is **injected** into prompts via creator memory, content brief, niche lock, and Virlo/rule engines — not a separate “Opportunity Engine” product surface yet.

---

## 2. Folder structure map

```
Mugtee-AI-Studio/
├── app/                    # Next.js App Router — pages + API routes
│   ├── (app)/              # Authenticated app (dashboard, create, home, admin)
│   ├── api/                # ~145 route handlers (see §4)
│   ├── cinematic/          # Cinematic flow pages
│   ├── studio/             # Studio shell routes
│   ├── quick-cut/          # Quick Cut entry
│   └── auth/, blog/, etc.
├── components/             # UI by domain (cinematic, quick-cut, companion, admin, …)
├── stores/                 # Zustand client state (15 stores)
├── lib/                    # Core business logic (largest surface)
│   ├── ai/providers/       # Multi-provider text router
│   ├── cinematic/          # Generation, niches, story bible, render orchestration
│   ├── quick-cut/          # Compile, export client, zip/download
│   ├── video/              # Remotion orchestration, FFmpeg faceless, storage upload
│   ├── remotion/           # Compositions (ReelComposition, MugteeComposition)
│   ├── agent/              # Opportunity radar, weekly plan, CEO briefing (V4 agent)
│   ├── memory/             # Memory OS prompt injection, events
│   ├── companion/          # Personality, brain prompts
│   ├── reels/              # Export API, polling
│   ├── analytics/          # MP4 funnel, feature usage
│   ├── image-providers/    # Flux → Together → Pollinations
│   └── supabase/           # Server/client Supabase helpers
├── hooks/                  # React hooks (companion language, cinematic routes, …)
├── services/realtime/      # Companion voice pipeline stubs
├── types/                  # Shared TS types
├── supabase/migrations/    # 0001–0048 SQL migrations
├── docs/                   # Operational docs + this file + training/
├── public/                 # Static assets, optional mugtee.glb
├── tests/                  # Test suites
└── scripts/                # Tooling
```

**Convention:** Server-only logic uses `import 'server-only'` in sensitive modules; API routes call into `lib/` rather than embedding business rules inline.

---

## 3. Database schema (migrations 0014–0048)

Migrations **0014+** introduced the modern creator stack on top of legacy **0001** Production OS tables (`content_pieces`, `crew`, `shoots`, `media`, `workspaces`, etc.).

### 3.1 Core project table: `cinematic_projects` (0014 + deltas)

**Created:** `0014_cinematic_projects.sql`  
**Purpose:** Single JSON-friendly row per AI video project (owner RLS).

| Column group | Migrations | Purpose |
|--------------|------------|---------|
| Core | 0014 | `title`, `prompt`, `style`, `duration`, `script`, `scenes` jsonb, `voice`, `captions`, `status` |
| Media URLs | 0015 | `video_url`, `thumbnail_url` |
| Mode / Virlo | 0016 | `mode`, `virlo` jsonb |
| Storyboard archive | 0017 | `storyboard` jsonb |
| Phase 2 metadata | 0018 | `language`, `variation_history`, `visual_style`, `viral_script`, … |
| Generation recovery | 0019 | `generation_status`, `generation_step`, `generation_error` |
| Script structure | 0021 | `script_beats` jsonb |
| Reel export | 0022, 0032 | `reel_status`, `reel_url`, `reel_job_id`, `reel_rendered_at` |
| Creator profile blob | 0023 | `creator_profile` jsonb |
| Showcase | 0023 (showcase) | `share_as_showcase` |
| Story bible | 0035 | `story_bible` jsonb |
| Motion | 0038 | `scene_motion` jsonb |
| Creative companion | 0039 | `creative_brief`, `director_notes`, `director_session_counts` |
| Workspace UI | 0037 | `workspace_layout`, `timeline_state`, `panel_preferences` |
| Timeline editor | 0047 | `timeline_json` jsonb |

**Indexes:** `(user_id, updated_at desc)` (0014); `user_id` (0046).

### 3.2 Creator identity & growth

| Table / extension | Migration | Notes |
|-------------------|-----------|-------|
| `creator_profiles` | 0034, 0041, 0042, 0044 | DNA, relationship, memory_graph, XP/quests, multiverse world, sidekick evolution |
| `creator_events`, `creator_journal`, `creator_learning` | 0042 | Memory OS event loop |
| `creator_reflections` | 0039 | Creative companion reflections |
| `creator_opportunities`, `creator_ideas`, `creator_weekly_plan`, `creator_competitors`, `creator_missions` | 0043 | V4 Autonomous Creator Agent persistence |
| `creator_profiles.decision_history` | 0045 | Decision engine history jsonb |
| `project_edits` | 0036 | Rewrite/edit audit trail |
| `motion_presets` | 0038 | FFmpeg filter presets (future motion) |

### 3.3 Analytics, billing, ops

| Artifact | Migration | Notes |
|----------|-----------|-------|
| `analytics_events` | 0013 (+ MP4 taxonomy in app) | Funnel events including `mp4_*` |
| `mp4_export_failures` view | 0048 | Founder debugging view |
| `feature_usage_events` | 0029 | Feature-level telemetry |
| `revenue_events` | 0031 | Revenue tracking |
| Usage counters on profiles | 0024 | projects/generations/exports/renders counts |
| Referrals, waitlist, feedback | 0025–0030 | Growth & founder feedback |

### 3.4 Legacy Production OS (0001–0013, still present)

`content_pieces`, `crew`, `shoots`, `media`, `publishing_queue`, `notifications`, `recurring_workflows` — used by `/workspace` and automations (`lib/automations-store.tsx`). **Parallel** to `cinematic_projects`; not unified.

### 3.5 Migration index (0014–0048)

| # | File | Summary |
|---|------|---------|
| 0014 | cinematic_projects | Core project table |
| 0015 | project_video_urls | video_url, thumbnail_url |
| 0016 | unified_projects | mode, virlo |
| 0017 | project_archive_fields | storyboard jsonb |
| 0018 | cinematic_phase2_fields | language, viral_script, variation_history |
| 0019 | generation_recovery | generation_* columns |
| 0020 | creator_validation | creator_feedback, creator_metrics |
| 0021 | script_beats | script_beats |
| 0022 | reel_render | reel_status, reel_url |
| 0023 | creator_profile, showcase_share | creator_profile, share_as_showcase |
| 0024 | usage_limits | profile usage counters |
| 0025–0030 | feedback, referrals, waitlist, interviews, exit, revenue | Growth tables |
| 0029 | feature_usage_events | Feature telemetry |
| 0031 | revenue_events | Revenue |
| 0032 | reel_job_id | Async export job id |
| 0033 | sidekick_creator_profile | Sidekick fields on profiles |
| 0034 | creator_profiles | Dedicated profiles table |
| 0035 | story_bible | story_bible on projects |
| 0036 | project_edits | Edit history |
| 0037 | workspace_preferences | Layout/timeline jsonb |
| 0038 | motion_engine | motion_presets, scene_motion |
| 0039 | creative_companion | brief, director notes, reflections |
| 0040 | creator_feedback | Extended feedback columns |
| 0041 | creator_mission | XP, quests, achievements |
| 0042 | companion_memory_os | DNA, memory graph, events/journal/learning |
| 0043 | creator_agent | opportunities, ideas, weekly plan, competitors, missions |
| 0044 | creator_multiverse | world, reputation, story vault, hall of fame |
| 0045 | creator_decisions | decision_history |
| 0046 | performance_indexes | user_id index on cinematic_projects |
| 0047 | timeline_json | timeline_json |
| 0048 | mp4_export_funnel | mp4_failed index + view |

---

## 4. API routes inventory (`app/api/**`)

~145 route files. Grouped by domain (representative paths; some legacy duplicates e.g. `projects/Save` in-memory vs Supabase).

### Generation & content

| Route | Purpose |
|-------|---------|
| `POST /api/generate-title` | Hook/title — AI router + Virlo |
| `POST /api/generate-script` | Script — AI router |
| `POST /api/generate-scenes` | Scene breakdown |
| `POST /api/generate-images` | Storyboard images |
| `POST /api/generate-voice` | ElevenLabs / TTS |
| `POST /api/generate-scene-video` | Per-scene Runway/Seedance |
| `POST /api/regenerate-hook`, `regenerate-scene`, `regenerate-voice` | Partial regen |
| `POST /api/enhance-storyboard`, `enhance-visual` | Storyboard polish |
| `POST /api/generate-series` | Series planning |
| `POST /api/guest-hook` | Unauthenticated hook teaser |

### AI providers & tools

| Route | Purpose |
|-------|---------|
| `GET /api/ai/providers/health` | Provider health snapshot |
| `POST /api/ai/generate`, `rewrite`, `deep-research`, `motion-director`, `voice`, `voiceover`, `image`, `runway-video`, `video-generator` | Routed AI tasks |

### Projects & workspace

| Route | Purpose |
|-------|---------|
| `POST /api/projects/create` | Legacy `projects` table insert |
| `POST /api/workspace/save` | Legacy workspace output save → content pipeline |
| `GET/POST /api/workspace/project/[id]` | Workspace project CRUD |
| `POST /api/workspace/exports` | Export event logging |
| Client persistence | `lib/cinematic-projects` via Zustand `persistProject` (direct Supabase client, not always `/api/projects`) |

### Export & video

| Route | Purpose |
|-------|---------|
| `GET /api/quick-cut/config` | `videoRenderEnabled`, remotion flags |
| `POST /api/reels/export`, `GET /api/reels/export/[jobId]` | Quick Cut MP4 queue + poll |
| `GET /api/reels/download/[projectId]/file` | MP4 download stream |
| `POST /api/render/reel`, `GET /api/render/reel/status/[jobId]` | Direct Remotion (in-memory jobs) |
| `POST /api/render-video`, `POST /api/timeline/render`, `POST /api/compile-video` | Legacy/alternate pipelines |
| `POST /api/cinematic/render/prepare` | Cinematic compile metadata (not final MP4) |
| `GET /api/admin/export-funnel` | Founder MP4 funnel dashboard |

### Companion & memory

| Route | Purpose |
|-------|---------|
| `POST/GET /api/companion/realtime` | Live companion brain |
| `POST /api/companion/discovery`, `reflection`, `director-note`, `emotional-analysis`, `story-expansions`, `creator-memory` | Creative companion APIs |
| `POST /api/memory/event`, `profile`, `timeline`, `reflection`, `companion-message` | Memory OS |

### Agent & decisions (V4 — not full V5 Opportunity Engine)

| Route | Purpose |
|-------|---------|
| `GET /api/agent/opportunities` | Daily opportunity feed (cached DB + radar templates) |
| `POST /api/agent/ideas`, `weekly-plan`, `suggestions`, `ceo-briefing`, `competitors`, `publishing-review` | Agent features |
| `GET /api/decision/recommended-next-move`, `POST /api/decision/accept` | Creator decision engine |

### Multiverse & mission

| Route | Purpose |
|-------|---------|
| `/api/multiverse/*` | home-briefing, profile, world, story-vault, hall-of-fame |
| `/api/mission/profile`, `/api/mission/xp` | XP, quests |

### Platform integrations

| Route | Purpose |
|-------|---------|
| `/api/youtube/*` | OAuth, upload, status |
| `/api/buffer/*` | Scheduling queue |
| `/api/instagram/[action]` | Instagram actions |
| `/api/elevenlabs/*` | Voice list, preview |
| `/api/notion/*` | Notion sync stub |

### Billing, admin, analytics

| `/api/billing/*`, `/api/usage`, `/api/referral/*` | Monetization & growth |
| `/api/analytics/*`, `/api/admin/*` | Events, funnel, validation, interviews |
| `/api/quality/review` | Content quality review |
| `/api/content-director/brief` | Content brief generation |

---

## 5. Zustand stores

| Store | File | Responsibility |
|-------|------|----------------|
| `useCinematicProjectStore` | `cinematic-project.ts` | **Primary** project state: hook, script, scenes, voice; autosave → Supabase `cinematic_projects` |
| `useQuickCutGenerationStore` | `quick-cut-generation-store.ts` | End-to-end Quick Cut generation orchestration, video render requests |
| `useCinematicWorkflowStore` | `cinematic-workflow-store.ts` | Workflow step navigation |
| `useCinematicRenderStore` | `cinematic-render-store.ts` | Render/compile UI state |
| `useStudioWorkspaceStore` | `studio-workspace-store.ts` | Studio layout/workspace |
| `useAIProviderStore` | `ai-provider-store.ts` | Dev/provider selection UI |
| `useCompanionStore` | `companion-store.ts` | Creative discovery / director notes |
| `useMugteeCompanionStore` | `mugtee-companion-store.ts` | Live `/home` companion avatar + chat |
| `useCreatorMemoryStore` | `creator-memory-store.ts` | Client creator memory profile |
| `useCreatorAgentStore` | `creator-agent-store.ts` | Opportunities, weekly plan, CEO briefing |
| `useCreatorDecisionStore` | `creator-decision-store.ts` | Recommended next move |
| `useMissionStore` | `mission-store.ts` | XP, daily quests |
| `useContentQualityStore` | `content-quality-store.ts` | Quality review state |
| `useRewriteStore` | `rewrite-store.ts` | Rewrite flows |
| `useFeedbackStore` | `feedback-store.ts` | In-app feedback |

**Persistence pattern:** `cinematic-project.ts` debounces `scheduleAutosave` → `persistProject()` → `lib/cinematic-projects` Supabase upsert. Quick Cut store additionally calls generation APIs and export pipeline.

---

## 6. AI pipelines

### 6.1 Text (multi-provider router)

**Location:** `lib/ai/providers/`  
**Migrated routes:** `generate-title`, `generate-script` (see [AI_PROVIDER_MIGRATION.md](./AI_PROVIDER_MIGRATION.md))  
**Fallback chain:** gemini → groq → openai (task-specific env overrides)  
**Context injection:** parsed intent, creator memory, content brief, niche lock  

**Not yet on router:** `regenerate-hook`, many caption/repurpose routes (Phase 2 per migration doc).

### 6.2 Hook / script / storyboard

| Stage | API / lib | Notes |
|-------|-----------|-------|
| Hook | `generate-title`, `lib/virlo-engine`, `content-angle-engine` | Virlo rules + AI router |
| Script | `generate-script`, `lib/ai/prompts/cinematic/*` | SOP, director mode, deep research hooks |
| Scenes | `generate-scenes`, `lib/cinematic/generation.ts` | Scene records + image prompts |
| Storyboard enhance | `enhance-storyboard`, `cinematic/storyboard` | Optional polish |

### 6.3 Images

**Location:** `lib/image-providers/`  
**Chain:** FluxAPI Kontext → Together FLUX → Pollinations URL  
**Entry:** `POST /api/generate-images`, `POST /api/ai/image`

### 6.4 Voice

**Routes:** `generate-voice`, `regenerate-voice`, `suggest-voice`, `elevenlabs/*`, `ai/voice`, `ai/voiceover`  
**Providers:** ElevenLabs primary; OpenAI TTS paths exist  

### 6.5 Video (per-scene vs final export)

| Type | Path | Technology |
|------|------|------------|
| **Final reel MP4** | `reels/export` → `orchestrate-remotion-reel` | Remotion h264 1080×1920 |
| Per-scene AI clip | `generate-scene-video`, `ai/runway-video` | Runway / Seedance env |
| Faceless legacy | `render-video` | FFmpeg + optional Runway |
| Timeline | `timeline/render` | `timeline_json` on project |

---

## 7. Project persistence & autosave

### Canonical path (Quick Cut / Cinematic)

1. **Client:** `useCinematicProjectStore` (`stores/cinematic-project.ts`)
2. **Debounce:** `scheduleAutosave` (~silent persist)
3. **Mapper:** `stateToRowPayload` / `rowToState` in `lib/cinematic-projects`
4. **DB:** `cinematic_projects` with RLS (`auth.uid() = user_id`)

### Secondary / legacy paths

| Path | Mechanism |
|------|-----------|
| `POST /api/workspace/save` | Saves to legacy workspace/content model with output object |
| `POST /api/projects/create` | Inserts into `projects` table (separate from cinematic_projects) |
| `POST /api/projects/Save` | **In-memory** demo store — not production persistence |
| `rememberLastWorkspace` | `lib/last-workspace.ts` localStorage for resume UX |

### Generation recovery

Columns `generation_status`, `generation_step`, `generation_error` (0019) support resuming failed generation steps; wired from generation APIs and Quick Cut store.

---

## 8. Export / Remotion pipeline

See [EXPORT_AUDIT.md](./EXPORT_AUDIT.md) for full sequence diagram.

**Summary:**

1. Client: `use-unified-export-actions.client.ts`, `compile-project-mp4.client.ts`
2. Queue: `POST /api/reels/export` → `lib/reels/export-api.ts`
3. Background: `lib/export/export-background.server.ts` (`waitUntil` on Vercel)
4. Render: `lib/video/orchestrate-remotion-reel.ts` → `lib/remotion/render-reel.server.ts`
5. Composition: `ReelComposition` in `lib/remotion/compositions/`
6. Storage: `lib/video/reel-storage-upload.ts` → Supabase `reels` bucket
7. Poll/download: `export-poll.client.ts`, `reels/download/.../file`

**Gating:** `VIDEO_RENDER_ENABLED` env; 503 `VIDEO_RENDER_DISABLED` when off.

**Tracking:** [MP4_EXPORT_TRACKING.md](./MP4_EXPORT_TRACKING.md) — `mp4_started|completed|failed|downloaded` in `analytics_events`; admin `/admin/export-funnel`.

**Known production gap:** Audit notes ~25 users, asset exports work, **0 successful MP4 exports** — critical V5 reliability target.

---

## 9. Companion, memory, opportunity & growth (existing)

### Live Companion (`/home`)

- Doc: [COMPANION_V1.md](./COMPANION_V1.md)
- Store: `mugtee-companion-store.ts`
- API: `/api/companion/realtime` — LLM when `EMERGENT_LLM_KEY` set, else stub
- Memory: `buildCompanionBrainPrompt()` ← `memory-prompt-injection`, `buildTodaysBrief()` opportunity hint

### Memory OS (0042)

- `creator_profiles`: `creator_dna`, `memory_graph`, `learning_events`, `relationship_level`
- Tables: `creator_events`, `creator_journal`, `creator_learning`
- APIs: `/api/memory/*`
- Client: `creator-memory-store.ts`, hooks `use-companion-memory-context.ts`

### Creator Agent / opportunities (0043 — partial V5 “Market→Opportunity”)

- **Not** external market ingestion; **template radar** in `lib/agent/opportunity-radar.ts`
- Feed builder: `lib/agent/content-opportunity-feed.ts` → `buildDailyOpportunityFeed`
- Persisted: `creator_opportunities` when API caches feed
- Store: `creator-agent-store.ts` → `/api/agent/opportunities`
- Related: `lib/decision/creator-decision-engine.ts`, `recommended-next-move` API

### Growth & gamification

- Mission/XP: 0041 + `/api/mission/*`, `mission-store.ts`
- Multiverse: 0044 + `/api/multiverse/*`
- Referrals, waitlist, founding creator: 0025–0027 APIs
- Analytics: `analytics_events`, `feature_usage_events`, PostHog optional

---

## 10. Reusable systems for V5 phases

| System | Why reusable for V5 |
|--------|---------------------|
| **`cinematic_projects` + `lib/cinematic-projects`** | Single source of truth for Story→Script→Visual state; extend with opportunity_id, market_signals |
| **`lib/ai/providers` router** | Plug Market/Opportunity LLM tasks with same fallback, context injection |
| **`lib/memory/*` + 0042 schema** | “Learn” phase maps naturally to learning_events + journal |
| **`lib/agent/opportunity-radar` + 0043 tables** | Scaffold for Opportunity Engine — swap templates for real market feeds |
| **`lib/analytics/mp4-export-events` + 0048 view** | Closed-loop publish/learn metrics |
| **Remotion export stack** | Publish artifact already defined; fix reliability before new features |
| **`lib/content-director` + `input-understanding`** | Brief/intent layer for Market→Story alignment |
| **`creator-decision-engine`** | UX pattern for “recommended next move” across phases |
| **Companion brain pipeline** | Unified intelligence surface for /home + sidekick |
| **`lib/cinematic/story-bible.ts` + script beats** | Story continuity for multi-phase narrative |

---

## 11. Gaps vs locked V5 vision

**Locked V5 chain:** Market → Opportunity → Story → Script → Visual → Publish → Learn  
**Positioning:** “Intelligence Layer for Faceless Creators”

| V5 phase | Current state | Gap |
|----------|---------------|-----|
| **Market** | Virlo hooks, content angles, niche inference — no live market API | No systematic market signal ingestion (trends, competitors at scale) |
| **Opportunity** | Template `opportunity-radar`, DB cache 0043 | Not a true Opportunity Engine; scores are heuristic, not market-backed |
| **Story** | Story bible, script beats, cinematic prompts | Story not explicitly linked to opportunity records |
| **Script** | Strong router + SOP | Quality gates / A/B pack planned but not shipped (per AI_PROVIDER doc) |
| **Visual** | Image provider chain works | Motion engine DB presets underused; scene video separate from reel |
| **Publish** | YouTube, Buffer, export assets | MP4 export reliability broken in production; learn loop weak post-publish |
| **Learn** | Memory OS tables + events | No automatic closure: publish outcome → opportunity model update |

**Structural gaps:**

- Dual persistence (`cinematic_projects` vs `content_pieces` / `projects`)
- Fragmented export pipelines (Remotion vs FFmpeg vs timeline)
- Agent intelligence largely **client-fetch + templates**, not orchestrated backend jobs
- No locked “Phase” UI for Market→Opportunity entry (Quick Cut still prompt-first)

---

## 12. Architecture evaluation (summary)

| Dimension | Score (0–100) | Notes |
|-----------|---------------|-------|
| Data model | 78 | `cinematic_projects` well-evolved; legacy tables add confusion |
| AI pipeline | 72 | Router + prompts strong; partial migration |
| Export/publish | 45 | Remotion path exists; production MP4 success rate ~0 |
| Intelligence/memory | 70 | Rich schema; template opportunities vs real market |
| Observability | 75 | MP4 funnel + admin dashboards |
| V5 alignment | 58 | Scaffolding present; Opportunity→Story chain not productized |

**Overall architecture readiness for V5 evolution: 68/100** (see training Module 2 for framework detail).

---

## 13. References

- [EXPORT_AUDIT.md](./EXPORT_AUDIT.md) — MP4 flow, routes, FFmpeg vs Remotion
- [COMPANION_V1.md](./COMPANION_V1.md) — /home companion deploy guide
- [AI_PROVIDER_MIGRATION.md](./AI_PROVIDER_MIGRATION.md) — Provider router phases
- [MP4_EXPORT_TRACKING.md](./MP4_EXPORT_TRACKING.md) — Funnel events & admin review

*Phase 2+ implementation (Opportunity Engine, new phases) is explicitly out of scope for Phase 1.*
