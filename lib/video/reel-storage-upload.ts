import 'server-only'

import fs from 'fs/promises'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const REEL_BUCKET = 'reels'

export type ReelStatus =
  | 'pending'
  | 'queued'
  | 'assembling'
  | 'rendering'
  | 'uploading'
  | 'ready'
  | 'completed'
  | 'failed'

export async function uploadReelMp4(params: {
  localPath: string
  projectId: string
  userId: string
}): Promise<{ videoUrl: string; storagePath: string }> {
  const supabase = createSupabaseServerClient()
  const buffer = await fs.readFile(params.localPath)
  const storagePath = `${params.projectId}/final-reel.mp4`

  const { error } = await supabase.storage.from(REEL_BUCKET).upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  })

  if (error) {
    const fallback = await uploadReelToProjectAssets(params)
    if (fallback) return fallback
    throw new Error(error.message)
  }

  const { data: pub } = supabase.storage.from(REEL_BUCKET).getPublicUrl(storagePath)
  return { videoUrl: pub.publicUrl, storagePath }
}

async function uploadReelToProjectAssets(params: {
  localPath: string
  projectId: string
  userId: string
}): Promise<{ videoUrl: string; storagePath: string } | null> {
  const supabase = createSupabaseServerClient()
  const buffer = await fs.readFile(params.localPath)
  const storagePath = `${params.userId}/${params.projectId}/final-reel.mp4`

  const { error } = await supabase.storage.from('project-assets').upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (error) return null

  const { data: pub } = supabase.storage.from('project-assets').getPublicUrl(storagePath)
  return { videoUrl: pub.publicUrl, storagePath }
}

export async function persistProjectReel(params: {
  userId: string
  projectId: string
  videoUrl: string
  storagePath: string
  title?: string
  thumbnailUrl?: string | null
  reelStatus?: ReelStatus
}) {
  const supabase = createSupabaseServerClient()
  const now = new Date().toISOString()
  const status = params.reelStatus ?? 'ready'
  const dbReelStatus = status === 'ready' ? 'completed' : status

  await supabase.from('project_assets').insert({
    project_id: params.projectId,
    user_id: params.userId,
    kind: 'video',
    url: params.videoUrl,
    storage_path: params.storagePath,
    mime_type: 'video/mp4',
    title: params.title ?? null,
    metadata: {
      thumbnail_url: params.thumbnailUrl ?? null,
      pipeline: 'remotion-reel',
    },
  })

  await supabase
    .from('cinematic_projects')
    .update({
      status: status === 'ready' ? 'complete' : undefined,
      video_url: params.videoUrl,
      thumbnail_url: params.thumbnailUrl ?? null,
      reel_status: dbReelStatus,
      reel_url: params.videoUrl,
      reel_rendered_at: status === 'ready' || status === 'completed' ? now : null,
      updated_at: now,
    })
    .eq('id', params.projectId)
    .eq('user_id', params.userId)
}

export async function updateProjectReelStatus(params: {
  userId: string
  projectId: string
  reelStatus: ReelStatus
}) {
  const supabase = createSupabaseServerClient()
  await supabase
    .from('cinematic_projects')
    .update({
      reel_status: params.reelStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.projectId)
    .eq('user_id', params.userId)
}
