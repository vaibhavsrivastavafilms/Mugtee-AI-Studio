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
import { formatCreatorMemoryForPrompt } from '@/lib/memory/memory-prompt-injection'
import type { MemoryProfile } from '@/lib/memory/types'
import type { CreativeBrief, CreatorMemory } from '@/lib/companion/types'
import {
  formatCompanionBriefFallback,
  formatContentBriefForPrompt,
  type ContentBrief,
} from '@/lib/content-director/content-brief'
import { creatorHistoryDirective } from '@/lib/creator/knowledge-base'
import { buildDeepResearchScriptContextSection } from '@/lib/ai/prompts/youtube/deep-research-prompt'
import { buildDeepResearchReportScriptContext } from '@/lib/ai/prompts/youtube/deep-research-sop'
import { scriptWordCountHint } from '@/lib/ai/prompts/cinematic/script-writing-sop'
import { buildDirectorModePromptSection } from '@/lib/ai/prompts/cinematic/director-mode-prompt'
import { buildCreatorBlueprintPromptSection } from '@/lib/ai/prompts/cinematic/creator-blueprint-prompt'
import type { DirectorMode } from '@/lib/cinematic/director-modes'
import type { DeepResearchPipelineOptions } from '@/types/deep-research'
import {
  buildArchetypePromptSection,
  type SelectedScriptArchetype,
} from '@/lib/cinematic/script-archetypes'
import type { SelectedContentAngle, HookFramework } from '@/lib/cinematic/content-angle-engine'
import {
  formatIntentForPrompt,
  resolveGenerationTopic,
  type ParsedCreatorIntent,
} from '@/lib/input-understanding'
import {
  buildNarrativeFrameworkPromptSection,
  type SelectedNarrativeFramework,
} from '@/lib/narrative/narrative-frameworks'

export type CinematicPromptInput = {
  topic: string
  /** Parsed input understanding — clean topic for generation */
  parsedIntent?: ParsedCreatorIntent | null
  platform: string
  tone: string
  duration: number
  niche: CinematicNiche
  sessionSeed?: string | number
  language?: ProjectLanguage
  /** Hinglish / mixed Hindi-English output lock */
  languageMixed?: boolean
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
  /** Selected script archetype — dynamic structure (not fixed CTSH template) */
  scriptArchetype?: SelectedScriptArchetype
  /** Content originality engine — strategist angle for title/hook/script alignment */
  contentAngle?: SelectedContentAngle
  hookFramework?: HookFramework
  /** Human Creative Companion discovery brief */
  creativeBrief?: CreativeBrief | null
  /** Content Director session brief — preferred over duplicating topic/platform/tone */
  contentBrief?: ContentBrief | null
  /** Dynamic narrative framework — rotates per session to avoid repetitive structure */
  narrativeFramework?: SelectedNarrativeFramework | null
  /** Companion creator memory from reflections */
  companionMemory?: CreatorMemory | null
  /** V3 Memory OS — DNA, graph, relationship */
  memoryProfile?: MemoryProfile | null
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
    'Payoff and CTA must be freshly written for this topic — never reuse generic "save and try step one" closers.',
  ]
  if (input.previousHook?.trim()) {
    parts.push(`Previous hook to avoid: "${input.previousHook.slice(0, 180)}"`)
  }
  if (input.previousScript?.trim()) {
    parts.push(
      `Previous script to avoid (do not copy wording or structure):\n${input.previousScript.slice(0, 1000)}`
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
    parts.push(`Previous hook to avoid: "${input.previousHook.slice(0, 180)}"`)
  }
  if (input.previousScript?.trim()) {
    parts.push(
      `Previous script to avoid (negative example only — do not copy wording or structure):\n${input.previousScript.slice(0, 1000)}`
    )
  }
  return parts.join('\n')
}

export function buildCinematicScriptPrompt(input: CinematicPromptInput): string {
  const generationTopic = resolveGenerationTopic(input.parsedIntent, input.topic)
  const intentBlock = input.parsedIntent ? formatIntentForPrompt(input.parsedIntent) : ''

  const virlo = buildVirloContext(generationTopic, {
    platform: input.platform,
    tone: input.tone,
    duration: input.duration,
    niche: input.niche,
    sessionSeed: input.sessionSeed,
  })
  const directorBrief = formatContentBriefForPrompt(
    input.contentBrief,
    formatCreatorMemoryForPrompt({
      profile: input.memoryProfile,
      companionMemory: input.companionMemory,
    })
  )
  const briefHeader = [
    intentBlock,
    directorBrief ||
      [
        'CREATOR BRIEF (use exactly):',
        `TOPIC: ${generationTopic}`,
        `STYLE: ${input.tone}`,
        `PLATFORM: ${input.platform}`,
      ].join('\n'),
    `MODE: quick_cut`,
    `DURATION: ${input.duration}s`,
    scriptWordCountHint(input.duration),
    languageDirective(normalizeProjectLanguage(input.language), {
      isMixed: input.languageMixed,
    }),
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
    formatCreatorMemoryForPrompt({
      profile: input.memoryProfile,
      companionMemory: input.companionMemory,
    }),
    formatCompanionBriefFallback(input.contentBrief, input.creativeBrief),
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
    input.scriptArchetype
      ? buildArchetypePromptSection(input.scriptArchetype)
      : '',
    input.narrativeFramework
      ? buildNarrativeFrameworkPromptSection(input.narrativeFramework)
      : '',
  ]
    .filter(Boolean)
    .join('\n')
  return `${briefHeader}\n\n${buildVirloScriptPrompt(virlo, input.viralStructure, input.scriptArchetype, input.contentAngle, input.hookFramework)}`
}

// Back-compat re-export for existing imports
export { CINEMATIC_SYSTEM_PROMPT } from '@/lib/ai/prompts/cinematic/system'
