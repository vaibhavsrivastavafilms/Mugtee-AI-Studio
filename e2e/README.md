# Quick Cut Template E2E — Auth Setup

Full pipeline tests require a signed-in Supabase session.

## CI smoke (pull requests)

Workflow: `.github/workflows/quick-cut-smoke.yml`

Local run (server must be up on port 3000):

```bash
npm run test:ci:quick-cut-smoke
```

Required env (also set as GitHub Actions secrets):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CI_E2E_EMAIL` / `CI_E2E_PASSWORD` (dedicated CI test user)

Optional image provider keys (`GEMINI_API_KEY`, etc.) — without them the smoke test uses placeholder stills but still validates persistence + export.

## One-time setup

Choose **one** auth method:

### A — Google sign-in (recommended)

1. Start dev server: `npm run dev`
2. Run:

   ```bash
   npm run test:e2e:auth-interactive
   ```

3. Sign in with Google when the browser opens.
4. Wait until the terminal prints `[AUTH_VERIFY] PASS`.

### B — Email/password (requires Supabase email provider)

Add to `.env.local`:

```bash
E2E_EMAIL=your-test@example.com
E2E_PASSWORD=your-secure-password
SUPABASE_SERVICE_ROLE_KEY=...   # optional: auto-create/confirm test user
```

Playwright global setup creates `e2e/.auth/user.json` on first `npm run test:e2e:mp4-proof`.

### C — Existing storage file

```bash
set E2E_STORAGE_STATE=C:\path\to\storage.json
npm run test:e2e:mp4-proof
```

## Execute mode (full MP4 proof)

```bash
npm run test:execute
```

Report: `docs/FINAL_EXECUTE_REPORT.json`

**Auth (pick one):**

1. **Capture browser session (fastest if already signed in)**  
   Sign in at `/studio/quick`, then open:  
   `http://localhost:3000/api/dev/capture-session`  
   Then run `npm run test:execute`.

2. **Service role + E2E user** — add to `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=...
   E2E_EMAIL=mugtee.execute@mugtee.dev
   E2E_PASSWORD=MugteeExecute!2026
   ```
   Bootstrap: `POST /api/dev/bootstrap-e2e-session`

3. **Interactive Google sign-in**
   ```bash
   npm run test:e2e:auth-interactive
   ```

## MP4 proof run

```bash
npm run test:e2e:mp4-proof
```

Report: `docs/E2E_MP4_PROOF_REPORT.json` (~15–25 min)

## Full template validation

```bash
npm run test:e2e:static   # no auth — static + API preflight
npm run test:e2e            # full pipeline (3 templates, ~30–45 min)
```

## Alternative

Set `E2E_STORAGE_STATE=/path/to/storage.json` if you already have a Playwright storage file.

Report: `docs/TEMPLATE_E2E_REPORT.md`
