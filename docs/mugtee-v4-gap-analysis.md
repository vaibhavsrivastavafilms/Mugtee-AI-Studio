# Mugtee V4 — Gap Analysis & Architecture Plan

**Date:** 2026-06-05  
**Reference:** V4 dual-mode mock (Quick left / Director center+right), production export screenshot, commits `7fff404` (style library), `307a031` (pipeline), `2946935` (export).

---

## 1. Current Codebase Audit vs Design

### What already exists (partial V4)

| Design element | Current implementation | Gap |
|----------------|------------------------|-----|
| Separate Quick / Director routes | `/studio/quick`, `/studio/director` with `?project=` continuity | ✅ Routes exist; legacy `/studio/workspace`, `/quick-cut` still reachable |
| Mode switcher | `ModeSwitcher` in `CinematicHeader` | Styling still gold-first; mock uses purple Quick / violet Director |
| Director 3-column layout | `CreatorCommandCenter`: 72px rail + workspace + 320px inspector | ✅ Structure matches mock |
| Workflow rail ○ ◐ ✓ | `StudioWorkflowRail` + `workspace-stages.ts` | Missing **Research** step; no **Timeline** tab in rail (by design — Phase 6) |
| Scene cards workspace | `StudioScenesWorkspace`, `StudioSceneCard` | ✅ Wired to generation store |
| Inspector accordion | `StudioInspectorPanel` | Copy still mixed; "Style preset" vs **Creative Systems** |
| CMD+K palette | `StudioCommandPalette` (Director only) | Not mounted on Quick route; labels need V4 + timeline-agent stubs |
| Style library drawer 420px | `StyleLibraryDrawer` @ `sm:max-w-[420px]` | Title/description still "Style Library" |
| Generate pipeline | `useQuickCutGenerationStore.runPipeline` | ✅ Real; Quick Mode passes `skipResearch: true` today |
| Export / browser FFmpeg | `PreviewExportTabbedPanel`, browser export preflight | ✅ Production path; director-note 500 is API bug (out of UI scope) |
| Design tokens | `lib/studio/studio-design-tokens.ts`, `tailwind` `studio.*` | Indigo `#6366F1`; mock specifies purple `#8b5cf6` + cyan accent |

### Quick Mode gaps

| Mock | Current | Action |
|------|---------|--------|
| Example chips (Psychology, Motivational, Restaurant) | `ASK_MUGTEE_PROMPT_CHIPS` (different copy) | Add V4 chip set on Quick workspace |
| Duration + Platform selectors | Hard-coded `duration: 60` in `QuickModeWorkspace` | Wire selectors → store + `runPipeline` |
| Creative System selector | `StylePresetCompactField` | Rename UI; reuse drawer |
| Output asset rows + actions | `PreviewExportTabbedPanel` (tabbed) | Add compact action row: Export, Regenerate, Make More Viral, Change System |
| Hide storyboard/timeline/director notes | Quick uses minimal shell | ✅ No rail in Quick; keep pipeline view only |

### Director Mode gaps

| Mock | Current | Action |
|------|---------|--------|
| Research in left rail | Not in `WORKSPACE_STAGE_ORDER` | Stub stage → `DeepResearchPanel` when report exists |
| Timeline multi-track | `story-timeline.tsx` / `timeline_json` elsewhere | Phase 6 — stub CMD+K only |
| Desktop-first mobile | Rail hidden `lg:` only | Add explicit mobile gate message |
| Director AI suggestions | `StudioDirectorSuggestions` + companion APIs | Wire exists; API 500 needs backend fix |
| Compile MP4 CTA | Inspector `handleCompile` → `retryVideoRender` | ✅ Wired |

### Intentionally deferred (this session)

- Timeline Studio multi-track editor (Phase 6)
- AI Research Engine full UX (stub rail link only)
- AI Timeline Agent (CMD+K registration only)
- Long-form duration options beyond 30/60s

---

## 2. Route Structure Plan

```
/studio/quick?project={id}     → Quick Mode (CapCut-like)
/studio/director?project={id}  → Director Mode (Premiere-like)
/studio/create?mode=*          → Redirect to dedicated routes (legacy)
/studio/workspace              → Legacy command center (redirect → director)
/quick-cut/*                   → Legacy aliases (keep for bookmarks)
/studio/create/{id}/export     → Deep export page (unchanged)
```

**Mode switch:** `switchCreatorModeHref(mode, projectId)` in `lib/create/routes.ts` — preserves `project` query param.

**Entry:** `STUDIO_HOME_HREF = '/studio/quick'`.

---

## 3. Component Hierarchy

```
CinematicAppShell (global)
├── CinematicHeader
│   ├── Logo + "Creator Operating System" (studio routes)
│   ├── ModeSwitcher (Quick | Director)
│   ├── ⌘K trigger → StudioCommandPalette
│   └── HeaderRightActions (profile)
├── [hidden on quick/director] StudioPromptBar
└── children

Quick Mode (/studio/quick)
└── QuickModeShell
    ├── SessionContinuityGuard
    └── QuickModeWorkspace
        ├── Prompt + chips + CreativeSystemCompactField
        ├── QuickCreateControls (duration, platform)
        ├── Generate → runPipeline
        └── QuickModePipelineView → PreviewExportTabbedPanel
            └── QuickModeOutputActions (when complete)

Director Mode (/studio/director)
└── DirectorModeShell
    └── CreatorCommandCenter
        ├── StudioCommandPalette
        ├── StudioWorkspaceTopbar (project title, ⌘K)
        ├── StudioWorkflowRail (72px, + Research stub)
        ├── StudioMainWorkspace
        │   ├── StudioScenesWorkspace (scenes stage)
        │   └── DeepResearchPanel (research stage)
        └── StudioInspectorPanel (320px)
            ├── Project
            ├── Director AI
            ├── Creative System
            └── Export Assets + Compile MP4
```

Shared: `StyleLibraryDrawer` (420px), `useQuickCutGenerationStore`, `useStudioWorkspaceStore`.

---

## 4. State Management Plan

| Concern | Store / module | Notes |
|---------|----------------|-------|
| Generation pipeline | `useQuickCutGenerationStore` | Single source for both modes; same `savedProjectId` |
| Active director stage | `useStudioWorkspaceStore.activeStage` | Maps to `activeStageTab` via `workspaceStageToTab` |
| Inspector accordion | `panelPreferences.contextSections` | Persisted |
| Creative system template | `styleTemplateId` + `applyStyleTemplate` | DB templates via `style_templates` migration |
| Mode preference | `storeCreatorMode` localStorage | `lib/create/mode-selection` |
| Platform (Quick) | `QuickCutInput.platform` (optional) + brief payload | Passed to `contentBriefApiPayload` |
| CMD+K | `StudioCommandPalette` local open state | Global listener; mount from `CinematicAppShell` on studio routes |

No new Zustand store required for V4 Phases 1–3.

---

## 5. DB / Schema Changes

| Change | Needed for Phases 1–3? | Notes |
|--------|------------------------|-------|
| `style_templates` table | No (exists, `0049`) | UI rename only |
| `projects.mode` column | Optional later | Today mode inferred from route + `creator_mode` local |
| `timeline_json` extensions | Phase 6 | Existing JSON sufficient for stub |
| Director note API fix | Backend | `POST /api/companion/director-note` 500 |

**Recommendation:** No blocking migrations for Phases 1–3.

---

## 6. Rollout Phases 1–10

| Phase | Scope | Status (this session) |
|-------|--------|------------------------|
| **1** | Workspace shell: header, mode switcher, tokens, ⌘K | ✅ Implement |
| **2** | Quick Mode: composer, Creative Systems, duration/platform, wired actions | ✅ Implement |
| **3** | Director Mode: rail, scenes, inspector, compile | ✅ Extend (Research stub) |
| **4** | Creative Systems rename project-wide + analytics copy | Partial (UI strings) |
| **5** | Consolidate legacy routes (`/workspace`, `/quick-cut`) redirects | Follow-up |
| **6** | Timeline Studio multi-track | Stub route / CMD+K only |
| **7** | AI Research Engine full panel | Stub rail |
| **8** | AI Timeline Agent | CMD+K commands |
| **9** | Long-form durations + platform packs | Selector extension |
| **10** | Mobile Director parity / responsive inspector | Desktop gate + Quick responsive |

---

## 7. Wiring vs Scaffold (this session)

| Feature | Wired | Scaffold |
|---------|-------|----------|
| Generate | ✅ `runPipeline` | — |
| Export / Compile MP4 | ✅ `retryVideoRender` / `resumeRenderPoll` | — |
| Regenerate | ✅ `resetQuickCut` / `runPipeline` regen | — |
| Make More Viral | ✅ `requestRewriteSelection('more_viral')` + script apply | — |
| Change Creative System | ✅ `mugtee:open-style-drawer` | — |
| Research rail step | — | ✅ Opens `DeepResearchPanel` or empty state |
| Timeline Agent | — | ✅ CMD+K entries only |
| Timeline editor | — | ✅ Phase 6 |

---

## 8. Test URLs

- Quick (fresh): `http://localhost:3000/studio/quick`
- Quick (project): `http://localhost:3000/studio/quick?project={uuid}`
- Director: `http://localhost:3000/studio/director?project={uuid}`
- Legacy redirect: `http://localhost:3000/studio/create?mode=quick`

---

## 9. Verification

```bash
npx tsc --noEmit
npm run build
```

Manual: switch Quick ↔ Director with same `?project=`; run Generate; complete pipeline; Export from Quick actions; ⌘K commands on both routes.
