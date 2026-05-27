import type { CinematicNiche } from '@/lib/cinematic/niches'
import { NICHE_PROFILES } from '@/lib/cinematic/niches'
import { scenePacingRole } from '@/lib/cinematic/regen-context'
import type { GeneratedScene } from '@/lib/cinematic/generation'

const ESCALATION_VERBS = [
  'holds',
  'breaks',
  'reveals',
  'tightens',
  'softens',
  'lands',
  'pulls back',
  'closes in',
]

function enrichDescription(desc: string, role: string, niche: CinematicNiche): string {
  let text = desc.trim()
  if (text.length < 40) return text

  const profile = NICHE_PROFILES[niche]
  const hasVocab = profile.vocabulary.some((w) =>
    text.toLowerCase().includes(w.toLowerCase())
  )
  if (!hasVocab && profile.vocabulary[0]) {
    text = text.replace(/\.$/, ` — ${profile.vocabulary[0]} held in frame.`)
  }

  if (role === 'peak' && !/\b(close|tight|still|hold)\b/i.test(text)) {
    const verb = ESCALATION_VERBS[role.length % ESCALATION_VERBS.length]
    text = `${text.replace(/\.$/, '')}; camera ${verb}.`
  }

  return text.slice(0, 1200)
}

/** Strengthen emotional arc across scene beats without changing structure. */
export function applyEmotionalEscalation(
  scenes: GeneratedScene[],
  niche: CinematicNiche
): GeneratedScene[] {
  const total = scenes.length || 1
  return scenes.map((scene, index) => {
    const sceneIndex = index + 1
    const role = scenePacingRole(sceneIndex, total)
    return {
      ...scene,
      title: scene.title.trim() || `Beat ${sceneIndex}`,
      description: enrichDescription(scene.description, role, niche),
    }
  })
}

export function scoreEmotionalArc(scenes: GeneratedScene[]): number {
  if (scenes.length < 2) return 0.5
  let score = 0
  for (let i = 1; i < scenes.length; i++) {
    const prev = scenes[i - 1].description.length
    const curr = scenes[i].description.length
    if (curr >= prev * 0.85) score += 1
  }
  return score / (scenes.length - 1)
}
