import type { GeneratedScene } from '@/lib/cinematic/generation'
import { loadProject, resolveProjectScenes } from '@/lib/cinematic-projects'
import type { CinematicScene, CinematicVoice } from '@/stores/cinematic-project'

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
  return scenes.some((scene) => Boolean(scene.imageUrl?.trim()))
}

export function resolvePersistedSceneImageUrl(scene: CinematicScene): string | null {
  if (scene.imageUrl?.trim()) return scene.imageUrl.trim()
  const active = scene.storyboardImages?.find(
    (img) => img.id === scene.activeStoryboardId
  )?.url
  if (active?.trim()) return active.trim()
  const first = scene.storyboardImages?.[0]?.url
  return first?.trim() ? first.trim() : null
}

/** True when the project has scene stills and narration audio to compile an MP4. */
export function projectCanCompileMp4(
  scenes: CinematicScene[],
  voice: CinematicVoice | null
): boolean {
  if (!voice?.audioUrl?.trim()) return false
  if (scenes.length < 1) return false
  return scenes.some((scene) => Boolean(resolvePersistedSceneImageUrl(scene)))
}

async function requestReelExport(projectId: string) {
  const exportRes = await fetch('/api/reels/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId,
      quality: '1080p',
      includeVoiceover: true,
      includeCaptions: true,
    }),
  })
  const exportData = (await exportRes.json()) as Record<string, unknown>
  return { renderRes: exportRes, renderData: exportData }
}

export type CompileProjectMp4Options = {
  onProgress?: (label: string) => void
}

async function compileProjectMp4Inner(
  projectId: string,
  options?: CompileProjectMp4Options
): Promise<string> {
  const row = await loadProject(projectId)
  const voiceUrl = row.voice?.audioUrl?.trim() ?? null
  const scenes = resolveProjectScenes(row)

  if (!projectCanCompileMp4(scenes, row.voice)) {
    throw new Error('Add storyboard images and voice narration before compiling MP4.')
  }

  if (row.reel_url?.trim() || row.video_url?.trim()) {
    return (row.reel_url ?? row.video_url)!.trim()
  }

  const configRes = await fetch('/api/quick-cut/config')
  const config = (await configRes.json()) as {
    videoRenderEnabled?: boolean
    remotion?: boolean
    ffmpeg?: boolean
  }
  if (!config.videoRenderEnabled) {
    throw new Error(
      'MP4 compile is not enabled on this server. Set VIDEO_RENDER_ENABLED=true.'
    )
  }
  if (!config.remotion && !config.ffmpeg) {
    throw new Error('Reel render is not available on this server.')
  }

  const { renderRes, renderData } = await requestReelExport(projectId)
  if (!renderRes.ok) {
    throw new Error(String(renderData?.error || 'Video render unavailable'))
  }

  if (renderData.status === 'completed' && typeof renderData.reelUrl === 'string') {
    return renderData.reelUrl
  }

  const jobId = typeof renderData.jobId === 'string' ? renderData.jobId : null
  if (jobId) {
    const { pollReelExportJob } = await import('@/lib/reels/export-poll.client')
    const { reelExportPollPath } = await import('@/lib/reels/export-paths')
    return pollReelExportJob(reelExportPollPath(jobId, projectId), {
      onProgress: (patch) => {
        if (patch.label) options?.onProgress?.(patch.label)
      },
      projectId,
    })
  }

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
