# Programmatic SEO — Copy-Ready Page Specs

**Base path:** `/tools/{slug}`  
**Hub:** `/tools` (lists all generators + links to Quick Cut / Director Mode)  
**Primary CTA:** `Open Studio` → `/auth/login?next=/studio/quick` (or homepage `#cta` until deep links exist)  
**Secondary CTA:** `See pricing` → `/pricing`

**Design note:** Match homepage cinematic tone (`lib/marketing/site-copy.ts`). Workflow-driven UI screenshots, not chatbot mockups. Show hook → script → storyboard → export artifact strip.

---

## Hub: `/tools`

| Field | Copy |
|-------|------|
| **SEO title** | Free AI Tools for Reels, Scripts & Storyboards \| Mugtee |
| **Meta description** | Cinematic AI tools for creators: script, storyboard, reel, hook, and caption generators. Turn one idea into export-ready vertical video — not a generic chatbot. |
| **H1** | Cinematic AI tools for creators |
| **Outline** | Intro (50 words) → grid of 5 tools → “How Mugtee differs” (workflow vs chat) → Quick Cut vs Director Mode → FAQ (3) → CTA band |
| **CTA placement** | Sticky mobile bar after scroll; end of page full-width gold CTA |

---

## `/tools/script-generator`

| Field | Copy |
|-------|------|
| **SEO title** | AI Script Generator for Reels & YouTube \| Mugtee Cinematic Studio |
| **Meta description** | Generate documentary-style scripts, narration beats, and reel hooks from one idea. Mugtee shapes pacing and emotional arc — built for faceless and vertical creators. |
| **H1** | AI script generator for cinematic short-form |
| **Content outline** | 1) Problem: blank page + generic ChatGPT tone · 2) Mugtee workflow: idea → hook → script beats → voice-ready narration · 3) Modes: Quick Cut (speed) vs Director Mode (control) · 4) Output preview (script excerpt mock) · 5) Use cases: faceless YouTube, documentary, explainer reels · 6) FAQ: credits, languages, export · 7) Related: storyboard + hook tools |
| **CTA placement** | Above fold secondary; after section 2 primary; footer repeat |

**Target keywords:** `ai script generator`, `youtube script generator ai`, `documentary script ai`, `reel script writer`

---

## `/tools/storyboard-generator`

| Field | Copy |
|-------|------|
| **SEO title** | AI Storyboard Generator for Reels & Short Film \| Mugtee |
| **Meta description** | Turn script beats into visually directed storyboard frames with cinematic pacing. Built for reel and faceless creators who need frames before filming or AI visuals. |
| **H1** | AI storyboard generator with cinematic pacing |
| **Content outline** | 1) Why storyboards reduce reshoots · 2) Mugtee: script beat → frame → visual direction · 3) 9:16 vertical framing callout · 4) Before/after: text-only beat vs storyboard frame · 5) Director Mode refinement loop · 6) FAQ: image style, scene count · 7) Link to script + reel tools |
| **CTA placement** | After before/after block (primary); mid-page “Try on a real project” |

**Target keywords:** `ai storyboard generator`, `storyboard maker ai`, `reel storyboard tool`, `video storyboard generator`

---

## `/tools/reel-generator`

| Field | Copy |
|-------|------|
| **SEO title** | AI Reel Generator — Script to Export-Ready Video \| Mugtee |
| **Meta description** | One idea to hook, script, storyboard, captions, and export-ready vertical reel. Mugtee is a cinematic AI studio — not a text-only AI writer. |
| **H1** | AI reel generator from one idea to export |
| **Content outline** | 1) Reel economics (hook window, pacing) · 2) End-to-end Mugtee pipeline diagram · 3) Quick Cut path (`/studio/quick`) · 4) Output quality: captions + MP4 export mention · 5) Platform fit: Instagram, YouTube Shorts, TikTok · 6) Social proof: link `/made-with-mugtee` when populated · 7) FAQ: length, aspect ratio, watermark on free tier |
| **CTA placement** | Hero primary; sticky on mobile after “pipeline diagram” |

**Target keywords:** `ai reel generator`, `instagram reel maker ai`, `ai video reel creator`, `short form video ai`

---

## `/tools/hook-generator`

| Field | Copy |
|-------|------|
| **SEO title** | Viral Hook Generator for Reels & Shorts \| Mugtee |
| **Meta description** | Generate scroll-stopping hooks with cinematic tension — tuned for retention, not clickbait clichés. Pair with full script and storyboard in Mugtee Studio. |
| **H1** | Hook generator built for retention, not clichés |
| **Content outline** | 1) 3-second rule · 2) Mugtee hook refinement (“improve hook” in product) · 3) Examples: 3 hook variants for same topic (static text, no fake metrics) · 4) Guest hook pattern (reference existing guest hook on landing if still live) · 5) Upgrade path: hook → full script in studio · 6) FAQ: daily limits on guest vs signed-in |
| **CTA placement** | Inline after examples; bottom “Open Studio — full pipeline” |

**Target keywords:** `hook generator`, `viral hook generator`, `instagram hook generator`, `youtube shorts hook ideas`

---

## `/tools/caption-generator`

| Field | Copy |
|-------|------|
| **SEO title** | AI Caption Generator for Reels & Shorts \| Mugtee |
| **Meta description** | Captions that match your script’s emotional pacing — readable on mobile, timed for vertical video. Part of Mugtee’s cinematic reel studio workflow. |
| **H1** | Caption generator aligned to your script beats |
| **Content outline** | 1) Why captions affect retention · 2) Beat-synced captions in Mugtee export · 3) Tone: documentary vs punchy reel · 4) Accessibility + silent viewing · 5) Workflow: import script or generate in studio · 6) FAQ: languages, SRT/export · 7) Cross-link reel generator |
| **CTA placement** | After section 2; final CTA with “See export workflow” link to blog post |

**Target keywords:** `ai caption generator`, `reel caption generator`, `subtitle generator for reels`, `short video captions ai`

---

## Shared on-page SEO checklist (all tool pages)

- [ ] `SoftwareApplication` JSON-LD (reuse homepage pattern)
- [ ] Single H1; H2s for each outline section
- [ ] 800–1,200 words unique copy per page (no duplicate paragraphs across tools)
- [ ] Internal links: hub ↔ sibling tools ↔ 1 relevant blog post
- [ ] `og:image` — cinematic 1200×630 (screenshot of Quick Cut output strip)
- [ ] FAQ schema (`FAQPage`) for 3–5 questions per page
- [ ] CTA UTM: `?utm_source=tool&utm_medium=seo&utm_campaign={slug}`

**Priority:** P0 — ship hub + reel + script first (highest search volume intent).
