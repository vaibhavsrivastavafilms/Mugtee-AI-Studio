import type { CinematicNiche } from '@/lib/cinematic/niches'

export type ShowcaseScene = {
  title: string
  description: string
  duration: number
  visualPrompt: string
  cameraAngle: string
  lightingMood: string
  environment: string
  colorPalette: string
  movementStyle: string
}

export type ShowcaseExample = {
  slug: string
  title: string
  niche: CinematicNiche
  hook: string
  summary: string
  scenes: ShowcaseScene[]
  captions: string[]
  voiceStyle: string
  visualDirection: string
  coverMood: string
}

export const INSPIRATION_PROMPTS = [
  'Why successful people feel empty',
  'Luxury is quiet',
  'The hidden psychology of attention',
  'Nobody talks about discipline like this',
  'What the camera noticed that you missed',
  'The cost of always being understood',
  'The silence before a comeback',
  'What your reel feels like at 2am',
  'The moment discipline becomes identity',
] as const

export const NICHE_INSPIRATION_PROMPTS = [
  {
    niche: 'documentary',
    label: 'Documentary hook',
    prompt:
      'Try a cinematic documentary hook — the last person who remembers how this was made.',
  },
  {
    niche: 'psychology',
    label: 'Psychology tension',
    prompt:
      'Open on the psychology of why we chase approval when nobody is watching us win.',
  },
  {
    niche: 'luxury',
    label: 'Quiet luxury reel',
    prompt:
      'Luxury is quiet — a reel about restraint, craft, and details only patience reveals.',
  },
  {
    niche: 'faceless reels',
    label: 'Faceless retention reel',
    prompt:
      'Faceless reel: macro B-roll, desk light, and the psychology of money nobody admits.',
  },
  {
    niche: 'motivation',
    label: 'Motivational arc',
    prompt:
      'Nobody talks about discipline like this — the quiet decision before the comeback begins.',
  },
  {
    niche: 'storytelling',
    label: 'Emotional brand story',
    prompt:
      'An emotional brand story built from memory — not features, but the feeling of being understood.',
  },
] as const

export function getRotatedInspirationPrompts(count = 4): string[] {
  const pool = [...INSPIRATION_PROMPTS]
  const dayOffset = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % pool.length
  const rotated = [...pool.slice(dayOffset), ...pool.slice(0, dayOffset)]
  return rotated.slice(0, count)
}

export function getRotatedNichePrompts(count = 3) {
  const pool = [...NICHE_INSPIRATION_PROMPTS]
  const dayOffset = Math.floor(Date.now() / (1000 * 60 * 60 * 12)) % pool.length
  const rotated = [...pool.slice(dayOffset), ...pool.slice(0, dayOffset)]
  return rotated.slice(0, count)
}

export const STARTER_PROMPT_CHIPS = [
  {
    label: 'Documentary Hook',
    prompt:
      'Try a cinematic documentary hook — the last witness to a disappearing craft, told through hands and patience.',
  },
  {
    label: 'Luxury Reel',
    prompt:
      'Luxury is quiet — a restrained reel about craft, silence, and the details nobody notices until they are gone.',
  },
  {
    label: 'Psychology Hook',
    prompt:
      'The hidden psychology of why successful people feel empty when nobody is watching them win.',
  },
  {
    label: 'Motivational Short',
    prompt:
      'Nobody talks about discipline like this — the quiet decision before the comeback arc begins.',
  },
  {
    label: 'Faceless Finance Reel',
    prompt:
      'Faceless finance reel: the psychology of money decisions nobody admits — desk light, macro B-roll, adult clarity.',
  },
  {
    label: 'Emotional Brand Story',
    prompt:
      'An emotional brand story built from memory — not features, but the feeling of being understood.',
  },
] as const

export const HOMEPAGE_TRUST_LINES = [
  'Emotionally immersive storytelling',
  'Editorially restrained · atmospherically alive',
  'Creator-owned cinematic worlds',
] as const

export const CREATOR_TYPE_SHOWCASE = [
  { label: 'Documentary', example: 'Witness & craft' },
  { label: 'Psychology', example: 'Attention & attachment' },
  { label: 'Luxury', example: 'Quiet gold restraint' },
  { label: 'Atmospheric reels', example: 'Mood-first sequencing' },
  { label: 'Storytelling', example: 'Emotional arc worlds' },
  { label: 'Identity', example: 'Voice & permanence' },
] as const

export type OutputPreviewCard = {
  slug: string
  title: string
  niche: CinematicNiche
  hook: string
  scriptSnippet: string
  captionPreview: string
  coverMood: string
  frameLabel: string
  visualPrompt: string
}

export function getOutputPreviewCards(limit = 5): OutputPreviewCard[] {
  return SHOWCASE_EXAMPLES.slice(0, limit).map((example) => {
    const scene = example.scenes[0]
    return {
      slug: example.slug,
      title: example.title,
      niche: example.niche,
      hook: example.hook,
      scriptSnippet: scene?.description || example.summary,
      captionPreview: example.captions[0] || example.hook,
      coverMood: example.coverMood,
      frameLabel: scene?.title || 'Scene 1',
      visualPrompt: scene?.visualPrompt || example.visualDirection,
    }
  })
}

export const TRENDING_CINEMATIC_STYLES = [
  { label: 'Intimate psychology', niche: 'psychology', mood: 'Close framing · soft window light' },
  { label: 'Quiet luxury', niche: 'luxury', mood: 'Warm gold · slow drift' },
  { label: 'Vérité documentary', niche: 'documentary', mood: 'Handheld · natural light' },
  { label: 'Faceless retention', niche: 'faceless reels', mood: 'Macro B-roll · punchy cuts' },
] as const

export const POPULAR_CREATOR_FORMATS = [
  { label: 'Emotional hook → 4-beat arc', duration: '45–60s' },
  { label: 'Pattern interrupt opener', duration: '30s' },
  { label: 'Voiceover-led story reel', duration: '60–90s' },
  { label: 'Visual metaphor peak', duration: '45s' },
] as const

export const RECENT_NICHE_SIGNALS = [
  'psychology',
  'storytelling',
  'motivation',
  'faceless reels',
  'documentary',
  'luxury',
] as const

export const SHOWCASE_EXAMPLES: ShowcaseExample[] = [
  {
    slug: 'psychology-attention',
    title: 'The Hidden Psychology of Attention',
    niche: 'psychology',
    hook: 'You were never addicted to your phone. You were addicted to the feeling of almost being chosen.',
    summary:
      'A 45-second psychology reel about attention, avoidance, and the nervous system — told through objects, not lectures.',
    coverMood: 'Muted neutrals · intimate close-ups',
    visualDirection: 'Interior psychology — mirrors, notifications, stillness. Observational, emotionally literate.',
    voiceStyle: 'calm_storyteller',
    captions: [
      'The scroll was never about content. It was about almost being chosen.',
      'Send this to someone who needs the mirror.',
      '#psychology',
      '#attachment',
      '#mugtee',
    ],
    scenes: [
      {
        title: 'Pattern interrupt',
        description: 'Phone face-down on a wooden table. One notification glow — we feel the pull before we see the screen.',
        duration: 4,
        visualPrompt:
          'Intimate close-up on a phone face-down, notification light pulsing under glass. Muted neutrals, soft shadow pockets.',
        cameraAngle: 'Macro close-up, shallow depth',
        lightingMood: 'Soft window light, gentle falloff',
        environment: 'Quiet bedroom desk at dusk',
        colorPalette: 'Muted neutrals, soft skin tones',
        movementStyle: 'Static hold with subtle push-in',
      },
      {
        title: 'The pattern',
        description: 'Thumb hovers — never presses. The body remembers what the mind refuses to name.',
        duration: 5,
        visualPrompt:
          'Handheld detail of a thumb frozen above a screen. Tension in the pause, not the action.',
        cameraAngle: 'Handheld medium close-up',
        lightingMood: 'Cool screen glow vs warm ambient',
        environment: 'Same room, tighter isolation',
        colorPalette: 'Blue screen wash, warm skin',
        movementStyle: 'Handheld micro-shake',
      },
      {
        title: 'Emotional peak',
        description: 'Mirror reflection — viewer sees themselves seeing. The pattern is not the phone. It is the almost.',
        duration: 5,
        visualPrompt:
          'Mirror catches the subject mid-glance — doubled loneliness, no exposition. Psychology-native framing.',
        cameraAngle: 'Intimate close-up via mirror',
        lightingMood: 'Single soft key, emotional shadow',
        environment: 'Bathroom mirror, lived-in detail',
        colorPalette: 'Desaturated, shadow pockets',
        movementStyle: 'Slow push-in',
      },
      {
        title: 'Aftertaste',
        description: 'Phone flipped face-down again. Silence earns the last frame.',
        duration: 4,
        visualPrompt: 'Return to stillness. Phone down. Breath out. Hold on the quiet choice.',
        cameraAngle: 'Wide hold, negative space',
        lightingMood: 'Fading natural light',
        environment: 'Desk again — same object, different feeling',
        colorPalette: 'Muted neutrals',
        movementStyle: 'Slow drift',
      },
    ],
  },
  {
    slug: 'luxury-is-quiet',
    title: 'Luxury Is Quiet',
    niche: 'luxury',
    hook: 'Real luxury does not announce itself. It arrives after everyone else has stopped trying.',
    summary:
      'An understated 30-second luxury reel — craft, restraint, and the detail nobody posts about.',
    coverMood: 'Warm gold · polished restraint',
    visualDirection: 'Understated craft — tactile materials, negative space, slow camera. Never loud flex.',
    voiceStyle: 'deep_trailer',
    captions: [
      'Luxury is not louder. It is slower.',
      'Save this. Come back when you are ready to notice.',
      '#luxury',
      '#craft',
      '#mugtee',
    ],
    scenes: [
      {
        title: 'Opening detail',
        description: 'Stitching on leather — the sound implied, not heard. Craft over logo.',
        duration: 4,
        visualPrompt:
          'Extreme close-up on leather stitching, warm gold highlights on charcoal. Slow, sensory, restrained.',
        cameraAngle: 'Macro detail, elegant framing',
        lightingMood: 'Polished warm key, restrained contrast',
        environment: 'Artisan workbench, minimal clutter',
        colorPalette: 'Warm gold, deep charcoal, ivory',
        movementStyle: 'Slow drift',
      },
      {
        title: 'The standard',
        description: 'Hands adjust a cuff — no face needed. Standard is felt, not stated.',
        duration: 5,
        visualPrompt:
          'Medium shot of hands adjusting fabric — heritage in gesture, not brand.',
        cameraAngle: 'Medium shot, symmetrical balance',
        lightingMood: 'Soft side light, patina visible',
        environment: 'Tailored interior, negative space',
        colorPalette: 'Warm gold, soft ivory',
        movementStyle: 'Slow dolly',
      },
      {
        title: 'Landing',
        description: 'Empty chair by a window. The room already decided who belongs.',
        duration: 5,
        visualPrompt:
          'Wide hold on an empty chair in golden hour light — aftertaste of quiet wealth.',
        cameraAngle: 'Wide hold, 35mm feel',
        lightingMood: 'Golden hour, long shadows',
        environment: 'Minimal interior, city haze outside',
        colorPalette: 'Warm gold, deep shadow',
        movementStyle: 'Static hold',
      },
    ],
  },
  {
    slug: 'documentary-last-witness',
    title: 'The Last Witness',
    niche: 'documentary',
    hook: 'The camera did not find a story. It found a silence someone left behind.',
    summary:
      'Observational documentary pacing — vérité framing, human detail, unhurried truth.',
    coverMood: 'Earth tones · handheld realism',
    visualDirection: 'Witness over performance — available light, real locations, honest contrast.',
    voiceStyle: 'calm_storyteller',
    captions: [
      'Some truths only survive because someone stayed to notice.',
      'Watch twice. The second pass hurts different.',
      '#documentary',
      '#realstory',
      '#mugtee',
    ],
    scenes: [
      {
        title: 'Observation',
        description: 'Empty market stall at dawn — yesterday’s prices still chalked on wood.',
        duration: 5,
        visualPrompt:
          'Handheld medium shot of an empty stall at dawn. Desaturated earth tones, lived-in truth.',
        cameraAngle: 'Handheld medium, vérité',
        lightingMood: 'Available dawn light',
        environment: 'Street market, unstyled',
        colorPalette: 'Desaturated earth tones',
        movementStyle: 'Handheld follow',
      },
      {
        title: 'Evidence',
        description: 'Close on worn hands sorting letters — memory made physical.',
        duration: 6,
        visualPrompt:
          'Close detail of worn hands, letters, dust in light beam — archive of a life.',
        cameraAngle: 'Close-up, documentary intimacy',
        lightingMood: 'Natural window, honest contrast',
        environment: 'Small back room, archive boxes',
        colorPalette: 'Naturalistic, muted',
        movementStyle: 'Handheld hold',
      },
      {
        title: 'Hold',
        description: 'Wide street — one figure walks away. Camera stays. Witness does not follow.',
        duration: 6,
        visualPrompt:
          'Locked wide as a figure exits frame — camera stays as witness. Unhurried ending.',
        cameraAngle: 'Wide static, observational',
        lightingMood: 'Overcast daylight',
        environment: 'Urban street, morning',
        colorPalette: 'Desaturated grey-blue',
        movementStyle: 'Static hold',
      },
    ],
  },
  {
    slug: 'faceless-discipline',
    title: 'The Rep Nobody Sees',
    niche: 'faceless reels',
    hook: 'Everyone posts the result. Nobody posts the rep that made it boring enough to win.',
    summary:
      'Fast faceless B-roll storytelling — retention-first cuts, visual punch, voiceover-led.',
    coverMood: 'Bold contrast · dynamic motion',
    visualDirection: 'Retention-first rhythm — macro textures, hands, objects, snap energy.',
    voiceStyle: 'emotional_cinematic',
    captions: [
      'The boring rep is the whole story.',
      'Send this to someone chasing shortcuts.',
      '#faceless',
      '#discipline',
      '#mugtee',
    ],
    scenes: [
      {
        title: 'Hook cut',
        description: 'Chalk dust on barbell knurling — macro punch, instant texture.',
        duration: 3,
        visualPrompt:
          'Macro B-roll of chalk on steel — graphic contrast, vertical punch, no face.',
        cameraAngle: 'Macro POV insert',
        lightingMood: 'Hard side light, gym atmosphere',
        environment: 'Gym floor, steel and chalk',
        colorPalette: 'Steel grey, punchy contrast',
        movementStyle: 'Snap cut energy',
      },
      {
        title: 'Escalation',
        description: 'Timer ticks — hands grip, breath visible. Discipline is physical.',
        duration: 4,
        visualPrompt:
          'Hands on bar, timer in foreground — kinetic faceless storytelling.',
        cameraAngle: 'Dynamic POV, low angle',
        lightingMood: 'Hard contrast, readable silhouette',
        environment: 'Gym rack, minimal background',
        colorPalette: 'Bold contrast, accent red',
        movementStyle: 'Whip pan energy',
      },
      {
        title: 'Peak',
        description: 'Weight rises — frame tightens with effort, not celebration.',
        duration: 4,
        visualPrompt:
          'Tight frame on lift effort — sweat, breath, no influencer smile.',
        cameraAngle: 'Low angle close detail',
        lightingMood: 'Dramatic side light',
        environment: 'Same rack, tighter crop',
        colorPalette: 'High contrast black-steel',
        movementStyle: 'Fast handheld',
      },
      {
        title: 'Landing beat',
        description: 'Bar settles. Silence. The rep is the point.',
        duration: 3,
        visualPrompt:
          'Bar back on rack — hold on stillness after effort. Faceless aftertaste.',
        cameraAngle: 'Static medium detail',
        lightingMood: 'Softening gym ambient',
        environment: 'Rack, empty platform',
        colorPalette: 'Cool grey settle',
        movementStyle: 'Static hold',
      },
    ],
  },
  {
    slug: 'motivation-empty-success',
    title: 'When Success Feels Empty',
    niche: 'motivation',
    hook: 'You did everything they told you to do. So why does the room still feel too quiet?',
    summary:
      'Earned motivational arc — identity gap, comeback energy, human not hustle-bro.',
    coverMood: 'Dawn gold · high contrast',
    visualDirection: 'Direct, human, earned — discipline as identity, not corny grindset.',
    voiceStyle: 'emotional_cinematic',
    captions: [
      'Success without alignment feels like applause in an empty room.',
      'Save this. Finish it tonight.',
      '#motivation',
      '#identity',
      '#mugtee',
    ],
    scenes: [
      {
        title: 'The gap',
        description: 'City lights through glass — reflection shows achievement, not peace.',
        duration: 4,
        visualPrompt:
          'High-rise window, city glow, lone silhouette — identity gap made visual.',
        cameraAngle: 'Low angle to eye-level',
        lightingMood: 'Motivated rim light, gritty realism',
        environment: 'Office at night, glass and city',
        colorPalette: 'Dawn gold, deep shadow',
        movementStyle: 'Purposeful tracking',
      },
      {
        title: 'The mirror',
        description: 'Trophy on desk, untouched coffee cold — proof without feeling.',
        duration: 5,
        visualPrompt:
          'Desk detail: award, cold coffee, blinking cursor — human cost of the grind.',
        cameraAngle: 'Medium shot, shallow depth',
        lightingMood: 'Cool desk light, warm edge',
        environment: 'Workspace, late night',
        colorPalette: 'Cool slate, gold accent',
        movementStyle: 'Slow slide',
      },
      {
        title: 'The choice',
        description: 'Jacket picked up. Door opens to stairwell light — not escape, return.',
        duration: 5,
        visualPrompt:
          'Hand on door, stairwell light spills in — comeback begins with one decision.',
        cameraAngle: 'Medium follow from behind',
        lightingMood: 'Hard contrast doorway',
        environment: 'Office corridor to stairs',
        colorPalette: 'Gold spill, deep shadow',
        movementStyle: 'Building tracking',
      },
    ],
  },
  {
    slug: 'storytelling-unspoken-goodbye',
    title: 'The Line They Never Said',
    niche: 'storytelling',
    hook: 'She packed the car in silence. That was the whole goodbye.',
    summary:
      'Character-first cinematic storytelling — memory, weight, and the turn nobody narrates.',
    coverMood: 'Teal-amber · emotional contrast',
    visualDirection: 'Character-first composition — places with memory, emotional shadow.',
    voiceStyle: 'warm_documentary',
    captions: [
      'Some goodbyes never get a speech. Just a door closing.',
      'Watch until the last frame. It lands different.',
      '#storytelling',
      '#cinematicreel',
      '#mugtee',
    ],
    scenes: [
      {
        title: 'Before',
        description: 'Two mugs on a table — one still full, morning light between them.',
        duration: 5,
        visualPrompt:
          'Two mugs, one untouched — morning light between objects, love already leaving.',
        cameraAngle: 'Character-driven medium close-up',
        lightingMood: 'Motivated practicals, soft shadow',
        environment: 'Kitchen table, morning',
        colorPalette: 'Cinematic teal-amber',
        movementStyle: 'Slow push-in',
      },
      {
        title: 'The turn',
        description: 'Car door shuts — sound implied. House window watches, empty.',
        duration: 5,
        visualPrompt:
          'Car door close from driveway POV — house window darkens. Turn without dialogue.',
        cameraAngle: 'Wide to medium cut energy',
        lightingMood: 'Overcast, emotional contrast',
        environment: 'Suburban driveway, quiet street',
        colorPalette: 'Teal shadow, amber highlight',
        movementStyle: 'Handheld follow',
      },
      {
        title: 'Aftertaste',
        description: 'Empty chair at the table. Mug still full. Time stopped in ceramic.',
        duration: 6,
        visualPrompt:
          'Return to table — empty chair, full mug. Hold on aftermath, not explanation.',
        cameraAngle: 'Static medium wide',
        lightingMood: 'Fading morning, emotional hold',
        environment: 'Same kitchen, absence visible',
        colorPalette: 'Muted teal-amber',
        movementStyle: 'Slow drift',
      },
    ],
  },
]

export function getShowcaseBySlug(slug: string): ShowcaseExample | undefined {
  return SHOWCASE_EXAMPLES.find((e) => e.slug === slug)
}

export function getShowcaseSlugs(): string[] {
  return SHOWCASE_EXAMPLES.map((e) => e.slug)
}

export function nicheLabel(niche: CinematicNiche): string {
  const labels: Record<CinematicNiche, string> = {
    motivation: 'Motivation',
    psychology: 'Psychology',
    luxury: 'Luxury',
    documentary: 'Documentary',
    finance: 'Finance',
    fitness: 'Fitness',
    spirituality: 'Spirituality',
    storytelling: 'Storytelling',
    'faceless reels': 'Faceless Reels',
  }
  return labels[niche] ?? niche
}

export function voiceStyleLabel(style: string): string {
  const map: Record<string, string> = {
    warm_documentary: 'Warm',
    emotional_cinematic: 'Emotional',
    deep_trailer: 'Deep',
    calm_storyteller: 'Calm',
  }
  return map[style] ?? 'Warm'
}
