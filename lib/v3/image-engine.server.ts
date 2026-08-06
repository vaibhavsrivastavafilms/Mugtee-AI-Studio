import 'server-only'

import { executeV3ImageGeneration } from '@/lib/v3/image-generation.server'
import { updateV3Project, upsertV3Job } from '@/lib/v3/db.server'
import { V3_POST_IMAGE_STAGE } from '@/lib/v3/pipeline'
import type { SupabaseServerClient } from '@/lib/supabase/server'

export type RunImageEngineParams = {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
  sceneIds?: string[]
  providerId?: string | null
}

export type RunImageEngineResult = {
  success: true
  imagesGenerated: number
}

export async function runV3ImageEngine(params: RunImageEngineParams): Promise<RunImageEngineResult> {
  const isRegeneration = Boolean(params.sceneIds?.length)

  if (!isRegeneration) {
    await updateV3Project(params.supabase, params.projectId, params.userId, {
      current_stage: 'image',
    })
    await upsertV3Job(params.supabase, {
      projectId: params.projectId,
      agent: 'image',
      status: 'running',
      input: {},
    })
  }

  try {
    const { imagesGenerated, durationMs } = await executeV3ImageGeneration(params)

    if (!isRegeneration) {
      await upsertV3Job(params.supabase, {
        projectId: params.projectId,
        agent: 'image',
        status: 'completed',
        output: { imagesGenerated, durationMs },
      })
      await updateV3Project(params.supabase, params.projectId, params.userId, {
        current_stage: V3_POST_IMAGE_STAGE,
      })
    }

    return { success: true, imagesGenerated }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed'
    if (!isRegeneration) {
      await upsertV3Job(params.supabase, {
        projectId: params.projectId,
        agent: 'image',
        status: 'failed',
        error: message,
      })
      await updateV3Project(params.supabase, params.projectId, params.userId, {
        status: 'failed',
        current_stage: 'image',
      })
    }
    throw err
  }
}
