import type { GeneratedScene } from '@/lib/cinematic/generation'

import { loadProject, resolveProjectScenes } from '@/lib/cinematic-projects'

import type { CinematicScene, CinematicVoice } from '@/stores/cinematic-project'

import {

  allScenesHaveExportImages,

  missingScenesExportMessage,

  resolveSceneExportImageUrl,

  findScenesMissingExportImages,

} from '@/lib/export/scene-export-validation'

import { ensureExportSafeScenes } from '@/lib/export/export-placeholders'

import {

  validateExportReadinessInput,

  validateExportRequestPayload,

} from '@/lib/export/export-schema'

import { scenesToExportRequestPayload } from '@/lib/export/export-request-payload.client'

import {

  mugteeExportEnd,

  mugteeExportGroup,

  mugteeExportLog,

  mugteeExportSnapshot,

} from '@/lib/export/export-log.client'



let compileInFlight: Promise<string> | null = null

let compileInFlightProjectId: string | null = null



/** True while a project MP4 compile job is running (one at a time globally). */

export function isCompileProjectMp4Busy(projectId?: string): boolean {

  if (!compileInFlight) return false

  if (projectId) return compileInFlightProjectId === projectId

  return true

}



/** Quick Cut session — scene stills + voice when server render is enabled. */

export function quickCutCanCompileMp4(

  scenes: GeneratedScene[],

  voiceUrl: string | null,

  videoRenderEnabled: boolean

): boolean {

  if (!videoRenderEnabled || !voiceUrl?.trim() || scenes.length < 1) return false

  return allScenesHaveExportImages(scenes)

}



export function resolvePersistedSceneImageUrl(scene: CinematicScene): string | null {

  return resolveSceneExportImageUrl(scene)

}



/** True when the project has scene stills and narration audio to compile an MP4. */

export function projectCanCompileMp4(

  scenes: CinematicScene[],

  voice: CinematicVoice | null

): boolean {

  if (!voice?.audioUrl?.trim()) return false

  if (scenes.length < 1) return false

  return allScenesHaveExportImages(scenes)

}



async function backfillStoryboardAssets(projectId: string): Promise<void> {

  mugteeExportGroup('backfill', { projectId })

  try {

    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/backfill-storyboard-assets`, {

      method: 'POST',

    })

    const body = (await res.json().catch(() => ({}))) as {

      error?: string

      missingAssets?: unknown

      success?: boolean

      recovered?: boolean

    }

    mugteeExportLog('backfill.response', { projectId, status: res.status, body })

    if (!res.ok) {

      mugteeExportLog('backfill.non_ok', { status: res.status, error: body.error })

    }

  } catch (err) {

    mugteeExportLog('backfill.failed', {

      projectId,

      message: err instanceof Error ? err.message : String(err),

    })

  } finally {

    mugteeExportEnd()

  }

}



async function requestReelExport(projectId: string) {

  const row = await loadProject(projectId)

  const scenes = ensureExportSafeScenes(resolveProjectScenes(row))

  const snapshot = scenesToExportRequestPayload(scenes)

  const payload = {

    projectId,

    quality: '1080p' as const,

    includeVoiceover: true,

    includeCaptions: true,

    ...snapshot,

    script: row.script ?? null,

    voiceUrl: row.voice?.audioUrl?.trim() ?? null,

    thumbnailUrl: row.thumbnail_url?.trim() ?? null,

  }



  const validated = validateExportRequestPayload(payload)

  if (!validated.ok) {

    throw new Error(validated.message)

  }



  mugteeExportGroup('api_request', { projectId })

  mugteeExportSnapshot({

    stage: 'payload',

    projectId,

    scenes: snapshot.scenes,

    storyboards: snapshot.storyboards,

    payload,

  })



  const exportRes = await fetch('/api/reels/export', {

    method: 'POST',

    headers: { 'Content-Type': 'application/json' },

    body: JSON.stringify(validated.data),

  })

  const exportData = (await exportRes.json()) as Record<string, unknown>

  mugteeExportLog('api_response', { status: exportRes.status, ok: exportRes.ok, exportData })

  mugteeExportEnd()

  return { renderRes: exportRes, renderData: exportData }

}



export type CompileProjectMp4Options = {

  onProgress?: (label: string) => void

}



async function compileProjectMp4Inner(

  projectId: string,

  options?: CompileProjectMp4Options

): Promise<string> {

  mugteeExportGroup('compile_start', { projectId })



  const row = await loadProject(projectId)

  const voiceUrl = row.voice?.audioUrl?.trim() ?? null

  let scenes = ensureExportSafeScenes(resolveProjectScenes(row))



  mugteeExportSnapshot({

    stage: 'project_loaded',

    projectId,

    scenes,

    storyboards: scenes,

    payload: { hasVoice: Boolean(voiceUrl), sceneCount: scenes.length },

  })



  const readiness = validateExportReadinessInput({

    projectId,

    script: row.script,

    voiceUrl,

    scenes,

  })

  if (!readiness.ok) {

    mugteeExportEnd()

    throw new Error(readiness.message)

  }



  if (!voiceUrl) {

    mugteeExportEnd()

    throw new Error('Add voice narration before compiling MP4.')

  }



  if (row.reel_url?.trim() || row.video_url?.trim()) {

    mugteeExportEnd()

    return (row.reel_url ?? row.video_url)!.trim()

  }



  const configModule = await import('@/lib/quick-cut/quick-cut-config-cache.client')
  const fetchQuickCutConfig = configModule.fetchQuickCutConfig
  if (typeof fetchQuickCutConfig !== 'function') {
    console.error('[EXPORT] compile function unavailable', { projectId, stage: 'fetchQuickCutConfig' })
    mugteeExportEnd()
    throw new Error('Export poll unavailable — refresh the page and try Compile MP4 again.')
  }

  const config = (await fetchQuickCutConfig()) as {

    videoRenderEnabled?: boolean

    remotion?: boolean

    ffmpeg?: boolean

  }

  if (!config.videoRenderEnabled) {

    const { REEL_EXPORT_DISABLED_USER_MSG } = await import('@/lib/video/reel-render-errors')

    mugteeExportEnd()

    throw new Error(REEL_EXPORT_DISABLED_USER_MSG)

  }

  if (!config.remotion && !config.ffmpeg) {

    mugteeExportEnd()

    throw new Error('Reel render is not available on this server.')

  }



  await backfillStoryboardAssets(projectId)



  const { renderRes, renderData } = await requestReelExport(projectId)

  if (!renderRes.ok) {

    const detail =

      typeof renderData?.error === 'string'

        ? renderData.error

        : typeof renderData?.message === 'string'

          ? renderData.message

          : 'Video render unavailable'

    mugteeExportEnd()

    throw new Error(detail)

  }

  if (renderData.status === 'completed' && typeof renderData.reelUrl === 'string') {

    mugteeExportEnd()

    return renderData.reelUrl

  }



  const jobId = typeof renderData.jobId === 'string' ? renderData.jobId : null

  if (jobId) {

    const pollModule = await import('@/lib/reels/export-poll.client')

    const pollReelExportJob = pollModule.pollReelExportJob

    if (typeof pollReelExportJob !== 'function') {

      mugteeExportEnd()

      throw new Error('Export poll unavailable — refresh the page and try Compile MP4 again.')

    }

    const pathsModule = await import('@/lib/reels/export-paths')

    const reelExportPollPath = pathsModule.reelExportPollPath

    if (typeof reelExportPollPath !== 'function') {

      mugteeExportEnd()

      throw new Error('Export poll unavailable — refresh the page and try Compile MP4 again.')

    }

    const onProgress =
      typeof options?.onProgress === 'function' ? options.onProgress : undefined

    const url = await pollReelExportJob(reelExportPollPath(jobId, projectId), {

      onProgress: (patch) => {

        if (patch.label && onProgress) onProgress(patch.label)

      },

      projectId,

    })

    mugteeExportLog('compile.complete', { projectId, jobId })

    mugteeExportEnd()

    return url

  }



  mugteeExportEnd()

  throw new Error(String(renderData?.error || 'Video render unavailable'))

}



/** Loads project assets and compiles scene slides + voice into one MP4 via /api/render/reel. */

export async function compileProjectMp4(

  projectId: string,

  options?: CompileProjectMp4Options

): Promise<string> {

  if (compileInFlight && compileInFlightProjectId === projectId) {

    return compileInFlight

  }

  if (compileInFlight) {

    throw new Error('Another video compile is in progress — wait for it to finish.')

  }



  compileInFlightProjectId = projectId

  compileInFlight = compileProjectMp4Inner(projectId, options).finally(() => {

    compileInFlight = null

    compileInFlightProjectId = null

  })

  return compileInFlight

}



/** Pre-flight validation for server compile without starting a job. */

export function validateCompileProjectMp4Input(input: {

  projectId?: string | null

  script?: string | null

  voiceUrl?: string | null

  scenes: CinematicScene[]

}): { ok: true } | { ok: false; message: string } {

  const safeScenes = ensureExportSafeScenes(input.scenes)

  const readiness = validateExportReadinessInput({

    projectId: input.projectId,

    script: input.script,

    voiceUrl: input.voiceUrl,

    scenes: safeScenes,

  })

  if (!readiness.ok) return { ok: false, message: readiness.message }

  if (!input.voiceUrl?.trim()) {

    return { ok: false, message: 'Add voice narration before compiling MP4.' }

  }

  const missing = findScenesMissingExportImages(safeScenes)

  if (missing.length > 0) {

    return { ok: false, message: missingScenesExportMessage(missing) }

  }

  return { ok: true }

}


