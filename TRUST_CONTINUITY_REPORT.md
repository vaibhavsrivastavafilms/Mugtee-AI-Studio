# Mugtee Creator Trust & Continuity Pass

Audit and implementation report — builds on the Workflow Continuity Pass (stacked workspace, Zustand workflow fields, `workflow-session`, `workflow-continuity`).

## Trust gaps found

| Gap | Impact | Resolution |
|-----|--------|------------|
| Save indicator hidden when idle | Creators unsure work persisted | `SaveStatusIndicator` shows persistent state + timestamps + cloud sync |
| No cross-session recovery after browser close | Lost context on return | `localStorage` project continuity + Continue Project card |
| Recovery copy felt like generic pause | Anxiety on failure | "Generation interrupted" + "Retry Step →" |
| Regeneration silently overwrote hook/script | Fear of losing good drafts | Draft protection dialog (Keep / New Version) |
| Activity only on script workspace route | No production log in Quick Cut studio | Lightweight timeline + pipeline event logging |
| Mobile save state buried in footer | App switch / network blips felt risky | Fixed `MobileSaveTrustBar` + persistent footer indicator |
| Workflow fields existed but continuity not tied to project id | Deep link restore could miss project | Extended session + localStorage with `projectId` + resume href |
| Dashboard showed recents only | Unfinished work not prioritized | `ContinueProjectCard` above Recent Productions |

## Recovery flows added

### 1. Browser return
- **Dashboard:** `ContinueProjectCard` surfaces last unfinished project (local continuity first, then library heuristic).
- **Workspace (no project):** `ProjectRecoveryBanner` with title, relative time, Continue → deep link.
- **Workspace (with project):** `SessionContinuityGuard` restores hash step, workflow step, scroll position.

### 2. Generation failure
- Existing `GenerationRecoveryPanel` updated: preserved outputs, step checklist, **Retry Step →** (calls `resumeGeneration` — only failed step via `resumeFrom` / `runPipeline`).
- `generationStatus: failed` keeps `lastCompletedStep` + `failedAtStep` in Supabase + Zustand.

### 3. Draft regeneration
- Hook / script regen in `GenerationStagePanel` gated by `DraftProtectionDialog`.
- "Keep Existing Version" cancels; "Create New Version" proceeds (versions still tracked in `variationHistory`).

## Save-state improvements

| State | UI copy |
|-------|---------|
| `saving` | Saving… |
| `saved` + cloud id | ✓ Synced to cloud |
| `saved` (local) | ✓ Saved just now |
| `idle` + `lastSavedAt` | ✓ Saved · Synced Xm ago |
| `error` | Save failed + **Retry** (calls `saveProject`) |
| Mobile persistent | Always visible when project has content |

Locations: `StudioStatusBar`, `QuickCutGenerationFooter`, `MobileSaveTrustBar`, recovery panel.

## Session continuity improvements

- **`sessionStorage`** (`workflow-session`): per-tab workflow step, completed steps, last visited, project id.
- **`localStorage`** (`project-continuity`): survives browser close — project id, title, steps, scroll, resume href.
- **`sessionStorage`** (`workflow-continuity` scroll): per-step scroll Y restored on load.
- **URL hash** (`#hook`, `#script`, …): `applyWorkflowHashFromLocation` on load.
- **Auth redirects:** studio layout still gates auth; continuity restores after successful session.

## What's persisted where

| Field | Zustand | sessionStorage | localStorage | Supabase |
|-------|---------|----------------|--------------|----------|
| `currentWorkflowStep` | ✓ | ✓ | ✓ | — |
| `completedWorkflowSteps` | ✓ | ✓ | ✓ | — |
| `lastVisitedStep` | ✓ | ✓ | ✓ | — |
| `lastCompletedStep` | ✓ | — | ✓ | ✓ (`last_completed_step`) |
| `failedAtStep` | ✓ | — | — | ✓ (`generation_step` on fail) |
| Hook/script/scenes/voice | ✓ | preview session | — | ✓ (`cinematic_projects`) |
| Activity milestones | — | — | cache | ✓ (`team_activity`) |
| Scroll position | — | ✓ per step | — | — |
| Resume deep link | — | — | ✓ `resumeHref` | — |

## Files modified

### New
- `lib/trust/project-continuity.ts`
- `lib/trust/activity-events.ts`
- `components/trust/save-status-indicator.tsx` (via enhanced `generation-save-indicator.tsx`)
- `components/trust/mobile-save-trust-bar.tsx`
- `components/trust/continue-project-card.tsx`
- `components/trust/project-recovery-banner.tsx`
- `components/trust/draft-protection-dialog.tsx`
- `components/trust/quick-cut-activity-timeline.tsx`
- `components/trust/session-continuity-guard.tsx`
- `TRUST_CONTINUITY_REPORT.md`

### Extended
- `stores/quick-cut-generation-store.ts` — `persistCreatorContinuity`, workflow session project binding
- `lib/workflow/workflow-session.ts` — project id, scroll, last asset
- `lib/workflow/workflow-navigation.ts` — persist project id on navigate
- `lib/cinematic/generation-persist.ts` — pipeline activity logging
- `lib/cinematic/generation-errors.ts` — recovery copy
- `lib/log-event.ts` — `hook_generated`, `scenes_generated`, `visuals_generated`
- `components/quick-cut/generation-save-indicator.tsx` — full save confidence layer
- `components/quick-cut/generation-recovery-panel.tsx` — interrupted UX
- `components/quick-cut/generation-stage-panel.tsx` — draft protection
- `components/quick-cut/generation-footer.tsx` — mobile persistent save
- `components/studio/studio-status-bar.tsx` — enhanced indicator
- `components/studio/creator-command-center.tsx` — recovery banner, activity timeline
- `components/project/activity-timeline.tsx` — new event labels
- `app/(app)/dashboard/page.tsx` — Continue Project priority
- `app/studio/(shell)/workspace/page.tsx` — continuity guard + mobile trust bar

## Follow-ups (migrations optional)

1. **Optional JSONB on `cinematic_projects`** — store `workflow_continuity` server-side for multi-device resume (currently client + existing generation columns suffice).
2. **`team_activity` RLS** — ensure Quick Cut project ids write successfully (uses existing table; no migration required).
3. **Scene-level draft protection** — dialog pattern ready; wire to storyboard regen buttons similarly.
4. **Clear continuity on explicit "New project"** — call `clearProjectContinuity()` from fresh-create flow when product wants hard reset.

## Verification

```bash
npm run build
```

Manual checks:
- Generate through hook → confirm "✓ Synced to cloud" + activity line.
- Kill tab → reopen dashboard → Continue Project card appears.
- Force generation error → Retry Step → prior hook/script preserved.
- Regenerate hook → draft dialog → Keep Existing cancels.
