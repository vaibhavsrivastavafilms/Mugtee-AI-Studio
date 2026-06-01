import type { WorkflowStepId } from '@/lib/workflow/workflow-navigation'
import type { PersistedGenerationStep } from '@/lib/cinematic/generation-state'

const CONTINUITY_KEY = 'mugtee:creator:project-continuity:v1'

export type LastGeneratedAsset =
  | 'hook'
  | 'script'
  | 'scenes'
  | 'visuals'
  | 'voice'
  | 'export'
  | null

export type CreatorProjectContinuity = {
  projectId: string
  title: string
  lastEditedAt: string
  currentWorkflowStep: WorkflowStepId
  lastVisitedStep: WorkflowStepId | null
  completedWorkflowSteps: WorkflowStepId[]
  lastGeneratedAsset: LastGeneratedAsset
  lastCompletedStep: PersistedGenerationStep | null
  scrollY: number
  /** Deep link to restore exact workspace location */
  resumeHref: string
}

export function buildResumeHref(projectId: string, step?: WorkflowStepId | null): string {
  const base = `/studio/workspace?project=${encodeURIComponent(projectId)}`
  return step ? `${base}#${step}` : base
}

export function saveProjectContinuity(data: CreatorProjectContinuity): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONTINUITY_KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

export function loadProjectContinuity(): CreatorProjectContinuity | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CONTINUITY_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CreatorProjectContinuity>
    if (!parsed.projectId || typeof parsed.projectId !== 'string') return null
    if (!parsed.title || typeof parsed.title !== 'string') return null
    return {
      projectId: parsed.projectId,
      title: parsed.title,
      lastEditedAt: parsed.lastEditedAt ?? new Date().toISOString(),
      currentWorkflowStep: (parsed.currentWorkflowStep as WorkflowStepId) ?? 'analyze',
      lastVisitedStep: (parsed.lastVisitedStep as WorkflowStepId | null) ?? null,
      completedWorkflowSteps: Array.isArray(parsed.completedWorkflowSteps)
        ? (parsed.completedWorkflowSteps.filter(
            (s): s is WorkflowStepId => typeof s === 'string'
          ) as WorkflowStepId[])
        : [],
      lastGeneratedAsset: (parsed.lastGeneratedAsset as LastGeneratedAsset) ?? null,
      lastCompletedStep: (parsed.lastCompletedStep as PersistedGenerationStep | null) ?? null,
      scrollY: typeof parsed.scrollY === 'number' ? parsed.scrollY : 0,
      resumeHref:
        parsed.resumeHref ??
        buildResumeHref(parsed.projectId, parsed.lastVisitedStep ?? parsed.currentWorkflowStep),
    }
  } catch {
    return null
  }
}

export function clearProjectContinuity(projectId?: string): void {
  if (typeof window === 'undefined') return
  try {
    if (projectId) {
      const current = loadProjectContinuity()
      if (current?.projectId !== projectId) return
    }
    localStorage.removeItem(CONTINUITY_KEY)
  } catch {
    /* ignore */
  }
}

export function isProjectUnfinished(continuity: CreatorProjectContinuity): boolean {
  if (continuity.lastCompletedStep === 'export') return false
  if (continuity.completedWorkflowSteps.includes('export')) return false
  return true
}

export function inferLastGeneratedAsset(
  lastCompletedStep: PersistedGenerationStep | null
): LastGeneratedAsset {
  if (!lastCompletedStep) return null
  const map: Partial<Record<PersistedGenerationStep, LastGeneratedAsset>> = {
    hook: 'hook',
    script: 'script',
    visual_direction: 'scenes',
    storyboard: 'visuals',
    voice: 'voice',
    export: 'export',
  }
  return map[lastCompletedStep] ?? null
}
