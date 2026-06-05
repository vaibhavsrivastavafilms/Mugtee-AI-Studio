import type { MotionPlan, MotionPlanScene } from '@/lib/director/types'
import {
  createSceneVideoRow,
  updateSceneVideoRow,
  type SceneVideoRow,
} from '@/lib/director/scene-video-db.server'
import { parseProjectScenes, resolveSceneImageUrl } from '@/lib/director/resolve-scene-image'
import { verifyDirectorProject } from '@/lib/director/director-db.server'
import {
  getDirectorVideoProvider,
  isDirectorVideoProviderConfigured,
  resolveDirectorVideoProviderId,
} from '@/lib/video/providers/registry'
import { logError } from '@/lib/workspace/validation'

export type GenerateDirectorSceneVideoInput = {
  projectId: string
  sceneId: string
  userId: string
  motionPlan?: MotionPlan | null
  prompt?: string
}

export type GenerateDirectorSceneVideoResult = {
  id: string
  status: SceneVideoRow['status']
  videoUrl?: string | null
  errorMessage?: string | null
}

function motionForScene(
  motionPlan: MotionPlan | null | undefined,
  sceneId: string
): MotionPlanScene | null {
  if (!motionPlan?.scenes?.length) return null
  const index = Number.parseInt(sceneId, 10)
  if (Number.isFinite(index) && index > 0) {
    return motionPlan.scenes.find((s) => s.sceneIndex === index) ?? motionPlan.scenes[index - 1] ?? null
  }
  return motionPlan.scenes[0] ?? null
}

async function runSceneVideoGeneration(
  rowId: string,
  input: GenerateDirectorSceneVideoInput,
  imageUrl: string,
  sceneMotion: MotionPlanScene | null,
  visualPrompt: string,
  duration: number
): Promise<GenerateDirectorSceneVideoResult> {
  const providerId = resolveDirectorVideoProviderId()

  await updateSceneVideoRow(rowId, { status: 'generating' })

  try {
    const provider = getDirectorVideoProvider(providerId)
    const result = await provider.generateSceneVideo({
      projectId: input.projectId,
      sceneId: input.sceneId,
      imageUrl,
      motionPlan: sceneMotion,
      prompt: visualPrompt,
      duration,
    })

    await updateSceneVideoRow(rowId, {
      status: 'completed',
      videoUrl: result.videoUrl,
      providerJobId: result.jobId ?? null,
      errorMessage: null,
    })

    return {
      id: rowId,
      status: 'completed',
      videoUrl: result.videoUrl,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Scene video generation failed'
    logError('director.generateSceneVideo', err, { projectId: input.projectId, sceneId: input.sceneId })
    await updateSceneVideoRow(rowId, {
      status: 'failed',
      errorMessage: message,
    })
    return {
      id: rowId,
      status: 'failed',
      errorMessage: message,
    }
  }
}

export async function generateDirectorSceneVideo(
  input: GenerateDirectorSceneVideoInput
): Promise<GenerateDirectorSceneVideoResult> {
  const providerId = resolveDirectorVideoProviderId()
  if (!isDirectorVideoProviderConfigured(providerId)) {
    throw new Error(`Video provider "${providerId}" is not configured`)
  }

  const project = await verifyDirectorProject(input.projectId, input.userId)
  if (!project) {
    throw new Error('Project not found')
  }

  const scenes = parseProjectScenes(project.scenes)
  const imageUrl = resolveSceneImageUrl(scenes, input.sceneId)
  if (!imageUrl) {
    throw new Error('Scene storyboard image required before video generation')
  }

  const sceneMotion = motionForScene(input.motionPlan, input.sceneId)
  const duration = sceneMotion?.durationSec ?? 4
  const visualPrompt =
    input.prompt ||
    scenes.find((s) => s.id === input.sceneId)?.visualPrompt ||
    scenes[Number.parseInt(input.sceneId, 10) - 1]?.visualPrompt ||
    ''

  const row = await createSceneVideoRow({
    projectId: input.projectId,
    sceneId: input.sceneId,
    userId: input.userId,
    provider: providerId,
    sourceImageUrl: imageUrl,
    motionPlan: sceneMotion,
  })

  return runSceneVideoGeneration(row.id, input, imageUrl, sceneMotion, visualPrompt, duration)
}

export async function runDirectorSceneVideoAsync(
  input: GenerateDirectorSceneVideoInput,
  rowId: string
): Promise<void> {
  try {
    const providerId = resolveDirectorVideoProviderId()
    if (!isDirectorVideoProviderConfigured(providerId)) {
      throw new Error(`Video provider "${providerId}" is not configured`)
    }

    const project = await verifyDirectorProject(input.projectId, input.userId)
    if (!project) throw new Error('Project not found')

    const scenes = parseProjectScenes(project.scenes)
    const imageUrl = resolveSceneImageUrl(scenes, input.sceneId)
    if (!imageUrl) throw new Error('Scene storyboard image required before video generation')

    const sceneMotion = motionForScene(input.motionPlan, input.sceneId)
    const duration = sceneMotion?.durationSec ?? 4
    const visualPrompt =
      input.prompt ||
      scenes.find((s) => s.id === input.sceneId)?.visualPrompt ||
      scenes[Number.parseInt(input.sceneId, 10) - 1]?.visualPrompt ||
      ''

    await runSceneVideoGeneration(rowId, input, imageUrl, sceneMotion, visualPrompt, duration)
  } catch (err) {
    logError('director.generateSceneVideo.async', err)
    await updateSceneVideoRow(rowId, {
      status: 'failed',
      errorMessage: err instanceof Error ? err.message : 'Async generation failed',
    })
  }
}
