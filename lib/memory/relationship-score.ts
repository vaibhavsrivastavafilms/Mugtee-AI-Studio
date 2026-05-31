import {
  EVENT_SCORE_WEIGHTS,
  RELATIONSHIP_THRESHOLDS,
  type RelationshipLevel,
} from '@/lib/memory/types'

export function scoreToRelationshipLevel(score: number): RelationshipLevel {
  for (const { level, minScore } of RELATIONSHIP_THRESHOLDS) {
    if (score >= minScore) return level
  }
  return 'explorer'
}

export function bumpRelationshipScore(current: number, delta: number): number {
  return Math.max(0, current + delta)
}

export function relationshipLabel(level: RelationshipLevel): string {
  switch (level) {
    case 'creative_soulmate':
      return 'Creative Soulmate'
    case 'director':
      return 'Director'
    case 'partner':
      return 'Partner'
    case 'collaborator':
      return 'Collaborator'
    default:
      return 'Explorer'
  }
}

export function relationshipProgress(score: number): {
  level: RelationshipLevel
  nextLevel: RelationshipLevel | null
  progress: number
  pointsToNext: number
} {
  const level = scoreToRelationshipLevel(score)
  const idx = RELATIONSHIP_THRESHOLDS.findIndex((t) => t.level === level)
  const next = idx > 0 ? RELATIONSHIP_THRESHOLDS[idx - 1] : null
  const currentMin = RELATIONSHIP_THRESHOLDS[idx]?.minScore ?? 0
  const nextMin = next?.minScore ?? currentMin + 100
  const range = nextMin - currentMin
  const progress = next ? Math.min(1, (score - currentMin) / range) : 1
  const pointsToNext = next ? Math.max(0, nextMin - score) : 0
  return { level, nextLevel: next?.level ?? null, progress, pointsToNext }
}

export function eventScoreWeight(eventType: string): number {
  return EVENT_SCORE_WEIGHTS[eventType as keyof typeof EVENT_SCORE_WEIGHTS] ?? 0
}
