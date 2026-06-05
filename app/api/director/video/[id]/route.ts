import { NextRequest, NextResponse } from 'next/server'
import { requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { getSceneVideoById } from '@/lib/director/scene-video-db.server'
import { getDirectorVideoProvider } from '@/lib/video/providers/registry'
import { updateSceneVideoRow } from '@/lib/director/scene-video-db.server'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: { id: string } }

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const id = params?.id?.trim()
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    let row = await getSceneVideoById(id, auth.user!.id)
    if (!row) {
      return NextResponse.json({ error: 'Scene video not found' }, { status: 404 })
    }

    if (
      row.status === 'generating' &&
      row.provider_job_id &&
      row.provider === 'replicate'
    ) {
      try {
        const provider = getDirectorVideoProvider('replicate')
        if (provider.getJobStatus) {
          const job = await provider.getJobStatus(row.provider_job_id)
          if (job.status === 'completed' && job.videoUrl) {
            await updateSceneVideoRow(row.id, {
              status: 'completed',
              videoUrl: job.videoUrl,
            })
            row = { ...row, status: 'completed', video_url: job.videoUrl }
          } else if (job.status === 'failed') {
            await updateSceneVideoRow(row.id, {
              status: 'failed',
              errorMessage: job.errorMessage ?? 'Generation failed',
            })
            row = {
              ...row,
              status: 'failed',
              error_message: job.errorMessage ?? 'Generation failed',
            }
          }
        }
      } catch (err) {
        logError('director.video.poll', err)
      }
    }

    return NextResponse.json({
      id: row.id,
      sceneId: row.scene_id,
      status: row.status,
      videoUrl: row.video_url,
      errorMessage: row.error_message,
      provider: row.provider,
      sourceImageUrl: row.source_image_url,
      updatedAt: row.updated_at,
    })
  } catch (err) {
    logError('director.video.get', err)
    return NextResponse.json({ error: 'Failed to load scene video status' }, { status: 500 })
  }
}
