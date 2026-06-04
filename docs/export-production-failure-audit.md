# Production Export Failure — Deep Audit

**Date:** 2026-06-04  
**Production:** https://mugtee.in  
**Scope:** POST `/api/reels/export`, Compile MP4 client path, React/R3F build, hydration

---

## Compatibility matrix (Phase 1)

| Package | Locked / resolved | Peer / notes | Verdict |
|---------|-------------------|--------------|---------|
| `react` | **18.3.1** (pinned + npm overrides) | Next 14.2.3 expects React 18 | OK |
| `react-dom` | **18.3.1** | Must match `react` | OK |
| `@react-three/fiber` | **8.17.14** | `react` ^16.8 \|\| ^17 \|\| ^18 | OK for React 18 |
| `@react-three/drei` | **9.117.3** | `@react-three/fiber` >=8, `react` ^18 | OK |
| `three` | **0.170.0** | R3F 8.x | OK |
| `@react-three/fiber` **9.x** | — | Requires React 19 | **Do not upgrade** on Next 14 |
| Remotion 4.0.469+ | — | Server-only export | Independent of R3F |

**Build note:** Webpack may warn `unstable_act` is not exported from `react` (R3F 8 + React 18.3). Warning-only; build completes. Upgrading to R3F 9 requires React 19 + Next 15+.

**Files:** `package.json` L91–93, L63–64; `package-lock.json` `node_modules/react` 18.3.1

---

## Phase 2 — React error #425 (hydration)

**Symptom:** Text/content mismatch between SSR HTML and client render.

**Export-path component:** `PreviewExportTabbedPanel` initialized `subTab` from store-driven `generationStep` / `isRenderingVideo` on first render, which can differ after hydration when session store rehydrates from `localStorage`.

**Fix:** Mount gate — default `subTab` to `'preview'`, set export tab only after `mounted === true` in `useEffect`.

| File | Line | Change |
|------|------|--------|
| `components/quick-cut/preview-export-tabbed-panel.tsx` | 62–78 | `mounted` + deferred tab selection |

**Related:** `QuickCutStudio` already uses `dynamic(..., { ssr: false })` for `PreviewExportTabbedPanel` (`components/quick-cut/quick-cut-studio.tsx` L34–39). `MugteeAvatar` uses `dynamic` + `mounted` for WebGL (`components/avatar/mugtee-avatar.tsx` L70–76).

---

## Phase 3 — "I is not a function" (client)

**Likely cause:** Dynamic import of `@/lib/reels/export-poll.client` returned a module without `pollReelExportJob` (chunk load / HMR edge), then `capReelExportProgress(...)` or `pollReelExportJob(...)` threw in minified bundle as `i is not a function`.

**Trace — Compile MP4 → handler:**

```
ExportTabbedPanel.handleDownloadMp4 (export-tabbed-panel.tsx ~223)
  → resolveMp4Download (resolve-mp4-download.client.ts ~80)
    → compileProjectMp4 (compile-project-mp4.client.ts ~123)
      → requestReelExport POST /api/reels/export
      → pollReelExportJob (export-poll.client.ts ~207)  [guarded]
```

Alternate path: `QuickCutGenerationStore.retryVideoRender` → `pollRenderJob` (`stores/quick-cut-generation-store.ts` ~1624, ~4095).

| File | Function | Line |
|------|----------|------|
| `components/quick-cut/export-tabbed-panel.tsx` | `handleDownloadMp4` | 223 |
| `lib/quick-cut/resolve-mp4-download.client.ts` | `compileAndDownload` | 53–60 |
| `lib/quick-cut/compile-project-mp4.client.ts` | `compileProjectMp4Inner` | 64–120 |
| `lib/reels/export-poll.client.ts` | `pollReelExportJob` | 207 |
| `stores/quick-cut-generation-store.ts` | `pollRenderJob` | 1624 |

**Fix:** Runtime `typeof pollReelExportJob === 'function'` checks in `compile-project-mp4.client.ts` and `pollRenderJob`.

**Secondary:** Replaced `toast[method](...)` bracket calls in `use-unified-export-actions.client.ts` with explicit `toast.success` / `toast.error` (minifier-safe).

---

## Phase 4 — Export button audit

| Component | onClick | Verdict |
|-----------|---------|---------|
| `ExportTabbedPanel` Compile MP4 | `() => void handleDownloadMp4()` | Function |
| `ProjectMp4Button` | `() => void handleClick(e)` | Function |
| `QuickCutPlayerMp4Download` | `() => void handleClick()` | Function |
| `UnifiedExportMenu` MP4 item | `() => void handleDownloadMp4()` | Function |
| `publish-center` Compile MP4 | `() => void handleCompileMp4()` | Function (delegates to `retryVideoRender`) |

No object/promise/undefined passed as onClick handler in primary MP4 CTAs.

---

## Phase 5 — POST `/api/reels/export` 500

**Fixes:**

1. Structured `console.error('[EXPORT_FATAL]', { projectId, userId, message, stack })` in catch.
2. JSON body on **500** includes `stack` (truncated 4k) for Vercel log correlation.
3. Validation/asset errors remain **400** with `stage`.

| File | Line |
|------|------|
| `app/api/reels/export/route.ts` | catch block ~175–220 |

---

## Phase 6 — Pre-export network logs

Before `queueReelExportForProject`, route logs `logExportAssetCounts` with `sceneCount` and per-scene `imageAssetPaths` (grep: `[export] pre-export asset counts`).

| File | Line |
|------|------|
| `app/api/reels/export/route.ts` | pre-queue `logExportAssetCounts` |
| `lib/export/export-readiness.server.ts` | `logExportAssetCounts` L134–158 |
| `lib/reels/export-api.ts` | `queueReelExportForProject` L307–315 |

---

## Phase 7 — `render-reel.server.ts` imageAssetPath

When `imageUrl` is empty, server refreshes signed URL from `resolveSceneExportAssetPath` → `refreshStoryboardUrl`.

| File | Line |
|------|------|
| `lib/remotion/render-reel.server.ts` | 114–121 |
| `lib/reels/export-scenes.server.ts` | 9–17 (`resolveSceneExportAssetPath` on queue) |

---

## Root causes (summary 1–4)

1. **Server 500 on export** — Uncaught queue/render errors without `[EXPORT_FATAL]` correlation; asset validation sometimes surfaced as 500 before prior 400 mapping. Mitigated: fatal logging, stack on 500, pre-export scene/path logs.
2. **React #425** — `PreviewExportTabbedPanel` tab state derived from Zustand before mount. Fixed with client-only tab selection after mount.
3. **"I is not a function"** — Calling `pollReelExportJob` / `capReelExportProgress` when dynamic import failed. Fixed with runtime guards + clearer error copy.
4. **R3F / React** — Stay on **fiber 8.17.14 + React 18.3.1**; do not move to fiber 9 without React 19. `unstable_act` warning is non-fatal.

**Operational (not code):** `VIDEO_RENDER_ENABLED=true` on Vercel; durable `imageAssetPath` on Quick Cut save; backfill for legacy projects.

---

## Test steps

1. `npm install && npx tsc --noEmit && npm run build`
2. Sign in on mugtee.in → Quick Cut project with storyboard + voice.
3. DevTools → Network: `POST /api/reels/export` → 200 with `jobId` or 400 with `missingAssets` (not opaque 500).
4. Vercel logs: grep `[EXPORT_FATAL]` and `[export] pre-export asset counts`.
5. Export tab → **Compile MP4** → poll completes → download; no `i is not a function` in console.
6. Hard refresh export tab — no React #425 on Preview/Export tabs.

---

## Prior audit

See also `docs/export-pipeline-root-cause-audit.md` for storyboard persistence and `export_jobs` migration.
