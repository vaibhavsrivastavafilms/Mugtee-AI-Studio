import type { MemoryProfile } from '@/lib/memory/types'
import type { ReflectionInput, ReflectionResult } from '@/lib/memory/types'
import { updateDnaFromProfile } from '@/lib/memory/creator-dna'

const HIGHLIGHT_WORKED: Record<string, string> = {
  hook: 'Strong opening hooks resonate with your audience',
  story: 'Narrative structure is a strength',
  visuals: 'Visual storytelling drives engagement',
  ending: 'Payoff and endings land well',
  voice: 'Voice and tone feel authentic',
}

/** Post-completion reflection — what worked, improve, learned */
export function buildReflectionResult(
  input: ReflectionInput,
  profile: MemoryProfile
): ReflectionResult {
  const worked: string[] = [...(input.worked ?? [])]
  const improve: string[] = [...(input.improve ?? [])]
  const learned: string[] = [...(input.learned ?? [])]

  if (input.highlight && HIGHLIGHT_WORKED[input.highlight]) {
    worked.push(HIGHLIGHT_WORKED[input.highlight])
  }

  const theme =
    typeof input.brief?.theme === 'string' ? input.brief.theme : undefined
  if (theme) {
    learned.push(`Theme "${theme.slice(0, 60)}" performed well for you`)
  }

  const dna = profile.creatorDna
  if (dna.emotionalTrigger) {
    learned.push(`Your audience responds to ${dna.emotionalTrigger} triggers`)
  }

  if (!improve.length) {
    improve.push('Experiment with a new hook angle on your next project')
  }

  const summaryParts = [
    worked.length ? `What worked: ${worked.slice(0, 2).join('; ')}` : '',
    learned.length ? `Learned: ${learned.slice(0, 2).join('; ')}` : '',
  ].filter(Boolean)

  return {
    summary: summaryParts.join('. ') || 'Reflection captured — Mugtee will remember this.',
    worked: worked.slice(0, 6),
    improve: improve.slice(0, 4),
    learned: learned.slice(0, 6),
  }
}

export function applyReflectionToProfile(
  profile: MemoryProfile,
  input: ReflectionInput,
  result: ReflectionResult
): MemoryProfile {
  const dna = updateDnaFromProfile(profile, {
    theme: typeof input.brief?.theme === 'string' ? input.brief.theme : undefined,
    tone: typeof input.brief?.tone === 'string' ? input.brief.tone : undefined,
  })

  return {
    ...profile,
    creatorDna: dna,
    updatedAt: new Date().toISOString(),
  }
}
