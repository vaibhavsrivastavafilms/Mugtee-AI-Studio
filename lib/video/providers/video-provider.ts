import type { MotionPlanScene } from '@/lib/director/types'

export type DirectorVideoProviderId = 'replicate' | 'ltx' | 'wan' | 'kling' | 'hunyuan'

export type SceneVideoStatus = 'queued' | 'generating' | 'completed' | 'failed'

export type SceneMotionParams = {
  zoom?: number
  pan?: 'left' | 'right' | 'up' | 'down' | 'none'
  drift?: number
  dolly?: 'in' | 'out' | 'none'
  parallax?: number
  motionStyle?: string
}

export type SceneVideoInput = {
  projectId: string
  sceneId: string
  imageUrl: string
  motionPlan?: MotionPlanScene | SceneMotionParams | null
  prompt?: string
  duration?: number
}

export type SceneVideoResult = {
  videoUrl: string
  provider: DirectorVideoProviderId
  jobId?: string
  generationTimeMs?: number
}

export type SceneVideoJobStatus = {
  jobId: string
  status: SceneVideoStatus
  videoUrl?: string | null
  errorMessage?: string | null
}

export interface VideoProvider {
  readonly name: DirectorVideoProviderId
  generateSceneVideo(input: SceneVideoInput): Promise<SceneVideoResult>
  getJobStatus?(jobId: string): Promise<SceneVideoJobStatus>
}

export function motionPlanToParams(
  motionPlan?: MotionPlanScene | SceneMotionParams | null
): SceneMotionParams {
  if (!motionPlan) return {}
  if ('motionStyle' in motionPlan && typeof motionPlan.motionStyle === 'string') {
    return parseMotionStyle(motionPlan.motionStyle)
  }
  return motionPlan as SceneMotionParams
}

export function parseMotionStyle(motionStyle: string): SceneMotionParams {
  const style = motionStyle.toLowerCase()
  const params: SceneMotionParams = { motionStyle }

  if (/\bzoom\b|ken\s*burns/i.test(style)) {
    params.zoom = /\bout\b/.test(style) ? -0.6 : 0.7
  }
  if (/\bpan\b/.test(style)) {
    if (/\bleft\b/.test(style)) params.pan = 'left'
    else if (/\bright\b/.test(style)) params.pan = 'right'
    else if (/\bup\b/.test(style)) params.pan = 'up'
    else if (/\bdown\b/.test(style)) params.pan = 'down'
    else params.pan = 'right'
  }
  if (/\bdrift\b|handheld\b|observational\b/.test(style)) {
    params.drift = 0.5
  }
  if (/\bdolly\b|push\b|pull\b/.test(style)) {
    params.dolly = /\bout\b|pull\b/.test(style) ? 'out' : 'in'
  }
  if (/\bparallax\b|depth\b|layered\b/.test(style)) {
    params.parallax = 0.6
  }

  return params
}

export function buildMotionPrompt(
  motionPlan?: MotionPlanScene | SceneMotionParams | null,
  fallbackPrompt?: string
): string {
  const params = motionPlanToParams(motionPlan)
  const parts: string[] = []

  if (params.motionStyle) parts.push(params.motionStyle)
  if (params.zoom && params.zoom > 0) parts.push('slow cinematic zoom in')
  if (params.zoom && params.zoom < 0) parts.push('slow cinematic zoom out')
  if (params.pan && params.pan !== 'none') parts.push(`gentle camera pan ${params.pan}`)
  if (params.drift) parts.push('subtle handheld drift')
  if (params.dolly === 'in') parts.push('dolly push toward subject')
  if (params.dolly === 'out') parts.push('dolly pull back reveal')
  if (params.parallax) parts.push('layered parallax depth')

  const motion = parts.filter(Boolean).join(', ')
  if (motion && fallbackPrompt) return `${fallbackPrompt}. Camera: ${motion}`
  return motion || fallbackPrompt || 'subtle cinematic camera motion'
}
