# Mugtee public launch checklist

Manual verification for first-time creators before announcing publicly. Complements the in-app founder tools at `/admin/launch-readiness` and `/admin/launch-checklist` (admin session required).

## Signup & login

- [ ] Open `/auth/login` on desktop and mobile — layout does not overflow
- [ ] Google OAuth completes and lands on `/studio` or intended `next` path
- [ ] Sign out and sign back in — session persists after reload
- [ ] Unconfigured auth shows a clear message (no raw stack traces)

## Studio home (`/studio`)

- [ ] Dashboard loads with guidance when project list is empty
- [ ] “Quick Cut” entry opens create flow
- [ ] Footer or nav reaches Pricing, Privacy, Terms, Contact

## Generation (Quick Cut)

- [ ] New project from `/studio/create?mode=quick` (or homepage CTA)
- [ ] Section status badges visible on mobile during generation
- [ ] Failure shows friendly copy (not `500` or provider JSON)
- [ ] Reload project — hook, script, and scenes restore

## Save & projects

- [ ] Project appears under `/projects` after generation
- [ ] Search and filters work; empty search shows recovery UI
- [ ] Open project continues at correct step

## Workspace (`/studio/workspace`)

- [ ] Three-panel layout usable on tablet; no horizontal bleed on phone
- [ ] Starter prompts and generate CTA have ≥44px touch targets

## Export

- [ ] Export / compile completes or shows clear retry message
- [ ] Download MP4 and script assets
- [ ] Export empty state directs user back to generate/director

## Billing & pricing

- [ ] `/pricing` explains Free vs Creator vs Pro limits
- [ ] Waitlist CTA works for paid tiers
- [ ] Plan limit errors show upgrade guidance (not raw API text)

## Mobile smoke (375px width)

- [ ] Homepage hero and CTAs
- [ ] Login
- [ ] Studio home
- [ ] Quick Cut generation + status badges
- [ ] Projects list
- [ ] Export flow

## Trust & compliance

- [ ] `/privacy` and `/terms` load
- [ ] `/contact` and `hello@mugtee.in` reachable from footer
- [ ] Homepage and pricing include footer legal links

## SEO & PWA

- [ ] View source: JSON-LD `SoftwareApplication` on homepage
- [ ] `app/layout.tsx` title/description present
- [ ] `/manifest.webmanifest` or `/manifest.json` loads

## Performance (deferred / monitor)

- [ ] Homepage below-fold sections lazy-loaded (no duplicate bootstrap fetches observed)
- [ ] Lighthouse mobile performance — track post-launch; not a launch gate

## Founder admin tools

| URL | Purpose |
|-----|---------|
| `/admin/launch-readiness` | Auto probes + manual launch QA toggles |
| `/admin/launch-checklist` | Bugs / UX / blockers (localStorage) |
| `/admin/analytics` | Conversion funnel |

## Audited but deferred

- Full workspace mobile redesign (additive Tailwind fixes only in this pass)
- Replacing every `Loader2` site-wide with skeletons
- DB migrations (none required for legal pages)
- New AI features or pricing model changes
- Production build on CI agent hit OS resource limit (error 1450) — re-run `npm run build` locally before deploy

## Report template

After a pass, note: device, browser, path, expected vs actual, screenshot link, severity (blocker / UX / polish).
