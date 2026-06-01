import { logEvent, type EventType } from '@/lib/log-event'
import type { PersistedGenerationStep } from '@/lib/cinematic/generation-state'

const STEP_EVENT: Partial<Record<PersistedGenerationStep, EventType>> = {
  hook: 'hook_generated',
  script: 'script_generated',
  visual_direction: 'scenes_generated',
  storyboard: 'visuals_generated',
  voice: 'voiceover_generated',
  export: 'export_created',
}

const LOCAL_ACTIVITY_KEY = 'mugtee:creator:activity-cache:v1:'

export type CachedActivityEntry = {
  id: string
  label: string
  createdAt: string
}

function cacheKey(projectId: string) {
  return `${LOCAL_ACTIVITY_KEY}${projectId}`
}

export function cacheLocalActivity(
  projectId: string,
  label: string,
  createdAt = new Date().toISOString()
): void {
  if (typeof window === 'undefined' || !projectId) return
  try {
    const key = cacheKey(projectId)
    const raw = localStorage.getItem(key)
    const prev: CachedActivityEntry[] = raw ? (JSON.parse(raw) as CachedActivityEntry[]) : []
    const entry: CachedActivityEntry = {
      id: `${createdAt}-${label}`,
      label,
      createdAt,
    }
    localStorage.setItem(key, JSON.stringify([entry, ...prev].slice(0, 40)))
  } catch {
    /* ignore */
  }
}

export function loadCachedActivity(projectId: string): CachedActivityEntry[] {
  if (typeof window === 'undefined' || !projectId) return []
  try {
    const raw = localStorage.getItem(cacheKey(projectId))
    if (!raw) return []
    return JSON.parse(raw) as CachedActivityEntry[]
  } catch {
    return []
  }
}

const STEP_LABEL: Record<PersistedGenerationStep, string> = {
  hook: 'Hook generated',
  script: 'Script generated',
  visual_direction: 'Scenes generated',
  storyboard: 'Visuals generated',
  voice: 'Voice generated',
  export: 'Export ready',
}

/** Log a pipeline milestone to team_activity + local cache (best-effort). */
export function logPipelineActivity(
  step: PersistedGenerationStep,
  projectId: string | null | undefined,
  title?: string
): void {
  const label = STEP_LABEL[step] ?? 'Activity recorded'
  if (projectId) {
    cacheLocalActivity(projectId, label)
  }
  const eventType = STEP_EVENT[step]
  if (!eventType || !projectId) return
  void logEvent({
    event_type: eventType,
    project_id: projectId,
    target: title,
    metadata: { step },
  })
}
