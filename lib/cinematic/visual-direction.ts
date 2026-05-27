import type { CinematicNiche } from '@/lib/cinematic/niches'
import type { CinematicScene } from '@/stores/cinematic-project'

export type SceneVisualDirection = {
  visualPrompt: string
  cameraAngle: string
  lightingMood: string
  environment: string
  colorPalette: string
  movementStyle: string
}

type NicheVisualProfile = {
  palette: string
  camera: string
  lighting: string
  movement: string
  environment: string
  language: string
}

const NICHE_VISUAL: Record<CinematicNiche, NicheVisualProfile> = {
  luxury: {
    palette: 'Warm gold, deep charcoal, soft ivory highlights',
    camera: 'Slow dolly, elegant wide-to-medium framing',
    lighting: 'Polished warm key light, restrained contrast',
    movement: 'Slow drift',
    environment: 'Minimal interiors, tactile materials, negative space',
    language: 'Understated craft — never loud flex',
  },
  psychology: {
    palette: 'Muted neutrals, soft skin tones, shadow pockets',
    camera: 'Intimate close-up, shallow depth of field',
    lighting: 'Soft window light, gentle falloff',
    movement: 'Static hold with subtle push-in',
    environment: 'Private rooms, mirrors, everyday objects with weight',
    language: 'Interior, observational, emotionally precise',
  },
  documentary: {
    palette: 'Naturalistic, desaturated earth tones',
    camera: 'Handheld medium shot, vérité framing',
    lighting: 'Available light, honest contrast',
    movement: 'Handheld follow',
    environment: 'Real locations, lived-in detail, unstyled truth',
    language: 'Witness over performance',
  },
  motivation: {
    palette: 'High contrast, dawn gold, deep shadow',
    camera: 'Low angle to eye-level progression',
    lighting: 'Motivated rim light, gritty realism',
    movement: 'Purposeful tracking',
    environment: 'Gym, street, workspace — proof-of-work spaces',
    language: 'Earned intensity, not hustle-bro gloss',
  },
  finance: {
    palette: 'Cool slate, navy, sharp white accents',
    camera: 'Clean overhead and symmetrical medium shots',
    lighting: 'Cool desk light, crisp edges',
    movement: 'Controlled slide',
    environment: 'Desk, city glass, numbers made visual',
    language: 'Adult clarity, no get-rich fantasy',
  },
  fitness: {
    palette: 'Sweat-toned skin, steel grey, punchy contrast',
    camera: 'Low angle close-up on form and breath',
    lighting: 'Hard side light, gym atmosphere',
    movement: 'Kinetic handheld',
    environment: 'Gym floor, chalk, repetition made visible',
    language: 'Embodied, physical, honest',
  },
  spirituality: {
    palette: 'Dawn mist, amber candle, deep blue silence',
    camera: 'Slow wide hold, gentle close detail',
    lighting: 'Diffused natural light, soft glow',
    movement: 'Slow drift',
    environment: 'Still rooms, nature edge, sacred ordinary',
    language: 'Spacious, sincere, never preachy',
  },
  storytelling: {
    palette: 'Cinematic teal-amber, emotional contrast',
    camera: 'Character-driven medium close-up',
    lighting: 'Motivated practicals, emotional shadow',
    movement: 'Slow push-in',
    environment: 'Places with memory — doorways, rain, empty chairs',
    language: 'Character-first composition',
  },
  'faceless reels': {
    palette: 'Bold contrast, punchy accent color',
    camera: 'Dynamic POV, macro detail cuts',
    lighting: 'Graphic contrast, readable silhouette',
    movement: 'Fast whip and snap cuts energy',
    environment: 'B-roll textures, hands, objects, motion paths',
    language: 'Retention-first visual rhythm',
  },
}

const PACING_VISUAL: Record<string, Partial<NicheVisualProfile>> = {
  'pattern interrupt / hook energy': { movement: 'Snap cut energy', camera: 'Tight close-up or bold insert' },
  'escalation / rising tension': { movement: 'Building tracking', camera: 'Medium shot tightening' },
  'emotional peak / sharpest insight': { movement: 'Slow push-in', camera: 'Intimate close-up' },
  'landing beat / aftertaste': { movement: 'Slow drift', camera: 'Wide hold or still frame' },
  'single beat': { movement: 'Controlled hold', camera: 'Medium framing' },
}

const GENERIC_VISUAL_PATTERNS = [
  /masterpiece/i,
  /8k ultra/i,
  /trending on artstation/i,
  /hyper.?realistic/i,
  /unreal engine/i,
  /midjourney/i,
  /octane render/i,
]

function coerce(raw: unknown, fallback = '', max = 600): string {
  if (typeof raw !== 'string') return fallback
  const t = raw.trim()
  if (!t) return fallback
  return t.length > max ? t.slice(0, max) : t
}

export function normalizeVisualDirection(
  raw: Record<string, unknown> | undefined,
  niche: CinematicNiche,
  pacingRole: string
): SceneVisualDirection {
  const profile = NICHE_VISUAL[niche]
  const pacing = PACING_VISUAL[pacingRole] ?? {}

  const cameraAngle = coerce(
    raw?.cameraAngle ?? raw?.camera,
    pacing.camera ?? profile.camera,
    120
  )
  const lightingMood = coerce(
    raw?.lightingMood ?? raw?.lighting,
    profile.lighting,
    120
  )
  const environment = coerce(raw?.environment, profile.environment, 160)
  const colorPalette = coerce(raw?.colorPalette, profile.palette, 120)
  const movementStyle = coerce(
    raw?.movementStyle ?? raw?.movement,
    pacing.movement ?? profile.movement,
    120
  )

  const visualPrompt =
    coerce(raw?.visualPrompt, '', 500) ||
    composeVisualPrompt({
      cameraAngle,
      lightingMood,
      environment,
      colorPalette,
      movementStyle,
    })

  return {
    visualPrompt,
    cameraAngle,
    lightingMood,
    environment,
    colorPalette,
    movementStyle,
  }
}

export function composeVisualPrompt(
  parts: Omit<SceneVisualDirection, 'visualPrompt'>
): string {
  return [
    `${parts.cameraAngle}. ${parts.environment}.`,
    `${parts.colorPalette}. ${parts.lightingMood}.`,
    `${parts.movementStyle}.`,
  ]
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function defaultVisualDirection(
  niche: CinematicNiche,
  pacingRole: string,
  sceneTitle?: string
): SceneVisualDirection {
  const profile = NICHE_VISUAL[niche]
  const pacing = PACING_VISUAL[pacingRole] ?? {}
  const base = normalizeVisualDirection(
    {
      cameraAngle: pacing.camera ?? profile.camera,
      lightingMood: profile.lighting,
      environment: sceneTitle
        ? `${profile.environment} — ${sceneTitle}`
        : profile.environment,
      colorPalette: profile.palette,
      movementStyle: pacing.movement ?? profile.movement,
    },
    niche,
    pacingRole
  )
  return {
    ...base,
    visualPrompt: composeVisualPrompt(base),
  }
}

export function isWeakVisualDirection(v: SceneVisualDirection): boolean {
  if (!v.visualPrompt.trim() || v.visualPrompt.length < 24) return true
  const blob = Object.values(v).join(' ')
  return GENERIC_VISUAL_PATTERNS.some((p) => p.test(blob))
}

export function validateVisualDirection(v: SceneVisualDirection): {
  valid: boolean
  issues: string[]
} {
  const issues: string[] = []
  if (!v.cameraAngle.trim()) issues.push('missing_camera')
  if (!v.lightingMood.trim()) issues.push('missing_lighting')
  if (!v.colorPalette.trim()) issues.push('missing_palette')
  if (!v.movementStyle.trim()) issues.push('missing_movement')
  if (isWeakVisualDirection(v)) issues.push('weak_visual_prompt')
  return { valid: issues.length === 0, issues }
}

/** Short chip labels for scene cards */
export function visualChipLabels(
  scene: Pick<
    CinematicScene,
    | 'cameraAngle'
    | 'lightingMood'
    | 'colorPalette'
    | 'movementStyle'
    | 'camera'
    | 'lighting'
  >
): { camera: string; mood: string; palette: string; movement: string } {
  const short = (s: string | undefined, max = 18) => {
    if (!s) return ''
    const t = s.trim()
    if (t.length <= max) return t
    const cut = t.slice(0, max)
    const sp = cut.lastIndexOf(' ')
    return (sp > 8 ? cut.slice(0, sp) : cut).trim() + '…'
  }

  const camera = scene.cameraAngle || scene.camera || ''
  const mood = scene.lightingMood || scene.lighting || ''
  const palette = scene.colorPalette || ''
  const movement = scene.movementStyle || ''

  return {
    camera: short(chipCamera(camera)),
    mood: short(chipMood(mood)),
    palette: short(chipPalette(palette)),
    movement: short(chipMovement(movement)),
  }
}

function chipCamera(s: string): string {
  if (/close/i.test(s)) return 'Close-Up'
  if (/wide/i.test(s)) return 'Wide'
  if (/medium/i.test(s)) return 'Medium'
  if (/overhead/i.test(s)) return 'Overhead'
  if (/handheld/i.test(s)) return 'Handheld'
  if (/tracking/i.test(s)) return 'Tracking'
  return s.split(/[,—]/)[0]?.trim() || s
}

function chipMood(s: string): string {
  if (/noir/i.test(s)) return 'Noir'
  if (/soft/i.test(s)) return 'Soft Light'
  if (/hard/i.test(s)) return 'Hard Light'
  if (/neon/i.test(s)) return 'Neon'
  if (/natural/i.test(s)) return 'Natural'
  return s.split(/[,—]/)[0]?.trim() || s
}

function chipPalette(s: string): string {
  if (/gold/i.test(s)) return 'Warm Gold'
  if (/blue|teal/i.test(s)) return 'Blue Noir'
  if (/slate|navy/i.test(s)) return 'Cool Slate'
  if (/earth|desatur/i.test(s)) return 'Earth Tone'
  if (/amber/i.test(s)) return 'Amber'
  return s.split(/[,—]/)[0]?.trim() || s
}

function chipMovement(s: string): string {
  if (/slow drift/i.test(s)) return 'Slow Drift'
  if (/handheld/i.test(s)) return 'Handheld'
  if (/static|hold/i.test(s)) return 'Static Hold'
  if (/push/i.test(s)) return 'Push-In'
  if (/track/i.test(s)) return 'Tracking'
  if (/whip|snap|fast/i.test(s)) return 'Dynamic Cut'
  return s.split(/[,—]/)[0]?.trim() || s
}

export function applyVisualToScene(
  scene: CinematicScene,
  visual: SceneVisualDirection
): CinematicScene {
  return {
    ...scene,
    visualPrompt: visual.visualPrompt,
    cameraAngle: visual.cameraAngle,
    lightingMood: visual.lightingMood,
    environment: visual.environment,
    colorPalette: visual.colorPalette,
    movementStyle: visual.movementStyle,
    camera: visual.cameraAngle,
    lighting: visual.lightingMood,
  }
}

export function sceneHasVisualDirection(scene: CinematicScene): boolean {
  return Boolean(
    scene.visualPrompt ||
      scene.cameraAngle ||
      scene.lightingMood ||
      scene.colorPalette
  )
}

export { NICHE_VISUAL }
