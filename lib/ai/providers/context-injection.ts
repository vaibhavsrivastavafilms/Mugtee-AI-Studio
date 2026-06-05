import { buildNicheLayer, type CinematicNiche } from '@/lib/cinematic/niches'
import { formatContentBriefForPrompt } from '@/lib/content-director/content-brief'
import { formatIntentForPrompt } from '@/lib/input-understanding'
import { formatCreatorMemoryForPrompt } from '@/lib/memory/memory-prompt-injection'
import {
  buildStyleFingerprint,
  formatFingerprintForPrompt,
} from '@/lib/ai/style-fingerprint'
import type { ProviderContext, ProviderContextInput } from '@/lib/ai/providers/types'
import { formatDirectorStudioForPrompt } from '@/lib/director/director-context-injection'
import { formatDirectorCreatorMemoryForPrompt } from '@/lib/director/memory/memory-prompt-injection'

function coerceNiche(niche?: CinematicNiche | string): CinematicNiche {
  if (niche && typeof niche === 'string') return niche as CinematicNiche
  return (niche ?? 'general') as CinematicNiche
}

/** Merge creator memory, parsed intent, niche lock, and content brief into provider context. */
export function buildProviderContext(input: ProviderContextInput): ProviderContext {
  const niche = coerceNiche(input.niche)
  const nicheLock = buildNicheLayer(niche)
  const styleFingerprint = buildStyleFingerprint(
    {
      topic: input.topic,
      niche,
      tone: input.tone,
      platform: input.platform,
      duration: input.duration,
      visualStyle: input.visualStyle,
      emotionalGoal: input.emotionalGoal,
    },
    {
      profile: input.memoryProfile,
      companionMemory: input.companionMemory,
    },
    nicheLock
  )

  const sections: string[] = []

  if (input.parsedIntent) {
    const intent = formatIntentForPrompt(input.parsedIntent)
    if (intent) sections.push(intent)
  }

  const memorySection = formatCreatorMemoryForPrompt({
    profile: input.memoryProfile,
    companionMemory: input.companionMemory,
  })
  if (memorySection) sections.push(memorySection)

  const briefSection = formatContentBriefForPrompt(input.contentBrief, memorySection)
  if (briefSection) {
    sections.push(briefSection)
  } else if (input.topic.trim()) {
    sections.push(`TOPIC LOCK: ${input.topic.trim()}`)
  }

  if (input.tone?.trim()) sections.push(`TONE LOCK: ${input.tone.trim()}`)
  if (input.platform?.trim()) sections.push(`PLATFORM LOCK: ${input.platform.trim()}`)

  const directorSection = formatDirectorStudioForPrompt(input.directorStudioContext)
  if (directorSection) sections.push(directorSection)

  if (input.directorStudioContext) {
    const directorMemorySection = formatDirectorCreatorMemoryForPrompt(
      input.directorCreatorMemory
    )
    if (directorMemorySection) sections.push(directorMemorySection)
  }

  sections.push(nicheLock)
  sections.push(formatFingerprintForPrompt(styleFingerprint))

  return {
    injectionBlock: sections.filter(Boolean).join('\n\n'),
    nicheLock,
    styleFingerprint,
  }
}

/** Prepend context injection to a user prompt. */
export function injectContext(userPrompt: string, context?: ProviderContext): string {
  if (!context?.injectionBlock?.trim()) return userPrompt
  return `${context.injectionBlock}\n\n---\n\n${userPrompt}`
}
