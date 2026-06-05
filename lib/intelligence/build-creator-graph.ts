import {
  STORY_FRAMEWORK_IDS,
  STORY_FRAMEWORKS,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import { computeMemoryScores, frequenciesToPercentages } from '@/lib/director/memory/memory-score'
import type { MemoryFrequencyMap } from '@/lib/director/memory/types'
import {
  buildStyleFingerprint as buildCreatorStyleFingerprint,
  type CreatorStyleFingerprint,
} from '@/lib/ai/style-fingerprint'
import type {
  AffinityMap,
  CreatorIntelligenceGraphData,
  CreatorProfileSummary,
  EvolutionEntry,
  FrameworkAffinity,
  IntelligenceSourceBundle,
  MotionAffinity,
  ProducerAffinity,
  VisualAffinity,
  VoiceAffinity,
} from '@/lib/intelligence/types'
import {
  EMPTY_AUDIENCE_AFFINITY,
  EMPTY_CREATOR_PROFILE,
  EMPTY_PRODUCER_AFFINITY,
} from '@/lib/intelligence/types'

function mapToAffinity(map: MemoryFrequencyMap): AffinityMap {
  return Object.fromEntries(
    frequenciesToPercentages(map, 20).map((e) => [e.label, e.percent])
  )
}

function normalizeFrameworkKey(name: string): StoryFrameworkId | null {
  const key = name.trim().toLowerCase()
  if ((STORY_FRAMEWORK_IDS as readonly string[]).includes(key)) return key as StoryFrameworkId
  const byLabel = STORY_FRAMEWORK_IDS.find(
    (id) => STORY_FRAMEWORKS[id].label.toLowerCase() === key
  )
  return byLabel ?? null
}

function buildFrameworkAffinity(sources: IntelligenceSourceBundle): FrameworkAffinity {
  const weights: Record<string, number> = {}

  for (const id of STORY_FRAMEWORK_IDS) {
    weights[id] = 0
  }

  for (const [key, entry] of Object.entries(sources.creatorMemory.storyMemory.frameworks)) {
    const fw = normalizeFrameworkKey(key)
    if (fw) weights[fw] = (weights[fw] ?? 0) + (entry.weight ?? entry.count ?? 0)
  }

  for (const fw of sources.storyFrameworks) {
    const id = normalizeFrameworkKey(fw.frameworkName)
    if (!id) continue
    const boost = fw.isActive ? 2 : 1
    weights[id] = (weights[id] ?? 0) + boost * Math.max(1, fw.confidenceScore / 25)
  }

  const total = Object.values(weights).reduce((s, v) => s + v, 0) || 1
  const affinity = {} as FrameworkAffinity
  for (const id of STORY_FRAMEWORK_IDS) {
    affinity[id] = Math.round(((weights[id] ?? 0) / total) * 100)
  }
  return affinity
}

function buildVisualAffinity(sources: IntelligenceSourceBundle): VisualAffinity {
  const vm = sources.creatorMemory.visualMemory
  const visualStyles: AffinityMap = {}
  if (sources.creatorMemory.creatorPreferences.preferredMood) {
    visualStyles[sources.creatorMemory.creatorPreferences.preferredMood] = 100
  }
  if (sources.creatorDna.visualStyle) {
    visualStyles[sources.creatorDna.visualStyle] = Math.max(
      visualStyles[sources.creatorDna.visualStyle] ?? 0,
      60
    )
  }
  return {
    shotTypes: mapToAffinity(vm.shotTypes),
    lighting: mapToAffinity(vm.lighting),
    colorPalettes: mapToAffinity(vm.colorPalettes),
    composition: mapToAffinity(vm.composition),
    cameraMovements: mapToAffinity(vm.cameraMovements),
    visualStyles,
  }
}

function buildVoiceAffinity(sources: IntelligenceSourceBundle): VoiceAffinity {
  const vm = sources.creatorMemory.voiceMemory
  return {
    narratorTones: mapToAffinity(vm.narratorTones),
    pacing: mapToAffinity(vm.pacing),
    intensity: mapToAffinity(vm.intensity),
    narrationTypes: mapToAffinity(vm.narrationTypes),
  }
}

function buildMotionAffinity(sources: IntelligenceSourceBundle): MotionAffinity {
  const mm = sources.creatorMemory.motionMemory
  return {
    motionStyles: mapToAffinity(mm.motionStyles),
    zoomUsage: mapToAffinity(mm.zoomUsage),
    panUsage: mapToAffinity(mm.panUsage),
    driftUsage: mapToAffinity(mm.driftUsage),
    pacing: mapToAffinity(mm.pacing),
  }
}

function buildProducerAffinity(sources: IntelligenceSourceBundle): ProducerAffinity {
  const reports = sources.producerReports
  if (!reports.length) return { ...EMPTY_PRODUCER_AFFINITY }

  const n = reports.length
  const avg = (fn: (r: (typeof reports)[0]) => number) =>
    Math.round(reports.reduce((s, r) => s + fn(r), 0) / n)

  const strengthCounts = new Map<string, number>()
  const suggestionCounts = new Map<string, number>()
  let acceptedCount = 0

  for (const r of reports) {
    for (const s of r.recommendations.strengths) {
      strengthCounts.set(s.text, (strengthCounts.get(s.text) ?? 0) + 1)
    }
    for (const s of r.recommendations.suggestions) {
      suggestionCounts.set(s.text, (suggestionCounts.get(s.text) ?? 0) + 1)
    }
    acceptedCount += r.producerMemory.acceptedSuggestionIds.length
  }

  const topFrom = (map: Map<string, number>, limit = 3) =>
    [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([text]) => text)

  return {
    avgStoryScore: avg((r) => r.scores.storyStrength),
    avgAudienceScore: avg((r) => r.scores.audienceFit),
    avgEmotionScore: avg((r) => r.scores.emotionalImpact),
    avgRetentionScore: avg((r) => r.scores.retention),
    avgCinematicScore: avg((r) => r.scores.cinematicQuality),
    productionReadyRate: Math.round(
      (reports.filter((r) => r.productionReady).length / n) * 100
    ),
    reportCount: n,
    topStrengths: topFrom(strengthCounts),
    topSuggestions: topFrom(suggestionCounts),
    acceptedSuggestionCount: acceptedCount,
  }
}

function buildProfileStyleFingerprint(
  sources: IntelligenceSourceBundle
): Partial<CreatorStyleFingerprint> | null {
  return buildCreatorStyleFingerprint(
    {
      niche: sources.profileMeta.niche ?? undefined,
      tone: sources.profileMeta.contentStyle ?? sources.creatorDna.voice ?? undefined,
      platform: sources.profileMeta.platform ?? undefined,
      emotionalGoal: sources.creatorDna.emotionalTrigger ?? undefined,
    },
    { profile: { creatorDna: sources.creatorDna } as import('@/lib/memory/types').MemoryProfile }
  )
}

function identityLabel(sources: IntelligenceSourceBundle, topFramework: string | null): string {
  const approved = sources.directorProjects.filter((p) => p.directorApproved).length
  if (approved >= 5) return 'Seasoned Director'
  if (approved >= 2) return 'Developing Director'
  if (topFramework) return `${STORY_FRAMEWORKS[topFramework as StoryFrameworkId]?.label ?? topFramework} Storyteller`
  if (sources.profileMeta.niche) return `${sources.profileMeta.niche} Creator`
  return 'Emerging Director'
}

function buildCreatorProfile(
  sources: IntelligenceSourceBundle,
  frameworkAffinity: FrameworkAffinity,
  memoryDepth: number
): CreatorProfileSummary {
  const prefs = sources.creatorMemory.creatorPreferences
  const approvedCount = sources.directorProjects.filter((p) => p.directorApproved).length
  const topFw = STORY_FRAMEWORK_IDS.reduce<{ id: StoryFrameworkId; pct: number } | null>(
    (best, id) => {
      const pct = frameworkAffinity[id] ?? 0
      if (!best || pct > best.pct) return { id, pct }
      return best
    },
    null
  )

  return {
    identityLabel: identityLabel(sources, topFw?.id ?? null),
    projectCount: sources.creatorMemory.storyMemory.projectCount,
    directorApprovedCount: approvedCount,
    preferredFramework:
      prefs.preferredFramework ??
      (topFw ? STORY_FRAMEWORKS[topFw.id].label : null),
    preferredGenre: prefs.preferredGenre,
    preferredMood: prefs.preferredMood,
    avgSceneCount: prefs.avgSceneCount,
    avgDurationSec: prefs.avgDurationSec,
    memoryDepth,
    styleFingerprint: buildProfileStyleFingerprint(sources),
  }
}

function buildEvolutionHistory(
  sources: IntelligenceSourceBundle,
  existing: EvolutionEntry[]
): EvolutionEntry[] {
  const entries: EvolutionEntry[] = [...existing]

  const latestReport = sources.producerReports[0]
  if (latestReport) {
    const exists = entries.some(
      (e) => e.event === 'producer_report' && e.projectId === latestReport.projectId
    )
    if (!exists) {
      entries.unshift({
        at: latestReport.updatedAt,
        event: 'producer_report',
        projectId: latestReport.projectId,
        summary: `Producer review — ${latestReport.readinessLabel} (${latestReport.storyReadinessScore}/100)`,
        snapshot: { readinessScore: latestReport.storyReadinessScore },
      })
    }
  }

  const lastProjectId = sources.creatorMemory.storyMemory.lastProjectId
  if (lastProjectId && sources.creatorMemory.storyMemory.projectCount > 0) {
    const exists = entries.some(
      (e) => e.event === 'memory_learned' && e.projectId === lastProjectId
    )
    if (!exists) {
      entries.unshift({
        at: sources.creatorMemory.updatedAt,
        event: 'memory_learned',
        projectId: lastProjectId,
        summary: `Director memory updated from project ${lastProjectId.slice(0, 8)}…`,
        snapshot: {
          topFramework: sources.creatorMemory.creatorPreferences.preferredFramework,
        },
      })
    }
  }

  return entries.slice(0, 24)
}

/** Merge source bundle into unified graph_data. */
export function buildCreatorGraph(
  sources: IntelligenceSourceBundle,
  existingHistory: EvolutionEntry[] = []
): CreatorIntelligenceGraphData {
  const memoryDepth = computeMemoryScores(sources.creatorMemory).overall

  const frameworkAffinity = buildFrameworkAffinity(sources)
  const creatorProfile = buildCreatorProfile(sources, frameworkAffinity, memoryDepth)

  return {
    creatorProfile: creatorProfile.projectCount ? creatorProfile : { ...EMPTY_CREATOR_PROFILE, styleFingerprint: creatorProfile.styleFingerprint },
    frameworkAffinity,
    visualAffinity: buildVisualAffinity(sources),
    voiceAffinity: buildVoiceAffinity(sources),
    motionAffinity: buildMotionAffinity(sources),
    producerAffinity: buildProducerAffinity(sources),
    audienceAffinity: {
      ...EMPTY_AUDIENCE_AFFINITY,
      niche: sources.profileMeta.niche ?? sources.creatorDna.audience ?? null,
      platform: sources.profileMeta.platform ?? null,
      emotionalGoal: sources.creatorDna.emotionalTrigger ?? null,
      audience: sources.creatorDna.audience ?? null,
      creatorType: sources.creatorDna.creatorType ?? null,
      contentStyle: sources.profileMeta.contentStyle ?? sources.creatorDna.voice ?? null,
    },
    evolutionHistory: buildEvolutionHistory(sources, existingHistory),
  }
}
