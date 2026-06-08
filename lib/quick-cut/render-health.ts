export const REEL_EXPORT_WIDTH = 1080
export const REEL_EXPORT_HEIGHT = 1920
export const REEL_EXPORT_FPS = 30
export const REEL_EXPORT_RESOLUTION_LABEL = `${REEL_EXPORT_WIDTH}×${REEL_EXPORT_HEIGHT}`

export type RenderHealthSnapshot = {
  resolution: string
  fps: number
  currentFrame: number
  totalFrames: number
  sceneCount: number
  currentStage: string
  etaLabel: string | null
  status: 'Healthy' | 'Rendering' | 'Uploading' | 'Stalled' | 'Failed' | 'Idle'
  progressPercent: number
}

export function resolveRenderHealth(input: {
  isRenderingVideo: boolean
  renderPollUrl: string | null
  videoUrl: string | null
  renderError: string | null
  renderStatusLabel: string | null
  progressPercent: number
  currentFrame: number
  totalFrames: number
  sceneCount: number
  currentStage: string
  etaLabel: string | null
  renderStartedAt: number | null
}): RenderHealthSnapshot | null {
  const exporting = Boolean(
    input.isRenderingVideo || (input.renderPollUrl && !input.videoUrl)
  )
  if (!exporting && !input.videoUrl) return null

  let status: RenderHealthSnapshot['status'] = 'Idle'
  if (input.renderError) status = 'Failed'
  else if (input.isRenderingVideo || input.renderPollUrl) {
    if (/upload/i.test(input.renderStatusLabel ?? '')) status = 'Uploading'
    else status = 'Rendering'
    if (
      input.renderStartedAt &&
      Date.now() - input.renderStartedAt > 180_000 &&
      input.progressPercent < 90
    ) {
      status = 'Stalled'
    }
  } else if (input.videoUrl) status = 'Healthy'

  return {
    resolution: REEL_EXPORT_RESOLUTION_LABEL,
    fps: REEL_EXPORT_FPS,
    currentFrame: input.currentFrame,
    totalFrames: input.totalFrames,
    sceneCount: input.sceneCount,
    currentStage: input.currentStage,
    etaLabel: input.etaLabel,
    status,
    progressPercent: input.progressPercent,
  }
}
