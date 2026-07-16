# Mugtee AI Studio — End-to-End QA Audit Report

**Date:** 2026-07-03
**Environment:** Windows (win32 10.0.26200), PowerShell, local dev on `http://localhost:3000`
**Method:** Authenticated Chromium session (Cursor browser + CDP), same-origin HTTP sweeps, dev-server log analysis, source inspection.
**Auth:** Reused existing Supabase session in `e2e/.auth/user.json` (`/api/profile` → `signed_in: true`, plan `FREE`).

> **Auto-fix policy:** Per instruction (Step 17), no application source files were modified as part of this audit. All fixes below are proposals/patches only. The only runtime change performed was **restarting the dev server** to compare bundlers (required to isolate the root cause).

---

## 1. Executive Summary

The local environment is **fundamentally broken by a Next.js / React version mismatch**, and this single issue cascades into the majority of failures observed:

- **Installed runtime is `Next.js 16.2.9`**, but `package.json` pins **`next@14.2.3`** and **`react@18.3.1` / `react-dom@18.3.1`**.
- Next 16 defaults to **Turbopack**. Turbopack cannot resolve the **absolute Windows path** `react`/`react-dom` alias declared in `next.config.js` → `windows imports are not implemented yet` → **~20+ API routes return HTTP 500** at compile time.
- Forcing **webpack** (`next dev --webpack`) makes it *worse*: **every page 500s** with `TypeError: (0 , _react.cache) is not a function` — Next 16 calls React 19's `cache()`, but the alias pins React 18.3.1, which does not export a working `cache`.
- Net effect: **there is no bundler mode in which the app runs correctly** on this machine until dependencies are realigned.

On top of the environment issue, the audit confirmed a **second, independent product bug** carried over from the previous investigation: **Quick Cut `POST /api/generate-script` returns 502** because the configured `GEMINI_API_KEY` is malformed and provider fallback is defeated (see §"Critical Bugs").

**Overall verdict:** 🔴 **Not shippable / not runnable in dev as currently checked out.** Fix the dependency mismatch first; almost every downstream failure derives from it.

| Severity | Count |
|---|---|
| 🔴 Critical | 3 |
| 🟠 High | 4 |
| 🟡 Medium | 5 |
| 🟢 Low | 4 |

---

## 2. Pages Tested / Routes Discovered

Routes were discovered dynamically from the App Router tree (99 `page.tsx` files) and exercised via an authenticated same-origin HTTP sweep + live rendering of key pages.

### Page routes (HTTP sweep — all returned 200 or an auth redirect; **no page-level 500s**)

- **Public (200):** `/`, `/pricing`, `/blog`, `/contact`, `/about`, `/terms`, `/privacy`, `/showcase`, `/made-with-mugtee`, `/offline`, `/auth/forgot-password`
- **Auth pages (redirect while signed-in):** `/auth/login`, `/login`, `/signin` → `opaqueredirect`
- **App (redirect → studio/login):** `/dashboard`, `/projects`, `/create`, `/settings`, `/workspace` → `opaqueredirect`
- **App (200):** `/home` (→ `/studio`), `/media`, `/automations`, `/crew`, `/calendar`, `/shoots`, `/mugtee-os`, `/pipeline`, `/scripts`, `/storyboards`, `/library`, `/analytics`
- **Cinematic (200):** `/cinematic`, `/cinematic/create`, `/cinematic/director`, `/cinematic/scenes`, `/cinematic/voiceover`, `/cinematic/compile`, `/cinematic/preview`, `/cinematic/generating`, `/quick-cut`, `/quick-cut/preview`, `/director-cut`
- **Studio shell (200):** `/studio`, `/studio/quick`, `/studio/workspace`, `/studio/workspaces`, `/studio/library` (→ `/studio/assets`), `/studio/assets`, `/studio/memory`, `/studio/knowledge`, `/studio/analytics`, `/studio/growth`, `/studio/jobs`, `/studio/exports`, `/studio/integrations`, `/studio/marketplace`, `/studio/director`, `/studio/editor`, `/studio/video`, `/studio/settings`, `/studio/projects`, `/studio/create`
- **Admin (200 shell):** `/admin`, `/admin/health`, `/admin/analytics`, `/admin/feedback`, `/admin/ecosystem`, `/admin/referrals`, `/admin/interviews`, `/admin/validation`, `/admin/growth-signals`, `/admin/export-funnel`, `/admin/unit-economics`, `/admin/agent-activity`, `/admin/launch-checklist`, `/admin/launch-readiness`, `/admin/sponsored-placements`
- **Debug:** `/debug/runtime` (200)

### Pages rendered & visually inspected

| Page | Result |
|---|---|
| `/studio` (workflow chooser) | ✅ Renders cleanly (Quick Cut / Director Mode cards) |
| `/studio/quick` (Quick Cut) | ✅ Renders: prompt box, presets, Duration/Quality/Platform/Voice/Language/Tone/Visual Template selectors. No console errors. `nav ≈ 3s` (first compile). Screenshot: `qa-studio-quick.png` |
| `/studio/library` → `/studio/assets` | ⚠️ Shell renders; asset data empty (backing API 500) — **no error state shown** |
| `/admin` (Founder Dashboard) | ⚠️ Nav + headings render; metrics area empty (`bodyLen 342`, backing APIs 500) — **no error state shown** |

---

## 3. API Validation

Authenticated same-origin sweep of key `GET` endpoints (run twice: once on the pre-existing server, once after a clean restart — results identical).

### ✅ Working (HTTP 200)
`/api/profile`, `/api/billing/me`, `/api/usage`, `/api/projects/recent`, `/api/generation/jobs/list`, `/api/generation/jobs/health`, `/api/ai/providers/health`

### 🔴 Failing (HTTP 500, `Content-Type: text/html` — a Next compile error page, not JSON)
`/api/health/providers`, `/api/notion/status`, `/api/youtube/status`, `/api/referral`, `/api/templates`, `/api/library/assets`, `/api/analytics/summary`, `/api/analytics/event`, `/api/admin/dashboard`, `/api/admin/health`, `/api/admin/metrics`, `/api/creator-profile`, `/api/workspace/exports`, `/api/buffer/status`, `/api/director/frameworks`, `/api/mission/profile`, `/api/feedback/summary`, `/api/assets/search`, `/api/notion/sync`, `/api/memory/profile`, `/api/memory/companion-message`, `/api/decision/recommended-next-move`

**Server log for every failing route (identical):**
```
⨯ Module not found: Can't resolve 'C:\Users\pc\...\node_modules\react'
  windows imports are not implemented yet
⨯ Module not found: Can't resolve 'C:\Users\pc\...\node_modules\react-dom'
  windows imports are not implemented yet
GET /api/<route> 500 in ~250ms (next.js: ~8ms, proxy.ts: ~230ms, application-code: ~6ms)
```
The `application-code: ~6ms` proves these fail **at compile/module-resolution time**, not in handler logic. All the affected route files exist and are individually correct — the 404s briefly seen during first-hit are compile-window artifacts that settle into 500s.

> ⚠️ Because the 500 body is **HTML**, any client `fetch().then(r => r.json())` against these endpoints will also throw a JSON parse error in the browser (secondary failure).

---

## 4. Console Errors / Exceptions

- **Client console (rendered pages):** No `console.error`, exceptions, unhandled rejections, or broken images captured on `/studio`, `/studio/quick`, `/studio/assets`, `/admin` (a persistent CDP collector was installed via `Page.addScriptToEvaluateOnNewDocument`).
- **Benign warnings:** `AdSense head tag doesn't support data-nscript attribute` (from `adsbygoogle.js`) on public/landing pages.
- **Under webpack mode only:** `Uncaught TypeError: (0 , _react.cache) is not a function` on every page (see Critical Bug #1).
- **Next.js config warnings (startup):**
  ```
  Unrecognized key(s) in object: 'serverComponentsExternalPackages', 'outputFileTracingIncludes' at "experimental"
  experimental.serverComponentsExternalPackages → moved to serverExternalPackages
  experimental.outputFileTracingIncludes → moved to outputFileTracingIncludes
  ```
  These are Next-14 config keys that Next 16 has relocated (a direct symptom of the version mismatch). The "2 Issues" badge in the dev overlay corresponds to these.

---

## 5. Performance Observations

- First-hit compile latency is high under Turbopack dev (`/studio/director` ~4.5s, `/cinematic/create` ~2.9s, most authenticated pages 1.8–2.4s). This is dev-mode compilation, not production, but the **long tail on first navigation** is notable.
- `/api/profile` steady-state ≈ 650–970ms `application-code` — heavier than expected for a profile read; worth profiling (multiple Supabase round-trips + trial computation).
- A custom `proxy.ts` layer adds ~220–1300ms per request (visible in every timing line). Investigate whether this middleware/proxy is necessary in dev.
- No infinite-rerender or runaway-polling patterns were observed on the pages that rendered.

---

## 6. Security / Auth

- ✅ Auth pages (`/auth/login`, `/login`, `/signin`) **redirect away when already signed in**.
- ✅ Protected app routes (`/dashboard`, `/projects`, `/create`, `/settings`, `/workspace`) issue redirects (to studio equivalents / login).
- ✅ `/api/profile` correctly reports `signed_in` and gates on the Supabase session.
- ⚠️ Not fully exercised in this pass (would require a signed-out context): CSRF posture, expired-JWT handling, and role-based gating of `/admin/*` (the admin pages render their shell for the current FREE user — verify server-side role enforcement on the admin **APIs**, not just UI).

---

## 7. Database Consistency

- The Quick Cut `POST /api/generate-script` endpoint is **stateless** — it does not write to `projects`, `generation_jobs`, `generation_events`, or `scripts`. A failure there leaves **no partial/orphan records** and consumes **no credit** (usage is incremented only on success). ✅
- Broader data-mutation flows (create/rename/duplicate/delete project, generation jobs, automation records) **could not be exercised end-to-end** because their supporting APIs (`/api/creator-profile`, `/api/templates`, `/api/library/assets`, `/api/workspace/exports`, etc.) are currently 500ing. Re-run this section after the environment fix.

---

## 8. Bug Register

### 🔴 CRITICAL

**C1 — Next.js/React version mismatch breaks the entire dev runtime**
- **Symptom:** Turbopack → ~20 API routes 500 (`windows imports are not implemented yet`); webpack → all pages 500 (`_react.cache is not a function`).
- **Root cause:** Installed `next@16.2.9` + aliased `react@18.3.1`, while `package.json` pins `next@14.2.3`. Next 16 needs React 19's `cache()`; Turbopack can't resolve the absolute-Windows-path react alias.
- **Files:** `package.json` (lines ~98/103/105), `next.config.js` (`turbopack.resolveAlias` lines 32–38, `webpack()` alias lines 57–62), the installed `node_modules`.
- **HTTP path:** Compile-time module resolution — routes return HTML 500 before handler code runs.

**C2 — Quick Cut `POST /api/generate-script` returns 502 (provider failure)**
- **Root cause:** `GEMINI_API_KEY` in `.env.local` is malformed (`AQ.Ab8...`; valid AI Studio keys start with `AIza`) → Gemini (primary script provider) 400s; the `hasScriptGenerationKey()` guard only checks key *presence*, so it returns a hard 502 instead of falling back to mock.
- **File / line:** `app/api/generate-script/route.ts` (inner catch → `status: 502`); throw origin `lib/cinematic/quick-cut/run-script-generation.ts:386`; guard `lib/ai/script-generation-keys.ts:5`.
- *(Detailed analysis + instrumentation delivered in the prior task.)*

**C3 — Data pages silently render empty on API 500 (no error UI)**
- **Symptom:** `/admin` and `/studio/assets` render their shells but show blank content when backing APIs 500; no toast, error boundary, or retry affordance.
- **Impact:** Users/founders see a "working" but empty screen — failures are invisible.
- **Files:** `app/(app)/admin/page.tsx`, `app/studio/(shell)/assets/page.tsx` (and siblings) — data-fetch layers lack error/empty-state handling.

### 🟠 HIGH

**H1 — `next.config.js` uses deprecated Next-14 experimental keys** (`serverComponentsExternalPackages`, `outputFileTracingIncludes`) → config warnings under Next 16.
**H2 — `dev`, `dev:no-reload`, `dev:webpack` scripts are identical** (`package.json` lines 9–11) — `dev:webpack` does **not** force webpack, so the documented Windows workaround (AGENTS.md) is a no-op on Next 16.
**H3 — HTML error bodies on JSON API routes** — even independent of C1, API routes should never return an HTML shell; a JSON error contract + error boundary is needed so clients don't get JSON.parse failures.
**H4 — `proxy.ts` overhead** adds up to ~1.3s/request in dev; validate it's required and not double-handling.

### 🟡 MEDIUM

**M1 — First-load compile latency** (several pages 2–4.5s first hit).
**M2 — `/api/profile` steady-state latency** ~0.7–1s application-code.
**M3 — Admin API role enforcement** not verified server-side for a FREE user.
**M4 — AdSense `data-nscript` warning** on landing pages (Script strategy mismatch).
**M5 — Retry/resume logic depends on `lastCompletedStep`** — correct for the script-fail case (verified in prior task), but resuming from `'hook'` will skip hook even if hook never produced usable output (edge case).

### 🟢 LOW

**L1 — `.playwright-mcp/` logs and stray artifacts** untracked in repo root.
**L2 — Dev overlay "2 Issues" badge** = the config warnings (cosmetic once H1 fixed).
**L3 — Mixed route duplication** (`/quick-cut`, `/studio/quick`, `/cinematic/create`, `/studio/create` all resolve) — consider consolidating to reduce surface area.
**L4 — Screenshot/telemetry noise** from `console.warn` on public pages.

---

## 9. Suggested Fixes / Patches (proposals only — not applied)

### Fix C1 (choose ONE track)

**Track A — Realign to the pinned stack (recommended for stability now):**
```bash
# From project root
rm -rf node_modules .next
npm ci            # installs the versions in package-lock (should be Next 14.2.3 / React 18.3.1)
npm run dev       # Next 14 → webpack by default; next.config webpack() alias works on Windows
```
Verify the banner reads `▲ Next.js 14.2.3` (not 16.x). If `npx`/global Next is shadowing, always use `npm run dev` (local bin), never a global `next`.

**Track B — Commit to Next 16 (larger migration):**
1. `package.json`: bump `next` to `^16`, `react`/`react-dom` to `^19` (and `@types/react*`).
2. `next.config.js`: rename `experimental.serverComponentsExternalPackages` → `serverExternalPackages`; move `experimental.outputFileTracingIncludes` → top-level `outputFileTracingIncludes`.
3. Remove the absolute-path `react`/`react-dom` aliases (both `turbopack.resolveAlias` and `webpack()`), or replace with bare specifiers. Absolute Windows paths are what Turbopack rejects.
4. Audit `cookies()`/`headers()` for the async signature (already partially done in a prior session).

**Fix H2 — make the scripts real:**
```jsonc
// package.json (Next 16)
"dev": "next dev --hostname 0.0.0.0 --port 3000",              // Turbopack (default)
"dev:webpack": "next dev --webpack --hostname 0.0.0.0 --port 3000"
// (Next 14) dev:webpack is redundant — webpack is already default.
```

### Fix C2
Set a real key from https://aistudio.google.com/apikey (`AIza…`) in `.env.local`, **or** remove `GEMINI_API_KEY` so a working provider becomes primary. Longer term, make `hasScriptGenerationKey()` health-aware and let the 502 branch fall back to mock in non-production. (Instrumentation + fail-fast retry changes were delivered in the prior task.)

### Fix C3 / H3 — error boundaries + JSON error contract
- Add `error.tsx` boundaries under `app/(app)/admin/` and `app/studio/(shell)/` so failed server fetches render a visible error + retry, not a blank shell.
- Ensure API routes always `return NextResponse.json({error}, {status})` and never fall through to the HTML error page (this is automatic once C1 is fixed, since the handlers do run).

---

## 10. Likely Root Cause & Recommended Refactor

**Master root cause:** the checked-out `node_modules` (Next 16.2.9 / React 18.3.1 via forced alias) does not match `package.json` (Next 14.2.3 / React 18.3.1). The `next.config.js` react/react-dom **absolute-Windows-path aliases** — originally added to force a single React instance for `@react-three/fiber` — are incompatible with Turbopack on Windows and are the proximate trigger for the API 500s.

**Recommended refactor:**
1. **Pin and lock the toolchain.** Decide Next 14 *or* Next 16 and align `package.json` + lockfile; add an `engines`/preinstall check that fails if the resolved `next` version differs from the pinned one.
2. **Kill the absolute-path react alias.** Rely on npm/pnpm dedupe (or `overrides`) for a single React copy instead of Windows-absolute `resolveAlias`, which is bundler- and OS-fragile.
3. **Standardize the API error envelope.** A thin wrapper (`withApiHandler`) that guarantees JSON `{ error, kind }` responses + structured logging across all `app/api/**` routes.
4. **Add route-group error boundaries** for `admin` and `studio` so data-fetch failures are user-visible.
5. **CI guard:** a lightweight authenticated smoke test that sweeps the top ~25 API routes and fails on any non-2xx (this audit's sweep, productized) would have caught C1 immediately.

---

## 11. Coverage & Stop Conditions

- **Routes discovered:** 99 page routes + dozens of API routes (enumerated in §2/§3).
- **Reachable pages visited/swept:** all page routes (HTTP), 4 rendered & visually inspected in depth.
- **APIs exercised:** 25+ GET endpoints across all major groups.
- **Console/network/exceptions:** captured via persistent CDP collectors on rendered pages.
- **Not completed (blocked by C1):** exhaustive per-button/form/modal interaction and full Quick Cut generation-to-export, because the supporting APIs are 500ing. **These should be re-run after the environment fix** — this report should be treated as *Phase 1 (environment + API + route health)*; Phase 2 (interaction + workflow depth) is gated on C1.

**Bottom line:** fix **C1 (version mismatch)** first. It is responsible for the API 500s, the webpack meltdown, the config warnings, and (indirectly) the empty data screens. Then fix **C2** to restore Quick Cut, and **C3/H3** to make failures visible. After that, re-run the interaction-level audit.
