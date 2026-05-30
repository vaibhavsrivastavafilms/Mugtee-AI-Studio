import type { CinematicNiche } from '@/lib/cinematic/niches'
import { buildVirloContext } from '@/lib/virlo-engine'
import { buildVirloScriptPrompt } from '@/lib/virlo-engine/virlo-prompt'
import { languageDirective } from '@/lib/cinematic/language-prompt'
import {
  normalizeProjectLanguage,
  type ProjectLanguage,
} from '@/lib/cinematic/language-detection'
import type { ViralStructureAnalysis } from '@/lib/cinematic/viral-structure'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import type { CreatorMemoryBiasHints, CreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { buildCreatorMemoryPromptSection, creatorProfileDirective } from '@/lib/creator/creator-memory'
import { creatorHistoryDirective } from '@/lib/creator/knowledge-base'
import { buildDeepResearchScriptContextSection } from '@/lib/ai/prompts/youtube/deep-research-prompt'
import { buildDeepResearchReportScriptContext } from '@/lib/ai/prompts/youtube/deep-research-sop'
import { scriptWordCountHint } from '@/lib/ai/prompts/cinematic/script-writing-sop'
import { buildDirectorModePromptSection } from '@/lib/ai/prompts/cinematic/director-mode-prompt'
import { buildCreatorBlueprintPromptSection } from '@/lib/ai/prompts/cinematic/creator-blueprint-prompt'
import type { DirectorMode } from '@/lib/cinematic/director-modes'
import type { DeepResearchPipelineOptions } from '@/types/deep-research'

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
  /** Full project regen — fresh script, same locked context */
  regenFresh?: boolean
  /** Brief changed — new story for the new topic */
  topicChanged?: boolean
  previousTopic?: string
  previousScript?: string
  previousHook?: string
  creatorMemoryBias?: CreatorMemoryBiasHints | null
  creatorProfile?: CreatorMemoryProfile | null
  /** Title from /api/generate-title */
  titleSeed?: string
  /** AI Director Mode — creative direction for script tone and structure */
  directorMode?: DirectorMode
  /** Creator Project Template — blueprint-specific generation directive */
  blueprintId?: string | null
  /** Rule-based prior topics from project library (client aggregate) */
  recentTopics?: string[]
  /** Director mode / style line for creator history block */
  creatorHistoryStyle?: string
} & Pick<DeepResearchPipelineOptions, 'researchDocument' | 'researchReport'>

/** Instruct LLM to produce a new variation while keeping topic / style locks. */
export function buildFreshRegenDirective(input: {
  previousScript?: string
  previousHook?: string
}): string {
  const parts = [
    'FRESH REGENERATION — same topic, language, niche, and locked visual style.',
    'Write a completely new script variation. Do NOT repeat, paraphrase, or echo the previous script.',
    'Use different hook angle, scene beats, wording, and emotional pacing while staying on-brief.',
  ]
  if (input.previousHook?.trim()) {
    parts.push(`Previous hook to avoid: "${input.previousHook.slice(0, 220)}"`)
  }
  if (input.previousScript?.trim()) {
    parts.push(
      `Previous script to avoid (do not copy wording or structure):\n${input.previousScript.slice(0, 1500)}`
    )
  }
  return parts.join('\n')
}

/** New topic — do not carry over prior script beats or wording. */
export function buildTopicChangeDirective(input: {
  previousTopic?: string
  previousScript?: string
  previousHook?: string
}): string {
  const parts = [
    'TOPIC UPDATED — the creator changed the brief.',
    'Write a completely new script for the NEW topic below. Do NOT repeat, paraphrase, or reuse scenes from the previous script.',
    'New hook angle, beats, wording, and visuals must match the new topic only.',
  ]
  if (input.previousTopic?.trim()) {
    parts.push(`Previous topic (abandoned): "${input.previousTopic.slice(0, 280)}"`)
  }
  if (input.previousHook?.trim()) {
    parts.push(`Previous hook to avoid: "${input.previousHook.slice(0, 220)}"`)
  }
  if (input.previousScript?.trim()) {
    parts.push(
      `Previous script to avoid (negative example only — do not copy wording or structure):\n${input.previousScript.slice(0, 1500)}`
    )
  }
  return parts.join('\n')
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
    scriptWordCountHint(input.duration),
    languageDirective(normalizeProjectLanguage(input.language)),
    input.virloHook
      ? `VIRLO HOOK SEED (expand into spoken hook — not a quote): ${input.virloHook}`
      : '',
    input.titleSeed
      ? `TITLE SEED (use or improve — not a quote): ${input.titleSeed}`
      : '',
    input.retentionPattern
      ? `CREATOR RETENTION PATTERN: ${input.retentionPattern}`
      : '',
    input.visualStyle
      ? `LOCKED VISUAL STYLE: ${input.visualStyle.label} · ${input.visualStyle.palette}`
      : '',
    input.topicChanged
      ? buildTopicChangeDirective({
          previousTopic: input.previousTopic,
          previousScript: input.previousScript,
          previousHook: input.previousHook,
        })
      : input.regenFresh
        ? buildFreshRegenDirective({
            previousScript: input.previousScript,
            previousHook: input.previousHook,
          })
        : '',
    input.creatorMemoryBias
      ? buildCreatorMemoryPromptSection(input.creatorMemoryBias)
      : '',
    input.creatorProfile ? creatorProfileDirective(input.creatorProfile) : '',
    input.researchReport
      ? buildDeepResearchReportScriptContext(input.researchReport)
      : input.researchDocument
        ? buildDeepResearchScriptContextSection(input.researchDocument)
        : '',
    input.directorMode ? buildDirectorModePromptSection(input.directorMode) : '',
    input.blueprintId ? buildCreatorBlueprintPromptSection(input.blueprintId) : '',
    input.recentTopics?.length || input.creatorHistoryStyle
      ? creatorHistoryDirective({
          recentTopics: input.recentTopics,
          directorMode: input.creatorHistoryStyle ?? input.directorMode,
        })
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  return `${briefHeader}\n\n${buildVirloScriptPrompt(virlo, input.viralStructure)}`
}

// Back-compat re-export for existing imports
export { CINEMATIC_SYSTEM_PROMPT } from '@/lib/ai/prompts/cinematic/system'
