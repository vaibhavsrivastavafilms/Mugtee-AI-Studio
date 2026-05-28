import type { CinematicNiche } from '@/lib/cinematic/niches'
import { buildVirloContext } from '@/lib/virlo-engine'
import { buildVirloScriptPrompt } from '@/lib/virlo-engine/virlo-prompt'

export type CinematicPromptInput = {
  topic: string
  platform: string
  tone: string
  duration: number
  niche: CinematicNiche
  sessionSeed?: string | number
}

export function buildCinematicScriptPrompt(input: CinematicPromptInput): string {
  const virlo = buildVirloContext(input.topic, {
    platform: input.platform,
    tone: input.tone,
    duration: input.duration,
    niche: input.niche,
    sessionSeed: input.sessionSeed,
  })
  const briefHeader = [
    'CREATOR BRIEF (use exactly):',
    `TOPIC: ${input.topic}`,
    `MODE: quick_cut`,
    `STYLE: ${input.tone}`,
    `PLATFORM: ${input.platform}`,
    `DURATION: ${input.duration}s`,
  ].join('\n')
  return `${briefHeader}\n\n${buildVirloScriptPrompt(virlo)}`
}

// Back-compat re-export for existing imports
export { CINEMATIC_SYSTEM_PROMPT } from '@/lib/ai/prompts/cinematic/system'
