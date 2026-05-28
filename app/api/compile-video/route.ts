import { NextRequest, NextResponse } from 'next/server'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { orchestrateFacelessVideo } from '@/lib/video/orchestrate-faceless-video'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/** Legacy alias — delegates to the faceless render orchestrator. */
export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const idea = typeof raw?.idea === 'string' ? raw.idea : 'cinematic-story'
    const title = typeof raw?.title === 'string' ? raw.title : idea
    const script = typeof raw?.script === 'string' ? raw.script : ''
    const scenes = Array.isArray(raw?.scenes) ? (raw.scenes as GeneratedScene[]) : []
    const voiceUrl = typeof raw?.voiceUrl === 'string' ? raw.voiceUrl : null

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const result = await orchestrateFacelessVideo(
      {
        idea,
        title,
        script,
        scenes,
        voiceAudioPath: null,
        voiceUrl,
        subtitles: [],
        userId: user?.id ?? null,
        projectId: typeof raw?.projectId === 'string' ? raw.projectId : null,
      },
      { baseUrl: req.nextUrl.origin }
    )

    return NextResponse.json({
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      format: 'mp4',
      resolution: '1080x1920',
      durationSec: result.durationSec,
      status: result.status,
      mock: result.mock ?? false,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Video compile paused'
    logError('compile-video', err)
    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
