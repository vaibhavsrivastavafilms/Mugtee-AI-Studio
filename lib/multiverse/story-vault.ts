import type { StoryVaultEntry } from '@/lib/multiverse/types'
import {
  buildTimelineFromEvents,
  mergeTimelineWithJournal,
  type TimelineSource,
} from '@/lib/memory/creator-timeline'

export type ProjectRef = {
  id: string
  title?: string | null
  hook?: string | null
  created_at: string
  updated_at?: string | null
}

export function buildStoryVault(
  events: TimelineSource[],
  journal: Array<{ id: string; title?: string | null; created_at: string; project_id?: string | null }>,
  projects: ProjectRef[] = []
): StoryVaultEntry[] {
  const timeline = mergeTimelineWithJournal(buildTimelineFromEvents(events, 60), journal)

  const projectEntries: StoryVaultEntry[] = projects.map((p) => ({
    id: `project-${p.id}`,
    projectId: p.id,
    title: p.title?.trim() || 'Untitled project',
    type: 'project',
    at: p.updated_at ?? p.created_at,
    highlight: p.hook?.slice(0, 80) ?? undefined,
  }))

  const eventEntries: StoryVaultEntry[] = timeline.map((e) => ({
    id: e.id,
    projectId: e.projectId,
    title: e.label,
    type: e.type,
    at: e.at,
  }))

  return [...projectEntries, ...eventEntries]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 50)
}

export function storyVaultToCache(entries: StoryVaultEntry[]): StoryVaultEntry[] {
  return entries.slice(0, 30)
}
