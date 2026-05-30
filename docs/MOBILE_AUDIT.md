# Mobile audit — Phase 3 (minimal fixes)

**Scope:** Quick CSS / layout pass only — no redesign, no backend changes.

## Areas reviewed

| Surface                  | Issue                                   | Fix applied                                                                     |
| ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------- |
| `live-generation-canvas` | Horizontal overflow on narrow viewports | `min-w-0 w-full overflow-x-hidden` on content column                            |
| `quick-cut-studio`       | Footer overlap                          | Already uses `min-w-0` + `GENERATION_FOOTER_CLEARANCE`                          |
| `create-entry`           | Mode grid overflow                      | `min-w-0 overflow-x-hidden` on mode grid                                        |
| `download-panel`         | Small tap targets, row overflow         | `min-h-[44px]`, `touch-manipulation`, `min-w-0 overflow-x-hidden` on panel root |
| `quick-cut-create-entry` | Edge bleed                              | Existing `min-w-0 overflow-x-hidden` on wrapper                                 |

## Recommended follow-ups (not in Phase 3)

- Test Quick Cut generation footer on 360px-wide devices (Samsung A series).
- Verify safe-area insets on notched Android WebView (`viewport-fit: cover` in root layout).
- Run Lighthouse PWA audit on production after deploy.
- Capture Play Store screenshots on a 1080×2400 device profile (see `docs/play-store/SCREENSHOTS_CHECKLIST.md`).

## PWA / install

- Manifest: `public/manifest.json` + dynamic `app/manifest.json/route.ts`
- Install banner: `components/pwa/install-mugtee-banner.tsx`
- Offline: `app/offline/page.tsx` + `app/sw.js/route.ts`
