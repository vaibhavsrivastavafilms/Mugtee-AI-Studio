import type { GeneratedScene } from '@/lib/cinematic/generation'
import { storeScenesToGenerated } from '@/lib/cinematic/generation'
import { loadProject, resolveProjectScenes } from '@/lib/cinematic-projects'
import type { CinematicScene, CinematicVoice } from '@/stores/cinematic-project'

let compileInFlight: Promise<string> | null = null
let compileInFlightProjectId: string | null = null

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

function scenesForRender(scenes: CinematicScene[]): GeneratedScene[] {
  const withImages = scenes.map((scene) => {
    const imageUrl = resolvePersistedSceneImageUrl(scene)
    return imageUrl ? { ...scene, imageUrl } : scene
  })
  return storeScenesToGenerated(withImages)
}

async function pollRenderJob(
  pollUrl: string,
  options?: {
    maxAttempts?: number
    onProgress?: (label: string) => void
  }
): Promise<string> {
  const maxAttempts = options?.maxAttempts ?? 120
  for (let i = 0; i < maxAttempts; i++) {
    await delay(1500)
    const res = await fetch(pollUrl)
    const job = (await res.json()) as Record<string, unknown>

    if (res.status === 404) {
      throw new Error('Render job expired — try again')
    }
    if (!res.ok) {
      throw new Error(String(job?.error || 'Render status unavailable'))
    }
    if (typeof job.label === 'string' && job.label) {
      options?.onProgress?.(job.label)
    }
    if (job.status === 'failed') {
      throw new Error(String(job.error || 'Video render failed'))
    }

    const url =
      typeof job.videoUrl === 'string' && job.videoUrl ? job.videoUrl : null
    if (url) return url
  }
  throw new Error('Video render timed out — try again')
}

async function requestVideoRender(input: {
  idea: string
  title: string
  script: string
  scenes: GeneratedScene[]
  voiceUrl: string | null
  projectId: string
  asyncMode: boolean
}) {
  const renderRes = await fetch('/api/render-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idea: input.idea,
      title: input.title,
      script: input.script,
      scenes: input.scenes,
      voiceUrl: input.voiceUrl,
      async: input.asyncMode,
      projectId: input.projectId,
    }),
  })
  const renderData = (await renderRes.json()) as Record<string, unknown>
  return { renderRes, renderData }
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

  if (row.video_url?.trim()) {
    return row.video_url.trim()
  }

  const configRes = await fetch('/api/quick-cut/config')
  const config = (await configRes.json()) as { videoRenderEnabled?: boolean; ffmpeg?: boolean }
  if (!config.videoRenderEnabled) {
    throw new Error(
      'MP4 compile is not enabled on this server. Set VIDEO_RENDER_ENABLED=true and configure FFmpeg.'
    )
  }
  if (!config.ffmpeg) {
    throw new Error('FFmpeg is not available on the server for MP4 compile.')
  }

  const renderScenes = scenesForRender(scenes)
  const base = {
    idea: row.prompt || row.title || 'cinematic-story',
    title: row.title || 'Untitled reel',
    script: row.script || '',
    scenes: renderScenes,
    voiceUrl,
    projectId,
  }

  const { renderRes, renderData } = await requestVideoRender({ ...base, asyncMode: true })
  if (!renderRes.ok) {
    throw new Error(String(renderData?.error || 'Video render unavailable'))
  }

  if (typeof renderData.videoUrl === 'string' && renderData.videoUrl) {
    return renderData.videoUrl
  }

  if (typeof renderData.pollUrl === 'string') {
    return pollRenderJob(renderData.pollUrl, { onProgress: options?.onProgress })
  }

  const sync = await requestVideoRender({ ...base, asyncMode: false })
  if (sync.renderRes.ok && typeof sync.renderData.videoUrl === 'string') {
    return sync.renderData.videoUrl
  }

  throw new Error(String(sync.renderData?.error || 'Video render unavailable'))
}

/** Loads project assets and compiles all scene slides + voice into one MP4 via /api/render-video. */
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
