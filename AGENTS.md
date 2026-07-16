# AGENTS.md

Guidance for AI agents working in this repository.

## Cursor Cloud specific instructions

### Product overview

**Mugtee AI Studio** is a single Next.js 14 full-stack app (App Router). There is no separate backend service, docker-compose, or Makefile. All UI and API routes live in this repo.

### Dev server (Linux)

On Linux, use **`npm run dev:no-reload`** (or `npm run dev:webpack`). Do **not** use `npm run dev` — that script uses Windows `set` syntax and fails on Linux.

The app listens on **`http://localhost:3000`** (`0.0.0.0:3000`).

Run long-lived dev servers in **tmux** (see cloud agent shell rules), not as one-shot background jobs.

### Environment variables

Copy `.env.example` → `.env.local` before first run (not in the VM update script):

```bash
cp .env.example .env.local
```

Recommended local defaults (already in `.env.example`):

- `FREE_TIER_ONLY=true` — blocks paid AI providers; mocks when keys are missing
- `VIDEO_RENDER_MOCK=true` — stub MP4 export without FFmpeg/Chromium
- `NEXT_PUBLIC_BASE_URL=http://localhost:3000`

**Supabase** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) is required for auth, project save/load, and full authenticated flows. **`npm run build` fails** on some API routes (e.g. YouTube OAuth) if Supabase keys are unset during static generation.

**`GEMINI_API_KEY`** enables live script generation; without it, use mock endpoints (below).

### Lint, typecheck, tests

| Command | Purpose |
|---------|---------|
| `npm run lint` | ESLint via Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npx tsx --test lib/input-understanding/__tests__/intent-extraction.test.ts lib/narrative/__tests__/narrative-frameworks.test.ts` | Unit tests (no `npm test` script) |

### Verifying the app without Supabase

Public routes work without auth: `/`, `/pricing`, `/blog`, `/contact`, `/api/*`.

**Core hello-world (mock AI pipeline):**

```bash
curl -s -X POST http://localhost:3000/api/generate-script \
  -H 'Content-Type: application/json' \
  -d '{"topic":"viral psychology short","mock":true,"platform":"shorts","duration":60}'
```

Returns `mock: true` with a full script payload — no sign-in or API keys required.

Protected app routes (`/create`, `/studio`, `/dashboard`, etc.) redirect to `/auth/login` without a Supabase session.

### External services (hosted, not local)

- **Supabase** — Postgres, auth, storage; apply SQL from `supabase/migrations/` in the Supabase SQL editor
- Optional: Gemini, Together AI, Razorpay, Notion, Buffer, etc. (see `.env.example`)

There is no local Supabase CLI or Docker setup in this repo.
