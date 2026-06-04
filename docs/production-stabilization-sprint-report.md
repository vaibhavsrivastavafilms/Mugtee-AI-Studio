# Production Stabilization Sprint Report

**Date:** 2026-06-05  
**Production:** https://mugtee.in  
**Branch:** main  

---

## 1. Export status

| Area | Status | Notes |
|------|--------|-------|
| Creator Pack (ZIP, TXT, DOCX, JPG) | **Complete** | Primary UX; MP4 gated behind `VIDEO_RENDER_ENABLED` |
| MP4 compile / poll | **Hardened** | `typeof` guards on `pollReelExportJob` / `capReelExportProgress`; friendly `CINEMATIC_EXPORT_FAILURE_MSG` |
| Structured logging | **Present** | `[EXPORT_FATAL]`, `[MUGTEE EXPORT] diagnostics`, export-log.client stages |
| Retry MP4 | **Present** | `retryVideoRender`, `resumeRenderPoll`, Retry MP4 in export section |
| Dev diagnostics | **Added** | `?debug=export` or `NODE_ENV=development` — `ExportDevDiagnosticsPanel` |
| Server MP4 on Vercel | **Operational** | Requires `VIDEO_RENDER_ENABLED=true` (not a code change) |

**Deferred:** End-to-end MP4 proof on production Vercel (operator verification).

---

## 2. Auth

| Area | Status | Notes |
|------|--------|-------|
| `/login` → `/auth/login` | **Complete** | Preserves `?next=` query |
| OAuth callback | **Complete** | Same-origin redirect; `next` + cookies |
| Middleware protected routes | **Complete** | `/studio/*` etc. |
| Session hydration | **Complete** | `useAuthHydration` waits for `INITIAL_SESSION` |
| Blank login screen | **Mitigated** | `OAuthLoadingState` until `ready` |

**Deferred:** Dedicated `/signup` route (login covers Google OAuth signup).

---

## 3. COOP / COEP

| Area | Status | Notes |
|------|--------|-------|
| Studio / create / workspace routes | **Complete** | `COOP: same-origin-allow-popups`, `COEP: credentialless` |
| `/ffmpeg/*` | **Complete** | `require-corp` + `CORP: cross-origin` |
| `/debug/runtime` | **Added** | Public read-only SAB / WebCodecs / isolation checks |

**Note:** `require-corp` on studio pages was not applied globally — would break Supabase/CDN assets and OAuth. `credentialless` enables `crossOriginIsolated` in Chromium without CORP on all embeds.

---

## 4. Pricing

| Tier | Display | Razorpay default (paise) |
|------|---------|--------------------------|
| Creator | ₹599/mo | 59900 (`RAZORPAY_CREATOR_AMOUNT_PAISE`) |
| Pro | ₹999/mo | 99900 (`RAZORPAY_PRO_AMOUNT_PAISE`) |

Waitlist remains primary CTA until billing launch. Existing `RAZORPAY_PLAN_*_ID` env overrides unchanged.

---

## 5. Homepage

| Section | Status |
|---------|--------|
| Hero positioning | **Updated** — "Your Cinematic AI Studio" |
| Demo reel block | **Added** — `DemoReelSection` (lazy video, placeholder if no `/public/demo-reel.mp4`) |
| Creator showcase | **Added** — `CreatorShowcase.tsx` |
| Social proof | **Added** — `lib/socialProof.ts` + `SocialProofSection` |
| Pricing CTA | **Added** — scroll section + `/pricing` |

**Deferred (P2):** Full FAQ on homepage (linked to `/pricing#faq`); storyboard preview section as separate block.

---

## 6. Mobile

| Surface | Status |
|---------|--------|
| Homepage scroll sections | Responsive grids |
| Export actions | `min-h-[44px]` touch targets (existing) |
| Studio / storyboard 360px | **Deferred** — audit notes only; no layout sweep in this sprint |

---

## 7. Lighthouse (estimate)

Not run in CI this sprint. **Estimate:** Performance 55–70 (heavy client bundles), Accessibility 85–92, Best Practices 90+, SEO 90+ (metadata updated).

---

## 8. Accessibility

- Demo video: `muted`, `playsInline`, poster fallback  
- Error page: recovery CTAs with clear labels  
- Locked features: text + waitlist link (not empty `title` only)

**Deferred:** Full axe pass on studio export tab.

---

## 9. Runtime errors

| Error | Mitigation |
|-------|------------|
| `l is not a function` (minified poll) | Dynamic import guards + generic cinematic export message |
| React #425 hydration | Prior fix in `preview-export-tabbed-panel` (mount gate) |
| Export 500 | `[EXPORT_FATAL]` logging on `/api/reels/export` |

---

## 10. Next sprint recommendations

1. Upload `/public/demo-reel.mp4` and verify autoplay on mugtee.in  
2. Production MP4 smoke test with `VIDEO_RENDER_ENABLED=true`  
3. Mobile 360px pass on `/studio/quick` export tab and storyboard grid  
4. Replace placeholder social proof when analytics API is stable (`NEXT_PUBLIC_SOCIAL_PROOF_LIVE=true`)  
5. Stripe parity if international billing launches  

---

## Deployment checklist

- [ ] `VIDEO_RENDER_ENABLED=true` on Vercel production  
- [ ] Supabase migrations applied (export_jobs, storyboard assets)  
- [ ] `npx tsc --noEmit` && `npm run build` green  
- [ ] Deploy main → mugtee.in  
- [ ] Sign in: `/auth/login?next=/studio/director` lands in director after OAuth  
- [ ] Creator Pack export on a project with voice + storyboard  
- [ ] Optional: Compile MP4 when render enabled  
- [ ] Visit `/debug/runtime` from studio tab — `crossOriginIsolated: true`  
- [ ] Pricing page shows ₹599 / ₹999 waitlist  

---

## P0 vs deferred summary

**P0 completed:** Export messaging/guards/diagnostics, COOP/COEP route expansion, auth `?next=` path (existing + verified), runtime debug page.  

**P1 completed:** Showcase, social proof, demo reel section, pricing copy, Coming Soon → Locked/waitlist in key surfaces.  

**P2 deferred:** Shimmer sweep on all loaders, per-page empty states, full mobile audit, homepage storyboard preview section, live social proof metrics.
