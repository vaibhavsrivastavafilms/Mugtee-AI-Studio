import {
  type GenerationStatus,
  type PersistedGenerationStep,
} from '@/lib/cinematic/generation-state'
import { logStepComplete } from '@/lib/cinematic/generation-logger'
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

  let projectId = state.savedProjectId

  if (archiveInput && (state.script || state.scenes.length > 0)) {
    try {
      const row = await archiveGeneratedProject({
        ...archiveInput,
        projectId: state.savedProjectId,
        generation_status: 'generating',
        generation_step: step,
        last_completed_step: step,
        generation_error: null,
      })
      projectId = row.id
    } catch {
      /* partial save best-effort */
    }
  } else if (projectId) {
    try {
      await persistGenerationFields(projectId, {
        generation_status: 'generating',
        generation_step: step,
        last_completed_step: step,
        generation_error: null,
      })
    } catch {
      /* non-blocking */
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
