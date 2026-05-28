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
import { coerceTopic, logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    const idea = coerceTopic(raw?.idea ?? raw?.prompt ?? raw?.topic)
    if (idea.length < 3) {
      return NextResponse.json({ error: 'Idea must be at least 3 characters' }, { status: 400 })
    }

    const sessionSeed =
      typeof raw?.sessionSeed === 'string' || typeof raw?.sessionSeed === 'number'
        ? raw.sessionSeed
        : idea

    const previousHooks = coercePreviousHooks(raw?.previousHooks)
    const attemptIndex =
      typeof raw?.hookVariantIndex === 'number' && raw.hookVariantIndex >= 0
        ? Math.floor(raw.hookVariantIndex)
        : previousHooks.length

    const virlo = buildVirloContext(idea, {
      sessionSeed: `${sessionSeed}-${attemptIndex}`,
    })
    const meta = virloMetadataFromContext(virlo)

    const titleCandidates = generateTitleCandidates(
      idea,
      virlo.topicAnalysis.niche,
      virlo.creativeSeed.seed + attemptIndex * 17
    )
    const hooks = generateHookCandidates(
      idea,
      virlo.topicAnalysis.niche,
      virlo.emotionalGoal,
      virlo.creativeSeed.seed + attemptIndex * 23
    )

    const avoid = previousHooks
    const rotated = pickRotatedHookCandidate(
      idea,
      virlo.topicAnalysis.niche,
      virlo.emotionalGoal,
      virlo.creativeSeed.seed,
      attemptIndex,
      (text) => isHookTooSimilar(text, avoid)
    )

    const freshCandidate =
      hooks.find((h) => !isHookTooSimilar(h.text, avoid)) ?? rotated
    const selectedHook =
      freshCandidate.tensionScore >= pickStrongestHookCandidate(hooks).tensionScore - 1
        ? freshCandidate
        : pickStrongestHookCandidate(hooks)

    const title = pickTitle(titleCandidates, virlo.creativeSeed.seed + attemptIndex)
    const hook = selectedHook.text

    await delay(320)

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
    })
  } catch (err) {
    logError('generate-title', err)
    return NextResponse.json({ error: 'Title generation paused' }, { status: 500 })
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
