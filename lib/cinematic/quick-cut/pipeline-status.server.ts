import 'server-only'

import { hasGeminiImageKey } from '@/lib/ai/generate-scene-image'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
import {
  allowElevenLabsVoice,
  allowEmergentGateway,
  allowOpenAITts,
  hasDirectGeminiKey,
  isFreeTierOnly,
} from '@/lib/ai/free-tier'
import { isFfmpegAvailable } from '@/lib/video/ffmpeg-path.server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import type { QuickCutPipelineStep, QuickCutPipelineStatus, QuickCutStepStatus } from '@/lib/cinematic/quick-cut/pipeline-status'

const FREE_STEP_KEY_HINTS: Record<QuickCutPipelineStep, string[]> = {
  script: ['GEMINI_API_KEY', 'OPENAI_API_KEY'],
  images: ['GEMINI_API_KEY'],
  voice: ['OPENAI_API_KEY'],
  video: ['FFMPEG_PATH'],
}

const PAID_STEP_KEY_HINTS: Record<QuickCutPipelineStep, string[]> = {
  script: ['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'GEMINI_API_KEY'],
  images: ['GEMINI_API_KEY', 'EMERGENT_LLM_KEY', 'OPENAI_API_KEY'],
  voice: ['ELEVENLABS_API_KEY', 'OPENAI_API_KEY', 'EMERGENT_LLM_KEY'],
  video: ['FFMPEG_PATH'],
}

function stepKeyHints(step: QuickCutPipelineStep): string[] {
  return isFreeTierOnly() ? FREE_STEP_KEY_HINTS[step] : PAID_STEP_KEY_HINTS[step]
}

export function detectConfiguredKeys(): string[] {
  const keys: string[] = []
  if (hasDirectGeminiKey()) keys.push('GEMINI_API_KEY')
  if (process.env.ANTHROPIC_API_KEY?.trim()) keys.push('ANTHROPIC_API_KEY')
  if (process.env.OPENAI_API_KEY?.trim()) keys.push('OPENAI_API_KEY')
  if (process.env.ELEVENLABS_API_KEY?.trim()) keys.push('ELEVENLABS_API_KEY')
  if (process.env.EMERGENT_LLM_KEY?.trim()) keys.push('EMERGENT_LLM_KEY')
  if (process.env.REPLICATE_API_TOKEN?.trim()) keys.push('REPLICATE_API_TOKEN')
  return keys
}

function stepHasLiveProvider(step: QuickCutPipelineStep): boolean {
  switch (step) {
    case 'script':
      return hasScriptGenerationKey()
    case 'images':
      return hasGeminiImageKey()
    case 'voice':
      return allowElevenLabsVoice() || allowOpenAITts() || allowEmergentGateway()
    case 'video':
      return isVideoRenderEnabled() ? isFfmpegAvailable() : true
    default:
      return false
  }
}

export function missingKeysForStep(step: QuickCutPipelineStep): string[] {
  if (step === 'video') {
    if (!isVideoRenderEnabled()) return []
    return isFfmpegAvailable() ? [] : ['FFMPEG_PATH (or ffmpeg-static in dev)']
  }
  if (stepHasLiveProvider(step)) return []
  return stepKeyHints(step)
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
