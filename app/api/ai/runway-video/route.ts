import { NextRequest, NextResponse } from 'next/server'
import {
  generateRunwayVideo,
  hasRunwayApiKey,
  resolveRunwayVideoProvider,
  RUNWAY_DEFAULT_MODEL,
} from '@/lib/ai/runway-video'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Generate a single Runway clip from a storyboard still + motion prompt. */
export async function POST(req: NextRequest) {
  try {
    if (!hasRunwayApiKey()) {
      return NextResponse.json(
        {
          error:
            'Runway is not configured. Set RUNWAY_API_KEY (or RUNWAYML_API_SECRET) to enable AI video generation.',
          provider: 'ffmpeg',
          fallback: 'Use /api/render-video for FFmpeg slide assembly.',
        },
        { status: 503 }
      )
    }

    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const promptText =
      typeof raw?.promptText === 'string'
        ? raw.promptText
        : typeof raw?.motionPrompt === 'string'
          ? raw.motionPrompt
          : ''
    const promptImage =
      typeof raw?.promptImage === 'string'
        ? raw.promptImage
        : typeof raw?.imageUrl === 'string'
          ? raw.imageUrl
          : null
    const durationSec =
      typeof raw?.durationSec === 'number' ? raw.durationSec : undefined

    if (!promptText.trim() && !promptImage?.trim()) {
      return NextResponse.json(
        { error: 'promptText or promptImage is required' },
        { status: 400 }
      )
    }

    const { taskId, videoUrl } = await generateRunwayVideo({
      promptText:
        promptText.trim() ||
        'Subtle cinematic camera motion, vertical social video, smooth movement',
      promptImage,
      durationSec,
    })

    return NextResponse.json({
      taskId,
      videoUrl,
      provider: 'runway',
      model: RUNWAY_DEFAULT_MODEL,
      note: 'Runway output URLs expire within 24–48 hours — download promptly.',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Runway video generation failed'
    logError('runway-video.route', err)
    return NextResponse.json({ error: message, provider: 'runway' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    configured: hasRunwayApiKey(),
    provider: resolveRunwayVideoProvider(),
    docs: 'https://docs.dev.runwayml.com/guides/using-the-api/',
  })
}
