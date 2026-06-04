import {
  generateRunwayVideo,
  hasRunwayApiKey,
} from '@/lib/ai/runway-video'
import type { SceneBlueprintInput, VideoProvider, VideoResult } from '@/lib/video-providers/types'

/** Scene clips via Runway Gen-4 image-to-video — requires RUNWAY_API_KEY or RUNWAYML_API_SECRET. */
export class RunwayProvider implements VideoProvider {
  readonly id = 'runway' as const

  async generateVideo(scene: SceneBlueprintInput): Promise<VideoResult> {
    if (!hasRunwayApiKey()) {
      throw new Error('RUNWAY_API_KEY is not configured')
    }
    if (!scene.imageUrl?.trim()) {
      throw new Error('Scene image required for Runway image-to-video')
    }

    const started = Date.now()
    const prompt = scene.motionDirection?.trim() || scene.imagePrompt?.trim() || scene.narration

    const { videoUrl } = await generateRunwayVideo({
      promptText: prompt.slice(0, 1000),
      promptImage: scene.imageUrl.trim(),
      durationSec: scene.duration,
    })

    return {
      videoUrl,
      thumbnailUrl: scene.imageUrl,
      duration: scene.duration,
      provider: 'runway',
      generationTimeMs: Date.now() - started,
    }
  }
}
