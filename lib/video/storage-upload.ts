import fs from 'fs/promises'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const BUCKET = 'project-assets'

export async function uploadRenderMp4(params: {
  localPath: string
  userId: string
  jobId: string
  projectId?: string | null
}): Promise<{ videoUrl: string; storagePath: string }> {
  const supabase = createSupabaseServerClient()
  const buffer = await fs.readFile(params.localPath)
  const folder = params.projectId
    ? `${params.userId}/${params.projectId}`
    : `${params.userId}/renders`
  const storagePath = `${folder}/faceless_${params.jobId}.mp4`

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (error) throw new Error(error.message)

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return { videoUrl: pub.publicUrl, storagePath }
}

/** Dev / unauthenticated: persist under public tmp served by API route. */
export async function saveLocalRenderAsset(params: {
  localPath: string
  jobId: string
}): Promise<{ videoUrl: string; storagePath: string }> {
  const dir = path.join(process.cwd(), '.tmp', 'renders')
  await fs.mkdir(dir, { recursive: true })
  const filename = `${params.jobId}.mp4`
  const dest = path.join(dir, filename)
  await fs.copyFile(params.localPath, dest)
  return {
    videoUrl: `/api/render-video/asset/${params.jobId}`,
    storagePath: dest,
  }
}

export async function persistProjectVideo(params: {
  userId: string
  projectId: string
  videoUrl: string
  storagePath: string
  title?: string
  thumbnailUrl?: string | null
}) {
  const supabase = createSupabaseServerClient()
  await supabase.from('project_assets').insert({
    project_id: params.projectId,
    user_id: params.userId,
    kind: 'video',
    url: params.videoUrl,
    storage_path: params.storagePath,
    mime_type: 'video/mp4',
    title: params.title ?? null,
    metadata: { thumbnail_url: params.thumbnailUrl ?? null, pipeline: 'faceless' },
  })
  await supabase
    .from('cinematic_projects')
    .update({
      status: 'complete',
      video_url: params.videoUrl,
      thumbnail_url: params.thumbnailUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.projectId)
    .eq('user_id', params.userId)
}
