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
  })

  const virloContext = buildVirloContext(topic, {
    platform,
    tone,
    duration,
    niche,
    sessionSeed: input.sessionSeed,
  })

  return {
    hook: viralStructure.hook,
    retention_pattern: retentionPatternFromAnalysis(viralStructure),
    viralStructure,
    virloContext,
    virlo: virloMetadataFromContext(virloContext),
    visualStyle: visualStyleFromVirloContext(virloContext),
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
