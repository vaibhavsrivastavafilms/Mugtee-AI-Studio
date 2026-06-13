import 'server-only'

import type { CinematicProjectRow } from '@/lib/cinematic-projects'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import {
  resolveSceneExportAssetPath,
  resolveSceneExportImageUrl,
} from '@/lib/export/scene-export-validation'
import { renderPipelineLog } from '@/lib/export/render-pipeline-log.server'
import {
  refreshStoryboardUrl,
  storyboardStorageExists,
} from '@/lib/storyboard/storyboard-url-service.server'
import { extractStoragePathFromUrl } from '@/lib/storyboard/storyboard-asset'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export type RenderInputSceneCheck = {
  sceneId: string
  imageAssetPath: string | null
  freshSignedUrl: string | null
  exists: boolean
}

export type RenderInputAudioCheck = {
  voiceAssetPath: string | null
  voiceUrl: string | null
  exists: boolean
  required: boolean
}

export type RenderExportInputVerification = {
  scenes: RenderInputSceneCheck[]
  audio: RenderInputAudioCheck
  allScenesReady: boolean
  audioReady: boolean
}

async function verifySceneForRender(
  scene: GeneratedScene,
  index: number
): Promise<RenderInputSceneCheck> {
  const supabase = createSupabaseServerClient()
  let imageAssetPath =
    resolveSceneExportAssetPath(scene) ??
    extractStoragePathFromUrl(resolveSceneExportImageUrl(scene))

  let freshSignedUrl: string | null = null
  let exists = false

  if (imageAssetPath) {
    freshSignedUrl = await refreshStoryboardUrl(imageAssetPath, supabase)
    exists =
      Boolean(freshSignedUrl) ||
      (await storyboardStorageExists(imageAssetPath, supabase))
  } else {
    const persisted = resolveSceneExportImageUrl(scene)
    if (persisted?.startsWith('http')) {
      freshSignedUrl = persisted
      exists = true
    }
  }

  renderPipelineLog('RENDER_PREP', {
    phase: 'scene_image',
    sceneId: scene.id,
    sceneIndex: index + 1,
    imageAssetPath,
    freshSignedUrl,
    exists,
    status: exists ? 'ready' : 'missing',
  })

  return {
    sceneId: scene.id,
    imageAssetPath,
    freshSignedUrl,
    exists,
  }
}

async function verifyAudioForRender(params: {
  voiceUrl: string | null
  required: boolean
}): Promise<RenderInputAudioCheck> {
  const voiceUrl = params.voiceUrl?.trim() ?? null
  const voiceAssetPath = voiceUrl ? extractStoragePathFromUrl(voiceUrl) : null
  let exists = !params.required

  if (params.required && voiceUrl) {
    if (voiceAssetPath) {
      const supabase = createSupabaseServerClient()
      exists = await storyboardStorageExists(voiceAssetPath, supabase)
    } else {
      exists = true
    }
  }

  renderPipelineLog('RENDER_PREP', {
    phase: 'audio',
    voiceAssetPath,
    voiceUrl: voiceUrl ? '[redacted]' : null,
    exists,
    required: params.required,
    status: exists ? 'ready' : 'missing',
  })

  return {
    voiceAssetPath,
    voiceUrl,
    exists,
    required: params.required,
  }
}

/** Pre-render gate — storage paths + fresh URLs; fail only when assets genuinely missing. */
export async function verifyRenderExportInputs(params: {
  row: CinematicProjectRow
  scenes: GeneratedScene[]
  includeVoiceover: boolean
  jobId?: string
}): Promise<RenderExportInputVerification> {
  renderPipelineLog('RENDER_PREP', {
    projectId: params.row.id,
    jobId: params.jobId ?? null,
    sceneCount: params.scenes.length,
    status: 'started',
  })

  const sceneChecks = await Promise.all(
    params.scenes.map((scene, index) => verifySceneForRender(scene, index))
  )

  const voiceUrl = params.includeVoiceover
    ? params.row.voice?.audioUrl?.trim() ?? null
    : null
  const audio = await verifyAudioForRender({
    voiceUrl,
    required: params.includeVoiceover,
  })

  const allScenesReady = sceneChecks.every((s) => s.exists)
  const audioReady = audio.exists

  renderPipelineLog('RENDER_PREP', {
    projectId: params.row.id,
    jobId: params.jobId ?? null,
    sceneCount: params.scenes.length,
    frameCount: params.scenes.length,
    audioExists: audioReady,
    allScenesReady,
    audioReady,
    status: allScenesReady && audioReady ? 'pass' : 'fail',
    scenes: sceneChecks,
    audio,
  })

  if (!allScenesReady) {
    const missing = sceneChecks.filter((s) => !s.exists).map((s) => s.sceneId)
    throw new Error(
      `Cannot export reel — storyboard storage missing for scenes: ${missing.join(', ')}`
    )
  }

  if (!audioReady) {
    throw new Error('Voice narration file is missing from storage. Regenerate voice, then export again.')
  }

  return { scenes: sceneChecks, audio, allScenesReady, audioReady }
}
