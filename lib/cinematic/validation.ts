import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import type { CinematicGenerationOutput } from '@/lib/cinematic/generation'
import { hookOverlapRatio, normalizeHookText } from '@/lib/cinematic/hook-variation'
import {
  validateScriptBeatsStructure,
  parseScriptBeats,
  beatsComplete,
  HOOK_MAX_WORDS,
  wordCount,
} from '@/lib/cinematic/script-sop'
import {
  CREATOR_RETENTION_SCENE_COUNT,
  isQuoteModeText,
  RETENTION_SCENE_BEATS,
} from '@/lib/cinematic/viral-structure'

const GENERIC_HOOK_PATTERNS = [
  /^in a world where/i,
  /^are you ready to/i,
  /^unlock your/i,
  /^discover the secret/i,
  /^the ultimate guide/i,
  /^you won't believe/i,
  /^hey guys/i,
  /^welcome back/i,
  /^let's talk about/i,
  /^today we('re| are)/i,
  /game.?changer/i,
  /level up your/i,
  /manifest your/i,
]

const GENERIC_CAPTION_PATTERNS = [
  /^follow for more$/i,
  /^like and subscribe/i,
  /^#?\w+\s#?\w+\s#?\w+\s#?\w+\s#?\w+/i,
]

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)
  )
}

function overlapRatio(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (!ta.size || !tb.size) return 0
  let shared = 0
  ta.forEach((t) => {
    if (tb.has(t)) shared += 1
  })
  return shared / Math.min(ta.size, tb.size)
}

function isWeakHook(hook: string): boolean {
  const h = hook.trim()
  if (h.length < 8) return true
  if (wordCount(h) > HOOK_MAX_WORDS) return true
  if (h.length > 220) return true
  return GENERIC_HOOK_PATTERNS.some((pattern) => pattern.test(h))
}

function scenesAreRepetitive(scenes: CinematicGenerationOutput['scenes']): boolean {
  if (scenes.length < 2) return false
  for (let i = 0; i < scenes.length; i++) {
    for (let j = i + 1; j < scenes.length; j++) {
      const a = `${scenes[i].title} ${scenes[i].description}`
      const b = `${scenes[j].title} ${scenes[j].description}`
      if (overlapRatio(a, b) > 0.62) return true
      if (scenes[i].title.trim().toLowerCase() === scenes[j].title.trim().toLowerCase()) {
        return true
      }
    }
  }
  return false
}

function nicheDrift(output: CinematicGenerationOutput, niche: CinematicNiche): boolean {
  const profile = NICHE_PROFILES[niche]
  const blob = [
    output.hook,
    output.summary,
    output.script,
    output.scenes.map((s) => `${s.title} ${s.description}`).join(' '),
    output.captionPack?.primary || output.captions[0] || '',
    output.captionPack?.cta || '',
    ...(output.captionPack?.hashtags || output.captions.filter((l) => l.startsWith('#'))),
  ]
    .join(' ')
    .toLowerCase()

  const avoidHit = profile.avoid.some((phrase) =>
    blob.includes(phrase.toLowerCase())
  )
  if (avoidHit) return true

  const vocabHit = profile.vocabulary.some((word) =>
    blob.includes(word.toLowerCase())
  )
  return !vocabHit && niche !== 'storytelling'
}

function captionsWeak(output: CinematicGenerationOutput): boolean {
  const primary = output.captionPack?.primary || output.captions[0] || ''
  const cta = output.captionPack?.cta || output.captions[1] || output.cta || ''
  const hashtags = output.captionPack?.hashtags?.length
    ? output.captionPack.hashtags
    : output.captions.filter((line) => line.startsWith('#'))

  if (!primary.trim()) return true
  if (!cta.trim()) return true
  if (hashtags.length > 3) return true
  const blob = [primary, cta, ...hashtags].join(' ')
  if (GENERIC_CAPTION_PATTERNS.some((p) => p.test(blob))) return true
  return false
}

export type ValidationResult = {
  valid: boolean
  issues: string[]
}

function scriptEchoesTopic(script: string, topic: string): boolean {
  const scriptNorm = script.trim().toLowerCase()
  const topicNorm = topic.trim().toLowerCase()
  if (!scriptNorm || !topicNorm) return false
  if (scriptNorm === topicNorm) return true
  if (scriptNorm.startsWith(topicNorm) && scriptNorm.length < topicNorm.length + 32) return true
  return overlapRatio(script, topic) > 0.72
}

function beatsStructureWeak(output: CinematicGenerationOutput): boolean {
  const beats =
    output.scriptBeats?.length
      ? output.scriptBeats
      : output.scriptSections?.length
        ? output.scriptSections
            .filter((s) => s.narration.trim())
            .map((s) => ({
              narration: s.narration,
              duration: '4s',
              emotion: s.emotion,
            }))
        : parseScriptBeats(
            output.scenes.map((s) => ({
              narration: s.description,
              duration: `${s.duration ?? 4}s`,
              emotion: '',
            }))
          )

  if (beats.length) {
    const check = validateScriptBeatsStructure({
      hook: output.hook,
      beats,
      payoff: output.payoff ?? '',
      cta: output.cta ?? output.captionPack?.cta ?? '',
    })
    return !check.valid
  }

  if (output.scenes.length !== CREATOR_RETENTION_SCENE_COUNT) return true
  const titles = output.scenes.map((s) => s.title.trim().toLowerCase())
  const matched = RETENTION_SCENE_BEATS.filter((label, i) => {
    const t = titles[i] ?? ''
    return t.includes(label.label.toLowerCase()) || label.label.toLowerCase() === t
  })
  return matched.length < 4
}

function quoteModeDetected(output: CinematicGenerationOutput): boolean {
  return isQuoteModeText(
    output.hook,
    output.script,
    output.summary,
    output.payoff ?? '',
    ...output.scenes.map((s) => `${s.title} ${s.description}`)
  )
}

export function validateCinematicOutput(
  output: CinematicGenerationOutput,
  niche: CinematicNiche,
  topic?: string
): ValidationResult {
  const issues: string[] = []

  if (isWeakHook(output.hook)) issues.push('weak_or_generic_hook')
  if (!output.hook.trim()) issues.push('missing_hook')
  if (wordCount(output.hook) > HOOK_MAX_WORDS) issues.push('hook_too_long')
  if (!output.script.trim()) issues.push('empty_script')
  if (topic && scriptEchoesTopic(output.script, topic)) issues.push('script_echoes_topic')
  if (quoteModeDetected(output)) issues.push('quote_mode_script')
  if (beatsStructureWeak(output)) issues.push('weak_sop_structure')
  if (output.scenes.length < 2) issues.push('insufficient_scenes')
  if (scenesAreRepetitive(output.scenes)) issues.push('repetitive_scenes')
  if (captionsWeak(output)) issues.push('weak_captions')
  if (nicheDrift(output, niche)) issues.push('niche_drift')

  const beats = output.scriptBeats ?? []
  if (beats.length && !beatsComplete(beats)) issues.push('incomplete_script_beats')

  return { valid: issues.length === 0, issues }
}

export function pickStrongestHook(variations: string[], niche: CinematicNiche): string {
  const profile = NICHE_PROFILES[niche]
  const candidates = variations.filter(Boolean)
  if (!candidates.length) return ''

  let best = candidates[0]
  let bestScore = -Infinity

  for (const candidate of candidates) {
    if (isWeakHook(candidate)) continue
    let score = 0
    score += Math.min(candidate.length, 140) * 0.05
    if (/[?!]/.test(candidate)) score += 2
    if (/\b(you|your|why|what if|never|always)\b/i.test(candidate)) score += 1.5
    profile.vocabulary.forEach((word) => {
      if (candidate.toLowerCase().includes(word)) score += 2
    })
    profile.avoid.forEach((phrase) => {
      if (candidate.toLowerCase().includes(phrase)) score -= 5
    })
    if (score > bestScore) {
      bestScore = score
      best = candidate
    }
  }

  return bestScore > -Infinity ? best : candidates[0]
}

function hookNicheDrift(hook: string, niche: CinematicNiche): boolean {
  const profile = NICHE_PROFILES[niche]
  const blob = hook.toLowerCase()
  if (profile.avoid.some((phrase) => blob.includes(phrase.toLowerCase()))) {
    return true
  }
  const vocabHit = profile.vocabulary.some((word) =>
    blob.includes(word.toLowerCase())
  )
  return !vocabHit && niche !== 'storytelling'
}

export function validateRegeneratedHook(
  hook: string,
  niche: CinematicNiche,
  previousHooks?: string | string[]
): ValidationResult {
  const issues: string[] = []
  if (isWeakHook(hook)) issues.push('weak_or_generic_hook')
  if (wordCount(hook) > HOOK_MAX_WORDS) issues.push('hook_too_long')

  const prior = Array.isArray(previousHooks)
    ? previousHooks
    : previousHooks
      ? [previousHooks]
      : []

  const normalized = normalizeHookText(hook)
  for (const prev of prior) {
    if (!prev.trim()) continue
    if (normalized === normalizeHookText(prev)) {
      issues.push('unchanged_hook')
      break
    }
    if (hookOverlapRatio(hook, prev) > 0.55) {
      issues.push('too_similar_hook')
      break
    }
  }

  if (hookNicheDrift(hook, niche)) issues.push('niche_drift')
  return { valid: issues.length === 0, issues }
}

export function validateRegeneratedScene(
  scene: { title: string; description: string },
  others: Array<{ title: string; description: string }>,
  niche: CinematicNiche
): ValidationResult {
  const issues: string[] = []
  if (!scene.description.trim()) issues.push('empty_scene')
  for (const other of others) {
    const a = `${scene.title} ${scene.description}`
    const b = `${other.title} ${other.description}`
    if (overlapRatio(a, b) > 0.62) issues.push('repetitive_scene')
    if (scene.title.trim().toLowerCase() === other.title.trim().toLowerCase()) {
      issues.push('duplicate_title')
    }
  }
  const blob = `${scene.title} ${scene.description}`.toLowerCase()
  const profile = NICHE_PROFILES[niche]
  if (profile.avoid.some((phrase) => blob.includes(phrase.toLowerCase()))) {
    issues.push('niche_drift')
  }
  return { valid: issues.length === 0, issues }
}

export function validateRegeneratedCaptions(
  pack: { primary: string; cta: string; hashtags: string[] },
  niche: CinematicNiche
): ValidationResult {
  const issues: string[] = []
  const output: CinematicGenerationOutput = {
    title: '',
    hook: pack.primary,
    summary: '',
    script: '',
    scriptBeats: [],
    payoff: '',
    cta: pack.cta,
    scenes: [],
    captions: [pack.primary, pack.cta, ...pack.hashtags],
    captionPack: pack,
    suggestedVoiceStyle: 'warm_documentary',
    niche,
  }
  if (captionsWeak(output)) issues.push('weak_captions')
  if (nicheDrift(output, niche)) issues.push('niche_drift')
  return { valid: issues.length === 0, issues }
}

