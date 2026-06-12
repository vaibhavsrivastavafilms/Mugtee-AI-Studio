import { NextResponse } from 'next/server'
import { hasImageGenerationKey } from '@/lib/ai/generate-scene-image'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
import { buildQuickCutProviderConfig } from '@/lib/ai/free-tier'
import { isFfmpegAvailable } from '@/lib/video/ffmpeg-path.server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { isRemotionRenderAvailable } from '@/lib/remotion/render-reel.server'
import { hasRunwayApiKey, resolveRunwayVideoProvider } from '@/lib/ai/runway-video'
import {
  hasSeedanceApiKey,
  isSceneVideoGenerationEnabled,
  resolveSceneVideoProviderId,
} from '@/lib/video-providers'
import { isV3PipelineEnabled } from '@/lib/pipeline/v3-feature-flag'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CONFIG_CACHE_MS = 60_000
let configCache: { at: number; body: Record<string, unknown> } | null = null

/** Public-safe booleans — which generation providers are configured server-side. */
export async function GET() {
  const now = Date.now()
  if (configCache && now - configCache.at < CONFIG_CACHE_MS) {
    return NextResponse.json(configCache.body, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
      },
    })
  }

  const providers = buildQuickCutProviderConfig()

  const body = {
    freeTierOnly: providers.freeTierOnly,
    anthropic: providers.anthropic,
    openai: providers.openai,
    elevenlabs: providers.elevenlabs,
    emergent: providers.emergent,
    gemini: providers.gemini,
    geminiDirect: providers.geminiDirect,
    replicate: providers.replicate,
    images: hasImageGenerationKey(),
    script: hasScriptGenerationKey(),
    ffmpeg: isFfmpegAvailable(),
    remotion: isRemotionRenderAvailable(),
    videoRenderEnabled: isVideoRenderEnabled(),
    runway: hasRunwayApiKey(),
    videoProvider: isRemotionRenderAvailable() ? 'remotion' : resolveRunwayVideoProvider(),
    sceneVideoEnabled: false,
    sceneVideoRequiresStudio: true,
    seedance: hasSeedanceApiKey(),
    sceneVideoProvider: null,
    v3PipelineEnabled: isV3PipelineEnabled(),
    models: providers.models,
  }

  configCache = { at: now, body }

  return NextResponse.json(body, {
    headers: {
      'Cache-Control': 'public, max-age=30, stale-while-revalidate=60',
    },
  })
}

