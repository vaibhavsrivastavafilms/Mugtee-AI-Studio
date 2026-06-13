# Quick Cut Template E2E — Auth Setup

Full pipeline tests require a signed-in Supabase session.

## One-time setup

1. Start dev server: `npm run dev`
2. Run:

   ```bash
   npx playwright codegen http://localhost:3000/studio/quick --save-storage=e2e/.auth/user.json
   ```

3. Sign in when the browser opens, confirm `/studio/quick` loads with the **Visual Template** cards.
4. Close codegen — `e2e/.auth/user.json` is created (gitignored).

## Run validation

```bash
npm run test:e2e:static   # no auth — static + API preflight
npm run test:e2e            # full pipeline (3 templates, ~30–45 min)
```

## Alternative

Set `E2E_STORAGE_STATE=/path/to/storage.json` if you already have a Playwright storage file.

Report: `docs/TEMPLATE_E2E_REPORT.md`
