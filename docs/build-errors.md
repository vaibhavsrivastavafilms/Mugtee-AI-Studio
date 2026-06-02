# Build errors log

## Initial `npm run build` failure (blocking)

| File | Line | Error | Severity | Root cause |
|------|------|-------|----------|------------|
| app/(app)/admin/feedback/page.tsx | 111 | TS2339: Property value on EventTarget and HTMLSelectElement | error | Symptom of missing DOM lib in the TS program |
| Full `tsc --noEmit` | many | ~809 DOM-related errors | error | Same root cause |

## Root cause (program-wide)

`tsconfig.json` `include` matched `**/*.js`, which pulled in `public/ffmpeg/ffmpeg-class-worker.js`. That file uses `no-default-lib` and `lib webworker`, which removed default DOM libs from the whole program. React empty DOM stubs in `@types/react/global.d.ts` then masked real DOM APIs.

## Fixes applied

1. **tsconfig.json** — exclude `public`, `next.config.js`, `postcss.config.js`, `tailwind.config.js`.
2. **lib/export/timeline-frame-renderer.client.ts** — canvas 2D context typing for OffscreenCanvas.

## Remaining warning (non-blocking)

@react-three/fiber: `unstable_act` not exported from `react` (webpack warning only).

## Final status

- `npm run build`: PASS
- `npx tsc --noEmit`: 0 errors
- `npm run lint`: PASS
