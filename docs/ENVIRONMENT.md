# Mugtee — Environment Variables

Copy `.env.example` → `.env.local` for local development.

## Core

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BASE_URL` | Yes (prod) | Public site URL, e.g. `https://mugtee.in` |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase access |

## V3 MVP pipeline

| Variable | Default | Description |
|----------|---------|-------------|
| `GEMINI_API_KEY` | — | Planner, research, Veo video (fallback provider) |
| `OPENAI_API_KEY` | — | Primary planner/script provider when set (`PLANNER_PROVIDER=auto`) |
| `PLANNER_PROVIDER` | `auto` | `auto` \| `openai` \| `gemini` — primary order + automatic fallback |
| `SCRIPT_PROVIDER` | `auto` | Same for script agent |
| `V3_TEXT_PROVIDER` | `auto` | Research, storyboard, style, location, character agents |
| `PLANNER_DETERMINISTIC_FALLBACK` | `false` | Dev/test only — skip external AI for planner (never in production) |
| `V3_IMAGE_PROVIDER` | `gpt-image` | Scene image provider |
| `V3_VIDEO_PROVIDER` | `veo` | Scene video provider |
| `VIDEO_RENDER_MOCK` | `true` (local) | Stub MP4 without FFmpeg |
| `VIDEO_RENDER_ENABLED` | — | Set `true` in production |
| `MVP_ROYALTY_FREE_MUSIC_URL` | — | Optional background music URL |

## Credits & limits

| Variable | Default | Description |
|----------|---------|-------------|
| `MUGTEE_LIMITS_ENABLED` | enabled | Set `false` to disable caps locally |
| `MUGTEE_LIMIT_GENERATIONS` | `3` | Free tier generations/month |
| `MUGTEE_PRO_LIMIT_GENERATIONS` | `100` | Pro tier cap |
| `FREE_TIER_ONLY` | `true` (local) | Block paid AI providers |

## Billing

| Variable | Description |
|----------|-------------|
| `BILLING_LIVE` | `true` enables live checkout on `/pricing` |
| `PAYMENT_PROVIDER` | `razorpay` or `stripe` (auto-detected from keys) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay server keys |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Razorpay client key |
| `RAZORPAY_CREATOR_AMOUNT_PAISE` | Default `99900` (₹999) |
| `RAZORPAY_PRO_AMOUNT_PAISE` | Default `249900` (₹2,499) |
| `STRIPE_SECRET_KEY` | Stripe secret |
| `STRIPE_PRICE_CREATOR` / `PRO` / `AGENCY` | Stripe price IDs |

## Monitoring

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_POSTHOG_KEY` | Product analytics |
| `SENTRY_DSN` | Error tracking (optional `@sentry/nextjs`) |

## Local quick start

```bash
cp .env.example .env.local
npm install
npm run dev:no-reload
```

Open `http://localhost:3000/v3` after signing in.
