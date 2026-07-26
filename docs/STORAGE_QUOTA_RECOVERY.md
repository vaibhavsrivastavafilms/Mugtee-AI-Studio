# Supabase Storage Quota Recovery — Mugtee

## Current incident (dashboard)

| Metric | Value |
|--------|--------|
| Plan | Free |
| Storage | **~2.004 GB / 1 GB (200%)** |
| Database | ~0.084 GB / 0.5 GB (OK) |
| Restriction | `exceed_storage_size_quota` → HTTP **402** on Auth + Storage API |
| Impact | Google OAuth / Auth / SDK deletes blocked |

**Root cause:** Storage Fair Use restriction — not application auth code.

---

## Safe vs never-delete

### Safe to delete (regenerable)

- `reels` — final MP4s / thumbnails  
- `project-assets` — generated images, voice, storyboard frames  
- `media` — uploads / previews  
- `storyboards`, `exports`, `renders`, `temporary`, `cache`, `thumbnails`, `generated-images`

### Never delete

- `auth.users`, profiles, projects, subscriptions, payments  
- Creative history tables, migration history  
- Do **not** `drop` buckets — only delete `storage.objects` rows

---

## Important: SQL DELETE is blocked on hosted Supabase

Hosted projects enforce:

1. `storage.protect_delete` — no direct `DELETE FROM storage.objects`
2. SQL Editor is **not** owner of `storage.objects` — cannot `DISABLE TRIGGER`

So scripts `08` / `09` / `10` **cannot** empty Storage from SQL Editor.

### Working recovery paths

#### A) Dashboard UI (works while restricted — try this first)

1. Supabase → **Storage**
2. Open `reels`, `project-assets`, `media` (and any large buckets)
3. Select all files/folders → **Delete**
4. Repeat until Usage Storage **&lt; 1 GB**

#### B) Temporary plan upgrade → API purge

1. Upgrade Free → Pro (or remove spend caps) until services unlock  
2. Confirm `listBuckets` works (no 402)  
3. From repo root:

```bash
npm run storage:purge-all
```

#### C) SQL — inventory only (still useful)

Run `01`–`07` in SQL Editor for reports. Do **not** expect `DELETE` to succeed.

---

## Post-cleanup checklist

1. Usage → Storage **&lt; 1 GB**  
2. Wait 2–10 minutes for restriction to clear  
3. `GET {SUPABASE_URL}/auth/v1/health` → **200**  
4. `/auth/login` → Google OAuth (not unavailable page)  
5. Storage listBuckets → **200**  
6. Optional: `npm run storage:audit` / `npm run storage:recover` (API path)  
7. Smoke: upload + reel export  

---

## Long-term (implemented in app)

| Threshold | Behaviour |
|-----------|-----------|
| 80% | Warn (dev log / `/api/storage/quota`) |
| 90% | Suggest auto-clean of temp assets |
| 95% | **Pause new Remotion renders** (`assertStorageAllowsRenders`) |
| 100% / 402 | Preserve Auth UX; SQL recovery required |

Retention rules: `lib/storage/retention-policy.ts`  
Cleanup runner: `lib/storage/retention-cleanup.server.ts`  
Quota probe: `GET /api/storage/quota`  

---

## Risk assessment

| Action | Risk |
|--------|------|
| Delete regenerable bucket objects | **Low** — assets regenerable |
| Delete `project_assets` soft-deleted rows | **Low** — already marked deleted |
| `delete from storage.objects` (all) | **Medium** — wipes all files; use only if still over quota |
| Touch auth/profiles/projects | **Forbidden** |

---

## After recovery — prevent recurrence

1. Prefer short retention on `reels` / temp paths (7–30 days)  
2. Run scheduled `GET /api/storage/quota?cleanup=1` (cron / Vercel) when unblocked  
3. Upgrade plan if sustained usage &gt; 1 GB is required  
4. Future buckets: see `TARGET_BUCKET_ARCHITECTURE` in retention policy  
