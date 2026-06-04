import {
  type GenerationStatus,
  type PersistedGenerationStep,
} from '@/lib/cinematic/generation-state'
import {
  logPipelineStepComplete,
  logPipelineStepError,
  logPipelineStepStart,
  logStepComplete,
} from '@/lib/cinematic/generation-logger'
import { logStepFailure } from '@/lib/pipeline/pipeline-trace'
import { withStepTimeout } from '@/lib/pipeline/with-step-timeout'
import { logPipelineActivity } from '@/lib/trust/activity-events'
import {
  archiveGeneratedProject,
  updateProject,
  type ArchiveGeneratedProjectInput,
} from '@/lib/cinematic-projects'

export type GenerationPersistState = {
  savedProjectId: string | null
  script: string
  scenes: unknown[]
}

export type GenerationPersistPatch = {
  generation_status: GenerationStatus
  generation_step?: PersistedGenerationStep | null
  generation_error?: string | null
  last_completed_step?: PersistedGenerationStep | null
}

export async function persistGenerationFields(
  projectId: string,
  patch: GenerationPersistPatch
): Promise<void> {
  await updateProject(projectId, patch as Parameters<typeof updateProject>[1])
}

export async function persistStepComplete(
  state: GenerationPersistState,
  step: PersistedGenerationStep,
  archiveInput?: ArchiveGeneratedProjectInput
): Promise<string | null> {
  logStepComplete(step, state.savedProjectId)
  logPipelineActivity(step, state.savedProjectId)
  logPipelineStepStart('project_save', state.savedProjectId, { generationStep: step })

  let projectId = state.savedProjectId

  if (archiveInput && (state.script || state.scenes.length > 0)) {
    try {
      const row = await withStepTimeout(
        'project_save',
        archiveGeneratedProject({
          ...archiveInput,
          projectId: state.savedProjectId,
          generation_status: 'generating',
          generation_step: step,
          last_completed_step: step,
          generation_error: null,
        }),
        60_000
      )
      projectId = row.id
      logPipelineStepComplete('project_save', projectId, {
        generationStep: step,
        sceneCount: archiveInput.scenes?.length ?? 0,
      })
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'archive failed'
      logPipelineStepError('project_save', state.savedProjectId, reason, {
        generationStep: step,
      })
      logStepFailure('project_save', err, { generationStep: step })
    }
  } else if (projectId) {
    try {
      await withStepTimeout(
        'project_save',
        persistGenerationFields(projectId, {
          generation_status: 'generating',
          generation_step: step,
          last_completed_step: step,
          generation_error: null,
        }),
        60_000
      )
    } catch (err) {
      logStepFailure('project_save', err, { generationStep: step, projectId })
    }
  }

  return projectId
}

export async function persistGenerationFailed(
  state: GenerationPersistState,
  archiveInput: ArchiveGeneratedProjectInput | null,
  lastCompletedStep: PersistedGenerationStep | null,
  userError: string
): Promise<void> {
  try {
    if (archiveInput && (state.script || state.scenes.length > 0)) {
      await archiveGeneratedProject({
        ...archiveInput,
        generation_status: 'failed',
        generation_step: lastCompletedStep ?? undefined,
        last_completed_step: lastCompletedStep,
        generation_error: userError,
      })
    } else if (state.savedProjectId) {
      await persistGenerationFields(state.savedProjectId, {
        generation_status: 'failed',
        last_completed_step: lastCompletedStep,
        generation_error: userError,
      })
    }
  } catch {
    /* local state still holds recoverable work */
  }
}
