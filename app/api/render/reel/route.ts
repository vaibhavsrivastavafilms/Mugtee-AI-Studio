import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { orchestrateRemotionReel } from '@/lib/video/orchestrate-remotion-reel'
import { createRenderJob, getRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : 'Reel render failed'
  if (raw.includes('VIDEO_RENDER') || raw.includes('Remotion') || raw.includes('FFmpeg')) {
    return 'Reel export is temporarily unavailable — your preview still works.'
  }
  return raw.slice(0, 160)
}

export async function POST(req: NextRequest) {
  try {
    if (!isVideoRenderEnabled()) {
      return NextResponse.json(
        {
          error: 'Reel MP4 export is not enabled on this server.',
          status: 'disabled',
        },
        { status: 503 }
      )
    }

    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const idea = typeof raw?.idea === 'string' ? raw.idea : 'cinematic-story'
    const title = typeof raw?.title === 'string' ? raw.title : idea
    const script = typeof raw?.script === 'string' ? raw.script : ''
    const scenes = Array.isArray(raw?.scenes) ? (raw.scenes as GeneratedScene[]) : []
    const voiceUrl = typeof raw?.voiceUrl === 'string' ? raw.voiceUrl : null
    const musicUrl = typeof raw?.musicUrl === 'string' ? raw.musicUrl : null
    const asyncMode = raw?.async === true
    const projectId = typeof raw?.projectId === 'string' ? raw.projectId : undefined

    if (scenes.length < 1) {
      return NextResponse.json({ error: 'At least one scene is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const jobId = `reel-${uuidv4()}-${Date.now()}`
    const baseUrl = req.nextUrl.origin

    const input = {
      idea,
      title,
      script,
      scenes,
      voiceAudioPath: null,
      voiceUrl,
      subtitles: [],
      userId: user?.id ?? null,
      projectId: projectId ?? null,
    }

    if (asyncMode) {
      createRenderJob(jobId)
      void orchestrateRemotionReel(input, { jobId, baseUrl, musicUrl }).catch((err) => {
        logError('render-reel.async', err)
        updateRenderJob(jobId, {
          status: 'failed',
          stage: 'error',
          label: friendlyError(err),
          error: friendlyError(err),
          percent: 0,
        })
      })
      return NextResponse.json({
        jobId,
        status: 'queued',
        pollUrl: `/api/render/reel/status/${jobId}`,
        provider: 'remotion',
        format: 'mp4',
        resolution: '1080x1920',
      })
    }

    const result = await orchestrateRemotionReel(input, { jobId, baseUrl, musicUrl })
    const job = getRenderJob(jobId)

    return NextResponse.json({
      jobId,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      status: result.status,
      durationSec: result.durationSec,
      mock: result.mock ?? job?.mock,
      provider: 'remotion',
      format: 'mp4',
      resolution: '1080x1920',
    })
  } catch (err) {
    const message = friendlyError(err)
    logError('render-reel', err)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
