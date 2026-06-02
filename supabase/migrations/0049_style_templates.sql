-- Mugtee style templates — cinematic continuity presets for Quick Cut / Director flows.

create table if not exists public.style_templates (
  id                    text primary key,
  name                  text not null,
  category              text not null,
  description           text not null default '',
  thumbnail             text not null default '',
  mood                  text not null default '',
  camera_language       text not null default '',
  color_palette         text not null default '',
  visual_style          text not null default '',
  animation_style       text not null default 'cinematic',
  character_consistency text not null default '',
  prompt_prefix         text not null default '',
  created_at            timestamptz not null default now()
);

comment on table public.style_templates is
  'Built-in cinematic style presets — mood, camera, palette, and prompt prefix for continuity.';

alter table public.style_templates enable row level security;

drop policy if exists "style_templates public read" on public.style_templates;
create policy "style_templates public read"
  on public.style_templates for select
  using (true);

alter table public.cinematic_projects
  add column if not exists style_template_id text references public.style_templates(id) on delete set null;

comment on column public.cinematic_projects.style_template_id is
  'Selected style template slug for continuity presets (migration 0049).';

create index if not exists cinematic_projects_style_template_idx
  on public.cinematic_projects (style_template_id)
  where style_template_id is not null;

-- Seed 20 built-in templates (ids match lib/templates/builtin-templates.ts)
insert into public.style_templates (
  id, name, category, description, thumbnail,
  mood, camera_language, color_palette, visual_style, animation_style,
  character_consistency, prompt_prefix
) values
(
  'ancient-empires-archive', 'Ancient Empires Archive', 'History',
  'Archival authority for faceless history — parchment tones, slow reveals, and evidence-first narration.',
  'history-empires',
  'Mysterious, authoritative, time-worn gravitas',
  'Slow dolly through ruins, wide establishing to intimate artifact close-ups',
  'Sepia warmth, stone grey, deep bronze accents',
  'Archival documentary stills — tactile grain, museum lighting',
  'documentary',
  'No on-screen host; recurring symbolic hands or silhouettes only when needed',
  'Cinematic history archive aesthetic. Evidence-first, no sensationalism. Vertical 9:16.'
),
(
  'forgotten-dynasties', 'Forgotten Dynasties', 'History',
  'Dynasty-scale storytelling with map beats, court intrigue, and legacy framing for long-form cuts.',
  'history-dynasty',
  'Epic restraint, courtly tension, legacy weight',
  'Symmetrical wide shots, ceremonial push-ins, map overlays implied in framing',
  'Imperial crimson, ink black, aged gold leaf',
  'Painterly historical drama — controlled contrast, regal negative space',
  'cinematic',
  'Consistent royal silhouette or emblem motif; faceless court figures in shadow',
  'Dynasty documentary tone. Regal, researched, vertical epic framing without fantasy excess.'
),
(
  'heritage-estates-luxury', 'Heritage Estates', 'Luxury',
  'Old-world luxury real estate and craft — marble, linen, and whispered opulence.',
  'luxury-estate',
  'Understated opulence, calm exclusivity',
  'Slow glide through interiors, detail macros on materials',
  'Warm ivory, champagne gold, deep walnut',
  'Editorial luxury — soft key light, shallow depth, negative space',
  'subtle',
  'Elegant hands or back-of-head only; no flashy flex poses',
  'Heritage luxury editorial. Tactile materials, never loud flex. Vertical 9:16.'
),
(
  'haute-craft-luxury', 'Haute Craft', 'Luxury',
  'Watchmaking, tailoring, and atelier craft — precision as the hero.',
  'luxury-craft',
  'Precision worship, quiet mastery',
  'Macro product hero, rack focus on mechanisms, controlled tabletop angles',
  'Steel silver, matte black, single warm accent',
  'High-end product documentary — crisp edges, studio polish',
  'subtle',
  'Artisan hands only; consistent glove or tool motif',
  'Haute craft luxury macro world. Precision, restraint, vertical product cinema.'
),
(
  'shadow-psychology-reels', 'Shadow Psychology', 'Psychology',
  'Attachment, avoidance, and pattern reveals — intimate, non-clinical reel psychology.',
  'psychology-shadow',
  'Intimate unease, reflective clarity',
  'Close-up emotional framing, mirror compositions, shallow depth',
  'Muted neutrals, soft skin tones, shadow pockets',
  'Intimate observational — window light, gentle falloff',
  'subtle',
  'Same faceless subject silhouette across scenes when character appears',
  'Psychology insight reel. Emotionally literate, never diagnostic. Vertical intimate framing.'
),
(
  'cognitive-bias-lab', 'Cognitive Bias Lab', 'Psychology',
  'Behavioral science explainers with clean visual metaphors and calm authority.',
  'psychology-bias',
  'Curious, analytical, approachable',
  'Clean medium shots, infographic-friendly negative space',
  'Cool slate, soft white, single accent blue',
  'Modern edu-creator — minimal sets, metaphor objects',
  'cinematic',
  'Consistent presenter-adjacent prop or desk setup; face optional but stable wardrobe',
  'Behavioral science explainer. Clear metaphors, adult tone, vertical edu-native.'
),
(
  'calm-wealth-principles', 'Calm Wealth Principles', 'Finance',
  'Timeless money lessons without hype — desk, city glass, and proof-of-work calm.',
  'finance-calm',
  'Adult clarity, trustworthy calm',
  'Symmetrical desk mediums, clean overhead on notes, city bokeh backgrounds',
  'Cool navy, slate grey, crisp white highlights',
  'Professional finance documentary — no lambos, no charts spam',
  'cinematic',
  'Faceless professional silhouette or consistent desk props',
  'Calm personal finance authority. No get-rich hype. Vertical credible framing.'
),
(
  'market-myths-finance', 'Market Myths Debunked', 'Finance',
  'Myth-busting market narratives with crisp contrast and evidence beats.',
  'finance-myths',
  'Skeptical clarity, sharp but fair',
  'Push-in on headlines, split-frame tension, controlled slide',
  'Charcoal, electric cyan accent, warning amber sparingly',
  'Investigative finance shorts — high contrast, readable composition',
  'dynamic',
  'Consistent news-desk or phone-screen motif; no recurring face required',
  'Finance myth-bust tone. Evidence-led, vertical investigative energy without panic.'
),
(
  'dawn-discipline-motivation', 'Dawn Discipline', 'Motivation',
  'Early-hour discipline arcs — grit, proof-of-work spaces, earned intensity.',
  'motivation-dawn',
  'Earned intensity, quiet resolve',
  'Low angle to eye-level progression, purposeful tracking in gyms and streets',
  'Dawn gold, deep shadow, sweat-toned skin',
  'Gritty motivation documentary — motivated rim light, real locations',
  'dynamic',
  'Same athlete silhouette or wardrobe color across workout beats',
  'Discipline motivation cinema. Earned, not hustle-bro. Vertical proof-of-work framing.'
),
(
  'comeback-proof-motivation', 'Comeback Proof', 'Motivation',
  'Comeback stories with before/after emotional pacing and mirror moments.',
  'motivation-comeback',
  'Vulnerable rise, cathartic landing',
  'Static hold then subtle push-in on emotional beats',
  'Desaturated cool opening, warm gold on turnaround',
  'Character-driven motivation — honest contrast, minimal gloss',
  'cinematic',
  'Same protagonist wardrobe and hair across timeline',
  'Comeback arc motivation. Human first, vertical emotional pacing.'
),
(
  'sacred-stillness-spiritual', 'Sacred Stillness', 'Spirituality',
  'Contemplative spiritual reels — nature, breath, and reverent negative space.',
  'spiritual-still',
  'Reverent calm, spacious presence',
  'Slow drift, horizon lines, meditative static holds',
  'Mist blue-grey, soft dawn pink, forest green',
  'Contemplative nature cinema — soft diffusion, minimal clutter',
  'subtle',
  'Silhouette in prayer or walking away; no face close-ups unless consistent',
  'Contemplative spiritual vertical. Reverent, non-preachy, breath-paced.'
),
(
  'mindful-path-spiritual', 'Mindful Path', 'Spirituality',
  'Mindfulness and inner journey — candles, journals, and gentle ritual objects.',
  'spiritual-mindful',
  'Gentle hope, inner warmth',
  'Intimate tabletop, overhead ritual layouts, soft window light',
  'Warm cream, honey amber, sage green',
  'Lifestyle mindfulness — soft key, tactile props',
  'subtle',
  'Consistent hands-on-journal motif; cozy wardrobe palette',
  'Mindful spiritual lifestyle. Warm, accessible, vertical ritual framing.'
),
(
  'verite-street-documentary', 'Vérité Street', 'Documentary',
  'Handheld street vérité — real locations, lived-in truth, witness framing.',
  'doc-verite',
  'Honest witness, unstyled truth',
  'Handheld medium, vérité follow, available light',
  'Naturalistic desaturated earth tones',
  'Street documentary — honest contrast, no performance',
  'documentary',
  'Real people varied; recurring location anchor when serialized',
  'Street vérité documentary. Witness over performance. Vertical 9:16 real world.'
),
(
  'investigative-mini-doc', 'Investigative Mini-Doc', 'Documentary',
  'Short investigative docs — evidence tables, location stakes, chapter rhythm.',
  'doc-investigate',
  'Urgent curiosity, factual tension',
  'Establishing wide, evidence close-up, walking interview energy',
  'Cool documentary blue, practical tungsten interiors',
  'Investigative broadcast documentary — readable, grounded',
  'documentary',
  'Reporter back or voice-only; consistent notebook prop',
  'Investigative mini-doc vertical. Fact-led, chapter beats, no sensational montage.'
),
(
  'faceless-facts-reels', 'Faceless Facts', 'Faceless Reels',
  'High-retention fact reels — bold text-safe negative space and b-roll rhythm.',
  'faceless-facts',
  'Punchy curiosity, scroll-stopping clarity',
  'Fast-cut friendly mediums, top-third negative space for captions',
  'High contrast black and gold, single accent pop',
  'Faceless edu-reel — clean b-roll, no host face',
  'dynamic',
  'Strictly faceless — hands, objects, or screen recordings only',
  'Faceless facts reel. Caption-safe composition, bold clarity, vertical retention pacing.'
),
(
  'pov-storytime-faceless', 'POV Storytime', 'Faceless Reels',
  'First-person storytime without showing face — POV hands, environments, props.',
  'faceless-pov',
  'Confessional intimacy, narrative pull',
  'POV handheld, over-shoulder objects, doorway framing',
  'Warm indoor practicals, phone-screen glow accents',
  'POV storytime — relatable domestic realism',
  'cinematic',
  'POV hands and sleeves consistent; never reveal face',
  'POV faceless storytime. Intimate narrator energy without on-camera face. Vertical 9:16.'
),
(
  'stoic-wisdom-shorts', 'Stoic Wisdom Shorts', 'History',
  'Philosophy and stoic principles with marble, rain, and timeless city textures.',
  'history-stoic',
  'Stoic resolve, timeless calm',
  'Slow push on statues and rain windows, symmetrical compositions',
  'Marble white, storm grey, muted bronze',
  'Classical philosophy aesthetic — statuesque, restrained',
  'cinematic',
  'Philosopher silhouette or statue motif; no modern influencer look',
  'Stoic philosophy vertical cinema. Timeless, restrained, wisdom-first.'
),
(
  'biohacker-clarity', 'Biohacker Clarity', 'Psychology',
  'Health optimization explainers — labs, sleep, and habit science without bro-science.',
  'psychology-bio',
  'Curious optimization, clean science',
  'Clean lab and bedroom b-roll, macro on devices and food',
  'Clinical white, soft teal, natural skin',
  'Science-forward wellness — crisp, credible, minimal hype',
  'cinematic',
  'Consistent wellness desk setup; face optional with stable look',
  'Biohacker clarity explainer. Science-credible, no miracle claims. Vertical edu framing.'
),
(
  'old-money-aesthetic', 'Old Money Aesthetic', 'Luxury',
  'Quiet wealth cues — yacht clubs, libraries, and generational taste without logos.',
  'luxury-old-money',
  'Inherited taste, quiet confidence',
  'Elegant wide to medium, never shaky, gliding exteriors',
  'Navy, cream, forest green, brass highlights',
  'Old money editorial — preppy restraint, no logo flex',
  'subtle',
  'Back-of-head or profile in shadow; consistent classic wardrobe',
  'Old money aesthetic luxury. Quiet wealth, vertical editorial restraint.'
),
(
  'crypto-clarity-calm', 'Crypto Clarity', 'Finance',
  'Crypto concepts explained calmly — screens, nodes, and risk-aware tone.',
  'finance-crypto',
  'Calm explainer, risk-aware',
  'Screen capture friendly angles, desk medium, network abstract b-roll',
  'Dark UI blues, matrix green accent sparingly',
  'Tech finance explainer — dark mode friendly, readable',
  'cinematic',
  'Faceless desk + consistent monitor glow setup',
  'Crypto clarity explainer. Risk-aware, no moon hype. Vertical readable tech framing.'
)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  thumbnail = excluded.thumbnail,
  mood = excluded.mood,
  camera_language = excluded.camera_language,
  color_palette = excluded.color_palette,
  visual_style = excluded.visual_style,
  animation_style = excluded.animation_style,
  character_consistency = excluded.character_consistency,
  prompt_prefix = excluded.prompt_prefix;
