export const CINEMATIC_NICHES = [
  'motivation',
  'psychology',
  'luxury',
  'documentary',
  'finance',
  'fitness',
  'spirituality',
  'storytelling',
  'faceless reels',
] as const

export type CinematicNiche = (typeof CINEMATIC_NICHES)[number]

export type NicheProfile = {
  id: CinematicNiche
  label: string
  audience: string
  vocabulary: string[]
  toneNotes: string
  hookAngles: string[]
  avoid: string[]
}

export const NICHE_PROFILES: Record<CinematicNiche, NicheProfile> = {
  motivation: {
    id: 'motivation',
    label: 'Motivation',
    audience: 'creators chasing discipline, identity shifts, and comeback arcs',
    vocabulary: ['discipline', 'comeback', 'proof', 'standard', 'relentless', 'mirror'],
    toneNotes: 'Direct, human, earned — never corny hustle-bro spam.',
    hookAngles: ['identity gap', 'quiet decision', 'before/after truth'],
    avoid: ['grindset', 'rise and shine', 'you got this king', 'level up'],
  },
  psychology: {
    id: 'psychology',
    label: 'Psychology',
    audience: 'viewers curious about behavior, attachment, and inner patterns',
    vocabulary: ['pattern', 'trigger', 'attachment', 'nervous system', 'avoidance', 'cognitive'],
    toneNotes: 'Insightful, precise, emotionally literate — like a sharp therapist on reels.',
    hookAngles: ['hidden pattern', 'why we repeat', 'the real reason'],
    avoid: ['manifest', 'vibes', 'just think positive', 'toxic positivity'],
  },
  luxury: {
    id: 'luxury',
    label: 'Luxury',
    audience: 'aspirational viewers who respond to restraint, craft, and quiet wealth',
    vocabulary: ['craft', 'heritage', 'silence', 'detail', 'patina', 'intention'],
    toneNotes: 'Understated, sensory, slow — never loud flex culture.',
    hookAngles: ['the detail nobody notices', 'what money cannot buy', 'quiet standard'],
    avoid: ['millionaire mindset', 'boss up', 'hustle harder', 'lamborghini'],
  },
  documentary: {
    id: 'documentary',
    label: 'Documentary',
    audience: 'viewers who trust observation, truth, and human detail',
    vocabulary: ['witness', 'archive', 'truth', 'memory', 'record', 'stillness'],
    toneNotes: 'Observational, honest, unhurried — vérité over performance.',
    hookAngles: ['what the camera noticed', 'the line they never said', 'evidence of a life'],
    avoid: ['game changer', 'secret hack', 'you won\'t believe'],
  },
  finance: {
    id: 'finance',
    label: 'Finance',
    audience: 'viewers learning money behavior without guru noise',
    vocabulary: ['compound', 'leverage', 'risk', 'cashflow', 'decision', 'margin'],
    toneNotes: 'Clear, grounded, adult — no get-rich-quick fantasy.',
    hookAngles: ['the cost of waiting', 'one decision', 'what rich people notice first'],
    avoid: ['passive income fast', 'financial freedom overnight', 'secret wealth'],
  },
  fitness: {
    id: 'fitness',
    label: 'Fitness',
    audience: 'viewers chasing body identity, discipline, and honest transformation',
    vocabulary: ['rep', 'recovery', 'standard', 'breath', 'form', 'consistency'],
    toneNotes: 'Physical, honest, embodied — not influencer cliché.',
    hookAngles: ['the rep nobody sees', 'body remembers', 'discipline vs motivation'],
    avoid: ['no excuses', 'summer body', 'shred fast', 'pain is weakness'],
  },
  spirituality: {
    id: 'spirituality',
    label: 'Spirituality',
    audience: 'viewers seeking meaning, surrender, and inner stillness',
    vocabulary: ['stillness', 'surrender', 'grace', 'presence', 'return', 'belonging'],
    toneNotes: 'Gentle, spacious, sincere — never preachy or vague woo.',
    hookAngles: ['what silence taught', 'sign you ignored', 'return to yourself'],
    avoid: ['universe will provide', 'high vibration only', 'manifest instantly'],
  },
  storytelling: {
    id: 'storytelling',
    label: 'Storytelling',
    audience: 'viewers who stay for character, emotion, and narrative payoff',
    vocabulary: ['memory', 'turn', 'aftermath', 'choice', 'weight', 'return'],
    toneNotes: 'Character-first, cinematic, emotionally sequenced.',
    hookAngles: ['the moment everything shifted', 'what they never said', 'last time'],
    avoid: ['story time', 'let me tell you', 'once upon a time'],
  },
  'faceless reels': {
    id: 'faceless reels',
    label: 'Faceless Reels',
    audience: 'scroll-native viewers who want punchy faceless b-roll storytelling',
    vocabulary: ['cut', 'beat', 'hook', 'retention', 'visual', 'punch'],
    toneNotes: 'Fast, visual, voiceover-led — every line earns the next frame.',
    hookAngles: ['pattern interrupt', 'contrarian truth', 'watch what happens'],
    avoid: ['hey guys', 'welcome back', 'in this video'],
  },
}

const NICHE_ALIASES: Record<string, CinematicNiche> = {
  motivation: 'motivation',
  motivational: 'motivation',
  psychology: 'psychology',
  mental: 'psychology',
  luxury: 'luxury',
  premium: 'luxury',
  documentary: 'documentary',
  doc: 'documentary',
  finance: 'finance',
  money: 'finance',
  financial: 'finance',
  fitness: 'fitness',
  gym: 'fitness',
  spirituality: 'spirituality',
  spiritual: 'spirituality',
  storytelling: 'storytelling',
  story: 'storytelling',
  cinematic: 'storytelling',
  emotional: 'storytelling',
  faceless: 'faceless reels',
  'faceless reels': 'faceless reels',
  reels: 'faceless reels',
}

const TOPIC_NICHE_HINTS: Array<{ niche: CinematicNiche; pattern: RegExp }> = [
  { niche: 'psychology', pattern: /\b(psycholog|therapy|trauma|attachment|mindset|behavior|cognitive|anxiety|pattern)\b/i },
  { niche: 'finance', pattern: /\b(finance|money|invest|wealth|debt|budget|stock|crypto|compound|salary)\b/i },
  { niche: 'fitness', pattern: /\b(fitness|gym|workout|muscle|train|rep|cardio|body|weight loss)\b/i },
  { niche: 'luxury', pattern: /\b(luxury|premium|designer|craft|heritage|elegant|bespoke)\b/i },
  { niche: 'spirituality', pattern: /\b(spiritual|meditat|faith|soul|prayer|mindful|presence|god)\b/i },
  { niche: 'documentary', pattern: /\b(documentary| vérité|archive|witness|real story|investigation)\b/i },
  { niche: 'motivation', pattern: /\b(motivat|discipline|comeback|grind|habit|success|never give up)\b/i },
  { niche: 'faceless reels', pattern: /\b(faceless|b-roll|reel|short form|vertical|hook retention)\b/i },
]

export function coerceNiche(raw: unknown, fallback: CinematicNiche = 'storytelling'): CinematicNiche {
  if (typeof raw !== 'string') return fallback
  const key = raw.trim().toLowerCase()
  return NICHE_ALIASES[key] ?? fallback
}

export function inferNicheFromBrief(input: {
  topic: string
  tone?: string
  style?: string
  niche?: string
}): CinematicNiche {
  if (input.niche) return coerceNiche(input.niche)

  const styleNiche = coerceNiche(input.style ?? input.tone ?? '', 'storytelling')
  if (styleNiche !== 'storytelling' || /^(motivation|documentary)$/.test(String(input.style ?? input.tone ?? ''))) {
    if (input.style === 'motivational') return 'motivation'
    if (input.style === 'documentary') return 'documentary'
    if (input.style === 'emotional') return 'storytelling'
    if (styleNiche !== 'storytelling') return styleNiche
  }

  for (const hint of TOPIC_NICHE_HINTS) {
    if (hint.pattern.test(input.topic)) return hint.niche
  }

  return 'storytelling'
}

export function buildNicheLayer(niche: CinematicNiche): string {
  const profile = NICHE_PROFILES[niche]
  return `
NICHE LOCK — ${profile.label.toUpperCase()} (strict, no drift):
- Audience: ${profile.audience}
- Vocabulary to weave in naturally: ${profile.vocabulary.join(', ')}
- Tone: ${profile.toneNotes}
- Hook angles to lean on: ${profile.hookAngles.join(' · ')}
- NEVER use or imply: ${profile.avoid.join(', ')}
- Every hook, scene, caption, and narration beat must feel native to ${profile.label}.
- If the idea spans topics, filter everything through ${profile.label} — do not go generic.
`.trim()
}
