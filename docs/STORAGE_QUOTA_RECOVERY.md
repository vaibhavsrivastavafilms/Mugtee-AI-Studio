# Mugtee Storage Recovery — Architect Pack

## Incident

| Metric | Value |
|--------|--------|
| Plan | Free |
| Storage | **~2.004 GB / 1 GB (200%)** |
| Database | ~0.084 GB / 0.5 GB (OK) |
| Violation | `exceed_storage_size_quota` |
| Symptoms | Auth **402**, Google OAuth blocked, Storage API **402**, uploads/renders paused |

**Root cause:** Free-plan Storage Fair Use — not application auth code.  
**Constraint:** Do **not** modify authentication. Do **not** drop database tables. Reclaim regenerable Storage objects only.

---

## Critical platform note (read before SQL DELETE)

On hosted Supabase:

1. `storage.protect_delete` blocks `DELETE FROM storage.objects`
2. SQL Editor is usually **not** table owner → cannot `DISABLE TRIGGER`

So Steps 4–5 SQL are provided for completeness / self-hosted / support, but **live recovery is**:

| Path | When |
|------|------|
| **A. Dashboard Storage UI** | Works while restricted — **use first** |
| **B. Temporary upgrade → API** | `npm run storage:fresh-start` |
| **C. SQL inventory only** | `00_FULL_AUDIT_REPORT.sql` always works for reports |

---

## STEP 1 — Audit Storage

Run in SQL Editor:

`scripts/storage/sql/00_FULL_AUDIT_REPORT.sql`

Produces:

- Totals vs 1 GB quota  
- Largest buckets + empty buckets  
- Largest / oldest files  
- Category breakdown (temp, storyboards, video, generated images, failed renders)  
- Age distribution  
- Duplicates (reclaimable MB)  
- Soft-deleted `project_assets` orphans  
- Temp / intermediate path scan  

Also available as split files: `01`–`07`.

### Expected report shape (fill after running 00)

| Finding | Value |
|---------|--------|
| Total MB | _(from query A)_ |
| Top buckets | _(from query B)_ |
| Top reclaimable categories | _(from query F)_ |
| Duplicate reclaimable MB | _(from query H)_ |

---

## STEP 2 — Categorisation

### SAFE TO DELETE (regenerable)

Generated images · storyboard frames · intermediate animation frames · preview images · video renders · MP4/MOV exports · temporary uploads · failed renders · old thumbnails · cache · duplicate media · unused assets · temporary processing folders · everything regenerable.

Buckets typically involved: `renders`, `exports`, `storyboards`, `generated-images`, `temporary`, `cache`, `preview`, `thumbnails`, `media`, `project-assets`, `reels`, `voiceovers`, `music`, `uploads`.

### NEVER DELETE

| Layer | Keep |
|-------|------|
| Auth | `auth.users` |
| Account | profiles, subscriptions, payments, settings |
| Product | projects, brand kits, project configuration |
| Creative DB | creative history, user prompts, metadata rows (except soft-deleted orphan pointers) |
| Schema | database tables, SQL migrations |
| Storage structure | **do not DROP buckets** — delete objects only |

Protected file buckets (if present): `avatars`, `brand-assets`.

---

## STEP 3 — Inspect SQL

| Script | Purpose |
|--------|---------|
| `00_FULL_AUDIT_REPORT.sql` | Full report (recommended) |
| `01_inventory.sql` | Totals |
| `02_bucket_size_report.sql` | Bucket sizes |
| `03_object_count_report.sql` | Counts + age |
| `04_largest_files.sql` | Top 50 files |
| `05_old_files.sql` | Age buckets |
| `06_duplicate_detection.sql` | Duplicates |
| `07_orphaned_objects.sql` | Orphans / temp paths |

---

## STEP 4 — Safe cleanup SQL

`scripts/storage/sql/08_safe_delete_CONFIRM.sql`

- Set `confirm_delete := true` after reviewing audit  
- Deletes objects only in regenerable buckets  
- Optionally removes soft-deleted `project_assets` pointers  
- **Never** touches auth / profiles / projects / payments  

If blocked by `protect_delete` → use Dashboard or API path.

---

## STEP 5 — Empty regenerable buckets (if still &gt; 1 GB)

`scripts/storage/sql/12_EMPTY_REGENERABLE_BUCKETS.sql`

```sql
DELETE FROM storage.objects
WHERE bucket_id IN (
  'renders', 'exports', 'storyboards', 'generated-images',
  'temporary', 'cache', 'preview', 'thumbnails',
  'media', 'project-assets', 'reels', 'voiceovers', 'music', 'uploads'
);
```

Does **not** drop buckets. Escalation scripts `09` / `10` exist but usually fail on hosted (owner / protect trigger).

### Working commands after API unlock

```bash
npm run storage:fresh-start    # safe regenerable purge + project_assets soft-clear
npm run storage:purge-safe     # regenerable buckets only
npm run storage:purge-all      # all buckets' objects (still no DB wipe)
```

---

## STEP 6 — Automatic lifecycle policies

Implemented in `lib/storage/retention-policy.ts` → `RETENTION_RULES`:

| Asset class | Retention |
|-------------|-----------|
| Temporary uploads / processing | **24 hours** |
| Cache | **24 hours** |
| Storyboard images | **7 days** |
| Preview / thumbnails | **7 days** |
| Unused uploads | **7 days** |
| Rendered videos / exports | **14 days** |
| Intermediate after export | **Immediate (0 days)** |

Runtime cleanup: `lib/storage/retention-cleanup.server.ts`  
Quota gate: `GET /api/storage/quota` (+ `?cleanup=1`)  
Render pause at 95%: `assertStorageAllowsRenders`

---

## STEP 7 — Future-proof bucket architecture

Target layout (`TARGET_BUCKET_ARCHITECTURE` in retention policy):

| Bucket | Retention | Max size (soft) | Cleanup | Visibility | Compression |
|--------|-----------|-----------------|---------|------------|-------------|
| uploads | 7d unused | 200 MB | retention + cron | private | none |
| projects | while active / 90d | 300 MB | orphan on project delete | private | none |
| renders | 14d | 400 MB | after export or 14d | private | h264 |
| exports | 14d | 400 MB | 14d | private | h264 |
| storyboards | 7d | 150 MB | 7d | private | webp |
| voiceovers | 30d | 100 MB | 30d | private | aac |
| music | 30d | 100 MB | 30d | private | aac |
| generated-images | 7d | 200 MB | 7d | private | webp |
| temporary | 24h | 100 MB | hourly / on export | private | none |
| cache | 24h | 50 MB | hourly | private | none |
| avatars | keep | 20 MB | manual | public | webp |
| brand-assets | keep | 50 MB | manual | private | none |

Migrate away from monolithic `project-assets` / `media` when unblocked.

---

## STEP 8 — Recovery checklist

- [ ] Storage Usage **&lt; 1 GB**
- [ ] Wait 2–10 minutes for Fair Use unlock
- [ ] `GET {SUPABASE_URL}/auth/v1/health` → **200** (with `apikey` header)
- [ ] Google OAuth signs in (not `/auth/unavailable`)
- [ ] Storage `listBuckets` → **200**
- [ ] Uploads working
- [ ] Exports / Remotion pipeline working
- [ ] No user metadata lost (profiles, projects, prompts, payments intact)

Verify after purge:

```bash
npm run storage:fresh-start
# or probe:
# curl with apikey → /auth/v1/health
```

---

## Risk assessment

| Action | Risk |
|--------|------|
| Delete regenerable bucket objects | **Low** |
| Soft-delete / purge orphan `project_assets` | **Low** |
| Wipe all `storage.objects` | **Medium** — last resort; still no DB wipe |
| Touch auth / profiles / projects / payments | **Forbidden** |

---

## Recommended recovery order (now)

1. Run **`00_FULL_AUDIT_REPORT.sql`** → paste results if you want a filled report  
2. **Dashboard → Storage** → empty `reels`, `project-assets`, `media` (largest first)  
3. Confirm Usage **&lt; 1 GB**  
4. Wait for Auth **200**  
5. Run `npm run storage:fresh-start` to finish any leftovers + soft-clear asset pointers  
6. Smoke: login → upload → export  
