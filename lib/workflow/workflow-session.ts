import type { WorkflowStepId } from '@/lib/workflow/workflow-step-map'

const WORKFLOW_SESSION_KEY = 'mugtee:quick-cut:workflow-continuity:v1'

export type WorkflowContinuitySession = {
  currentWorkflowStep: WorkflowStepId
  completedWorkflowSteps: WorkflowStepId[]
  lastVisitedStep: WorkflowStepId | null
  projectId?: string | null
  scrollY?: number
  lastGeneratedAsset?: string | null
}

export function saveWorkflowSession(data: WorkflowContinuitySession) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(WORKFLOW_SESSION_KEY, JSON.stringify(data))
  } catch {
    /* quota / private mode */
  }
}

export function loadWorkflowSession(): WorkflowContinuitySession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(WORKFLOW_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<WorkflowContinuitySession>
    if (!parsed.currentWorkflowStep || typeof parsed.currentWorkflowStep !== 'string') {
      return null
    }
    return {
      currentWorkflowStep: parsed.currentWorkflowStep as WorkflowStepId,
      completedWorkflowSteps: Array.isArray(parsed.completedWorkflowSteps)
        ? (parsed.completedWorkflowSteps.filter(
            (s): s is WorkflowStepId => typeof s === 'string'
          ) as WorkflowStepId[])
        : [],
      lastVisitedStep:
        typeof parsed.lastVisitedStep === 'string'
          ? (parsed.lastVisitedStep as WorkflowStepId)
          : null,
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : null,
      scrollY: typeof parsed.scrollY === 'number' ? parsed.scrollY : undefined,
      lastGeneratedAsset:
        typeof parsed.lastGeneratedAsset === 'string' ? parsed.lastGeneratedAsset : null,
    }
  } catch {
    return null
  }
}

export function clearWorkflowSession() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(WORKFLOW_SESSION_KEY)
}
