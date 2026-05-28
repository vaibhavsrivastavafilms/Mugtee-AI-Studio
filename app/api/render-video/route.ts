import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { orchestrateFacelessVideo } from '@/lib/video/orchestrate-faceless-video'
import { createRenderJob, getRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const idea = typeof raw?.idea === 'string' ? raw.idea : 'cinematic-story'
    const title = typeof raw?.title === 'string' ? raw.title : idea
    const script = typeof raw?.script === 'string' ? raw.script : ''
    const scenes = Array.isArray(raw?.scenes) ? (raw.scenes as GeneratedScene[]) : []
    const voiceUrl = typeof raw?.voiceUrl === 'string' ? raw.voiceUrl : null
    const asyncMode = raw?.async === true
    const projectId = typeof raw?.projectId === 'string' ? raw.projectId : undefined

    if (scenes.length < 1) {
      return NextResponse.json({ error: 'At least one scene is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const jobId = `render-${uuidv4()}-${Date.now()}`
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
      void orchestrateFacelessVideo(input, { jobId, baseUrl }).catch((err) => {
        logError('render-video.async', err)
        const message = err instanceof Error ? err.message : 'Video render failed'
        updateRenderJob(jobId, {
          status: 'failed',
          stage: 'error',
          label: message,
          error: message,
          percent: 0,
        })
      })
      return NextResponse.json({
        jobId,
        status: 'queued',
        pollUrl: `/api/render-video/status/${jobId}`,
      })
    }

    const result = await orchestrateFacelessVideo(input, { jobId, baseUrl })
    const job = getRenderJob(jobId)

    return NextResponse.json({
      jobId,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      status: result.status,
      durationSec: result.durationSec,
      mock: result.mock ?? job?.mock,
      format: 'mp4',
      resolution: '1080x1920',
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video render failed'
    logError('render-video', err)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
