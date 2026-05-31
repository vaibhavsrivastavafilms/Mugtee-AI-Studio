import type { LegendaryProjectRef } from '@/lib/multiverse/types'

export const LEGENDARY_SCORE_THRESHOLD = 85

export type LegendaryCandidate = {
  projectId: string
  title: string
  score: number
  exported: boolean
  exportedAt?: string
}

export function isLegendaryCandidate(candidate: LegendaryCandidate): boolean {
  return candidate.exported && candidate.score >= LEGENDARY_SCORE_THRESHOLD
}

export function markLegendaryProject(candidate: LegendaryCandidate): LegendaryProjectRef | null {
  if (!isLegendaryCandidate(candidate)) return null
  return {
    projectId: candidate.projectId,
    title: candidate.title,
    score: candidate.score,
    exportedAt: candidate.exportedAt ?? new Date().toISOString(),
  }
}

export function mergeLegendaryProjects(
  existing: LegendaryProjectRef[],
  incoming: LegendaryProjectRef
): LegendaryProjectRef[] {
  const filtered = existing.filter((p) => p.projectId !== incoming.projectId)
  return [incoming, ...filtered].slice(0, 20)
}

export function legendaryBadgeLabel(score: number): string {
  if (score >= 95) return 'Masterpiece'
  if (score >= 90) return 'Legendary'
  return 'Exceptional'
}
