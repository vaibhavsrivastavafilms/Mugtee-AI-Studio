import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { parseSceneMotionMap } from '@/lib/motion/motion-presets'
import { orchestrateRemotionReel } from '@/lib/video/orchestrate-remotion-reel'
import { createRenderJob, getRenderJob, updateRenderJob } from '@/lib/video/job-store'
import { runExportInBackground } from '@/lib/export/export-background.server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { isVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled'
import { logError } from '@/lib/workspace/validation'
import { friendlyReelRenderErrorFromUnknown } from '@/lib/video/reel-render-errors'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import {
  trackMp4ExportServer,
  trackMp4FailedServer,
} from '@/lib/analytics/mp4-export-track.server'
import { computeRenderTotalSec } from '@/lib/cinematic/scene-duration'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function friendlyError(err: unknown): string {
  return friendlyReelRenderErrorFromUnknown(err)
}

export async function POST(req: NextRequest) {
  let trackUserId: string | null = null
  let trackProjectId: string | null = null
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const idea = typeof raw?.idea === 'string' ? raw.idea : 'cinematic-story'
    const title = typeof raw?.title === 'string' ? raw.title : idea
    const script = typeof raw?.script === 'string' ? raw.script : ''
    const scenes = Array.isArray(raw?.scenes) ? (raw.scenes as GeneratedScene[]) : []
    const voiceUrl = typeof raw?.voiceUrl === 'string' ? raw.voiceUrl : null
    const musicUrl = typeof raw?.musicUrl === 'string' ? raw.musicUrl : null
    const sceneMotion = parseSceneMotionMap(raw?.sceneMotion)
    const asyncMode = raw?.async === true
    const projectId = typeof raw?.projectId === 'string' ? raw.projectId : undefined
    trackProjectId = projectId ?? null

    if (scenes.length < 1) {
      void trackMp4FailedServer({
        userId: trackUserId,
        projectId: trackProjectId,
        stage: 'validation',
        err: 'At least one scene is required',
        route: 'POST /api/render/reel',
      })
      return NextResponse.json({ error: 'At least one scene is required' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    trackUserId = user?.id ?? null

    if (!isVideoRenderEnabled()) {
      const disabledMsg =
        'Reel MP4 export is not enabled on this server. Set VIDEO_RENDER_ENABLED=true or VIDEO_RENDER_MOCK=true in .env.local.'
      void trackMp4FailedServer({
        userId: trackUserId,
        projectId: trackProjectId,
        stage: 'validation',
        err: disabledMsg,
        route: 'POST /api/render/reel',
      })
      return NextResponse.json({ error: disabledMsg, status: 'disabled' }, { status: 503 })
    }

    const jobId = `reel-${uuidv4()}-${Date.now()}`
    const imageCount = scenes.filter((s) => s.imageUrl?.trim()).length
    void trackMp4ExportServer({
      event: Mp4ExportEvents.MP4_STARTED,
      userId: trackUserId,
      page: '/api/render/reel',
      metadata: {
        projectId: trackProjectId,
        image_count: imageCount,
        scene_count: scenes.length,
        has_voice: Boolean(voiceUrl),
        expected_duration_sec: computeRenderTotalSec(scenes),
        async: asyncMode,
      },
    })
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
      runExportInBackground(() =>
        orchestrateRemotionReel(input, { jobId, baseUrl, musicUrl, sceneMotion }).catch((err) => {
          logError('render-reel.async', err)
          updateRenderJob(jobId, {
            status: 'failed',
            stage: 'error',
            label: friendlyError(err),
            error: friendlyError(err),
            percent: 0,
          })
        })
      )
      return NextResponse.json({
        jobId,
        status: 'queued',
        pollUrl: `/api/render/reel/status/${jobId}`,
        provider: 'remotion',
        format: 'mp4',
        resolution: '1080x1920',
      })
    }

    const result = await orchestrateRemotionReel(input, { jobId, baseUrl, musicUrl, sceneMotion })
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
    void trackMp4FailedServer({
      userId: trackUserId,
      projectId: trackProjectId,
      stage: 'render_segments',
      err,
      route: 'POST /api/render/reel',
    })
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
