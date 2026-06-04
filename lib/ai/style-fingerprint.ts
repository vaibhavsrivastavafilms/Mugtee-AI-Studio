import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES, coerceNiche } from '@/lib/cinematic/niches'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import type { CreatorMemory } from '@/lib/companion/types'
import type { CreatorDna, MemoryProfile } from '@/lib/memory/types'

export type StylePacing = 'fast-cut' | 'measured' | 'slow-burn'
export type StyleEmotionalIntensity = 'subtle' | 'building' | 'high-impact'
export type StyleSentenceRhythm = 'staccato' | 'punchy' | 'flowing'
export type StyleHookStyle = 'curiosity-gap' | 'identity-challenge' | 'observational' | 'reveal'
export type StyleCtaStyle = 'soft-landing' | 'direct-ask' | 'open-loop'

export type CreatorStyleFingerprint = {
  niche: string
  pacing: StylePacing
  emotionalIntensity: StyleEmotionalIntensity
  sentenceRhythm: StyleSentenceRhythm
  hookStyle: StyleHookStyle
  visualTone: string
  ctaStyle: StyleCtaStyle
}

export type StyleFingerprintProjectInput = {
  topic?: string
  niche?: CinematicNiche | string
  tone?: string
  platform?: string
  duration?: number
  visualStyle?: Partial<VisualStyle> | VisualStyle | null
  emotionalGoal?: string
  directorMode?: string
}

export type StyleFingerprintMemoryInput = {
  profile?: MemoryProfile | null
  companionMemory?: CreatorMemory | null
}

const DEFAULT_FINGERPRINT: CreatorStyleFingerprint = {
  niche: 'storytelling',
  pacing: 'measured',
  emotionalIntensity: 'building',
  sentenceRhythm: 'punchy',
  hookStyle: 'curiosity-gap',
  visualTone: 'Cinematic vertical — motivated light, human scale, emotional specificity',
  ctaStyle: 'soft-landing',
}

const NICHE_HOOK_STYLE: Partial<Record<CinematicNiche, StyleHookStyle>> = {
  motivation: 'identity-challenge',
  psychology: 'reveal',
  luxury: 'observational',
  documentary: 'observational',
  finance: 'curiosity-gap',
  fitness: 'identity-challenge',
  spirituality: 'observational',
  storytelling: 'curiosity-gap',
  'faceless reels': 'curiosity-gap',
}

function pacingFromDuration(duration?: number): StylePacing {
  if (!duration || duration <= 0) return DEFAULT_FINGERPRINT.pacing
  if (duration <= 30) return 'fast-cut'
  if (duration >= 75) return 'slow-burn'
  return 'measured'
}

function intensityFromSignals(
  emotionalGoal?: string,
  tone?: string,
  dna?: CreatorDna
): StyleEmotionalIntensity {
  const blob = [emotionalGoal, tone, dna?.emotionalTrigger, dna?.voice]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  if (/\b(raw|intense|urgent|breakthrough|confront|gut)\b/.test(blob)) return 'high-impact'
  if (/\b(calm|quiet|gentle|reflect|still|soft)\b/.test(blob)) return 'subtle'
  return 'building'
}

function rhythmFromDna(dna?: CreatorDna, tone?: string): StyleSentenceRhythm {
  const voice = [dna?.voice, dna?.format, tone].filter(Boolean).join(' ').toLowerCase()
  if (/\b(punchy|short|snappy|direct|blunt)\b/.test(voice)) return 'staccato'
  if (/\b(flow|poetic|lyrical|narrat|documentary)\b/.test(voice)) return 'flowing'
  return 'punchy'
}

function visualToneFromProject(
  niche: CinematicNiche,
  visualStyle?: Partial<VisualStyle> | VisualStyle | null
): string {
  if (visualStyle?.label?.trim()) {
    const parts = [
      visualStyle.label,
      visualStyle.palette,
      visualStyle.lighting,
      visualStyle.camera,
      visualStyle.movement,
      visualStyle.environment,
    ].filter((p) => typeof p === 'string' && p.trim())
    if (parts.length) return parts.join(' · ')
  }
  const profile = NICHE_PROFILES[niche]
  return `${profile.label} cinematic — ${profile.toneNotes}`
}

function ctaFromPlatform(platform?: string): StyleCtaStyle {
  const p = platform?.toLowerCase() ?? ''
  if (p.includes('youtube') || p.includes('linkedin')) return 'direct-ask'
  if (p.includes('tiktok') || p.includes('reels') || p.includes('short')) return 'open-loop'
  return 'soft-landing'
}

function hookStyleForNiche(niche: CinematicNiche): StyleHookStyle {
  return NICHE_HOOK_STYLE[niche] ?? DEFAULT_FINGERPRINT.hookStyle
}

/** Derive a stable creator style fingerprint from project state, memory, and niche lock context. */
export function buildStyleFingerprint(
  project: StyleFingerprintProjectInput,
  memory: StyleFingerprintMemoryInput,
  nicheLock?: string
): CreatorStyleFingerprint {
  const niche = coerceNiche(project.niche ?? memory.profile?.preferences?.niche, 'storytelling')
  const profile = NICHE_PROFILES[niche]
  const dna = memory.profile?.creatorDna
  const prefs = memory.profile?.preferences

  void nicheLock

  return {
    niche: profile.label,
    pacing: pacingFromDuration(project.duration ?? prefs?.length),
    emotionalIntensity: intensityFromSignals(
      project.emotionalGoal,
      project.tone ?? prefs?.tone,
      dna
    ),
    sentenceRhythm: rhythmFromDna(dna, project.tone ?? prefs?.tone),
    hookStyle: hookStyleForNiche(niche),
    visualTone: visualToneFromProject(niche, project.visualStyle),
    ctaStyle: ctaFromPlatform(project.platform ?? prefs?.platform),
  }
}

/** Injectable block for system / context prompts — keeps cross-provider tone aligned. */
export function formatFingerprintForPrompt(fingerprint: CreatorStyleFingerprint): string {
  const f = { ...DEFAULT_FINGERPRINT, ...fingerprint }
  return `
CREATOR STYLE FINGERPRINT (strict — all outputs must match this cinematic voice):
- Niche lens: ${f.niche}
- Pacing: ${f.pacing} — honor beat timing; no rushed lecture endings or flat middle.
- Emotional intensity: ${f.emotionalIntensity} — escalate through the piece, never generic hype.
- Sentence rhythm: ${f.sentenceRhythm} — vary length deliberately; avoid monotone clause stacks.
- Hook style: ${f.hookStyle} — opening must use this pattern, not template viral bait.
- Visual tone: ${f.visualTone}
- CTA style: ${f.ctaStyle} — close with this energy, not a different creator persona.
- One intelligence system: same director across hook, script, captions, and visual copy.
`.trim()
}

export function mergeFingerprintDefaults(
  partial?: Partial<CreatorStyleFingerprint> | null
): CreatorStyleFingerprint {
  if (!partial) return { ...DEFAULT_FINGERPRINT }
  return { ...DEFAULT_FINGERPRINT, ...partial }
}
