import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  buildMockCinematicOutput,
  validateCinematicOutput,
} from '@/lib/cinematic/generation'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { runScriptGeneration } from '@/lib/cinematic/quick-cut/run-script-generation'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import {
  coerceDuration,
  coercePlatform,
  coerceTopic,
  coerceTone,
  logError,
} from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    if (raw?.landing === true || raw?.mock === true) {
      const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
      const tone = coerceTone(raw.tone ?? raw.style)
      const duration = coerceDuration(raw.duration)
      const sessionSeed =
        typeof raw.sessionSeed === 'string' || typeof raw.sessionSeed === 'number'
          ? raw.sessionSeed
          : topic
      const niche = inferNicheFromBrief({
        topic: topic || 'Cinematic story',
        tone,
        style: typeof raw.style === 'string' ? raw.style : tone,
        niche: typeof raw.niche === 'string' ? raw.niche : undefined,
      })
      const virloContext = buildVirloContext(topic || 'Cinematic story', {
        tone,
        duration,
        niche,
        sessionSeed,
      })
      const output = buildMockCinematicOutput({
        topic: topic || 'Cinematic story',
        tone,
        duration,
        niche,
        virloContext,
      })
      if (typeof raw.title === 'string' && raw.title.trim()) {
        output.title = raw.title.trim()
      }
      if (typeof raw.hook === 'string' && raw.hook.trim()) {
        output.hook = raw.hook.trim()
      }
      return NextResponse.json({
        output,
        mock: true,
        niche,
        landing: true,
        virlo: virloMetadataFromContext(virloContext),
      })
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 }
      )
    }

    const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
    if (topic.length < 6) {
      return NextResponse.json(
        { error: 'Topic must be at least 6 characters' },
        { status: 400 }
      )
    }

    const platform = coercePlatform(raw.platform)
    const tone = coerceTone(raw.tone ?? raw.style)
    const duration = coerceDuration(raw.duration)
    const sessionSeed =
      typeof raw.sessionSeed === 'string' || typeof raw.sessionSeed === 'number'
        ? raw.sessionSeed
        : user.id
    const niche = inferNicheFromBrief({
      topic,
      tone,
      style: typeof raw.style === 'string' ? raw.style : tone,
      niche: typeof raw.niche === 'string' ? raw.niche : undefined,
    })

    const input = { topic, platform, tone, duration, niche, sessionSeed }

    if (!hasScriptGenerationKey()) {
      const virloContext = buildVirloContext(topic, {
        platform,
        tone,
        duration,
        niche,
        sessionSeed,
      })
      const output = buildMockCinematicOutput({ topic, tone, duration, niche, virloContext })
      return NextResponse.json({
        output,
        mock: true,
        reason: 'missing_api_key',
        virlo: virloMetadataFromContext(virloContext),
      })
    }

    try {
      const result = await runScriptGeneration(input)
      const validation = validateCinematicOutput(result.output, niche)

      return NextResponse.json({
        output: result.output,
        mock: result.mock,
        niche,
        validation,
        virlo: result.virlo,
      })
    } catch (err) {
      logError('generate-script.openai', err, { topic: topic.slice(0, 40) })
      const virloContext = buildVirloContext(topic, {
        platform,
        tone,
        duration,
        niche,
        sessionSeed,
      })
      const output = buildMockCinematicOutput({ topic, tone, duration, niche, virloContext })
      return NextResponse.json({
        output,
        mock: true,
        reason: 'provider_fallback',
        niche,
        virlo: virloMetadataFromContext(virloContext),
      })
    }
  } catch (err) {
    logError('generate-script.exception', err)
    return NextResponse.json(
      { error: 'Story shaping paused — try again' },
      { status: 500 }
    )
  }
}
