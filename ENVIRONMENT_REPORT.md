# Mugtee AI Studio — ENVIRONMENT GATE REPORT

**Date:** 2026-07-02 (UTC) / 2026-07-03 (IST)
**Host:** Windows (win32 10.0.26200), PowerShell
**Gate result:** 🔴 **BLOCKED — functional QA cannot proceed.**
**Route failure rate:** **100%** (20/20 sampled API routes returned HTTP 500) — far above the 10% blocking threshold.

> Per the Environment Gate / Blocking Rule, functional regression testing is **halted**. No application-level bugs are being reported, because the environment cannot produce trustworthy results.

---

## 1. Verdict

The application dependency tree is **inconsistent**: the physically installed **Next.js is 16.2.9**, but `package.json` **and** `package-lock.json` both pin **Next.js 14.2.3**. Next 16 runs **Turbopack by default**, and Turbopack cannot resolve the **absolute Windows path** `react` / `react-dom` aliases declared in `next.config.js`. This produces `Module not found … windows imports are not implemented yet` at **compile time** for any route whose chunk is (re)compiled — which, combined with an aggressive 10-second on-demand entry eviction, means routes intermittently and then persistently return **HTTP 500**.

This is the same **C1** issue from the prior audit; it was **never repaired**. The server currently on port 3000 is the original Turbopack dev process — no reinstall or version change occurred.

---

## 2. Dependency Versions — Expected vs Installed

| Package | `package.json` (expected) | `package-lock.json` | Installed in `node_modules` |
|---|---|---|---|
| `next` | **14.2.3** | 14.2.3 | 🔴 **16.2.9** |
| `react` | 18.3.1 | 18.3.1 | 18.3.1 (via `overrides`) |
| `react-dom` | 18.3.1 | 18.3.1 | 18.3.1 (via `overrides`) |

**`npm ls` output (lockfile/install inconsistency — `ELSPROBLEMS`):**
```
nextjs-mongo-template@0.1.0  C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio
+-- next@16.2.9 invalid: "14.2.3" from the root project
+-- react-dom@18.3.1 overridden
`-- react@18.3.1 overridden

npm error code ELSPROBLEMS
npm error invalid: next@16.2.9 C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\node_modules\next
```

**Runtime confirmation:**
- `npx next --version` → `Next.js v16.2.9`
- Dev banner → `▲ Next.js 16.2.9 (Turbopack)`
- `require('next/package.json').version` → `16.2.9`

**Lockfile consistency:** ❌ The lockfile describes Next **14.2.3** but disk contains **16.2.9** — node_modules is out of sync with `package-lock.json` (a manual/partial `npm install next@16` almost certainly bypassed the lockfile).

---

## 3. Root Cause

1. **Version mismatch / lockfile drift.** `node_modules/next@16.2.9` ≠ pinned `14.2.3`. Next 16 changes the default bundler to **Turbopack** and requires **React 19** semantics (e.g. `React.cache`), neither of which this repo targets.
2. **Invalid alias for Turbopack.** `next.config.js` aliases `react`/`react-dom` to **absolute Windows paths** derived from `require.resolve(...)`. Turbopack rejects absolute-Windows-path imports:
   ```
   ⨯ Module not found: Can't resolve 'C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\node_modules\react'
   windows imports are not implemented yet
   ⨯ Module not found: Can't resolve 'C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\node_modules\react-dom'
   windows imports are not implemented yet
   GET /api/<route> 500 in ~240ms (next.js: ~10ms, proxy.ts: ~225ms, application-code: ~6ms)
   ```
   `application-code: ~6ms` proves the failure is **compile/module-resolution**, not handler logic.
3. **Aggressive recompilation.** `next.config.js` → `onDemandEntries.maxInactiveAge: 10000` (10s) evicts compiled entries after 10s idle. Each re-hit forces a **recompile**, which re-triggers the broken alias → routes flip **200 → 500**.
4. **Webpack is not a viable fallback under Next 16 + React 18.** Starting with `next dev --webpack` makes the alias resolve, but every page then throws:
   ```
   ⨯ TypeError: (0 , _react.cache) is not a function
       at resolve-metadata.ts:707  (page: '/', '/studio', …)
   ```
   Next 16’s metadata layer calls React 19’s `cache()`, absent in the aliased React 18.3.1 → **all pages 500**.

**Net:** neither bundler mode yields a healthy app until dependencies are realigned.

---

## 4. Warm-up Validation (as mandated)

Protocol: compile a 20-route API sample, wait 30s, revisit.

| Metric | Result |
|---|---|
| Routes sampled | 20 |
| HTTP 200 after warm-up + 30s | **0** |
| HTTP 500 after warm-up + 30s | **20** |
| **Failure rate** | **100%** |
| Observed 200→500 transitions (earlier passes) | `/api/templates`, `/api/creator-profile`, `/api/library/assets`, `/api/notion/status`, `/api/memory/profile`, `/api/analytics/summary` (and later even `/api/profile`, `/api/usage`, `/api/billing/me`, `/api/generation/jobs/list`) |

Two independent sweeps ~60s apart returned **opposite results** for the same routes (200 then 500), and a mass sweep drove **all** routes — including previously-stable ones — to 500. This is the exact “200 → 500 after recompilation” infrastructure blocker described in the gate.

---

## 5. Responsible Files

| File | Issue |
|---|---|
| `package.json` (`next: 14.2.3`, lines ~98/103/105) | Pins Next 14 while Next 16 is installed |
| `package-lock.json` | Describes Next 14.2.3; out of sync with installed 16.2.9 |
| `node_modules/next` | Physically 16.2.9 (invalid vs root pin) |
| `next.config.js` lines 32–38 (`turbopack.resolveAlias`) | Absolute Windows react/react-dom paths → Turbopack `windows imports are not implemented yet` |
| `next.config.js` lines 57–62 (`webpack()` alias) | Forces React 18.3.1 → `_react.cache is not a function` under Next 16 |
| `next.config.js` lines 75–78 (`onDemandEntries.maxInactiveAge: 10000`) | 10s eviction → constant recompiles → intermittent 500s |
| `next.config.js` lines 13–29 (`experimental.serverComponentsExternalPackages`, `experimental.outputFileTracingIncludes`) | Deprecated keys under Next 16 (startup warnings) |

---

## 6. Stack Traces / Compilation Errors (captured)

**Turbopack (current default):**
```
⨯ Module not found: Can't resolve 'C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\node_modules\react'
  windows imports are not implemented yet
⨯ Module not found: Can't resolve 'C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio\node_modules\react-dom'
  windows imports are not implemented yet
 GET /api/generation/jobs/gen_4de33732744d4068a9ef 500 in 230ms (next.js: 11ms, proxy.ts: 212ms, application-code: 6ms)
```

**Webpack (`next dev --webpack`):**
```
⨯ TypeError: (0 , _react.cache) is not a function
    at eval (..\..\..\src\lib\metadata\resolve-metadata.ts:707:30)
    at __webpack_exec__ (.next\dev\server\app\page.js:966:39)
  page: '/'
 GET / 500 in 14.3s
```

**Config warnings (startup, both modes):**
```
⚠ Unrecognized key(s) in object: 'serverComponentsExternalPackages', 'outputFileTracingIncludes' at "experimental"
⚠ experimental.serverComponentsExternalPackages → moved to serverExternalPackages
⚠ experimental.outputFileTracingIncludes → moved to outputFileTracingIncludes
```

---

## 7. Why Application QA Cannot Produce Trustworthy Results

- **Non-deterministic 500s.** Any route can be 200 on one request and 500 seconds later after recompilation. A pass/fail can’t be attributed to application code.
- **Multi-step workflows are impossible to validate.** Quick Cut (hook → script → … → export), project CRUD, and the automation engine each span many API calls over time; the 10s eviction guarantees some calls hit a cold recompile → 500. Failures would be environment artifacts, not product defects.
- **False negatives and false positives.** Real bugs would be masked by compile 500s; environment 500s would be mis-filed as product bugs. Either way the report is untrustworthy.
- **Client-side breakage.** The 500 bodies are HTML; any `res.json()` call against them throws, injecting spurious console/runtime errors unrelated to the code under test.

---

## 8. Recommended Fixes & Repair Commands

### Option A — Restore the pinned stack (recommended; matches repo intent)
Realigns `node_modules` to the committed lockfile (Next 14.2.3, webpack default — where the absolute-path alias works on Windows).
```bash
# from C:\Users\pc\Documents\GitHub\Mugtee-AI-Studio
rmdir /s /q node_modules       # PowerShell: Remove-Item -Recurse -Force node_modules
rmdir /s /q .next              # PowerShell: Remove-Item -Recurse -Force .next
npm ci                         # installs EXACTLY the lockfile (next@14.2.3)
npm run dev                    # verify banner reads: ▲ Next.js 14.2.3  (NOT 16.x)
```
Then re-run warm-up validation; expect 200s to persist after 30s.

### Option B — Commit to Next 16 (larger migration)
```bash
npm install next@16 react@19 react-dom@19 @types/react@19 @types/react-dom@19
```
Then edit `next.config.js`:
- Rename `experimental.serverComponentsExternalPackages` → top-level `serverExternalPackages`.
- Move `experimental.outputFileTracingIncludes` → top-level `outputFileTracingIncludes`.
- **Remove the absolute-path react/react-dom aliases** in both `turbopack.resolveAlias` and `webpack()` (rely on npm dedupe / `overrides` for a single React instance). Absolute Windows paths are what Turbopack rejects.
- Audit `cookies()` / `headers()` for the async (awaited) signature.

### Regardless of option
- Make the dev scripts honest: `dev:webpack` should pass `--webpack` (Next 16) or be removed (Next 14, webpack is default). Currently `dev`, `dev:no-reload`, `dev:webpack` are identical.
- Consider raising `onDemandEntries.maxInactiveAge` in dev (e.g. 60s) to reduce recompile churn.
- Add a preinstall/`engines` guard or a CI step that fails when installed `next` ≠ pinned `next`, so this drift is caught automatically.

---

## 9. Resume Criteria (before functional QA restarts)

Per the gate, resume only when **all** hold:
- [ ] `npm ls next react react-dom` reports no `invalid`/`ELSPROBLEMS`.
- [ ] Dev banner version matches `package.json`.
- [ ] Every sampled API route compiles and returns non-5xx.
- [ ] Warm-up validation passes: routes 200 → wait 30s → still 200 (no 200→500 regression).
- [ ] No `Module not found` / `windows imports are not implemented yet` / `_react.cache is not a function` in the server log.

**Recommendation:** apply **Option A** (`npm ci`) first — it is the smallest, most predictable change and matches the committed lockfile. Then re-invoke the Phase 2 regression audit.
