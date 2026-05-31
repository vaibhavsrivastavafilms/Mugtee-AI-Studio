import { NextResponse } from 'next/server'
import { hasImageGenerationKey } from '@/lib/ai/generate-scene-image'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
import { buildQuickCutProviderConfig } from '@/lib/ai/free-tier'
import { isFfmpegAvailable } from '@/lib/video/ffmpeg-path.server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { isRemotionRenderAvailable } from '@/lib/remotion/render-reel.server'
import { hasRunwayApiKey, resolveRunwayVideoProvider } from '@/lib/ai/runway-video'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Public-safe booleans — which generation providers are configured server-side. */
export async function GET() {
  const providers = buildQuickCutProviderConfig()

  return NextResponse.json({
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
    models: providers.models,
  })
}

