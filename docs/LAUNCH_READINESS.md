# Launch Readiness (Phase 4.2)

Public launch polish checklist, beta mode, and audit results for Mugtee AI Studio.

## Launch checklist (admin)

**Location:** [`/admin/launch-readiness`](/admin/launch-readiness)

Also linked from the Founder Dashboard at [`/studio/admin`](/studio/admin) → **Launch readiness**.

- 10 manual toggle items persisted in `localStorage` (`mugtee_launch_readiness_v1`)
- Auto-probes for: auth env, `/pricing`, `/api/feedback`, `NEXT_PUBLIC_POSTHOG_KEY`
- Progress bar shows completion percentage

### Checklist items

| Item | Type |
|------|------|
| Authentication Working | Auto-probe + manual |
| Project Creation Working | Manual |
| Save Project Working | Manual |
| Reload Project Working | Manual |
| Export Working | Manual |
| Download Working | Manual |
| Mobile Responsive | Manual |
| Pricing Visible | Auto-probe + manual |
| Feedback Collection Active | Auto-probe + manual |
| Analytics Tracking Active | Auto-probe + manual |

## Public beta badge

Set either env var to `true`:

- `NEXT_PUBLIC_PUBLIC_BETA=true` — required for client-side badge in nav/header
- `PUBLIC_BETA=true` — server-side fallback

Badge appears in:

- `LuxNav` (marketing / v2 pages)
- `CinematicHeader` (authenticated app shell)

## Audit results (Tasks 2–5)

### Empty states — PASS

- `/create?tab=projects` and `/projects` use `ProjectLibraryEmpty` with CTA, niche chips, and showcase examples.
- No code changes required.

### Console errors (key paths) — PASS

- Root layout: `AnalyticsBoot` is SSR-safe (useEffect only).
- Download/export: errors surfaced in UI (`assetError`, toast) rather than unhandled throws.
- No blocking client console errors found in layout, download panel, or export creator page.

### Mobile overflow — FIXED

- `quick-cut-create-entry.tsx`: added `min-w-0 overflow-x-hidden` on Quick Cut wrapper.
- `unified-creator-shell.tsx`: added `min-w-0 overflow-x-hidden` on creator shell root.

### Trust layer (homepage) — PASS (+ minor enhancement)

- Homepage includes: `CreatorExamplesSection`, `OutputShowcaseSection`, pricing in `LuxNav`.
- **Enhancement:** `LandingCtaBanner` now includes a secondary “View pricing” link.

### Support / contact — PASS (+ enhancement)

- Footer already has `mailto:hello@mugtee.in` under Company links.
- **Enhancement:** Settings page adds Help & support card with same mailto.

## Files added

- `lib/admin/launch-readiness.ts`
- `lib/feature-flags/public-beta.ts`
- `components/admin/launch-readiness-checklist.tsx`
- `components/shell/public-beta-badge.tsx`
- `app/(app)/admin/launch-readiness/page.tsx`

## Pre-launch smoke test

1. Open `/admin/launch-readiness` and run auto-checks.
2. Manually verify create → save → reload → export → download on staging.
3. Spot-check mobile on `/create?mode=quick` and `/projects`.
4. Confirm homepage sections and `/pricing` load.
5. Enable `NEXT_PUBLIC_PUBLIC_BETA=true` and confirm badge in nav.
