import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { MotionPlanScene } from '@/lib/director/types'
import type { DirectorVideoProviderId, SceneVideoStatus } from '@/lib/video/providers/video-provider'

export type SceneVideoRow = {
  id: string
  project_id: string
  scene_id: string
  user_id: string
  provider: string
  status: SceneVideoStatus
  video_url: string | null
  error_message: string | null
  motion_plan: MotionPlanScene | Record<string, unknown> | null
  source_image_url: string | null
  provider_job_id: string | null
  created_at: string
  updated_at: string
}

export async function getSceneVideoById(id: string, userId: string): Promise<SceneVideoRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('scene_videos')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null
  return data as SceneVideoRow
}

export async function getSceneVideoForScene(
  projectId: string,
  sceneId: string,
  userId: string
): Promise<SceneVideoRow | null> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('scene_videos')
    .select('*')
    .eq('project_id', projectId)
    .eq('scene_id', sceneId)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as SceneVideoRow
}

export async function listSceneVideosForProject(
  projectId: string,
  userId: string
): Promise<SceneVideoRow[]> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('scene_videos')
    .select('*')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as SceneVideoRow[]
}

export async function createSceneVideoRow(input: {
  projectId: string
  sceneId: string
  userId: string
  provider: DirectorVideoProviderId
  sourceImageUrl: string
  motionPlan?: MotionPlanScene | Record<string, unknown> | null
}): Promise<SceneVideoRow> {
  const supabase = createSupabaseServerClient()
  const now = new Date().toISOString()
  const row = {
    project_id: input.projectId,
    scene_id: input.sceneId,
    user_id: input.userId,
    provider: input.provider,
    status: 'queued' as SceneVideoStatus,
    video_url: null,
    error_message: null,
    motion_plan: input.motionPlan ?? null,
    source_image_url: input.sourceImageUrl,
    provider_job_id: null,
    updated_at: now,
  }

  const { data, error } = await supabase
    .from('scene_videos')
    .upsert(row, { onConflict: 'project_id,scene_id' })
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Failed to create scene video row')
  }
  return data as SceneVideoRow
}

export async function updateSceneVideoRow(
  id: string,
  patch: Partial<{
    status: SceneVideoStatus
    videoUrl: string | null
    errorMessage: string | null
    providerJobId: string | null
  }>
): Promise<void> {
  const supabase = createSupabaseServerClient()
  const row: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (patch.status !== undefined) row.status = patch.status
  if (patch.videoUrl !== undefined) row.video_url = patch.videoUrl
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage
  if (patch.providerJobId !== undefined) row.provider_job_id = patch.providerJobId

  const { error } = await supabase.from('scene_videos').update(row).eq('id', id)
  if (error) throw new Error(error.message)
}
