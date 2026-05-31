import { NextRequest, NextResponse } from 'next/server'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import {
  generateTitleCandidates,
  pickStrongestHookCandidate,
  generateHookCandidates,
  pickRotatedHookCandidate,
  pickTitle,
} from '@/lib/virlo-engine/hook-engine'
import { coercePreviousHooks, isHookTooSimilar } from '@/lib/cinematic/hook-variation'
import {
  coerceRecentContentAngles,
  contentAngleMetaFromSelection,
  isBannedHookOpening,
  isBannedTitle,
  sanitizeTitleCandidate,
  selectContentAngle,
  selectHookFramework,
} from '@/lib/cinematic/content-angle-engine'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { coerceTopic, logError } from '@/lib/workspace/validation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const blocked = await guardUsageLimit(user.id, 'generations')
      if (blocked) return blocked
    }

    const idea = coerceTopic(raw?.idea ?? raw?.prompt ?? raw?.topic)
    if (idea.length < 3) {
      return NextResponse.json({ error: 'Idea must be at least 3 characters' }, { status: 400 })
    }

    const sessionSeed =
      typeof raw?.sessionSeed === 'string' || typeof raw?.sessionSeed === 'number'
        ? raw.sessionSeed
        : idea

    const previousHooks = coercePreviousHooks(raw?.previousHooks)
    const recentAngles = coerceRecentContentAngles(raw?.recentContentAngles)
    const attemptIndex =
      typeof raw?.hookVariantIndex === 'number' && raw.hookVariantIndex >= 0
        ? Math.floor(raw.hookVariantIndex)
        : previousHooks.length

    const niche = inferNicheFromBrief({ topic: idea })
    const contentAngle = selectContentAngle({
      niche,
      topic: idea,
      sessionSeed,
      recentAngles,
      contentAngleId: typeof raw?.contentAngleId === 'string' ? raw.contentAngleId : undefined,
    })
    const hookFramework = selectHookFramework({
      sessionSeed,
      attemptIndex,
    })

    const virlo = buildVirloContext(idea, {
      sessionSeed: `${sessionSeed}-${attemptIndex}`,
    })
    const meta = virloMetadataFromContext(virlo)

    const titleCandidates = generateTitleCandidates(
      idea,
      virlo.topicAnalysis.niche,
      virlo.creativeSeed.seed + attemptIndex * 17,
      contentAngle
    )
    const hooks = generateHookCandidates(
      idea,
      virlo.topicAnalysis.niche,
      virlo.emotionalGoal,
      virlo.creativeSeed.seed + attemptIndex * 23,
      5,
      hookFramework
    )

    const avoid = previousHooks
    const rotated = pickRotatedHookCandidate(
      idea,
      virlo.topicAnalysis.niche,
      virlo.emotionalGoal,
      virlo.creativeSeed.seed,
      attemptIndex,
      (text) => isHookTooSimilar(text, avoid) || isBannedHookOpening(text),
      hookFramework
    )

    const freshCandidate =
      hooks.find((h) => !isHookTooSimilar(h.text, avoid) && !isBannedHookOpening(h.text)) ??
      rotated
    const selectedHook =
      freshCandidate.tensionScore >= pickStrongestHookCandidate(hooks).tensionScore - 1
        ? freshCandidate
        : pickStrongestHookCandidate(hooks)

    let title = pickTitle(titleCandidates, virlo.creativeSeed.seed + attemptIndex)
    if (isBannedTitle(title)) {
      title = sanitizeTitleCandidate(title, virlo.creativeSeed.seed + attemptIndex)
    }
    const hook = isBannedHookOpening(selectedHook.text)
      ? rotated.text
      : selectedHook.text

    const angleMeta = contentAngleMetaFromSelection(contentAngle, hookFramework)

    await delay(320)

    if (user) await trackUsageMetric(user.id, 'generations')

    return NextResponse.json({
      title,
      hook,
      niche: virlo.topicAnalysis.niche,
      mock: false,
      source: 'virlo',
      virlo: {
        ...meta,
        hookVariant: selectedHook.variant,
      },
      hookVariant: selectedHook.variant,
      structureName: meta.structureName,
      ...angleMeta,
    })
  } catch (err) {
    logError('generate-title', err)
    return NextResponse.json({ error: 'Title generation paused' }, { status: 500 })
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
