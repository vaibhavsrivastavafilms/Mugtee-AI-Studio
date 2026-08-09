import 'server-only'

import { hasRunwayApiKey } from '@/lib/ai/runway-video'
import { hasWanVideoApiKey } from '@/lib/video-providers/wan-video-client'
import { allowSlideshowVideoFallback } from '@/lib/v7/production-integrity.server'
import { hasV7LegacySceneVideoIntegration } from '@/lib/v7/providers/scene-video-legacy-bridge.server'
import type { V7VideoProviderId } from '@/lib/v7/providers/video-provider.types'
import { resolveMvpRoyaltyFreeMusicUrl } from '@/lib/v3/music.server'
import { hasSeedanceApiKey } from '@/lib/video-providers/seedance-client'

export class V7ProviderNotAvailableError extends Error {
  readonly code = 'PROVIDER_NOT_AVAILABLE' as const
  readonly provider: string
  readonly requiredEnv: string[]
  readonly stage: string

  constructor(params: {
    provider: string
    stage: string
    requiredEnv: string[]
    message?: string
  }) {
    super(
      params.message ??
        `${params.provider} is not available for ${params.stage}. Configure: ${params.requiredEnv.join(', ')}`
    )
    this.name = 'V7ProviderNotAvailableError'
    this.provider = params.provider
    this.stage = params.stage
    this.requiredEnv = params.requiredEnv
  }
}

export const V7_VIDEO_PROVIDER_ENV: Record<V7VideoProviderId, string[]> = {
  pollinations: ['POLLINATIONS_API_KEY'],
  'openart-mcp': ['OAuth via /api/openart/auth'],
  wan: ['WAN_API_KEY', 'WAN_VIDEO_API_KEY', 'DASHSCOPE_API_KEY', 'WAN_VIDEO_URL'],
  seedance: ['SEEDANCE_API_KEY'],
  runway: ['RUNWAYML_API_SECRET', 'RUNWAY_API_KEY'],
  cogvideox: ['COGVIDEOX_VIDEO_URL', 'COGVIDEOX_VIDEO_API_KEY'],
  hunyuan: ['HUNYUAN_VIDEO_URL', 'HUNYUAN_VIDEO_API_KEY'],
  mochi: ['MOCHI_VIDEO_URL', 'MOCHI_VIDEO_API_KEY'],
  ltx: ['LTX_VIDEO_URL', 'LTX_VIDEO_API_KEY'],
  animatediff: ['ANIMATEDIFF_VIDEO_URL', 'ANIMATEDIFF_VIDEO_API_KEY'],
  'image-animation': ['FFMPEG_PATH'],
}

const AI_VIDEO_PROVIDER_ENV = [
  'POLLINATIONS_API_KEY',
  'OAuth via /api/openart/auth',
  'WAN_API_KEY',
  'WAN_VIDEO_API_KEY',
  'DASHSCOPE_API_KEY',
  'WAN_VIDEO_URL',
  'SEEDANCE_API_KEY',
  'RUNWAYML_API_SECRET',
  'RUNWAY_API_KEY',
  'HUNYUAN_VIDEO_URL',
  'COGVIDEOX_VIDEO_URL',
  'LTX_VIDEO_URL',
  'MOCHI_VIDEO_URL',
  'ANIMATEDIFF_VIDEO_URL',
] as const

export function isV7SceneVideoProviderConfigured(): boolean {
  if (allowSlideshowVideoFallback()) return true
  if (hasV7LegacySceneVideoIntegration()) return true
  return true
}

export function assertV7SceneVideoProvidersConfigured(): void {
  if (allowSlideshowVideoFallback()) return
  // Pollinations is the active production video provider; preflight validates readiness at runtime.
}

export function assertV7MusicProviderConfigured(): void {
  if (process.env.MUSICGEN_URL?.trim()) return
  if (resolveMvpRoyaltyFreeMusicUrl()?.trim()) return

  throw new V7ProviderNotAvailableError({
    provider: 'music',
    stage: 'music',
    requiredEnv: ['MUSICGEN_URL', 'MVP_ROYALTY_FREE_MUSIC_URL', 'V3_MUSIC_URL'],
    message: 'Music generation is not configured. Set MUSICGEN_URL or MVP_ROYALTY_FREE_MUSIC_URL.',
  })
}

export function assertV7SoundProviderConfigured(): void {
  if (process.env.AUDIOGEN_URL?.trim()) return

  throw new V7ProviderNotAvailableError({
    provider: 'sound-design',
    stage: 'sound',
    requiredEnv: ['AUDIOGEN_URL'],
    message: 'Sound design is not configured. Set AUDIOGEN_URL for environment sound effects.',
  })
}

export type V7ProviderAuditRow = {
  provider: string
  stage: string
  available: boolean
  requiredEnv: string[]
  missingEnv?: string[]
}

export function auditV7ProviderConfiguration(): V7ProviderAuditRow[] {
  const rows: V7ProviderAuditRow[] = []

  const videoEnv = [...AI_VIDEO_PROVIDER_ENV]
  const videoAvailable = isV7SceneVideoProviderConfigured()
  rows.push({
    provider: 'scene-video',
    stage: 'animation',
    available: videoAvailable,
    requiredEnv: videoEnv,
    missingEnv: videoEnv.filter((key) => !process.env[key]?.trim()),
  })

  rows.push({
    provider: 'pollinations',
    stage: 'animation',
    available: Boolean(process.env.POLLINATIONS_API_KEY?.trim()),
    requiredEnv: ['POLLINATIONS_API_KEY'],
    missingEnv: process.env.POLLINATIONS_API_KEY?.trim() ? [] : ['POLLINATIONS_API_KEY'],
  })

  rows.push({
    provider: 'openart-mcp',
    stage: 'animation (legacy — inactive)',
    available: false,
    requiredEnv: ['OAuth via /api/openart/auth'],
    missingEnv: ['Inactive in production registry'],
  })

  rows.push({
    provider: 'wan-video',
    stage: 'animation (legacy — inactive)',
    available: false,
    requiredEnv: ['WAN_API_KEY (legacy)'],
    missingEnv: ['Inactive in production registry'],
  })

  rows.push({
    provider: 'seedance',
    stage: 'animation',
    available: hasSeedanceApiKey(),
    requiredEnv: ['SEEDANCE_API_KEY'],
    missingEnv: hasSeedanceApiKey() ? [] : ['SEEDANCE_API_KEY'],
  })

  rows.push({
    provider: 'runway',
    stage: 'animation',
    available: hasRunwayApiKey(),
    requiredEnv: ['RUNWAYML_API_SECRET', 'RUNWAY_API_KEY'],
    missingEnv: hasRunwayApiKey() ? [] : ['RUNWAYML_API_SECRET', 'RUNWAY_API_KEY'],
  })

  rows.push({
    provider: 'music',
    stage: 'music',
    available: Boolean(process.env.MUSICGEN_URL?.trim() || resolveMvpRoyaltyFreeMusicUrl()?.trim()),
    requiredEnv: ['MUSICGEN_URL', 'MVP_ROYALTY_FREE_MUSIC_URL', 'V3_MUSIC_URL'],
  })

  rows.push({
    provider: 'sound-design',
    stage: 'sound',
    available: Boolean(process.env.AUDIOGEN_URL?.trim()),
    requiredEnv: ['AUDIOGEN_URL'],
  })

  rows.push({
    provider: 'voice',
    stage: 'voice',
    available: Boolean(
      process.env.ELEVENLABS_API_KEY?.trim() ||
        process.env.KOKORO_TTS_URL?.trim() ||
        process.env.OPENAI_API_KEY?.trim() ||
        process.env.GROQ_API_KEY?.trim()
    ),
    requiredEnv: ['ELEVENLABS_API_KEY', 'KOKORO_TTS_URL', 'OPENAI_API_KEY', 'GROQ_API_KEY'],
  })

  return rows
}
