import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { parseVisualStyle } from '@/lib/cinematic/workflow-state'
import { parseSceneBlueprints } from '@/lib/cinematic/scene-blueprint'
import { parseSceneMotionMap } from '@/lib/motion/motion-presets'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'
import {
  getVideoProvider,
  isSceneVideoGenerationEnabled,
  resolveSceneVideoProviderId,
} from '@/lib/video-providers/factory'
import { normalizeGenerationMode } from '@/lib/economics/generation-mode'
import { resolveUserPlanType } from '@/lib/economics/resolve-user-plan.server'
import { createVideoJob } from '@/lib/video/video-job'
import { processSceneVideoJob } from '@/lib/video/process-scene-video.server'
import {
  buildSceneVideoLimitError,
  checkSceneVideoLimit,
} from '@/lib/video/scene-video-limits'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

type JobResponse = {
  jobId: string
  sceneId: string
  pollUrl: string
  status: string
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const generationMode = normalizeGenerationMode(raw?.generationMode ?? raw?.generation_mode)

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const planType = await resolveUserPlanType(user.id)
    const gate = { generationMode, planType }

    if (!isSceneVideoGenerationEnabled(gate)) {
      return NextResponse.json(
        {
          error: 'Runway clips require Studio plan and Cinematic mode',
          code: 'video_generation_disabled',
        },
        { status: 403 }
      )
    }

    const provider = getVideoProvider(undefined, gate)
    if (!provider) {
      return NextResponse.json(
        { error: 'No video provider configured', code: 'video_provider_missing' },
        { status: 503 }
      )
    }

    const scenes = Array.isArray(raw?.scenes) ? (raw.scenes as GeneratedScene[]) : []
    if (scenes.length === 0) {
      return NextResponse.json({ error: 'scenes array required' }, { status: 400 })
    }

    const limit = await checkSceneVideoLimit(user.id)
    if (!limit.allowed) {
      return NextResponse.json(buildSceneVideoLimitError(limit), { status: 429 })
    }

    const asyncMode = raw?.async !== false
    const projectId = typeof raw?.projectId === 'string' ? raw.projectId : null
    const sceneBlueprints = parseSceneBlueprints(raw?.sceneBlueprints ?? raw?.scene_blueprints)
    const sceneMotion = parseSceneMotionMap(raw?.sceneMotion ?? raw?.scene_motion)
    const visualStyle = parseVisualStyle(raw?.visualStyle ?? raw?.visual_style)

    const sceneIds = Array.isArray(raw?.sceneIds)
      ? (raw.sceneIds as string[]).filter((id) => typeof id === 'string')
      : undefined

    const targets = sceneIds?.length
      ? scenes.filter((s) => sceneIds.includes(s.id))
      : scenes

    const providerId = resolveSceneVideoProviderId(gate) ?? provider.id
    const jobs: JobResponse[] = []

    for (const scene of targets) {
      if (!scene.id || !scene.imageUrl?.trim()) continue

      const jobId = `svid-${uuidv4()}-${Date.now()}`
      createVideoJob({
        jobId,
        sceneId: scene.id,
        provider: providerId,
        projectId,
        userId: user?.id ?? null,
      })

      const payload = {
        jobId,
        scene,
        sceneBlueprints,
        sceneMotion,
        visualStyle,
        projectId,
        userId: user?.id ?? null,
      }

      if (asyncMode) {
        void processSceneVideoJob(payload).catch((err) => {
          logError('generate-scene-video.async', err)
        })
        jobs.push({
          jobId,
          sceneId: scene.id,
          pollUrl: `/api/video-job/${jobId}`,
          status: 'queued',
        })
      } else {
        await processSceneVideoJob(payload)
        jobs.push({
          jobId,
          sceneId: scene.id,
          pollUrl: `/api/video-job/${jobId}`,
          status: 'done',
        })
      }
    }

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: 'No eligible scenes with images for video generation' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      jobs,
      provider: providerId,
      async: asyncMode,
    })
  } catch (err) {
    logError('generate-scene-video', err)
    const message = err instanceof Error ? err.message : 'Scene video generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
