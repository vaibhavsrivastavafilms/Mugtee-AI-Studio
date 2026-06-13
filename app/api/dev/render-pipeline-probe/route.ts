import { NextRequest, NextResponse } from 'next/server'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { orchestrateRemotionReel } from '@/lib/video/orchestrate-remotion-reel'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Dev-only mock render probe — no auth; exercises orchestrateRemotionReel end-to-end. */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available outside development' }, { status: 404 })
  }

  const useMock = req.nextUrl.searchParams.get('mock') !== 'false'
  if (useMock) {
    process.env.VIDEO_RENDER_MOCK = 'true'
    process.env.CI_QUICK_CUT_SMOKE = 'true'
  } else {
    process.env.VIDEO_RENDER_MOCK = 'false'
  }

  const jobId = `dev-probe-${Date.now()}`
  const scenes: GeneratedScene[] = [
    {
      id: 'dev-probe-1',
      title: 'Probe A',
      description: 'Dev render pipeline probe',
      duration: 4,
      visualPrompt: 'vertical cinematic still',
      imagePrompt: 'vertical cinematic still',
      cameraAngle: 'medium',
      lightingMood: 'natural',
      environment: 'studio',
      colorPalette: 'neutral',
      movementStyle: 'static',
      imageUrl: 'https://placehold.co/1080x1920/jpg',
    },
    {
      id: 'dev-probe-2',
      title: 'Probe B',
      description: 'Dev render pipeline probe',
      duration: 4,
      visualPrompt: 'vertical cinematic still',
      imagePrompt: 'vertical cinematic still',
      cameraAngle: 'medium',
      lightingMood: 'natural',
      environment: 'studio',
      colorPalette: 'neutral',
      movementStyle: 'static',
      imageUrl: 'https://placehold.co/1080x1920/jpg',
    },
  ]

  try {
    const result = await orchestrateRemotionReel(
      {
        idea: 'dev-render-probe',
        title: 'Dev Render Probe',
        script: 'Probe',
        scenes,
        voiceAudioPath: null,
        voiceUrl: null,
        subtitles: [],
        userId: null,
        projectId: null,
      },
      { jobId, baseUrl: 'http://localhost:3000' }
    )

    return NextResponse.json({
      ok: true,
      jobId,
      result,
      logFile: 'logs/render-pipeline.log',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    return NextResponse.json(
      {
        ok: false,
        jobId,
        error: message,
        stack: stack?.slice(0, 4000),
        logFile: 'logs/render-pipeline.log',
      },
      { status: 500 }
    )
  }
}
