import type { CreatorMemory } from '@/lib/companion/types'
import type { MemoryProfile } from '@/lib/memory/types'
import { formatCreatorMemoryForPrompt } from '@/lib/memory/memory-prompt-injection'
import { buildCompanionSystemPrompt } from '@/lib/companion/personality'
import {
  mugteeLanguageSystemHint,
  type DetectedCreatorLanguage,
} from '@/lib/i18n/detect-creator-language'

export type CompanionBrainContext = {
  userMessage: string
  memoryProfile?: MemoryProfile | null
  companionMemory?: CreatorMemory | null
  language?: DetectedCreatorLanguage | null
  opportunityHint?: string | null
}

/** Assemble system prompt for companion brain — memory + personality + language. */
export function buildCompanionBrainPrompt(ctx: CompanionBrainContext): string {
  const memoryBlock = formatCreatorMemoryForPrompt({
    profile: ctx.memoryProfile ?? undefined,
    companionMemory: ctx.companionMemory ?? undefined,
  })

  const sections = [buildCompanionSystemPrompt()]

  if (memoryBlock) {
    sections.push('--- CREATOR MEMORY ---', memoryBlock)
  }

  if (ctx.opportunityHint) {
    sections.push(`TODAY'S OPPORTUNITY ANGLE: ${ctx.opportunityHint}`)
  }

  if (ctx.language) {
    sections.push(mugteeLanguageSystemHint(ctx.language).trim())
  }

  sections.push(
    'SCOPE: Creator output only — hooks, scripts, visual direction, niche, storyboard. No life coaching, productivity tips, or generic assistant chatter.'
  )

  return sections.join('\n\n')
}
