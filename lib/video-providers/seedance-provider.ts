import {
  createSeedanceTask,
  hasSeedanceApiKey,
  waitForSeedanceOutput,
} from '@/lib/video-providers/seedance-client'
import type { SceneBlueprintInput, VideoProvider, VideoResult } from '@/lib/video-providers/types'

export class SeedanceProvider implements VideoProvider {
  readonly id = 'seedance' as const

  async generateVideo(scene: SceneBlueprintInput): Promise<VideoResult> {
    if (!hasSeedanceApiKey()) {
      throw new Error('SEEDANCE_API_KEY is not configured')
    }

    const started = Date.now()
    const prompt = scene.motionDirection || scene.imagePrompt

    const taskId = await createSeedanceTask({
      prompt,
      imageUrl: scene.imageUrl,
      durationSec: scene.duration,
    })

    const output = await waitForSeedanceOutput(taskId, {
      onProgress: () => undefined,
    })

    return {
      videoUrl: output.videoUrl,
      thumbnailUrl: output.thumbnailUrl ?? scene.imageUrl ?? null,
      duration: scene.duration,
      provider: 'seedance',
      generationTimeMs: Date.now() - started,
    }
  }
}
