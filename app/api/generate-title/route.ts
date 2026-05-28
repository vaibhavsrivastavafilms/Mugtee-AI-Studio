import { NextRequest, NextResponse } from 'next/server'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import {
  generateTitleCandidates,
  pickStrongestHookCandidate,
  generateHookCandidates,
  pickTitle,
} from '@/lib/virlo-engine/hook-engine'
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

    const virlo = buildVirloContext(idea, { sessionSeed })
    const meta = virloMetadataFromContext(virlo)

    const titleCandidates = generateTitleCandidates(
      idea,
      virlo.topicAnalysis.niche,
      virlo.creativeSeed.seed
    )
    const hooks = generateHookCandidates(
      idea,
      virlo.topicAnalysis.niche,
      virlo.emotionalGoal,
      virlo.creativeSeed.seed
    )
    const selectedHook = pickStrongestHookCandidate(hooks)

    const title = pickTitle(titleCandidates, virlo.creativeSeed.seed)
    const hook = selectedHook.text

    await delay(320)

    return NextResponse.json({
      title,
      hook,
      niche: virlo.topicAnalysis.niche,
      mock: false,
      source: 'virlo',
      virlo: meta,
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
