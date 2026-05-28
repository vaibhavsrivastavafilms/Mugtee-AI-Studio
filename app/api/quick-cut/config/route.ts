import { NextResponse } from 'next/server'
import { hasImageGenerationKey } from '@/lib/ai/generate-scene-image'
import { isFfmpegAvailable } from '@/lib/video/ffmpeg-path.server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Public-safe booleans — which generation providers are configured server-side. */
export async function GET() {
  return NextResponse.json({
    openai: Boolean(process.env.OPENAI_API_KEY?.trim()),
    elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
    emergent: Boolean(process.env.EMERGENT_LLM_KEY?.trim()),
    replicate: Boolean(process.env.REPLICATE_API_TOKEN?.trim()),
    images: hasImageGenerationKey(),
    ffmpeg: isFfmpegAvailable(),
    videoRenderEnabled: isVideoRenderEnabled(),
  })
}
