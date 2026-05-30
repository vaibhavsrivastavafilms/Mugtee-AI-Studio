import type { ProjectCardModel } from '@/components/create/unified-projects-grid'

export type ProjectCategoryFilter =
  | 'all'
  | 'youtube'
  | 'instagram'
  | 'storytelling'
  | 'documentary'
  | 'business'

export type ProjectSortOrder = 'recently_edited' | 'newest' | 'oldest'

const BUSINESS_NICHES = new Set(['finance', 'luxury', 'motivation'])
const BUSINESS_KEYWORDS = ['business', 'finance', 'entrepreneur', 'startup', 'money', 'revenue']

function searchableText(project: ProjectCardModel): string {
  return [
    project.title,
    project.niche,
    project.platform,
    project.previewSnippet ?? '',
    project.style,
    project.prompt ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

export function matchesProjectSearch(project: ProjectCardModel, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return searchableText(project).includes(q)
}

function haystack(project: ProjectCardModel): string {
  return [
    project.title,
    project.niche,
    project.platform,
    project.style,
    project.previewSnippet ?? '',
    project.prompt ?? '',
    project.projectTypeLabel,
  ]
    .join(' ')
    .toLowerCase()
}

export function matchesProjectCategory(
  project: ProjectCardModel,
  filter: ProjectCategoryFilter
): boolean {
  if (filter === 'all') return true

  const text = haystack(project)
  const niche = project.niche.toLowerCase()
  const platform = project.platform.toLowerCase()

  switch (filter) {
    case 'youtube':
      return (
        platform.includes('youtube') ||
        text.includes('youtube') ||
        project.mode === 'director' ||
        project.duration > 90
      )
    case 'instagram':
      return (
        platform.includes('instagram') ||
        text.includes('instagram') ||
        text.includes('reel') ||
        (project.mode === 'quick' && !platform.includes('youtube'))
      )
    case 'storytelling':
      return niche === 'storytelling' || niche.includes('story') || text.includes('storytelling')
    case 'documentary':
      return niche === 'documentary' || text.includes('documentary')
    case 'business':
      return (
        BUSINESS_NICHES.has(niche) ||
        BUSINESS_KEYWORDS.some((keyword) => text.includes(keyword))
      )
    default:
      return true
  }
}

function parseTimestamp(value: string | undefined): number {
  if (!value) return 0
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : 0
}

export function sortProjects(
  projects: ProjectCardModel[],
  order: ProjectSortOrder
): ProjectCardModel[] {
  const sorted = [...projects]
  switch (order) {
    case 'newest':
      return sorted.sort(
        (a, b) => parseTimestamp(b.createdAt) - parseTimestamp(a.createdAt)
      )
    case 'oldest':
      return sorted.sort(
        (a, b) => parseTimestamp(a.createdAt) - parseTimestamp(b.createdAt)
      )
    case 'recently_edited':
    default:
      return sorted.sort(
        (a, b) => parseTimestamp(b.updatedAt) - parseTimestamp(a.updatedAt)
      )
  }
}

export function filterAndSortProjects(
  projects: ProjectCardModel[],
  options: {
    search: string
    category: ProjectCategoryFilter
    sort: ProjectSortOrder
  }
): ProjectCardModel[] {
  const filtered = projects.filter(
    (project) =>
      matchesProjectSearch(project, options.search) &&
      matchesProjectCategory(project, options.category)
  )
  return sortProjects(filtered, options.sort)
}
