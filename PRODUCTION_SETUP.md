# Production Setup — `mugtee.in`

This document is a **one-shot operator checklist** for finalizing the production deployment of ViralForgeAI on the `mugtee.in` domain. Code is already aligned (all fallback URLs now default to `https://mugtee.in`); the remaining work is purely **external configuration** in your hosting / OAuth / database dashboards.

---

## 1. DNS + SSL (Domain side — your registrar + Emergent)

**At your registrar** (where `mugtee.in` is purchased):

| Record | Host | Value | TTL |
|---|---|---|---|
| `A`     | `@`   | _Emergent's IPv4 from the deployment dashboard_ | 3600 |
| `CNAME` | `www` | `mugtee.in` (or the Emergent target) | 3600 |

**In Emergent's dashboard** (production deployment):

- [ ] Add `mugtee.in` and `www.mugtee.in` as custom domains for the deployment
- [ ] Enforce **HTTPS-only** (HTTP → HTTPS 301 redirect)
- [ ] Enforce **canonical** redirect: `www.mugtee.in` → `mugtee.in` (or vice versa — pick one)
- [ ] Wait for Let's Encrypt SSL certificate to be issued (usually < 5 min after DNS propagation)
- [ ] Verify at `https://mugtee.in` — green padlock, no mixed-content warnings

If the SSL cert doesn't issue automatically, contact **Emergent Support** — this is a managed-platform task you can't fix in code.

---

## 2. Production Environment Variables

In the **Emergent deployment dashboard → Environment variables**, set / update these for the production environment. **Do not** modify the preview `.env` — code already prefers `process.env.NEXT_PUBLIC_BASE_URL` and falls back to `https://mugtee.in` if absent.

```
NEXT_PUBLIC_BASE_URL=https://mugtee.in
YOUTUBE_REDIRECT_URI=https://mugtee.in/api/youtube/callback

# These already exist — confirm they're set in production env:
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
EMERGENT_LLM_KEY=...
RAZORPAY_KEY_ID=rzp_test_SrEX2ok3vDtFa1
RAZORPAY_KEY_SECRET=BRWr1uUTH34QGQsDq1ofC2X4
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_SrEX2ok3vDtFa1
```

After saving, **trigger a fresh deploy** so the new env vars take effect.

---

## 3. Google Cloud OAuth Client — Update URLs

Go to **Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client ID** (`47557360524-...apps.googleusercontent.com`).

### Authorized JavaScript origins
```
https://mugtee.in
https://www.mugtee.in
```

### Authorized redirect URIs
```
https://mugtee.in/api/youtube/callback        ← YouTube publishing handshake
https://<your-supabase-ref>.supabase.co/auth/v1/callback   ← Supabase Google sign-in (already set; do not remove)
```

**Important:** Supabase's Google sign-in callback URL stays as the Supabase project URL (`<ref>.supabase.co/auth/v1/callback`). That's Supabase's responsibility, not yours. Only the **YouTube** callback uses your `mugtee.in` domain directly.

### What to remove (optional cleanup)
- Old preview/Emergent host URIs if you're sure you don't need them
- Old `localhost:3000` entries (keep one if you still run local dev)

Click **Save** in the Cloud Console.

---

## 4. Supabase Auth Settings

In **Supabase dashboard → Authentication → URL Configuration**:

| Field | Value |
|---|---|
| **Site URL** | `https://mugtee.in` |
| **Redirect URLs (allowed)** | `https://mugtee.in/**`, `https://www.mugtee.in/**` |

For local + preview development you can ALSO keep:
- `http://localhost:3000/**`
- `https://crew-dashboard-17.preview.emergentagent.com/**`

Click **Save**.

**Provider check (Authentication → Providers → Google)**:
- Client ID / Client Secret match the Google Cloud OAuth client above

---

## 5. Razorpay (when promoting to LIVE mode later)

Currently in **TEST mode**. When you flip to LIVE:

1. Generate **Live keys** in Razorpay Dashboard → Settings → API Keys
2. Update production env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
3. **Webhook URL** (if you wire one later): `https://mugtee.in/api/billing/webhook` — paste this in Razorpay Dashboard → Settings → Webhooks, secret in `RAZORPAY_WEBHOOK_SECRET`

---

## 5b. AdSense (lightweight monetization for free-tier users)

The code is wired and graceful — it **auto-no-ops** until you set the env vars below. Steps:

1. Apply for AdSense at <https://adsense.google.com> using `mugtee.in`. Google requires:
   - Live site with crawlable content (`/about`, `/pricing`, `/privacy`, `/terms` already qualify)
   - Privacy policy (✅ done at `/privacy`)
   - ~2-4 weeks of organic traffic
2. After approval, create **two display ad units** in AdSense Console:
   - Slot 1: "Dashboard footer" — responsive display
   - Slot 2: "Analytics footer" — responsive display
3. Add to production env vars in Emergent dashboard:
   ```
   NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
   NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD=1234567890
   NEXT_PUBLIC_ADSENSE_SLOT_ANALYTICS=2345678901
   ```
4. Re-deploy. Slots auto-activate **only for free-tier users** — Creator/Agency plans see zero ads. Slots lazy-load via IntersectionObserver (no ad request until ~200px from viewport, so no perf hit on initial paint).

---

## 6. Supabase Migrations (one-time)

These two SQL files must be run **once** in production's Supabase SQL editor if not already:

- `migrations/0001_billing.sql` — `subscriptions` table + RLS
- `migrations/0002_youtube.sql` — `youtube_accounts` table + RLS + 3 columns on `content_pieces`

**Quick Cut / cinematic project persistence** (required for save-to-library and recent projects):

- `supabase/migrations/0014_cinematic_projects.sql` — base `cinematic_projects` table + RLS
- `supabase/migrations/0015_project_video_urls.sql` — `video_url`, `thumbnail_url` columns
- `supabase/migrations/0016_unified_projects.sql` — `mode`, `virlo` columns + mode index
- `supabase/migrations/0017_project_archive_fields.sql` — `storyboard` column + status index

**Shortcut:** copy `supabase/RUN_IN_SQL_EDITOR.sql` (0014–0018 in one paste).

Without 0014–0018, Quick Cut auto-save fails on `cinematic_projects` (missing table or Phase 2 columns). The UI shows a migration hint banner (not offline mode); local preview still works. Verify with `/api/test-db`.

Without these, the Razorpay verify endpoint and YouTube upload endpoint will fail with `relation does not exist`.

---

## 7. Code Side — Already Aligned ✅

The preview codebase has been audited; all hardcoded fallback URLs have been updated to `https://mugtee.in`. Files touched:

- `app/layout.tsx`              → `SITE_URL` fallback
- `app/sitemap.ts`              → fallback
- `app/robots.ts`               → fallback
- `lib/url.ts`                  → worst-case fallback (replaced `http://localhost:3000`)
- `capacitor.config.ts`         → Capacitor WebView server URL
- `app/opengraph-image.tsx`     → footer text
- `app/(legal)/privacy/page.tsx`→ email `privacy@mugtee.in`
- `app/(legal)/terms/page.tsx`  → email `hello@mugtee.in`
- `PLAYSTORE.md`                → privacy policy URL

`lib/youtube.ts` and OAuth callback routes already read `YOUTUBE_REDIRECT_URI` / `NEXT_PUBLIC_BASE_URL` from env at runtime — no code change needed; production env vars drive the behavior.

---

## 8. Production QA Sweep (after deploy)

Visit `https://mugtee.in` and run through:

| Flow | What to confirm |
|---|---|
| `/` → `/login` | Cinematic slideshow loops, Google button visible |
| Google sign-in | Redirects to Google → back to `https://mugtee.in/auth/callback?code=...` → lands on `/dashboard` |
| `/dashboard` | UsageGauge + StatCards + QuickStart render, no console errors |
| `/pipeline`     | Kanban drag works, content cards render |
| `/calendar`     | Drag-to-reschedule works |
| `/ai`           | Faceless Studio opens, generates script, "Open Workspace" loads `/script/[id]` with **no "doesn't exist" flash** |
| `/analytics`    | Real numbers (not zeros if you have content); charts render |
| `/pricing`      | Razorpay Subscribe button opens Checkout modal with `rzp_test_*` key |
| `/settings`     | YouTube Connect button visible; clicking it redirects to Google with scopes `youtube.upload` + `youtube.readonly` |
| YouTube connect | After consent → lands on `/settings?yt_connected=1` with toast |
| `/privacy`, `/terms`, `/about` | Render cleanly; emails are `@mugtee.in` |
| PWA install | Chrome menu → "Install app" → opens as standalone with cinematic splash |
| Mobile (Android Chrome) | All above flows work on phone; no overflow / no notch clipping |

---

## 9. Common Production Pitfalls

| Symptom | Cause | Fix |
|---|---|---|
| Google sign-in → `redirect_uri_mismatch` | Cloud Console missing the Supabase callback URL | Add `https://<ref>.supabase.co/auth/v1/callback` |
| YouTube connect → `redirect_uri_mismatch` | Cloud Console missing `https://mugtee.in/api/youtube/callback` | Add it; Save; retry |
| OAuth lands on `/login` repeatedly | Supabase **Site URL** still points to preview | Update Site URL to `https://mugtee.in` |
| OG card on social shares is blank | `metadataBase` mis-set | Confirm `NEXT_PUBLIC_BASE_URL=https://mugtee.in` in prod env |
| Razorpay test mode in production | Still using `rzp_test_*` keys | Switch to live keys when ready; see §5 |
| Sitemap / robots show wrong domain | Env var not picked up | Re-deploy after updating env |

---

## Final checklist before going public

- [ ] DNS resolves `mugtee.in` to Emergent
- [ ] SSL active (green padlock)
- [ ] Production env vars set, deploy re-triggered
- [ ] Google Cloud OAuth — origins + redirect URIs updated
- [ ] Supabase — Site URL + Redirect URLs updated
- [ ] Both SQL migrations applied
- [ ] All QA flows in §8 pass
- [ ] Privacy + Terms emails updated (✅ done in code)
- [ ] (Optional) Razorpay flipped to LIVE keys
- [ ] (Optional) Capacitor APK rebuilt with `mugtee.in` and submitted to Play Console
