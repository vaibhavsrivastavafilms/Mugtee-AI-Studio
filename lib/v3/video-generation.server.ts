import 'server-only'



import { runVideoAgent } from '@/agents/video'

import { getV3Project, insertV3SceneVideo } from '@/lib/v3/db.server'

import type { SupabaseServerClient } from '@/lib/supabase/server'



export type ExecuteVideoGenerationParams = {

  supabase: SupabaseServerClient

  projectId: string

  userId: string

  sceneIds?: string[]

  providerId?: string | null

}



export type ExecuteVideoGenerationResult = {

  videosGenerated: number

  durationMs: number

}



/** Generate and persist scene videos (keeps full history — inserts new rows). */

export async function executeV3VideoGeneration(

  params: ExecuteVideoGenerationParams

): Promise<ExecuteVideoGenerationResult> {

  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)

  if (!snapshot) throw new Error('Project not found')



  const plan = snapshot.project.production_plan

  const style = snapshot.project.cinematic_style

  if (!plan) throw new Error('Production plan missing')

  if (!style) throw new Error('Cinematic style missing')

  if (snapshot.scenePrompts.length === 0) {

    throw new Error('Scene prompts missing — run Prompt Engineering first')

  }

  if (snapshot.sceneImages.length === 0) {

    throw new Error('Scene images missing — run Image Generation first')

  }



  const targetScenes = params.sceneIds?.length

    ? snapshot.scenes.filter((scene) => params.sceneIds!.includes(scene.id))

    : snapshot.scenes



  const pendingRows: string[] = []

  const providerId = params.providerId ?? process.env.V3_VIDEO_PROVIDER ?? 'veo'



  for (const scene of targetScenes) {

    const pending = await insertV3SceneVideo(params.supabase, {

      project_id: params.projectId,

      scene_id: scene.id,

      provider: providerId,

      status: 'generating',

      metadata: { attempt: 0 },

    })

    pendingRows.push(pending.id)

  }



  try {

    const { results, durationMs } = await runVideoAgent({

      plan,

      style,

      scenes: snapshot.scenes,

      scenePrompts: snapshot.scenePrompts,

      sceneImages: snapshot.sceneImages,

      userId: params.userId,

      projectId: params.projectId,

      sceneIds: params.sceneIds,

      providerId,

    })



    for (let i = 0; i < results.length; i++) {

      const item = results[i]

      const pendingId = pendingRows[i]

      await params.supabase

        .from('v3_scene_videos')

        .update({

          image_id: item.row.image_id,

          provider: item.row.provider,

          provider_job_id: item.row.provider_job_id,

          video_url: item.row.video_url,

          thumbnail_url: item.row.thumbnail_url,

          duration_seconds: item.row.duration_seconds,

          fps: item.row.fps,

          resolution: item.row.resolution,

          generation_time_ms: item.row.generation_time_ms,

          status: 'completed',

          retry_count: item.row.retry_count,

          metadata: item.row.metadata,

          updated_at: new Date().toISOString(),

        })

        .eq('id', pendingId)

    }



    return { videosGenerated: results.length, durationMs }

  } catch (err) {

    const message = err instanceof Error ? err.message : 'Video generation failed'

    for (const pendingId of pendingRows) {

      await params.supabase

        .from('v3_scene_videos')

        .update({

          status: 'failed',

          retry_count: 3,

          metadata: { error: message, attempt: 3 },

          updated_at: new Date().toISOString(),

        })

        .eq('id', pendingId)

    }

    throw err

  }

}


