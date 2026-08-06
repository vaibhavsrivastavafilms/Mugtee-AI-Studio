import 'server-only'



import { executeV3VideoGeneration } from '@/lib/v3/video-generation.server'

import { updateV3Project, upsertV3Job } from '@/lib/v3/db.server'

import { V3_POST_VIDEO_STAGE } from '@/lib/v3/pipeline'

import type { SupabaseServerClient } from '@/lib/supabase/server'



export type RunVideoEngineParams = {

  supabase: SupabaseServerClient

  projectId: string

  userId: string

  sceneIds?: string[]

  providerId?: string | null

}



export type RunVideoEngineResult = {

  success: true

  videosGenerated: number

}



export async function runV3VideoEngine(params: RunVideoEngineParams): Promise<RunVideoEngineResult> {

  const isRegeneration = Boolean(params.sceneIds?.length)



  if (!isRegeneration) {

    await updateV3Project(params.supabase, params.projectId, params.userId, {

      current_stage: 'video',

    })

    await upsertV3Job(params.supabase, {

      projectId: params.projectId,

      agent: 'video',

      status: 'running',

      input: {},

    })

  }



  try {

    const { videosGenerated, durationMs } = await executeV3VideoGeneration(params)



    if (!isRegeneration) {

      await upsertV3Job(params.supabase, {

        projectId: params.projectId,

        agent: 'video',

        status: 'completed',

        output: { videosGenerated, durationMs },

      })

      await updateV3Project(params.supabase, params.projectId, params.userId, {
        current_stage: V3_POST_VIDEO_STAGE,
      })
    }

    return { success: true, videosGenerated }

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Video generation failed'

    if (!isRegeneration) {

      await upsertV3Job(params.supabase, {

        projectId: params.projectId,

        agent: 'video',

        status: 'failed',

        error: message,

      })

      await updateV3Project(params.supabase, params.projectId, params.userId, {

        status: 'failed',

        current_stage: 'video',

      })

    }

    throw err

  }

}


