import type { V3SceneVideoRow } from '@/types/v3/production'



/** Client-safe helper mirroring server pickLatestSceneVideos. */

export function pickLatestSceneVideos(videos: V3SceneVideoRow[]): V3SceneVideoRow[] {

  const latest = new Map<string, V3SceneVideoRow>()

  for (const video of videos) {

    const existing = latest.get(video.scene_id)

    if (!existing) {

      latest.set(video.scene_id, video)

      continue

    }

    if (video.status === 'completed' && existing.status !== 'completed') {

      latest.set(video.scene_id, video)

      continue

    }

    if (video.created_at > existing.created_at && video.status === 'completed') {

      latest.set(video.scene_id, video)

    }

  }

  return Array.from(latest.values()).sort(

    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

  )

}


