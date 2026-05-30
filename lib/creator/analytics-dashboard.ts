import { parseCaptionsPayload } from '@/lib/cinematic/generation'
import type { CinematicProjectRow, CinematicProjectSummary } from '@/lib/cinematic-projects'
import { rowToSummary } from '@/lib/cinematic-projects'
import { summaryToCard, type ProjectCardModel } from '@/components/create/unified-projects-grid'
import {
  matchesProjectCategory,
  type ProjectCategoryFilter,
} from '@/lib/project-search-filter'

export type CreatorAnalyticsCategory = Exclude<ProjectCategoryFilter, 'all'>

export const ANALYTICS_CATEGORY_LABELS: Record<CreatorAnalyticsCategory, string> = {
  storytelling: 'Storytelling',
  documentary: 'Documentary',
  instagram: 'Instagram',
  youtube: 'YouTube',
  business: 'Personal Brand',
}

export const CREATOR_MILESTONES = [10, 50, 100, 500] as const

export type CreatorAnalyticsOverview = {
  projectsCreated: number
  scriptsGenerated: number
  videosGenerated: number
  seriesCreated: number
  exportsDownloaded: number | null
}

export type CreatorAnalyticsCategoryBreakdown = {
  id: CreatorAnalyticsCategory
  label: string
  count: number
}

export type CreatorAnalyticsActivity = {
  last7Days: number
  last30Days: number
}

export type CreatorAnalyticsMilestone = {
  current: number
  next: number
  previous: number
  progress: number
  label: string
}

export type CreatorAnalyticsSnapshot = {
  overview: CreatorAnalyticsOverview
  categories: CreatorAnalyticsCategoryBreakdown[]
  activity: CreatorAnalyticsActivity
  milestone: CreatorAnalyticsMilestone
  sampleSize: number
  truncated: boolean
}

export type AnalyticsProjectInput = {
  id: string
  script: string
  videoUrl: string | null
  reelUrl: string | null
  hasSeries: boolean
  createdAt: string
  card: ProjectCardModel
}

function deriveProjectPlatform(project: CinematicProjectSummary): string {
  const haystack = [project.title, project.prompt, project.hook, project.script]
    .join(' ')
    .toLowerCase()
  if (haystack.includes('youtube') || project.mode === 'director' || project.duration > 90) {
    return 'YouTube'
  }
  return 'Instagram Reel'
}

/** Build analytics input from a library summary (no reel_url / series unless enriched). */
export function summaryToAnalyticsProject(
  summary: CinematicProjectSummary,
  extra?: { reelUrl?: string | null; hasSeries?: boolean }
): AnalyticsProjectInput {
  const card = summaryToCard(summary)
  return {
    id: summary.id,
    script: summary.script,
    videoUrl: summary.video_url,
    reelUrl: extra?.reelUrl ?? null,
    hasSeries: extra?.hasSeries ?? false,
    createdAt: summary.createdAt,
    card,
  }
}

/** Build analytics input from a DB row (full captions + reel fields). */
export function analyticsProjectFromRow(row: CinematicProjectRow): AnalyticsProjectInput {
  const summary = rowToSummary(row)
  const parsed = parseCaptionsPayload(row.captions)
  return summaryToAnalyticsProject(summary, {
    reelUrl: row.reel_url ?? null,
    hasSeries: Boolean(parsed.series?.title?.trim()),
  })
}

/** Aggregate analytics from summaries; pass optional row extras keyed by project id. */
export function aggregateAnalyticsFromSummaries(
  summaries: CinematicProjectSummary[],
  options?: {
    rowExtras?: Map<string, { reelUrl?: string | null; hasSeries?: boolean }>
    exportsDownloaded?: number | null
    sampleLimit?: number
  }
): CreatorAnalyticsSnapshot {
  const projects = summaries.map((summary) => {
    const extra = options?.rowExtras?.get(summary.id)
    return summaryToAnalyticsProject(summary, extra)
  })
  return aggregateCreatorAnalytics(projects, {
    exportsDownloaded: options?.exportsDownloaded ?? null,
    sampleLimit: options?.sampleLimit,
  })
}

function parseCreatedAtMs(value: string): number {
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

function hasScript(project: AnalyticsProjectInput): boolean {
  return project.script.trim().length > 0
}

function hasVideo(project: AnalyticsProjectInput): boolean {
  return Boolean(project.videoUrl?.trim() || project.reelUrl?.trim())
}

function countProjectsSince(projects: AnalyticsProjectInput[], days: number, now = Date.now()): number {
  const cutoff = now - days * 24 * 60 * 60 * 1000
  return projects.filter((project) => parseCreatedAtMs(project.createdAt) >= cutoff).length
}

function computeMilestone(total: number): CreatorAnalyticsMilestone {
  const sorted = [...CREATOR_MILESTONES]
  const next = sorted.find((target) => total < target) ?? sorted[sorted.length - 1]
  const previous =
    [...sorted].reverse().find((target) => total >= target) ?? 0
  const span = Math.max(1, next - previous)
  const progress =
    total >= next ? 1 : Math.min(1, Math.max(0, (total - previous) / span))

  return {
    current: total,
    next,
    previous,
    progress,
    label: total >= next ? `${next}+ projects` : `${total} / ${next} projects`,
  }
}

const CATEGORY_IDS: CreatorAnalyticsCategory[] = [
  'storytelling',
  'documentary',
  'instagram',
  'youtube',
  'business',
]

/** Client-side aggregation from project history — no external analytics APIs. */
export function aggregateCreatorAnalytics(
  projects: AnalyticsProjectInput[],
  options?: {
    exportsDownloaded?: number | null
    sampleLimit?: number
  }
): CreatorAnalyticsSnapshot {
  const sampleLimit = options?.sampleLimit
  const truncated = typeof sampleLimit === 'number' && projects.length >= sampleLimit

  const categories: CreatorAnalyticsCategoryBreakdown[] = CATEGORY_IDS.map((id) => ({
    id,
    label: ANALYTICS_CATEGORY_LABELS[id],
    count: projects.filter((project) => matchesProjectCategory(project.card, id)).length,
  })).sort((a, b) => b.count - a.count)

  return {
    overview: {
      projectsCreated: projects.length,
      scriptsGenerated: projects.filter(hasScript).length,
      videosGenerated: projects.filter(hasVideo).length,
      seriesCreated: projects.filter((project) => project.hasSeries).length,
      exportsDownloaded: options?.exportsDownloaded ?? null,
    },
    categories,
    activity: {
      last7Days: countProjectsSince(projects, 7),
      last30Days: countProjectsSince(projects, 30),
    },
    milestone: computeMilestone(projects.length),
    sampleSize: projects.length,
    truncated,
  }
}

export { deriveProjectPlatform }
