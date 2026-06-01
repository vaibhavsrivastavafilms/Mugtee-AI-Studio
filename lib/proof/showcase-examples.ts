import { quickCutStudioHref } from '@/lib/create/routes'

/** Display niches for the Creator Proof Layer — independent of pipeline niche enums. */
export type ProofNiche =
  | 'Business'
  | 'AI'
  | 'Documentary'
  | 'Motivation'
  | 'Psychology'
  | 'Storytelling'

export type ProofShowcaseExample = {
  id: string
  topic: string
  niche: ProofNiche
  hook: string
  scriptPreview: string
  captionPreview: string
  thumbnailIdea: string
  fullHook: string
  fullScript: string
  /** 2–3 cinematic frame URLs (Unsplash placeholders — illustrative only). */
  storyboardPreview: string[]
  caption: string
  thumbnailConcept: string
}

/** Illustrative platform metrics — no public stats API; replace when live aggregates exist. */
export const PROOF_TRUST_METRICS = {
  scriptsGenerated: '12,400+',
  projectsCreated: '3,800+',
  avgGenerationTime: '~90 sec',
  creatorSuccessStories: '240+',
} as const

export const BEFORE_AFTER_EXAMPLE = {
  creatorIdea: 'Why Nokia Failed',
  creatorPrompt:
    'Why Nokia failed — business documentary reel about missing the smartphone shift',
  mugteeOutput: [
    'Pattern-interrupt hook: "Nokia didn\'t lose to Apple. It lost to the moment it stopped listening."',
    '4-beat script arc: dominance → blind spot → collapse → lesson for builders today',
    'Storyboard frames: Helsinki HQ archive · iPhone launch split-screen · empty R&D hallway',
    'Caption pack with contrarian hook + save-worthy CTA',
    'Thumbnail concept: cracked Nokia brick phone beside glowing iPhone — gold text in negative space',
    'Export-ready 9:16 reel package — script, scenes, narration direction',
  ],
} as const

export type ProofEmptyStarter = {
  id: string
  label: string
  topic: string
  niche: ProofNiche
}

/** One-click starters — prefill topic only; never auto-run generation. */
export const EMPTY_STATE_STARTERS: ProofEmptyStarter[] = [
  {
    id: 'opposite-is-true',
    label: 'The Opposite Is True',
    topic:
      'The Opposite Is True — contrarian psychology reel on why the advice that sounds wise keeps you stuck',
    niche: 'Psychology',
  },
  {
    id: 'luxury-attention',
    label: 'How Luxury Brands Control Attention',
    topic:
      'How Luxury Brands Control Attention — cinematic business reel on scarcity, ritual, and the psychology of desire',
    niche: 'Business',
  },
  {
    id: 'psychology-silence',
    label: 'The Psychology of Silence',
    topic:
      'The Psychology of Silence — intimate psychology reel on pauses, tension, and what we hear in the gaps',
    niche: 'Psychology',
  },
  {
    id: 'motivation-script',
    label: 'Motivation Script',
    topic:
      'Nobody talks about discipline like this — the quiet decision before the comeback arc begins',
    niche: 'Motivation',
  },
]

export function proofStarterHref(starter: ProofEmptyStarter): string {
  return quickCutStudioHref({ topic: starter.topic })
}

const UNSPLASH = {
  business:
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=700&fit=crop&q=80',
  phone:
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=700&fit=crop&q=80',
  documentary:
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=400&h=700&fit=crop&q=80',
  motivation:
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=700&fit=crop&q=80',
  psychology:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=700&fit=crop&q=80',
  storytelling:
    'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=400&h=700&fit=crop&q=80',
  ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=700&fit=crop&q=80',
  archive:
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=700&fit=crop&q=80',
} as const

export const SHOWCASE_EXAMPLES: ProofShowcaseExample[] = [
  {
    id: 'nokia-failed',
    topic: 'Why Nokia Failed',
    niche: 'Business',
    hook: 'Nokia didn\'t lose to Apple. It lost to the moment it stopped listening.',
    scriptPreview:
      'Scene 1 · Nokia dominates global mobile. Scene 2 · The iPhone arrives — internal memos dismiss it. Scene 3 · Market share collapses in 36 months.',
    captionPreview: 'The fall wasn\'t technology. It was arrogance. Save this before your next product meeting.',
    thumbnailIdea: 'Cracked Nokia brick beside glowing iPhone — "THEY STOPPED LISTENING" in gold serif',
    fullHook:
      'Nokia didn\'t lose to Apple. It lost to the moment it stopped listening — when the world changed and the boardroom stayed still.',
    fullScript: `Scene 1 · [0:00]
Visual:    Archive footage aesthetic — Nokia campus, 2007 market dominance headlines.
Voiceover: "In 2007, one in three phones on Earth said Nokia."
Camera:    Slow push on glass tower, cold Nordic light.

Scene 2 · [0:12]
Visual:    Split screen — iPhone launch keynote vs Nokia internal meeting room, unchanged.
Voiceover: "They saw the iPhone. They called it a niche toy."
Camera:    Handheld vérité, tension in the pause.

Scene 3 · [0:28]
Visual:    Empty R&D hallway, lights flickering. Market share graph craters.
Voiceover: "Thirty-six months later, the giant was a case study."
Camera:    Wide hold, documentary stillness.

Scene 4 · [0:42]
Visual:    Founder at whiteboard — one question written large: "Who are we not listening to?"
Voiceover: "The lesson isn't about phones. It's about humility at scale."
Camera:    Intimate close-up, warm key light.`,
    storyboardPreview: [UNSPLASH.business, UNSPLASH.phone, UNSPLASH.archive],
    caption:
      'Nokia had everything — distribution, brand, engineers. They lost because they stopped listening.\n\nSave this. Send it to someone building the next thing.\n\n#business #strategy #mugtee',
    thumbnailConcept:
      'Split composition: left third holds a cracked Nokia 3310 on matte charcoal; right negative space carries gold serif text "THEY STOPPED LISTENING". Teal-amber grade, documentary gravitas.',
  },
  {
    id: 'ai-jobs-shift',
    topic: 'How AI Is Reshaping Work',
    niche: 'AI',
    hook: 'AI won\'t take your job. Someone using AI will — and they already started.',
    scriptPreview:
      'Hook cut on keyboard glow → three jobs transforming → the skill that still matters: taste and judgment.',
    captionPreview: 'The shift is already here. Are you directing it or reacting to it?',
    thumbnailIdea: 'Human hand over AI-generated storyboard frames — "DIRECT THE SHIFT"',
    fullHook:
      'AI won\'t take your job. Someone using AI will — and they started three months ago while you were debating whether to try it.',
    fullScript: `Scene 1 · [0:00]
Visual:    Macro keyboard, ChatGPT glow reflecting on fingers mid-type.
Voiceover: "Everyone is asking the wrong question."
Camera:    Macro POV, high contrast.

Scene 2 · [0:08]
Visual:    Three quick cuts — designer approving AI frames, editor trimming AI draft, founder pitching AI-assisted deck.
Voiceover: "It's not replacement. It's compression — idea to output in one sitting."
Camera:    Snap-cut energy, faceless B-roll.

Scene 3 · [0:22]
Visual:    Director at monitor, rejecting one frame, approving another — human taste visible.
Voiceover: "The skill that survived every tool: judgment. Knowing what to keep."
Camera:    Over-shoulder, warm monitor glow.

Scene 4 · [0:38]
Visual:    Empty chair → person sits, opens Mugtee, types one line. Cut to reel exporting.
Voiceover: "Start directing. The window is open — not forever."
Camera:    Match-cut on enter key.`,
    storyboardPreview: [UNSPLASH.ai, UNSPLASH.business, UNSPLASH.phone],
    caption:
      'AI won\'t take your job. Someone using AI will.\n\nThe creators winning right now aren\'t waiting for permission.\n\n#ai #creator #futureofwork #mugtee',
    thumbnailConcept:
      'Faceless frame: hands on keyboard, holographic storyboard ghosted behind. Bold sans headline "DIRECT THE SHIFT" in gold. Cyber-amber palette.',
  },
  {
    id: 'apple-design-bet',
    topic: 'When Apple Bet on Design',
    niche: 'Documentary',
    hook: 'They fired the focus group. Then they changed how the world touches glass.',
    scriptPreview:
      'Archive Jony Ive voiceover aesthetic — prototype sketches, rejected buttons, one seamless surface.',
    captionPreview: 'Design isn\'t decoration. It\'s the decision to remove everything else.',
    thumbnailIdea: 'iPhone prototype sketch on linen paper — "ONE SURFACE" in negative space',
    fullHook:
      'They fired the focus group. Then they changed how the world touches glass — one decision to remove everything that didn\'t belong.',
    fullScript: `Scene 1 · [0:00]
Visual:    Pencil sketch of iPhone prototype — no home button, annotated margins.
Voiceover: "The brief was impossible: one surface. No seams."
Camera:    Macro detail, paper texture.

Scene 2 · [0:14]
Visual:    Montage of rejected designs — buttons, bezels, compromises stacked and crossed out.
Voiceover: "Every meeting said add something. The studio kept subtracting."
Camera:    Overhead flat lay, documentary pacing.

Scene 3 · [0:30]
Visual:    Finger swipe on glass — first contact, sound implied.
Voiceover: "The moment the world touched glass, categories disappeared."
Camera:    Intimate close-up, single soft key.

Scene 4 · [0:45]
Visual:    Empty design studio at dusk — one lamp, one model on table.
Voiceover: "Courage isn't loud. It's what you refuse to ship."
Camera:    Wide hold, golden hour.`,
    storyboardPreview: [UNSPLASH.documentary, UNSPLASH.phone, UNSPLASH.storytelling],
    caption:
      'Apple didn\'t win on specs. They won on subtraction.\n\nWatch twice — the second pass is about your product.\n\n#documentary #design #apple #mugtee',
    thumbnailConcept:
      'Off-center prototype sketch on warm linen; deep negative space holds serif gold "ONE SURFACE". Warm ivory grade, museum quiet.',
  },
  {
    id: 'discipline-identity',
    topic: 'The Rep Nobody Sees',
    niche: 'Motivation',
    hook: 'Everyone posts the result. Nobody posts the rep that made it boring enough to win.',
    scriptPreview:
      'Macro gym B-roll → timer ticks → bar settles → silence as the payoff.',
    captionPreview: 'The boring rep is the whole story. Send this to someone chasing shortcuts.',
    thumbnailIdea: 'Chalk on barbell knurling — "THE BORING REP" in punchy sans',
    fullHook:
      'Everyone posts the result. Nobody posts the rep that made it boring enough to win — the one you did when nobody clapped.',
    fullScript: `Scene 1 · [0:00]
Visual:    Macro chalk dust on steel knurling — texture punch, no face.
Voiceover: "This is the rep that never goes viral."
Camera:    Macro insert, hard side light.

Scene 2 · [0:06]
Visual:    Timer ticks. Hands grip. Breath visible.
Voiceover: "Boring is the strategy. Consistency is the flex nobody films."
Camera:    Low angle POV, kinetic energy.

Scene 3 · [0:18]
Visual:    Weight rises — frame tightens with effort, not celebration.
Voiceover: "Discipline isn't motivation. It's identity on repeat."
Camera:    Tight crop, high contrast.

Scene 4 · [0:32]
Visual:    Bar back on rack. Gym empty. Hold on stillness.
Voiceover: "Winning looks quiet from the outside."
Camera:    Static medium, softening ambient.`,
    storyboardPreview: [UNSPLASH.motivation, UNSPLASH.motivation, UNSPLASH.motivation],
    caption:
      'The boring rep is the whole story.\n\nSave this. Finish it tonight.\n\n#motivation #discipline #mugtee',
    thumbnailConcept:
      'Macro chalk-on-steel texture fills frame; bold condensed "THE BORING REP" anchored bottom-right in gold. High-contrast gym grade.',
  },
  {
    id: 'psychology-attention',
    topic: 'The Hidden Psychology of Attention',
    niche: 'Psychology',
    hook: 'You were never addicted to your phone. You were addicted to the feeling of almost being chosen.',
    scriptPreview:
      'Phone face-down → thumb frozen → mirror reflection — pattern named without lecturing.',
    captionPreview: 'The scroll was never about content. It was about almost being chosen.',
    thumbnailIdea: 'Phone face-down, notification glow — "ALMOST CHOSEN" in soft serif',
    fullHook:
      'You were never addicted to your phone. You were addicted to the feeling of almost being chosen — the notification that might mean you matter.',
    fullScript: `Scene 1 · [0:00]
Visual:    Phone face-down on wooden table. One notification glow under glass.
Voiceover: "The scroll was never about content."
Camera:    Macro close-up, muted neutrals.

Scene 2 · [0:10]
Visual:    Thumb hovers — never presses. Tension in the pause.
Voiceover: "It was about almost being chosen."
Camera:    Handheld detail, cool screen vs warm skin.

Scene 3 · [0:22]
Visual:    Mirror catches subject mid-glance — doubled loneliness.
Voiceover: "The pattern isn't the phone. It's the almost."
Camera:    Intimate mirror framing, soft shadow.

Scene 4 · [0:36]
Visual:    Phone flipped face-down again. Silence earns the last frame.
Voiceover: "You can put it down. That is also a choice."
Camera:    Wide hold, fading light.`,
    storyboardPreview: [UNSPLASH.psychology, UNSPLASH.phone, UNSPLASH.psychology],
    caption:
      'The scroll was never about content. It was about almost being chosen.\n\nSend this to someone who needs the mirror.\n\n#psychology #attention #mugtee',
    thumbnailConcept:
      'Phone face-down on wood, pulsing notification edge-light. Serif gold "ALMOST CHOSEN" in upper negative space. Muted intimate grade.',
  },
  {
    id: 'unspoken-goodbye',
    topic: 'The Line They Never Said',
    niche: 'Storytelling',
    hook: 'She packed the car in silence. That was the whole goodbye.',
    scriptPreview:
      'Two mugs on a table → car door shuts → empty chair. Turn without dialogue.',
    captionPreview: 'Some goodbyes never get a speech. Just a door closing.',
    thumbnailIdea: 'Two mugs, one untouched — "THE WHOLE GOODBYE" in teal-amber serif',
    fullHook:
      'She packed the car in silence. That was the whole goodbye — no speech, no closure, just a door closing on everything unsaid.',
    fullScript: `Scene 1 · [0:00]
Visual:    Two mugs on kitchen table — one still full, morning light between them.
Voiceover: "Some goodbyes don't get a speech."
Camera:    Character medium close-up, soft practicals.

Scene 2 · [0:14]
Visual:    Car door shuts — sound implied. House window watches, empty.
Voiceover: "Just a door. Just a choice already made."
Camera:    Wide to medium cut, overcast contrast.

Scene 3 · [0:28]
Visual:    Empty chair at the table. Mug still full. Time stopped in ceramic.
Voiceover: "What they never said fills the room anyway."
Camera:    Static wide, emotional hold.

Scene 4 · [0:42]
Visual:    Hand reaches for the cold mug — doesn't lift it. Cut to black.
Voiceover: "Love doesn't always get a line. Sometimes it gets a silence."
Camera:    Slow push-in, teal-amber grade.`,
    storyboardPreview: [UNSPLASH.storytelling, UNSPLASH.storytelling, UNSPLASH.storytelling],
    caption:
      'Some goodbyes never get a speech. Just a door closing.\n\nWatch until the last frame. It lands different.\n\n#storytelling #cinematic #mugtee',
    thumbnailConcept:
      'Kitchen table, two mugs — one untouched. Teal shadow + amber highlight. Serif "THE WHOLE GOODBYE" in the negative space above.',
  },
  {
    id: 'startup-pivot',
    topic: 'The Pivot That Saved the Company',
    niche: 'Business',
    hook: 'They were 90 days from running out of cash. The product that saved them was never in the pitch deck.',
    scriptPreview:
      'Burn rate ticker → whiteboard erased → one customer call changes the roadmap.',
    captionPreview: 'The pivot wasn\'t failure. It was the first honest decision.',
    thumbnailIdea: 'Erased whiteboard with one sentence remaining — "LISTEN TO ONE USER"',
    fullHook:
      'They were 90 days from running out of cash. The product that saved them was never in the pitch deck — it came from one customer call they almost skipped.',
    fullScript: `Scene 1 · [0:00]
Visual:    Slack notifications pile up — runway: 90 days. Founder's reflection in monitor.
Voiceover: "The deck said scale. The bank account said survive."
Camera:    Over-shoulder, cool desk light.

Scene 2 · [0:12]
Visual:    Whiteboard wiped clean — except one sticky note: "What did Sarah actually need?"
Voiceover: "One call. One user. One honest question."
Camera:    Medium shot, handheld energy.

Scene 3 · [0:26]
Visual:    Product sketch morphs — feature list crossed out, one workflow circled.
Voiceover: "The pivot wasn't failure. It was the first true decision."
Camera:    Top-down flat lay, snap cuts.

Scene 4 · [0:40]
Visual:    Team small but focused — shipping one thing well. Notification: first paying customer.
Voiceover: "Build what one person can't live without. Then find the second."
Camera:    Wide hold, warm turnaround light.`,
    storyboardPreview: [UNSPLASH.business, UNSPLASH.archive, UNSPLASH.business],
    caption:
      'The pivot wasn\'t failure. It was the first honest decision.\n\nFounders — save this before the next roadmap meeting.\n\n#startup #business #mugtee',
    thumbnailConcept:
      'Whiteboard mostly erased; one sticky note centered: "LISTEN TO ONE USER". Gold sans headline, startup documentary grade.',
  },
  {
    id: 'ai-creator-tools',
    topic: 'AI Tools Every Creator Needs',
    niche: 'AI',
    hook: 'The creators pulling ahead aren\'t using more AI. They\'re using less — but better.',
    scriptPreview:
      'Tool overload montage → one workflow → reel exported in a single session.',
    captionPreview: 'Less tools. Better direction. That\'s the edge.',
    thumbnailIdea: 'Minimal desk — one screen, one idea typed — "LESS BUT BETTER"',
    fullHook:
      'The creators pulling ahead aren\'t using more AI. They\'re using less — but better — one workflow from idea to export.',
    fullScript: `Scene 1 · [0:00]
Visual:    Browser tabs multiply — twelve tools, zero output. Cursor hesitates.
Voiceover: "More tools didn't make them faster. It made them tired."
Camera:    Screen capture aesthetic, chaotic energy.

Scene 2 · [0:10]
Visual:    Tabs closed. One prompt typed. One studio open.
Voiceover: "One idea. One arc. One session."
Camera:    Clean over-shoulder, warm monitor glow.

Scene 3 · [0:24]
Visual:    Hook appears → storyboard frames populate → caption pack lands.
Voiceover: "Hook, script, storyboard, export — held as one decision."
Camera:    UI reveal pacing, cinematic cuts.

Scene 4 · [0:38]
Visual:    Reel plays on phone. Creator exhales — not perfect, done.
Voiceover: "Ship the reel. Learn from the reel. Repeat tomorrow."
Camera:    Phone in hand, golden hour window.`,
    storyboardPreview: [UNSPLASH.ai, UNSPLASH.ai, UNSPLASH.phone],
    caption:
      'Less tools. Better direction. That\'s the edge.\n\nOne session. One reel. Start tonight.\n\n#ai #creatortools #mugtee',
    thumbnailConcept:
      'Minimal creator desk — single monitor, one line of text glowing. Gold "LESS BUT BETTER" in deep negative space. Clean cyber-warm grade.',
  },
]

export function getShowcaseExample(id: string): ProofShowcaseExample | undefined {
  return SHOWCASE_EXAMPLES.find((e) => e.id === id)
}

export function proofNicheLabel(niche: ProofNiche): string {
  return niche
}

/** Dashboard showcase category filters — maps UI labels to proof niches. */
export const SHOWCASE_FEATURED_CATEGORIES = [
  { id: 'all', label: 'All', niches: null as ProofNiche[] | null },
  { id: 'psychology', label: 'Psychology', niches: ['Psychology'] as ProofNiche[] },
  { id: 'luxury', label: 'Luxury', niches: ['Business'] as ProofNiche[] },
  { id: 'documentary', label: 'Documentary', niches: ['Documentary'] as ProofNiche[] },
  { id: 'storytelling', label: 'Storytelling', niches: ['Storytelling', 'Motivation'] as ProofNiche[] },
] as const

export type ShowcaseCategoryId = (typeof SHOWCASE_FEATURED_CATEGORIES)[number]['id']

export function filterShowcaseByCategory(
  categoryId: ShowcaseCategoryId
): ProofShowcaseExample[] {
  const category = SHOWCASE_FEATURED_CATEGORIES.find((c) => c.id === categoryId)
  if (!category?.niches) return SHOWCASE_EXAMPLES
  return SHOWCASE_EXAMPLES.filter((e) => category.niches!.includes(e.niche))
}

/** Inspiration feed items for dashboard — hooks, scenes, scripts, visual directions. */
export const SHOWCASE_INSPIRATION_FEED = [
  ...SHOWCASE_EXAMPLES.slice(0, 4).map((e) => ({
    id: e.id,
    type: 'hook' as const,
    label: e.hook.slice(0, 72) + (e.hook.length > 72 ? '…' : ''),
    topic: e.topic,
    niche: e.niche,
  })),
  ...SHOWCASE_EXAMPLES.slice(0, 3).map((e) => ({
    id: `${e.id}-script`,
    type: 'script' as const,
    label: e.scriptPreview.slice(0, 72) + (e.scriptPreview.length > 72 ? '…' : ''),
    topic: e.topic,
    niche: e.niche,
  })),
  ...SHOWCASE_EXAMPLES.slice(0, 3).map((e) => ({
    id: `${e.id}-visual`,
    type: 'visual' as const,
    label: e.thumbnailIdea.slice(0, 72) + (e.thumbnailIdea.length > 72 ? '…' : ''),
    topic: e.topic,
    niche: e.niche,
  })),
].slice(0, 8)
