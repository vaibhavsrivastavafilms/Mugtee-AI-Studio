import { NextRequest, NextResponse } from 'next/server'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import {
  generateTitleCandidates,
  generateHookCandidates,
  pickRotatedHookCandidate,
} from '@/lib/virlo-engine/hook-engine'
import { coercePreviousHooks, isHookTooSimilar } from '@/lib/cinematic/hook-variation'
import {
  coerceRecentContentAngles,
  contentAngleMetaFromSelection,
  isBannedHookOpening,
  selectContentAngle,
  selectHookFramework,
} from '@/lib/cinematic/content-angle-engine'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { coerceTopic, logError } from '@/lib/workspace/validation'
import { normalizeContentBrief } from '@/lib/content-director/content-brief'
import { alignOutputToBrief } from '@/lib/content-director/align-output'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import {
  logParsedIntent,
  pickValidatedHook,
  pickValidatedTitle,
  resolveGenerationTopic,
  resolveParsedIntentAsync,
  serializeParsedIntent,
} from '@/lib/input-understanding'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function coerceRecentTitles(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((v): v is string => typeof v === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 12)
}

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

    const rawInput = coerceTopic(raw?.idea ?? raw?.prompt ?? raw?.topic)
    if (rawInput.length < 3) {
      return NextResponse.json({ error: 'Idea must be at least 3 characters' }, { status: 400 })
    }

    const parsedIntent = await resolveParsedIntentAsync(raw, rawInput)
    logParsedIntent(parsedIntent)
    const generationTopic = resolveGenerationTopic(parsedIntent, rawInput)

    const sessionSeed =
      typeof raw?.sessionSeed === 'string' || typeof raw?.sessionSeed === 'number'
        ? raw.sessionSeed
        : generationTopic

    const previousHooks = coercePreviousHooks(raw?.previousHooks)
    const recentTitles = coerceRecentTitles(raw?.recentTitles)
    const recentAngles = coerceRecentContentAngles(raw?.recentContentAngles)
    const attemptIndex =
      typeof raw?.hookVariantIndex === 'number' && raw.hookVariantIndex >= 0
        ? Math.floor(raw.hookVariantIndex)
        : previousHooks.length

    const contentBrief = normalizeContentBrief(raw?.contentBrief ?? raw?.content_brief)

    const niche = inferNicheFromBrief({
      topic: generationTopic,
      niche: parsedIntent.niche,
    })
    const contentAngle = selectContentAngle({
      niche,
      topic: generationTopic,
      sessionSeed,
      recentAngles,
      contentAngleId: typeof raw?.contentAngleId === 'string' ? raw.contentAngleId : undefined,
    })
    const hookFramework = selectHookFramework({
      sessionSeed,
      attemptIndex,
    })

    const virlo = buildVirloContext(generationTopic, {
      sessionSeed: `${sessionSeed}-${attemptIndex}`,
    })
    const meta = virloMetadataFromContext(virlo)

    const titleResult = pickValidatedTitle(
      (attempt) =>
        generateTitleCandidates(
          generationTopic,
          virlo.topicAnalysis.niche,
          virlo.creativeSeed.seed + (attemptIndex + attempt) * 17,
          contentAngle
        ),
      parsedIntent.rawInput,
      recentTitles
    )

    const avoid = previousHooks
    const hookResult = pickValidatedHook(
      (attempt) => {
        const seed = virlo.creativeSeed.seed + (attemptIndex + attempt) * 23
        const hooks = generateHookCandidates(
          generationTopic,
          virlo.topicAnalysis.niche,
          virlo.emotionalGoal,
          seed,
          5,
          hookFramework
        )
        const rotated = pickRotatedHookCandidate(
          generationTopic,
          virlo.topicAnalysis.niche,
          virlo.emotionalGoal,
          virlo.creativeSeed.seed,
          attemptIndex + attempt,
          (text) => isHookTooSimilar(text, avoid) || isBannedHookOpening(text),
          hookFramework
        )
        const fresh = hooks.find(
          (h) => !isHookTooSimilar(h.text, avoid) && !isBannedHookOpening(h.text)
        )
        return fresh ? [fresh, ...hooks.filter((h) => h !== fresh)] : [rotated, ...hooks]
      },
      parsedIntent.rawInput,
      recentTitles
    )

    let title = titleResult.value
    let hook = hookResult.value.text

    if (contentBrief) {
      hook = alignOutputToBrief(hook, contentBrief, 'hook').text
    }

    const angleMeta = contentAngleMetaFromSelection(contentAngle, hookFramework)

    if (user) await trackUsageMetric(user.id, 'generations')

    return NextResponse.json({
      title,
      hook,
      niche: virlo.topicAnalysis.niche,
      mock: false,
      source: 'virlo',
      parsedIntent: serializeParsedIntent(parsedIntent),
      validationRetries: titleResult.retries + hookResult.retries,
      virlo: {
        ...meta,
        hookVariant: hookResult.value.variant,
      },
      hookVariant: hookResult.value.variant,
      structureName: meta.structureName,
      ...angleMeta,
    })
  } catch (err) {
    logError('generate-title', err)
    return NextResponse.json({ error: 'Title generation paused' }, { status: 500 })
  }
}
