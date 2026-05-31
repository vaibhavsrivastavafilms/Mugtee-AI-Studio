import { buildDeepResearchReportScriptContext } from '@/lib/ai/prompts/youtube/deep-research-sop'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import type { VirloContext, VirloMetadata } from '@/lib/virlo-engine/types'
import { inferNicheFromBrief, type CinematicNiche } from '@/lib/cinematic/niches'
import {
  analyzeViralStructure,
  retentionPatternFromAnalysis,
  type ViralStructureAnalysis,
} from '@/lib/cinematic/viral-structure'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import {
  visualStyleFromVirloContext,
  type ViralScript,
  type VisualStyle,
} from '@/lib/cinematic/workflow-state'
import type { DeepResearchReport } from '@/types/deep-research'
import { coerceDuration, coercePlatform, coerceTone } from '@/lib/workspace/validation'

export type VirloScriptEngineInput = {
  topic: string
  platform?: string
  tone?: string
  duration?: number
  niche?: string
  sessionSeed?: string | number
  language?: ProjectLanguage | string
  transcript?: string
  voiceNote?: string
  /** Hook from /api/generate-title — feeds LLM instead of topic-template fallback */
  hookSeed?: string
  /** Locked visual style from saved project (regen) */
  visualStyle?: VisualStyle | null
  /** Structured deep-research report — overrides generic hook/retention when present */
  researchReport?: DeepResearchReport
}

export type VirloScriptBlueprint = {
  hook: string
  retention_pattern: string
  viralStructure: ViralStructureAnalysis
  virloContext: VirloContext
  virlo: VirloMetadata
  visualStyle: VisualStyle
  niche: CinematicNiche
}

/**
 * Virlo viral layer — hook + retention structure before Mugtee Director / LLM script.
 * Swap internals for a remote Virlo API when credentials are available.
 */
export function runVirloScriptEngine(input: VirloScriptEngineInput): VirloScriptBlueprint {
  const topic = input.topic.trim()
  const platform = coercePlatform(input.platform)
  const tone = coerceTone(input.tone)
  const duration = coerceDuration(input.duration)
  const niche = inferNicheFromBrief({
    topic,
    tone,
    style: input.tone,
    niche: input.niche,
  })

  const viralStructure = analyzeViralStructure({
    text: topic,
    language: input.language,
    transcript: input.transcript,
    voiceNote: input.voiceNote,
    sessionSeed: input.sessionSeed,
  })

  const virloContext = buildVirloContext(topic, {
    platform,
    tone,
    duration,
    niche,
    sessionSeed: input.sessionSeed,
  })

  const research = input.researchReport
  const researchHook = research?.writersGoldmine.strongestHook?.trim()
  const hook =
    input.hookSeed?.trim() ||
    researchHook ||
    research?.hookAngles[0]?.hookLine?.trim() ||
    viralStructure.hook

  const structure =
    hook !== viralStructure.hook
      ? { ...viralStructure, hook }
      : viralStructure

  const baseRetention = retentionPatternFromAnalysis(structure)
  const retention_pattern = research
    ? [
        research.retentionEngineering.openingPattern,
        ...research.retentionEngineering.rehookMoments.slice(0, 3),
        ...research.retentionEngineering.payoffBeats.slice(0, 2),
      ]
        .filter(Boolean)
        .join(' → ')
    : baseRetention

  return {
    hook,
    retention_pattern,
    viralStructure: structure,
    virloContext,
    virlo: virloMetadataFromContext(virloContext),
    visualStyle: input.visualStyle ?? visualStyleFromVirloContext(virloContext),
    niche,
  }
}

export function mergeViralScript(
  blueprint: VirloScriptBlueprint,
  script: string,
  hookOverride?: string
): ViralScript {
  return {
    hook: hookOverride?.trim() || blueprint.hook,
    retention_pattern: blueprint.retention_pattern,
    script: script.trim(),
  }
}

/** Script prompt block from structured deep research — goldmine, facts, stories, psychology. */
export function buildVirloResearchScriptContext(
  report: DeepResearchReport | null | undefined
): string {
  if (!report) return ''
  return buildDeepResearchReportScriptContext(report)
}
