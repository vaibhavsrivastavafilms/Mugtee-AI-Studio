import type { SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { ContentQualityScore } from '@/lib/quality/types'

export type StoryScoreDimension = {
  id: string
  label: string
  score: number
}

export type StoryScore = {
  overall: number
  dimensions: StoryScoreDimension[]
}

const BASE_WEIGHTS = {
  curiosity: { sections: ['hook', 'contentDirectorBrief'] as const, weight: 20 },
  retention: { sections: ['script', 'visualDirection'] as const, weight: 25 },
  emotion: { sections: ['script', 'visualDirection'] as const, weight: 20 },
  visualStrength: { sections: ['storyboard', 'thumbnail'] as const, weight: 20 },
  shareability: { sections: ['export', 'captions'] as const, weight: 15 },
}

function sectionBoost(sectionStatus: SectionStatusMap, sections: readonly string[]): number {
  let done = 0
  for (const s of sections) {
    if (sectionStatus[s as keyof SectionStatusMap] === 'completed') done++
  }
  return sections.length > 0 ? done / sections.length : 0
}

export function deriveStoryScore(
  sectionStatus: SectionStatusMap,
  qualityScore?: ContentQualityScore | null
): StoryScore {
  const quality = qualityScore?.breakdown

  const curiosity = Math.round(
    (sectionBoost(sectionStatus, BASE_WEIGHTS.curiosity.sections) * 60 +
      (quality ? (quality.hook / 10) * 40 : 20)) *
      (100 / 100)
  )

  const retention = Math.round(
    sectionBoost(sectionStatus, BASE_WEIGHTS.retention.sections) * 55 +
      (quality ? (quality.retention / 10) * 45 : 15)
  )

  const emotion = Math.round(
    sectionBoost(sectionStatus, BASE_WEIGHTS.emotion.sections) * 55 +
      (quality ? (quality.emotion / 10) * 45 : 15)
  )

  const visualStrength = Math.round(
    sectionBoost(sectionStatus, BASE_WEIGHTS.visualStrength.sections) * 70 +
      (quality ? (quality.storytelling / 10) * 30 : 10)
  )

  const shareability = Math.round(
    sectionBoost(sectionStatus, BASE_WEIGHTS.shareability.sections) * 65 +
      (quality ? (quality.cta / 10) * 35 : 10)
  )

  const dimensions: StoryScoreDimension[] = [
    { id: 'curiosity', label: 'Curiosity', score: Math.min(100, curiosity) },
    { id: 'retention', label: 'Retention', score: Math.min(100, retention) },
    { id: 'emotion', label: 'Emotion', score: Math.min(100, emotion) },
    { id: 'visualStrength', label: 'Visual Strength', score: Math.min(100, visualStrength) },
    { id: 'shareability', label: 'Shareability', score: Math.min(100, shareability) },
  ]

  const overall = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  )

  return { overall: Math.min(100, overall), dimensions }
}
