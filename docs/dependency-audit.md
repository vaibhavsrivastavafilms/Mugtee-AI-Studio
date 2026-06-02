# Dependency compatibility audit

Generated: 2026-06-03

## Core stack

| Package | Installed | Notes |
|---------|-----------|-------|
| next | 14.2.3 | App Router |
| react | 18.3.1 | Matches ^18 |
| react-dom | 18.3.1 | Paired with react |
| typescript | 5.4.5 | tsc clean after tsconfig exclude |

## React Three Fiber

| Package | Version | Compatibility |
|---------|---------|---------------|
| @react-three/fiber | 8.17.14 | react ^18 |
| @react-three/drei | 9.117.3 | R3F 8.x |

Webpack warning: unstable_act not exported from react (R3F 8.x vs React 18.3). Build still passes.

## State / backend

zustand 5.0.13 at app root; Supabase clients typecheck clean after DOM fix.

## Recommendation

Do not include public/ffmpeg worker JS in TypeScript program. Keep react and react-dom on the same 18.3.x line.
