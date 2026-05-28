import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { orchestrateRender } from '@/lib/cinematic/execution/render/render-orchestration-engine'
import {
  buildCompileFilmPlan,
  buildCinematicRenderBlueprint,
  buildInvisibleFilmMetadata,
  projectStateToGenerationOutput,
} from '@/lib/cinematic/render'
import { parseRegenContext } from '@/lib/cinematic/regen-context'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const ctx = parseRegenContext(body)

    const filmPlan = buildCompileFilmPlan({
      title: ctx.prompt.slice(0, 80) || 'Untitled cinematic story',
      hook: ctx.hook,
      summary: ctx.summary,
      script: ctx.script,
      scenes: ctx.scenes,
      captionLines: ctx.captionLines,
      suggestedVoiceStyle: ctx.suggestedVoiceStyle,
      niche: ctx.niche,
      duration: ctx.duration,
    })

    const blueprint = buildCinematicRenderBlueprint(filmPlan)
    const rhythm = buildInvisibleFilmMetadata(blueprint)
    const render = await orchestrateRender(blueprint)

    return NextResponse.json({
      ready: filmPlan.ready,
      presenceLine: render.presenceLine,
      filmRhythm: blueprint.filmRhythm,
      rhythm,
      status: render.status,
      provider: render.provider,
      output: projectStateToGenerationOutput({
        title: filmPlan.title,
        hook: ctx.hook,
        summary: ctx.summary,
        script: ctx.script,
        scenes: ctx.scenes,
        captionLines: ctx.captionLines,
        suggestedVoiceStyle: ctx.suggestedVoiceStyle,
        niche: ctx.niche,
      }),
    })
  } catch (err) {
    logError('cinematic.render.prepare', err)
    return NextResponse.json(
      {
        ready: true,
        presenceLine: 'Your cinematic world is preparing itself naturally.',
        status: 'preparing',
        provider: 'stub',
      },
      { status: 200 }
    )
  }
}
