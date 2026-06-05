import { NextRequest, NextResponse } from 'next/server'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { verifyDirectorProject } from '@/lib/director/director-db.server'
import { listSceneVideosForProject } from '@/lib/director/scene-video-db.server'
import { parseProjectScenes } from '@/lib/director/resolve-scene-image'
import {
  generateDirectorSceneVideo,
  runDirectorSceneVideoAsync,
} from '@/lib/video/generate-scene-video'
import { isDirectorVideoProviderConfigured } from '@/lib/video/providers/registry'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const projectId = req.nextUrl.searchParams.get('projectId')?.trim()
    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }

    const project = await verifyDirectorProject(projectId, auth.user!.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const sceneVideos = await listSceneVideosForProject(projectId, auth.user!.id)
    return NextResponse.json({
      sceneVideos: sceneVideos.map((row) => ({
        id: row.id,
        sceneId: row.scene_id,
        status: row.status,
        videoUrl: row.video_url,
        errorMessage: row.error_message,
        provider: row.provider,
        sourceImageUrl: row.source_image_url,
        updatedAt: row.updated_at,
      })),
      scenes: parseProjectScenes(project.scenes),
    })
  } catch (err) {
    logError('director.video.generate.get', err)
    return NextResponse.json({ error: 'Failed to load scene videos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isDirectorVideoProviderConfigured()) {
      return NextResponse.json(
        { error: 'Director video provider is not configured', code: 'video_provider_missing' },
        { status: 503 }
      )
    }

    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const sceneId = String(parsed.body!.sceneId || '').trim()
    if (!projectId || !sceneId) {
      return NextResponse.json({ error: 'projectId and sceneId required' }, { status: 400 })
    }

    const project = await verifyDirectorProject(projectId, auth.user!.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const motionPlan =
      parsed.body!.motionPlan !== undefined
        ? (parsed.body!.motionPlan as import('@/lib/director/types').MotionPlan | null)
        : undefined

    const prompt = typeof parsed.body!.prompt === 'string' ? parsed.body!.prompt : undefined
    const asyncMode = parsed.body!.async !== false

    const payload = {
      projectId,
      sceneId,
      userId: auth.user!.id,
      motionPlan,
      prompt,
    }

    if (asyncMode) {
      const { createSceneVideoRow } = await import('@/lib/director/scene-video-db.server')
      const { resolveSceneImageUrl } = await import('@/lib/director/resolve-scene-image')
      const { resolveDirectorVideoProviderId } = await import('@/lib/video/providers/registry')

      const scenes = parseProjectScenes(project.scenes)
      const imageUrl = resolveSceneImageUrl(scenes, sceneId)
      if (!imageUrl) {
        return NextResponse.json(
          { error: 'Scene storyboard image required before video generation' },
          { status: 400 }
        )
      }

      const row = await createSceneVideoRow({
        projectId,
        sceneId,
        userId: auth.user!.id,
        provider: resolveDirectorVideoProviderId(),
        sourceImageUrl: imageUrl,
        motionPlan: motionPlan?.scenes?.find(
          (s) => String(s.sceneIndex) === sceneId
        ) ?? null,
      })

      void runDirectorSceneVideoAsync(payload, row.id)

      return NextResponse.json({
        id: row.id,
        status: 'queued',
        pollUrl: `/api/director/video/${row.id}`,
      })
    }

    const result = await generateDirectorSceneVideo(payload)
    return NextResponse.json({
      id: result.id,
      status: result.status,
      videoUrl: result.videoUrl ?? undefined,
      errorMessage: result.errorMessage ?? undefined,
      pollUrl: `/api/director/video/${result.id}`,
    })
  } catch (err) {
    logError('director.video.generate.post', err)
    const message = err instanceof Error ? err.message : 'Scene video generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
