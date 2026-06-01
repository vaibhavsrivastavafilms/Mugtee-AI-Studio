import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { VideoResult } from '@/lib/video-providers/types'

export type SceneVideoRecord = {
  sceneId: string
  videoUrl: string
  thumbnailUrl: string | null
  provider: string
  generationTimeMs: number | null
  updatedAt: string
}

export function applyVideoResultToScene(
  scene: GeneratedScene,
  result: VideoResult,
  status: GeneratedScene['videoGenerationStatus'] = 'ready'
): GeneratedScene {
  return {
    ...scene,
    videoUrl: result.videoUrl,
    videoThumbnailUrl: result.thumbnailUrl,
    videoProvider: result.provider,
    videoGenerationStatus: status,
    videoGenerationTimeMs: result.generationTimeMs ?? null,
  }
}

export function parseSceneVideosFromCaptions(raw: unknown): SceneVideoRecord[] {
  if (!raw || typeof raw !== 'object') return []
  const row = raw as Record<string, unknown>
  if (!Array.isArray(row.sceneVideos)) return []
  const out: SceneVideoRecord[] = []
  for (const item of row.sceneVideos) {
    if (!item || typeof item !== 'object') continue
    const v = item as Record<string, unknown>
    const sceneId = typeof v.sceneId === 'string' ? v.sceneId.trim() : ''
    const videoUrl = typeof v.videoUrl === 'string' ? v.videoUrl.trim() : ''
    if (!sceneId || !videoUrl) continue
    out.push({
      sceneId,
      videoUrl,
      thumbnailUrl: typeof v.thumbnailUrl === 'string' ? v.thumbnailUrl : null,
      provider: typeof v.provider === 'string' ? v.provider : 'seedance',
      generationTimeMs:
        typeof v.generationTimeMs === 'number' ? v.generationTimeMs : null,
      updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : new Date().toISOString(),
    })
  }
  return out
}

export function mergeSceneVideosIntoScenes(
  scenes: GeneratedScene[],
  records: SceneVideoRecord[]
): GeneratedScene[] {
  if (!records.length) return scenes
  const map = new Map(records.map((r) => [r.sceneId, r]))
  return scenes.map((scene) => {
    const rec = map.get(scene.id)
    if (!rec) return scene
    return applyVideoResultToScene(
      scene,
      {
        videoUrl: rec.videoUrl,
        thumbnailUrl: rec.thumbnailUrl,
        duration: scene.duration,
        provider: rec.provider as VideoResult['provider'],
        generationTimeMs: rec.generationTimeMs ?? undefined,
      },
      'ready'
    )
  })
}
