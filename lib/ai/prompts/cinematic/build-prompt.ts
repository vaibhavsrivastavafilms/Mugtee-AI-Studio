import type { CinematicNiche } from '@/lib/cinematic/niches'
import { buildVirloContext } from '@/lib/virlo-engine'
import { buildVirloScriptPrompt } from '@/lib/virlo-engine/virlo-prompt'
import { languageDirective } from '@/lib/cinematic/language-prompt'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { ViralStructureAnalysis } from '@/lib/cinematic/viral-structure'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'

export type CinematicPromptInput = {
  topic: string
  platform: string
  tone: string
  duration: number
  niche: CinematicNiche
  sessionSeed?: string | number
  language?: ProjectLanguage
  visualStyle?: VisualStyle | null
  virloHook?: string
  retentionPattern?: string
  viralStructure?: ViralStructureAnalysis
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
    input.language ? languageDirective(input.language) : '',
    input.virloHook
      ? `VIRLO HOOK SEED (expand into spoken hook — not a quote): ${input.virloHook}`
      : '',
    input.retentionPattern
      ? `CREATOR RETENTION PATTERN: ${input.retentionPattern}`
      : '',
    input.visualStyle
      ? `LOCKED VISUAL STYLE: ${input.visualStyle.label} · ${input.visualStyle.palette}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  return `${briefHeader}\n\n${buildVirloScriptPrompt(virlo, input.viralStructure)}`
}

// Back-compat re-export for existing imports
export { CINEMATIC_SYSTEM_PROMPT } from '@/lib/ai/prompts/cinematic/system'
