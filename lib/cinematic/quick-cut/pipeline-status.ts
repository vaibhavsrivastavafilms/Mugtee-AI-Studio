import { isFfmpegAvailable } from '@/lib/video/ffmpeg-path'

export type QuickCutPipelineStep = 'script' | 'images' | 'voice' | 'video'

export type QuickCutStepStatus = 'live' | 'fallback' | 'skipped'

export type QuickCutPipelineStatus = {
  steps: Record<QuickCutPipelineStep, QuickCutStepStatus>
  missingKeys: string[]
  live: boolean
}

const STEP_KEY_HINTS: Record<QuickCutPipelineStep, string[]> = {
  script: ['OPENAI_API_KEY'],
  images: ['OPENAI_API_KEY', 'EMERGENT_LLM_KEY'],
  voice: ['ELEVENLABS_API_KEY', 'OPENAI_API_KEY', 'EMERGENT_LLM_KEY'],
  video: ['FFMPEG_PATH'],
}

export function detectConfiguredKeys(): string[] {
  const keys: string[] = []
  if (process.env.OPENAI_API_KEY?.trim()) keys.push('OPENAI_API_KEY')
  if (process.env.ELEVENLABS_API_KEY?.trim()) keys.push('ELEVENLABS_API_KEY')
  if (process.env.EMERGENT_LLM_KEY?.trim()) keys.push('EMERGENT_LLM_KEY')
  if (process.env.REPLICATE_API_TOKEN?.trim()) keys.push('REPLICATE_API_TOKEN')
  return keys
}

export function missingKeysForStep(step: QuickCutPipelineStep): string[] {
  const hints = STEP_KEY_HINTS[step]
  const configured = detectConfiguredKeys()
  if (step === 'video') {
    return isFfmpegAvailable() ? [] : ['FFMPEG_PATH (or ffmpeg-static in dev)']
  }
  return hints.filter((k) => !configured.includes(k))
}

export function buildPipelineStatus(parts: {
  scriptMock: boolean
  imagesMock: boolean
  voiceMock: boolean
  videoUrl: string | null
  videoError?: boolean
}): QuickCutPipelineStatus {
  const steps: Record<QuickCutPipelineStep, QuickCutStepStatus> = {
    script: parts.scriptMock ? 'fallback' : 'live',
    images: parts.imagesMock ? 'fallback' : 'live',
    voice: parts.voiceMock ? 'fallback' : 'live',
    video: parts.videoUrl ? 'live' : parts.videoError ? 'fallback' : 'skipped',
  }

  const missingKeys = new Set<string>()
  if (steps.script === 'fallback') missingKeysForStep('script').forEach((k) => missingKeys.add(k))
  if (steps.images === 'fallback') missingKeysForStep('images').forEach((k) => missingKeys.add(k))
  if (steps.voice === 'fallback') missingKeysForStep('voice').forEach((k) => missingKeys.add(k))
  if (steps.video === 'fallback') missingKeysForStep('video').forEach((k) => missingKeys.add(k))

  const live = Object.values(steps).every((s) => s === 'live')

  return {
    steps,
    missingKeys: [...missingKeys],
    live,
  }
}

export function formatMissingKeysHint(missingKeys: string[]): string {
  if (missingKeys.length === 0) return ''
  return `Configure ${missingKeys.join(', ')} in your environment for fully live generation.`
}
