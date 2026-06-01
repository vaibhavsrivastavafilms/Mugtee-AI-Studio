import fs from 'fs/promises'
import path from 'path'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { scenesToStore, storeScenesToGenerated } from '@/lib/cinematic/generation'
import { resolveProjectScenes } from '@/lib/cinematic-projects'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { downloadToFile } from '@/lib/video/download-asset'
import type { VideoResult } from '@/lib/video-providers/types'
import {
  applyVideoResultToScene,
  type SceneVideoRecord,
} from '@/lib/video/scene-video-shared'

const BUCKET = 'project-assets'

export type { SceneVideoRecord } from '@/lib/video/scene-video-shared'
export {
  applyVideoResultToScene,
  mergeSceneVideosIntoScenes,
  parseSceneVideosFromCaptions,
} from '@/lib/video/scene-video-shared'

export async function uploadSceneClipFromUrl(params: {
  sourceUrl: string
  userId: string
  projectId: string
  sceneId: string
  jobId: string
}): Promise<{ videoUrl: string; storagePath: string }> {
  const supabase = createSupabaseServerClient()
  const workDir = path.join(process.cwd(), '.tmp', 'scene-clips')
  await fs.mkdir(workDir, { recursive: true })
  const localPath = path.join(workDir, `${params.jobId}.mp4`)

  await downloadToFile(params.sourceUrl, localPath)
  const buffer = await fs.readFile(localPath)

  const storagePath = `${params.userId}/${params.projectId}/clips/${params.sceneId}_${params.jobId}.mp4`
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: 'video/mp4',
    upsert: true,
  })
  if (error) throw new Error(error.message)

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return { videoUrl: pub.publicUrl, storagePath }
}

export async function persistSceneVideoOnProject(params: {
  projectId: string
  userId: string
  sceneId: string
  result: VideoResult
}): Promise<SceneVideoRecord> {
  const supabase = createSupabaseServerClient()
  const { data: row, error: readErr } = await supabase
    .from('cinematic_projects')
    .select('scenes, captions')
    .eq('id', params.projectId)
    .eq('user_id', params.userId)
    .maybeSingle()

  if (readErr) throw new Error(readErr.message)
  if (!row) throw new Error('Project not found')

  const scenes = storeScenesToGenerated(resolveProjectScenes(row))
  const nextScenes = scenes.map((scene) =>
    scene.id === params.sceneId
      ? applyVideoResultToScene(scene, params.result, 'ready')
      : scene
  )

  const record: SceneVideoRecord = {
    sceneId: params.sceneId,
    videoUrl: params.result.videoUrl,
    thumbnailUrl: params.result.thumbnailUrl,
    provider: params.result.provider,
    generationTimeMs: params.result.generationTimeMs ?? null,
    updatedAt: new Date().toISOString(),
  }

  const captionsRaw = row.captions
  const captions: Record<string, unknown> =
    captionsRaw && typeof captionsRaw === 'object' && !Array.isArray(captionsRaw)
      ? { ...(captionsRaw as Record<string, unknown>) }
      : { text: typeof captionsRaw === 'string' ? captionsRaw : '' }

  const existing = Array.isArray(captions.sceneVideos)
    ? (captions.sceneVideos as SceneVideoRecord[])
    : []
  const sceneVideos = [
    ...existing.filter((v) => v.sceneId !== params.sceneId),
    record,
  ]

  const { error: writeErr } = await supabase
    .from('cinematic_projects')
    .update({
      scenes: scenesToStore(nextScenes),
      captions: { ...captions, sceneVideos },
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.projectId)
    .eq('user_id', params.userId)

  if (writeErr) throw new Error(writeErr.message)
  return record
}
