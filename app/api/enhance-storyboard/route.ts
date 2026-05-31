import { NextRequest, NextResponse } from 'next/server'
import { parseRegenContext } from '@/lib/cinematic/regen-context'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { generateSceneStoryboardImages } from '@/lib/cinematic/storyboard-generator'
import { extractStoryBibleFromVisualStyle } from '@/lib/cinematic/story-bible'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { logError } from '@/lib/workspace/validation'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function verifyProject(projectId: string, userId: string) {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase
    .from('cinematic_projects')
    .select('id, user_id, visual_style')
    .eq('id', projectId)
    .single()

  if (error || !data || data.user_id !== userId) return null
  return data
}

/** Regenerate storyboard visuals only — preserves scene text and pacing. */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const blocked = await guardUsageLimit(auth.user!.id, 'generations')
    if (blocked) return blocked

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const projectId = String(parsed.body!.projectId || '').trim()
    const sceneIndex =
      typeof parsed.body!.sceneIndex === 'number'
        ? parsed.body!.sceneIndex
        : Number(parsed.body!.sceneIndex)

    if (!projectId) {
      return NextResponse.json({ error: 'projectId required' }, { status: 400 })
    }
    if (!Number.isFinite(sceneIndex) || sceneIndex < 1) {
      return NextResponse.json({ error: 'sceneIndex required' }, { status: 400 })
    }

    const project = await verifyProject(projectId, auth.user!.id)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const ctx = parseRegenContext(parsed.body!)
    const target = ctx.scenes.find((s) => s.index === sceneIndex)
    if (!target) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    const storyBible = extractStoryBibleFromVisualStyle(project.visual_style)

    const { images, mock } = await generateSceneStoryboardImages({
      input: {
        scene: target,
        sceneIndex,
        totalScenes: ctx.scenes.length,
        niche: ctx.niche,
        style: ctx.style,
        projectPrompt: ctx.prompt,
        hook: ctx.hook,
        storyBible,
      },
      userId: auth.user!.id,
      projectId,
    })

    await trackUsageMetric(auth.user!.id, 'generations')

    return NextResponse.json({
      sceneIndex,
      storyboardImages: images,
      activeStoryboardId: images[0]?.id,
      mock,
    })
  } catch (err) {
    logError('enhance-storyboard', err)
    return NextResponse.json({ error: 'Storyboard enhancement failed' }, { status: 500 })
  }
}
