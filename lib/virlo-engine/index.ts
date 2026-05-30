import { CREATOR_RETENTION_SCENE_COUNT } from '@/lib/cinematic/viral-structure'
import { coerceDuration, coercePlatform, coerceTone } from '@/lib/workspace/validation'
import { detectEmotionalGoal, emotionalNotesFor } from '@/lib/virlo-engine/emotion-engine'
import {
  generateHookCandidates,
  pickStrongestHookCandidate,
} from '@/lib/virlo-engine/hook-engine'
import {
  loadRecentMemory,
  recordVirloUsage,
  shouldAvoidStructure,
} from '@/lib/virlo-engine/memory-avoidance'
import { analyzeTopic, detectNicheFromTopic } from '@/lib/virlo-engine/niche-locking'
import { buildPacingProfile } from '@/lib/virlo-engine/pacing-engine'
import { buildRetentionPlan } from '@/lib/virlo-engine/retention-engine'
import {
  getStoryStructureById,
  selectStoryStructure,
} from '@/lib/virlo-engine/story-structures'
import { buildSceneVisualLanguage } from '@/lib/virlo-engine/visual-language'
import type {
  VirloBuildOptions,
  VirloContext,
  VirloCreativeSeed,
  VirloMetadata,
  VirloPlatform,
} from '@/lib/virlo-engine/types'

export * from '@/lib/virlo-engine/types'
export { analyzeTopic } from '@/lib/virlo-engine/niche-locking'
export { VIRLO_MEMORY_KEY } from '@/lib/virlo-engine/memory-avoidance'

const NARRATIVE_RHYTHMS = [
  'Wave — swell, peak, exhale',
  'Staircase — each beat higher stakes',
  'Spiral — return motif with new meaning',
  'Pulse — short-long-short sentence cadence',
  'Drift — slow accumulation, sudden snap',
] as const

const EMOTIONAL_ARCS = [
  'Recognition → tension → release',
  'Curiosity → reveal → aftertaste',
  'Denial → confrontation → quiet truth',
  'Awe → intimacy → defiance',
  'Urgency → pause → earned close',
] as const

const VISUAL_STYLES = [
  'Neo-noir vertical — crushed blacks, selective gold',
  'Documentary vérité — natural light, handheld honesty',
  'Luxury stillness — wide negative space, slow moves',
  'Macro psychology — extreme close, shallow focus',
  'High-contrast faceless — silhouette + accent color',
] as const

function hashString(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0
  return h
}

function buildCreativeSeed(idea: string, sessionSeed?: string | number): VirloCreativeSeed {
  const timePart = typeof Date !== 'undefined' ? Date.now() : 0
  const seed = Math.abs(
    hashString(idea) ^
      hashString(String(sessionSeed ?? '')) ^
      (timePart & 0xfffffff)
  )

  return {
    seed,
    narrativeRhythm: NARRATIVE_RHYTHMS[seed % NARRATIVE_RHYTHMS.length],
    narrationIntensity: ['whisper', 'measured', 'cinematic', 'urgent'][
      seed % 4
    ] as VirloCreativeSeed['narrationIntensity'],
    emotionalArc: EMOTIONAL_ARCS[seed % EMOTIONAL_ARCS.length],
    visualStyle: VISUAL_STYLES[seed % VISUAL_STYLES.length],
  }
}

export function buildVirloContext(idea: string, options?: VirloBuildOptions): VirloContext {
  const trimmed = idea.trim()
  const platform = coercePlatform(options?.platform) as VirloPlatform
  const tone = coerceTone(options?.tone)
  const duration = coerceDuration(options?.duration)
  const sceneTarget = CREATOR_RETENTION_SCENE_COUNT

  const creativeSeed = buildCreativeSeed(trimmed, options?.sessionSeed)
  const memory = loadRecentMemory(options?.sessionSeed)

  const topicAnalysis = analyzeTopic(trimmed, {
    tone,
    duration,
    platform,
    niche: options?.niche,
    seed: creativeSeed.seed,
  })

  const avoidStructures = memory.structureIds.filter((id) =>
    shouldAvoidStructure(id, memory)
  )

  let structure = selectStoryStructure(
    topicAnalysis.niche,
    topicAnalysis.retentionType,
    topicAnalysis.pacingStyle,
    creativeSeed.seed,
    avoidStructures
  )

  if (shouldAvoidStructure(structure.id, memory)) {
    structure = getStoryStructureById(topicAnalysis.recommendedStructure)
  }

  const emotionalGoal = detectEmotionalGoal(
    trimmed,
    topicAnalysis.niche,
    creativeSeed.seed
  )
  const emotionalNotes = emotionalNotesFor(emotionalGoal)

  const hooks = generateHookCandidates(
    trimmed,
    topicAnalysis.niche,
    emotionalGoal,
    creativeSeed.seed
  )
  const selectedHook = pickStrongestHookCandidate(hooks)

  const retention = buildRetentionPlan(
    duration,
    sceneTarget,
    topicAnalysis.retentionType,
    structure,
    creativeSeed.seed
  )

  const pacing = buildPacingProfile(
    topicAnalysis.pacingStyle,
    structure,
    creativeSeed.seed
  )

  const visuals = buildSceneVisualLanguage(
    sceneTarget,
    topicAnalysis.niche,
    structure.id,
    emotionalGoal,
    creativeSeed.seed
  )

  if (!options?.skipMemory) {
    recordVirloUsage(
      {
        structureId: structure.id,
        hookPattern: selectedHook.pattern,
        openingMove: structure.openingMove,
      },
      options?.sessionSeed
    )
  }

  return {
    idea: trimmed,
    topicAnalysis,
    structure,
    emotionalGoal,
    emotionalNotes,
    hooks,
    selectedHook,
    retention,
    pacing,
    visuals,
    creativeSeed,
    memory,
    platform,
    tone,
    duration,
    sceneTarget,
  }
}

export function virloMetadataFromContext(ctx: VirloContext): VirloMetadata {
  return {
    structureId: ctx.structure.id,
    structureName: ctx.structure.name,
    hookVariant: ctx.selectedHook.variant,
    emotionalGoal: ctx.emotionalGoal,
    retentionType: ctx.retention.type,
    pacingStyle: ctx.pacing.style,
    seed: ctx.creativeSeed.seed,
  }
}
