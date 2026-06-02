import type { StyleTemplate } from '@/lib/templates/style-templates'

/** Built-in cinematic style templates (also seeded in migration 0049). */
export const BUILTIN_STYLE_TEMPLATES: StyleTemplate[] = [
  {
    id: 'ancient-empires-archive',
    name: 'Ancient Empires Archive',
    category: 'History',
    description:
      'Archival authority for faceless history — parchment tones, slow reveals, and evidence-first narration.',
    thumbnail: 'history-empires',
    mood: 'Mysterious, authoritative, time-worn gravitas',
    camera_language: 'Slow dolly through ruins, wide establishing to intimate artifact close-ups',
    color_palette: 'Sepia warmth, stone grey, deep bronze accents',
    visual_style: 'Archival documentary stills — tactile grain, museum lighting',
    animation_style: 'documentary',
    character_consistency: 'No on-screen host; recurring symbolic hands or silhouettes only when needed',
    prompt_prefix:
      'Cinematic history archive aesthetic. Evidence-first, no sensationalism. Vertical 9:16.',
  },
  {
    id: 'forgotten-dynasties',
    name: 'Forgotten Dynasties',
    category: 'History',
    description:
      'Dynasty-scale storytelling with map beats, court intrigue, and legacy framing for long-form cuts.',
    thumbnail: 'history-dynasty',
    mood: 'Epic restraint, courtly tension, legacy weight',
    camera_language: 'Symmetrical wide shots, ceremonial push-ins, map overlays implied in framing',
    color_palette: 'Imperial crimson, ink black, aged gold leaf',
    visual_style: 'Painterly historical drama — controlled contrast, regal negative space',
    animation_style: 'cinematic',
    character_consistency: 'Consistent royal silhouette or emblem motif; faceless court figures in shadow',
    prompt_prefix:
      'Dynasty documentary tone. Regal, researched, vertical epic framing without fantasy excess.',
  },
  {
    id: 'heritage-estates-luxury',
    name: 'Heritage Estates',
    category: 'Luxury',
    description:
      'Old-world luxury real estate and craft — marble, linen, and whispered opulence.',
    thumbnail: 'luxury-estate',
    mood: 'Understated opulence, calm exclusivity',
    camera_language: 'Slow glide through interiors, detail macros on materials',
    color_palette: 'Warm ivory, champagne gold, deep walnut',
    visual_style: 'Editorial luxury — soft key light, shallow depth, negative space',
    animation_style: 'subtle',
    character_consistency: 'Elegant hands or back-of-head only; no flashy flex poses',
    prompt_prefix:
      'Heritage luxury editorial. Tactile materials, never loud flex. Vertical 9:16.',
  },
  {
    id: 'haute-craft-luxury',
    name: 'Haute Craft',
    category: 'Luxury',
    description:
      'Watchmaking, tailoring, and atelier craft — precision as the hero.',
    thumbnail: 'luxury-craft',
    mood: 'Precision worship, quiet mastery',
    camera_language: 'Macro product hero, rack focus on mechanisms, controlled tabletop angles',
    color_palette: 'Steel silver, matte black, single warm accent',
    visual_style: 'High-end product documentary — crisp edges, studio polish',
    animation_style: 'subtle',
    character_consistency: 'Artisan hands only; consistent glove or tool motif',
    prompt_prefix:
      'Haute craft luxury macro world. Precision, restraint, vertical product cinema.',
  },
  {
    id: 'shadow-psychology-reels',
    name: 'Shadow Psychology',
    category: 'Psychology',
    description:
      'Attachment, avoidance, and pattern reveals — intimate, non-clinical reel psychology.',
    thumbnail: 'psychology-shadow',
    mood: 'Intimate unease, reflective clarity',
    camera_language: 'Close-up emotional framing, mirror compositions, shallow depth',
    color_palette: 'Muted neutrals, soft skin tones, shadow pockets',
    visual_style: 'Intimate observational — window light, gentle falloff',
    animation_style: 'subtle',
    character_consistency: 'Same faceless subject silhouette across scenes when character appears',
    prompt_prefix:
      'Psychology insight reel. Emotionally literate, never diagnostic. Vertical intimate framing.',
  },
  {
    id: 'cognitive-bias-lab',
    name: 'Cognitive Bias Lab',
    category: 'Psychology',
    description:
      'Behavioral science explainers with clean visual metaphors and calm authority.',
    thumbnail: 'psychology-bias',
    mood: 'Curious, analytical, approachable',
    camera_language: 'Clean medium shots, infographic-friendly negative space',
    color_palette: 'Cool slate, soft white, single accent blue',
    visual_style: 'Modern edu-creator — minimal sets, metaphor objects',
    animation_style: 'cinematic',
    character_consistency: 'Consistent presenter-adjacent prop or desk setup; face optional but stable wardrobe',
    prompt_prefix:
      'Behavioral science explainer. Clear metaphors, adult tone, vertical edu-native.',
  },
  {
    id: 'calm-wealth-principles',
    name: 'Calm Wealth Principles',
    category: 'Finance',
    description:
      'Timeless money lessons without hype — desk, city glass, and proof-of-work calm.',
    thumbnail: 'finance-calm',
    mood: 'Adult clarity, trustworthy calm',
    camera_language: 'Symmetrical desk mediums, clean overhead on notes, city bokeh backgrounds',
    color_palette: 'Cool navy, slate grey, crisp white highlights',
    visual_style: 'Professional finance documentary — no lambos, no charts spam',
    animation_style: 'cinematic',
    character_consistency: 'Faceless professional silhouette or consistent desk props',
    prompt_prefix:
      'Calm personal finance authority. No get-rich hype. Vertical credible framing.',
  },
  {
    id: 'market-myths-finance',
    name: 'Market Myths Debunked',
    category: 'Finance',
    description:
      'Myth-busting market narratives with crisp contrast and evidence beats.',
    thumbnail: 'finance-myths',
    mood: 'Skeptical clarity, sharp but fair',
    camera_language: 'Push-in on headlines, split-frame tension, controlled slide',
    color_palette: 'Charcoal, electric cyan accent, warning amber sparingly',
    visual_style: 'Investigative finance shorts — high contrast, readable composition',
    animation_style: 'dynamic',
    character_consistency: 'Consistent news-desk or phone-screen motif; no recurring face required',
    prompt_prefix:
      'Finance myth-bust tone. Evidence-led, vertical investigative energy without panic.',
  },
  {
    id: 'dawn-discipline-motivation',
    name: 'Dawn Discipline',
    category: 'Motivation',
    description:
      'Early-hour discipline arcs — grit, proof-of-work spaces, earned intensity.',
    thumbnail: 'motivation-dawn',
    mood: 'Earned intensity, quiet resolve',
    camera_language: 'Low angle to eye-level progression, purposeful tracking in gyms and streets',
    color_palette: 'Dawn gold, deep shadow, sweat-toned skin',
    visual_style: 'Gritty motivation documentary — motivated rim light, real locations',
    animation_style: 'dynamic',
    character_consistency: 'Same athlete silhouette or wardrobe color across workout beats',
    prompt_prefix:
      'Discipline motivation cinema. Earned, not hustle-bro. Vertical proof-of-work framing.',
  },
  {
    id: 'comeback-proof-motivation',
    name: 'Comeback Proof',
    category: 'Motivation',
    description:
      'Comeback stories with before/after emotional pacing and mirror moments.',
    thumbnail: 'motivation-comeback',
    mood: 'Vulnerable rise, cathartic landing',
    camera_language: 'Static hold then subtle push-in on emotional beats',
    color_palette: 'Desaturated cool opening, warm gold on turnaround',
    visual_style: 'Character-driven motivation — honest contrast, minimal gloss',
    animation_style: 'cinematic',
    character_consistency: 'Same protagonist wardrobe and hair across timeline',
    prompt_prefix:
      'Comeback arc motivation. Human first, vertical emotional pacing.',
  },
  {
    id: 'sacred-stillness-spiritual',
    name: 'Sacred Stillness',
    category: 'Spirituality',
    description:
      'Contemplative spiritual reels — nature, breath, and reverent negative space.',
    thumbnail: 'spiritual-still',
    mood: 'Reverent calm, spacious presence',
    camera_language: 'Slow drift, horizon lines, meditative static holds',
    color_palette: 'Mist blue-grey, soft dawn pink, forest green',
    visual_style: 'Contemplative nature cinema — soft diffusion, minimal clutter',
    animation_style: 'subtle',
    character_consistency: 'Silhouette in prayer or walking away; no face close-ups unless consistent',
    prompt_prefix:
      'Contemplative spiritual vertical. Reverent, non-preachy, breath-paced.',
  },
  {
    id: 'mindful-path-spiritual',
    name: 'Mindful Path',
    category: 'Spirituality',
    description:
      'Mindfulness and inner journey — candles, journals, and gentle ritual objects.',
    thumbnail: 'spiritual-mindful',
    mood: 'Gentle hope, inner warmth',
    camera_language: 'Intimate tabletop, overhead ritual layouts, soft window light',
    color_palette: 'Warm cream, honey amber, sage green',
    visual_style: 'Lifestyle mindfulness — soft key, tactile props',
    animation_style: 'subtle',
    character_consistency: 'Consistent hands-on-journal motif; cozy wardrobe palette',
    prompt_prefix:
      'Mindful spiritual lifestyle. Warm, accessible, vertical ritual framing.',
  },
  {
    id: 'verite-street-documentary',
    name: 'Vérité Street',
    category: 'Documentary',
    description:
      'Handheld street vérité — real locations, lived-in truth, witness framing.',
    thumbnail: 'doc-verite',
    mood: 'Honest witness, unstyled truth',
    camera_language: 'Handheld medium, vérité follow, available light',
    color_palette: 'Naturalistic desaturated earth tones',
    visual_style: 'Street documentary — honest contrast, no performance',
    animation_style: 'documentary',
    character_consistency: 'Real people varied; recurring location anchor when serialized',
    prompt_prefix:
      'Street vérité documentary. Witness over performance. Vertical 9:16 real world.',
  },
  {
    id: 'investigative-mini-doc',
    name: 'Investigative Mini-Doc',
    category: 'Documentary',
    description:
      'Short investigative docs — evidence tables, location stakes, chapter rhythm.',
    thumbnail: 'doc-investigate',
    mood: 'Urgent curiosity, factual tension',
    camera_language: 'Establishing wide, evidence close-up, walking interview energy',
    color_palette: 'Cool documentary blue, practical tungsten interiors',
    visual_style: 'Investigative broadcast documentary — readable, grounded',
    animation_style: 'documentary',
    character_consistency: 'Reporter back or voice-only; consistent notebook prop',
    prompt_prefix:
      'Investigative mini-doc vertical. Fact-led, chapter beats, no sensational montage.',
  },
  {
    id: 'faceless-facts-reels',
    name: 'Faceless Facts',
    category: 'Faceless Reels',
    description:
      'High-retention fact reels — bold text-safe negative space and b-roll rhythm.',
    thumbnail: 'faceless-facts',
    mood: 'Punchy curiosity, scroll-stopping clarity',
    camera_language: 'Fast-cut friendly mediums, top-third negative space for captions',
    color_palette: 'High contrast black and gold, single accent pop',
    visual_style: 'Faceless edu-reel — clean b-roll, no host face',
    animation_style: 'dynamic',
    character_consistency: 'Strictly faceless — hands, objects, or screen recordings only',
    prompt_prefix:
      'Faceless facts reel. Caption-safe composition, bold clarity, vertical retention pacing.',
  },
  {
    id: 'pov-storytime-faceless',
    name: 'POV Storytime',
    category: 'Faceless Reels',
    description:
      'First-person storytime without showing face — POV hands, environments, props.',
    thumbnail: 'faceless-pov',
    mood: 'Confessional intimacy, narrative pull',
    camera_language: 'POV handheld, over-shoulder objects, doorway framing',
    color_palette: 'Warm indoor practicals, phone-screen glow accents',
    visual_style: 'POV storytime — relatable domestic realism',
    animation_style: 'cinematic',
    character_consistency: 'POV hands and sleeves consistent; never reveal face',
    prompt_prefix:
      'POV faceless storytime. Intimate narrator energy without on-camera face. Vertical 9:16.',
  },
  {
    id: 'stoic-wisdom-shorts',
    name: 'Stoic Wisdom Shorts',
    category: 'History',
    description:
      'Philosophy and stoic principles with marble, rain, and timeless city textures.',
    thumbnail: 'history-stoic',
    mood: 'Stoic resolve, timeless calm',
    camera_language: 'Slow push on statues and rain windows, symmetrical compositions',
    color_palette: 'Marble white, storm grey, muted bronze',
    visual_style: 'Classical philosophy aesthetic — statuesque, restrained',
    animation_style: 'cinematic',
    character_consistency: 'Philosopher silhouette or statue motif; no modern influencer look',
    prompt_prefix:
      'Stoic philosophy vertical cinema. Timeless, restrained, wisdom-first.',
  },
  {
    id: 'biohacker-clarity',
    name: 'Biohacker Clarity',
    category: 'Psychology',
    description:
      'Health optimization explainers — labs, sleep, and habit science without bro-science.',
    thumbnail: 'psychology-bio',
    mood: 'Curious optimization, clean science',
    camera_language: 'Clean lab and bedroom b-roll, macro on devices and food',
    color_palette: 'Clinical white, soft teal, natural skin',
    visual_style: 'Science-forward wellness — crisp, credible, minimal hype',
    animation_style: 'cinematic',
    character_consistency: 'Consistent wellness desk setup; face optional with stable look',
    prompt_prefix:
      'Biohacker clarity explainer. Science-credible, no miracle claims. Vertical edu framing.',
  },
  {
    id: 'old-money-aesthetic',
    name: 'Old Money Aesthetic',
    category: 'Luxury',
    description:
      'Quiet wealth cues — yacht clubs, libraries, and generational taste without logos.',
    thumbnail: 'luxury-old-money',
    mood: 'Inherited taste, quiet confidence',
    camera_language: 'Elegant wide to medium, never shaky, gliding exteriors',
    color_palette: 'Navy, cream, forest green, brass highlights',
    visual_style: 'Old money editorial — preppy restraint, no logo flex',
    animation_style: 'subtle',
    character_consistency: 'Back-of-head or profile in shadow; consistent classic wardrobe',
    prompt_prefix:
      'Old money aesthetic luxury. Quiet wealth, vertical editorial restraint.',
  },
  {
    id: 'crypto-clarity-calm',
    name: 'Crypto Clarity',
    category: 'Finance',
    description:
      'Crypto concepts explained calmly — screens, nodes, and risk-aware tone.',
    thumbnail: 'finance-crypto',
    mood: 'Calm explainer, risk-aware',
    camera_language: 'Screen capture friendly angles, desk medium, network abstract b-roll',
    color_palette: 'Dark UI blues, matrix green accent sparingly',
    visual_style: 'Tech finance explainer — dark mode friendly, readable',
    animation_style: 'cinematic',
    character_consistency: 'Faceless desk + consistent monitor glow setup',
    prompt_prefix:
      'Crypto clarity explainer. Risk-aware, no moon hype. Vertical readable tech framing.',
  },
]

export const BUILTIN_TEMPLATE_BY_ID: Record<string, StyleTemplate> = Object.fromEntries(
  BUILTIN_STYLE_TEMPLATES.map((t) => [t.id, t])
)
