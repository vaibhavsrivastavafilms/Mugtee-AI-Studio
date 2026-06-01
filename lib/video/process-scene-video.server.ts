import { buildSceneBlueprintInput } from '@/lib/video-providers/build-scene-video-prompt'
import { getVideoProvider } from '@/lib/video-providers/factory'
import type { SceneBlueprintInput } from '@/lib/video-providers/types'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { VisualStyle } from '@/lib/cinematic/workflow-state'
import { motionPresetIdFromBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import { selectMotionPresetForScene } from '@/lib/motion/motion-presets'
import { logError } from '@/lib/workspace/validation'
import {
  persistSceneVideoOnProject,
  uploadSceneClipFromUrl,
} from '@/lib/video/scene-video-storage'
import { trackSceneVideoUsage } from '@/lib/video/scene-video-limits'
import { updateVideoJob } from '@/lib/video/video-job'

export type ProcessSceneVideoJobInput = {
  jobId: string
  scene: GeneratedScene
  sceneBlueprints?: SceneBlueprint[]
  sceneMotion?: SceneMotionMap | null
  visualStyle?: VisualStyle | null
  projectId?: string | null
  userId?: string | null
}

function blueprintForScene(
  scene: GeneratedScene,
  blueprints?: SceneBlueprint[]
): SceneBlueprint | null {
  return blueprints?.find((b) => b.sceneId === scene.id) ?? null
}

export function buildSceneVideoInputFromScene(
  input: ProcessSceneVideoJobInput
): SceneBlueprintInput {
  const blueprint = blueprintForScene(input.scene, input.sceneBlueprints)
  const presetId =
    input.scene.motionPresetId ??
    (blueprint
      ? motionPresetIdFromBlueprint(blueprint)
      : selectMotionPresetForScene(input.scene, 0, 1))

  return buildSceneBlueprintInput(input.scene, {
    blueprint,
    motionPresetId: presetId,
    sceneMotion: input.sceneMotion,
    visualStyle: input.visualStyle,
    imageUrl: input.scene.imageUrl,
  })
}

export async function processSceneVideoJob(input: ProcessSceneVideoJobInput): Promise<void> {
  const provider = getVideoProvider()
  if (!provider) {
    updateVideoJob(input.jobId, {
      status: 'failed',
      error: 'Scene video generation is not configured',
      label: 'Video generation unavailable',
    })
    return
  }

  if (!input.scene.imageUrl?.trim()) {
    updateVideoJob(input.jobId, {
      status: 'failed',
      error: 'Scene image required before video generation',
      label: 'Missing scene image',
    })
    return
  }

  updateVideoJob(input.jobId, {
    status: 'running',
    label: 'Generating cinematic clip…',
  })

  try {
    const sceneInput = buildSceneVideoInputFromScene(input)
    const result = await provider.generateVideo(sceneInput)

    let finalUrl = result.videoUrl
    let thumbnailUrl = result.thumbnailUrl

    if (
      input.userId &&
      input.projectId &&
      result.videoUrl.startsWith('http')
    ) {
      try {
        const uploaded = await uploadSceneClipFromUrl({
          sourceUrl: result.videoUrl,
          userId: input.userId,
          projectId: input.projectId,
          sceneId: input.scene.id,
          jobId: input.jobId,
        })
        finalUrl = uploaded.videoUrl
      } catch (uploadErr) {
        logError('scene-video.upload', uploadErr)
      }
    }

    const persisted = {
      ...result,
      videoUrl: finalUrl,
      thumbnailUrl: thumbnailUrl ?? input.scene.imageUrl ?? null,
    }

    if (input.userId && input.projectId) {
      await persistSceneVideoOnProject({
        projectId: input.projectId,
        userId: input.userId,
        sceneId: input.scene.id,
        result: persisted,
      })
    }

    if (input.userId) {
      await trackSceneVideoUsage(input.userId)
    }

    updateVideoJob(input.jobId, {
      status: 'done',
      label: 'Video clip ready',
      videoUrl: finalUrl,
      thumbnailUrl: persisted.thumbnailUrl,
      duration: result.duration,
      generationTimeMs: result.generationTimeMs ?? null,
      error: null,
    })
  } catch (err) {
    logError('scene-video.process', err)
    updateVideoJob(input.jobId, {
      status: 'failed',
      label: 'Video generation failed — image fallback preserved',
      error: err instanceof Error ? err.message : 'Video generation failed',
    })
  }
}
