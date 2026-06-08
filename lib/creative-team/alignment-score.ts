import type {
  AgentReport,
  CinematographyPayload,
  CreativeAlignmentScore,
  CreativeTeamPackage,
  MusicPayload,
  ScreenwriterPayload,
  StoryStrategyPayload,
  VoicePayload,
} from '@/lib/creative-team/types'
import type { ProducerReport } from '@/lib/director/producer/types'

function clamp(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)))
}

function avg(nums: number[]): number {
  if (!nums.length) return 0
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

/** Compute cross-agent creative alignment (0–100 per dimension). */
export function computeCreativeAlignmentScore(
  pkg: Pick<
    CreativeTeamPackage,
    | 'storyStrategy'
    | 'producerReport'
    | 'screenwriterReport'
    | 'cinematographyReport'
    | 'voiceReport'
    | 'musicReport'
  >
): CreativeAlignmentScore {
  const producer = pkg.producerReport?.payload as ProducerReport | undefined
  const producerScores = producer?.scores

  const storyFromProducer = producerScores
    ? avg([producerScores.storyStrength, producerScores.emotionalImpact, producerScores.curiosity])
    : null
  const storyFromStrategist = pkg.storyStrategy?.payload
    ? avg(
        (pkg.storyStrategy.payload as { recommendations?: { confidenceScore?: number }[] })
          .recommendations?.map((r) => r.confidenceScore ?? 70) ?? [70]
      )
    : null
  const story = clamp(storyFromProducer ?? storyFromStrategist ?? 65)

  const visuals = clamp(
    producerScores?.visualPotential ??
      (pkg.cinematographyReport ? 72 : 60)
  )

  const voice = clamp(
    pkg.voiceReport
      ? 78
      : producerScores
        ? avg([producerScores.emotionalImpact, producerScores.retention])
        : 62
  )

  const music = clamp(
    pkg.musicReport
      ? 76
      : producerScores
        ? avg([producerScores.emotionalImpact, producerScores.cinematicQuality])
        : 61
  )

  const audienceFit = clamp(
    producerScores?.audienceFit ??
      (pkg.storyStrategy?.payload as { audienceFit?: string } | undefined)
        ? 74
        : 68
  )

  const overall = clamp(avg([story, visuals, voice, music, audienceFit]))

  return { overall, story, visuals, voice, music, audienceFit }
}

export function alignmentFromReports(
  reports: Partial<Record<string, AgentReport>>
): CreativeAlignmentScore {
  return computeCreativeAlignmentScore({
    storyStrategy: (reports['story-strategist'] as AgentReport<StoryStrategyPayload> | undefined) ?? null,
    producerReport: (reports['executive-producer'] as AgentReport<ProducerReport> | undefined) ?? null,
    screenwriterReport: (reports.screenwriter as AgentReport<ScreenwriterPayload> | undefined) ?? null,
    cinematographyReport: (reports.cinematographer as AgentReport<CinematographyPayload> | undefined) ?? null,
    voiceReport: (reports['voice-director'] as AgentReport<VoicePayload> | undefined) ?? null,
    musicReport: (reports['music-director'] as AgentReport<MusicPayload> | undefined) ?? null,
  })
}
