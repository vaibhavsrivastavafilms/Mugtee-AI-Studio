# Mugtee.in — Sitemap & URL Architecture

**Status:** Strategy doc (P0). Implement routes incrementally; do not index authenticated `/studio/*` workflows until public landing variants exist.

**Canonical domain:** `https://mugtee.in` (Vercel production)

**Current sitemap (baseline):** `app/sitemap.ts` — `/`, `/pricing`, `/about`, `/blog` + 3 posts, legal, `/login`

---

## URL tree (target state)

```
mugtee.in/
├── /                              [P0] Homepage — cinematic reel studio positioning
├── /pricing                       [P0] Access tiers (Begin / Studio / Universe)
├── /about                         [P1] Founder story + mission
├── /contact                       [P0] Support + partnerships
├── /login | /auth/login           [P0] Sign-in (canonicalize to one URL in GSC)
├── /showcase                      [P1] Public authored worlds (when shareable)
├── /made-with-mugtee              [P1] UGC / creator examples gallery
│
├── /blog                          [P0] Content hub
│   ├── /blog/best-faceless-youtube-niches          [live]
│   ├── /blog/ai-documentary-script-workflow        [live]
│   ├── /blog/how-to-make-viral-reels-faster        [live]
│   └── /blog/{slug}             [P0–P2] 27+ planned posts (see growth engine)
│
├── /tools                         [P0] Programmatic SEO hub (new)
│   ├── /tools/script-generator
│   ├── /tools/storyboard-generator
│   ├── /tools/reel-generator
│   ├── /tools/hook-generator
│   └── /tools/caption-generator
│
├── /use-cases                     [P1] Intent landing hub (new)
│   ├── /use-cases/faceless-youtube
│   ├── /use-cases/documentary-creator
│   ├── /use-cases/instagram-reels
│   └── /use-cases/youtube-shorts
│
├── /compare                       [P2] Alternatives (careful — no trademark abuse)
│   └── /compare/mugtee-vs-{competitor-slug}
│
├── /studio                        [noindex] Authenticated app shell
│   ├── /studio/quick              Quick Cut mode (purple) — fast reel pipeline
│   ├── /studio/director           Director Mode (gold) — deep cinematic control
│   ├── /studio/create             Project creation
│   └── …                          (robots disallow app paths)
│
├── /privacy | /terms              [P0] Legal
└── /sitemap.xml                   [P0] Auto-generated; extend when new public routes ship
```

---

## Indexing rules

| Zone | robots | sitemap priority | changeFrequency |
|------|--------|------------------|-----------------|
| Marketing + blog + tools | Allow | 0.6–1.0 | weekly (blog/tools), monthly (legal) |
| `/studio/*`, `/dashboard`, `/api` | Disallow (existing `robots.ts`) | Exclude | — |
| Auth callbacks `/auth/*` | Disallow | Exclude | — |

**Canonicalization:** Pick one login URL (`/auth/login` preferred if already linked from OAuth). 301 `/login` → canonical or set `rel=canonical` on duplicate.

---

## Internal linking anchors (hub → spoke)

| From page | Link to | Anchor text pattern |
|-----------|---------|---------------------|
| Homepage hero | `/tools/reel-generator` | “AI reel generator” |
| Homepage workflow section | `/studio/quick` CTA | “Open Quick Cut” (logged-in deep link) |
| Blog posts | Relevant `/tools/*` + `/pricing` | Tool name + “Open Studio” |
| `/tools/*` | `/blog/{related}` + `/pricing` | “See workflow guide” |
| `/tools` hub | All five tool pages | Descriptive H2 links |
| Footer (all public pages) | `/blog`, `/tools`, `/pricing`, legal | Stable sitewide |

---

## Sitemap.xml expansion checklist (P0)

- [ ] Add `/tools` and five tool URLs when pages ship
- [ ] Add each new `/blog/{slug}` on publish (automate from blog metadata array)
- [ ] Add `/use-cases/*` when live
- [ ] Set `lastModified` from git or CMS `publishedAt`
- [ ] Submit sitemap in Google Search Console after first 10 indexable URLs

See `programmatic-seo-pages.md` for page-level copy specs.
