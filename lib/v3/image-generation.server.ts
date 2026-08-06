import 'server-only'

import { runImageAgent } from '@/agents/image'
import { getV3Project, insertV3SceneImage } from '@/lib/v3/db.server'
import type { SupabaseServerClient } from '@/lib/supabase/server'

export type ExecuteImageGenerationParams = {
  supabase: SupabaseServerClient
  projectId: string
  userId: string
  sceneIds?: string[]
  providerId?: string | null
}

export type ExecuteImageGenerationResult = {
  imagesGenerated: number
  durationMs: number
}

/** Generate and persist scene images (keeps full history — inserts new rows). */
export async function executeV3ImageGeneration(
  params: ExecuteImageGenerationParams
): Promise<ExecuteImageGenerationResult> {
  const snapshot = await getV3Project(params.supabase, params.projectId, params.userId)
  if (!snapshot) throw new Error('Project not found')

  const plan = snapshot.project.production_plan
  const style = snapshot.project.cinematic_style
  if (!plan) throw new Error('Production plan missing')
  if (!style) throw new Error('Cinematic style missing')
  if (snapshot.scenePrompts.length === 0) {
    throw new Error('Scene prompts missing — run Prompt Engineering first')
  }

  const targetScenes = params.sceneIds?.length
    ? snapshot.scenes.filter((s) => params.sceneIds!.includes(s.id))
    : snapshot.scenes

  const pendingRows: string[] = []
  const providerId = params.providerId ?? process.env.V3_IMAGE_PROVIDER ?? 'gpt-image'

  for (const scene of targetScenes) {
    const prompt = snapshot.scenePrompts.find((p) => p.scene_id === scene.id)
    const pending = await insertV3SceneImage(params.supabase, {
      project_id: params.projectId,
      scene_id: scene.id,
      prompt_id: prompt?.id ?? null,
      provider: providerId,
      status: 'generating',
      metadata: { attempt: 0 },
    })
    pendingRows.push(pending.id)
  }

  try {
    const { results, durationMs } = await runImageAgent({
      plan,
      style,
      scenes: snapshot.scenes,
      scenePrompts: snapshot.scenePrompts,
      characters: snapshot.characters,
      locations: snapshot.locations,
      userId: params.userId,
      projectId: params.projectId,
      sceneIds: params.sceneIds,
      providerId,
    })

    for (let i = 0; i < results.length; i++) {
      const item = results[i]
      const pendingId = pendingRows[i]
      await params.supabase
        .from('v3_scene_images')
        .update({
          prompt_id: item.row.prompt_id,
          provider: item.row.provider,
          provider_job_id: item.row.provider_job_id,
          image_url: item.row.image_url,
          thumbnail_url: item.row.thumbnail_url,
          seed: item.row.seed,
          width: item.row.width,
          height: item.row.height,
          generation_time_ms: item.row.generation_time_ms,
          status: 'completed',
          metadata: item.row.metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingId)
    }

    return { imagesGenerated: results.length, durationMs }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Image generation failed'
    for (const pendingId of pendingRows) {
      await params.supabase
        .from('v3_scene_images')
        .update({
          status: 'failed',
          metadata: { error: message, attempt: 3 },
          updated_at: new Date().toISOString(),
        })
        .eq('id', pendingId)
    }
    throw err
  }
}
