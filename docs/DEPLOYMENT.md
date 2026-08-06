# Mugtee — Deployment

Production deployment targets **Vercel** (Next.js App Router) + **Supabase** (Postgres, Auth, Storage).

## Prerequisites

- Vercel project linked to this repository
- Supabase production project
- Custom domain (`mugtee.in`) pointed to Vercel
- AI provider keys (Gemini, OpenAI) for live generation
- Billing keys (Razorpay and/or Stripe) when `BILLING_LIVE=true`

## 1. Supabase

1. Create a production Supabase project.
2. Apply migrations in order from `supabase/migrations/` (0071–0077 minimum for V3 MVP + billing).
3. Enable Row Level Security policies (included in migrations).
4. Configure Auth redirect URLs:
   - `https://mugtee.in/auth/callback`
   - `http://localhost:3000/auth/callback` (local)
5. Create storage buckets referenced by the app (see `docs/STORAGE_ASSET_MANAGEMENT.md`).

Optional script (requires `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD`):

```bash
node scripts/supabase/apply-v3-migrations.mjs
```

## 2. Vercel environment variables

Copy keys from `.env.example` into Vercel → Settings → Environment Variables.

**Required for auth + projects:**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_URL=https://mugtee.in`

**Required for live V3 pipeline:**

- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `V3_IMAGE_PROVIDER=gpt-image`
- `V3_VIDEO_PROVIDER=veo`
- `VIDEO_RENDER_ENABLED=true`
- `VIDEO_RENDER_MOCK=false`

**Billing (production):**

- `BILLING_LIVE=true`
- `MUGTEE_LIMITS_ENABLED=true`
- Razorpay: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- Stripe (optional): `STRIPE_SECRET_KEY`, `STRIPE_PRICE_CREATOR`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_AGENCY`, `PAYMENT_PROVIDER=stripe`

**Monitoring (optional):**

- `NEXT_PUBLIC_POSTHOG_KEY`
- `SENTRY_DSN`

## 3. Deploy

```bash
npm run build
```

Push to the production branch; Vercel builds automatically.

Verify after deploy:

1. `/` loads (landing)
2. Sign up / login works
3. `/v3` creates a production (with credits guard)
4. `/pricing` checkout opens (when billing live)
5. `/v3/dashboard` lists projects
6. Export produces downloadable MP4

## 4. Post-deploy checklist

- [ ] Migrations applied
- [ ] Auth callback works on custom domain
- [ ] HTTPS enforced
- [ ] Storage uploads succeed
- [ ] Razorpay/Stripe webhooks configured (if using live billing)
- [ ] Error monitoring receiving events

See also: [ENVIRONMENT.md](./ENVIRONMENT.md), [MUGTEE_MVP.md](./MUGTEE_MVP.md)
