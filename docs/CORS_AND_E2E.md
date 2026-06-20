# CORS Fix and Quick-Cut End-to-End Test

## Overview
This update covers two improvements:

1. A consistent CORS policy for all `/api/*` routes.
2. An end-to-end Playwright test for the Quick Cut workflow.

## What changed

- Added `middleware.ts` at the repository root to apply CORS headers to all requests matching `/api/:path*`.
- Updated `app/api/[[...path]]/route.js` to resolve request origins dynamically and avoid invalid `*` + `Access-Control-Allow-Credentials: true` combinations.
- Added a Playwright E2E test at `e2e/quick-cut-flow.spec.ts`.
- Updated `playwright.config.ts` to use `baseURL` and start the local dev server automatically.
- Updated `package.json` so `npm run test:e2e` now runs the new quick-cut E2E spec.

## CORS details

The root middleware now ensures the following headers are returned for API routes:

- `Access-Control-Allow-Origin`
- `Vary: Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Expose-Headers`
- `Access-Control-Allow-Credentials` when a specific origin is allowed

### Environment configuration

Set `CORS_ORIGINS` as a comma-separated list of allowed origins, for example:

```env
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

If `CORS_ORIGINS` is not set, the middleware defaults to allowing all origins for development.

## Running the E2E test

From the repository root:

```bash
npm run test:e2e
```

This command will:

- launch `npm run dev`
- wait for `http://localhost:3000`
- run `e2e/quick-cut-flow.spec.ts`

## Notes

- The Quick Cut test verifies that the `/studio/quick` experience loads and that the guest workflow reaches the sign-in prompt after submitting a valid prompt.
- The test also validates CORS preflight behavior for the Quick Cut API endpoint.
