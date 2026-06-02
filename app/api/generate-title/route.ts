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
import { formatFinalHook } from '@/lib/cinematic/hook-format'
import { alignOutputToBrief } from '@/lib/content-director/align-output'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'
import {
  generateHookViaRouter,
  hasAnyTextProviderKey,
} from '@/lib/ai/providers/generation-bridge'
import {
  logParsedIntent,
  pickValidatedHook,
  pickValidatedTitle,
  resolveGenerationTopic,
  resolveParsedIntentSync,
  serializeParsedIntent,
} from '@/lib/input-understanding'
import { getLastProviderForTask } from '@/lib/ai/providers'
import { Mp4ExportEvents } from '@/lib/analytics/mp4-export-events'
import { trackMp4ExportServer } from '@/lib/analytics/mp4-export-track.server'
import { parseFeatureUsageProjectId } from '@/lib/analytics/feature-usage'
import {
  getHookGenerationCache,
  hashHookGenerationKey,
  isHookGenerationCacheEnabled,
  setHookGenerationCache,
} from '@/lib/virlo-engine/hook-generation-cache.server'

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

function buildHookCandidatePool(
  generationTopic: string,
  niche: ReturnType<typeof inferNicheFromBrief>,
  emotionalGoal: string,
  creativeSeed: number,
  attemptIndex: number,
  hookFramework: ReturnType<typeof selectHookFramework>,
  avoid: string[]
) {
  const seed = creativeSeed + attemptIndex * 23
  const hooks = generateHookCandidates(
    generationTopic,
    niche,
    emotionalGoal as import('@/lib/virlo-engine/types').EmotionalGoal,
    seed,
    5,
    hookFramework
  )
  const fresh = hooks.filter(
    (h) => !isHookTooSimilar(h.text, avoid) && !isBannedHookOpening(h.text)
  )
  if (fresh.length > 0) return fresh
  const rotated = pickRotatedHookCandidate(
    generationTopic,
    niche,
    emotionalGoal as import('@/lib/virlo-engine/types').EmotionalGoal,
    creativeSeed,
    attemptIndex,
    (text) => isHookTooSimilar(text, avoid) || isBannedHookOpening(text),
    hookFramework
  )
  return [rotated, ...hooks]
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

    const parsedIntent = resolveParsedIntentSync(raw, rawInput)
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
    const platform =
      typeof raw?.platform === 'string' ? raw.platform : undefined

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

    const cacheKey = hashHookGenerationKey({
      topic: generationTopic,
      niche,
      platform,
      sessionSeed,
      attemptIndex,
      contentAngleId: contentAngle.id,
      hookFrameworkId: hookFramework.id,
      previousHooksKey: previousHooks.join('|'),
    })

    if (isHookGenerationCacheEnabled()) {
      const cached = getHookGenerationCache(cacheKey)
      if (cached) {
        if (user) await trackUsageMetric(user.id, 'generations')
        return NextResponse.json({ ...cached, cacheHit: true })
      }
    }

    const virlo = buildVirloContext(generationTopic, {
      sessionSeed: `${sessionSeed}-${attemptIndex}`,
    })
    const meta = virloMetadataFromContext(virlo)
    const avoid = previousHooks

    const [titleResult, hookResult] = await Promise.all([
      Promise.resolve(
        pickValidatedTitle(
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
      ),
      (async () => {
        const aiHook = hasAnyTextProviderKey()
          ? await generateHookViaRouter({
              topic: generationTopic,
              niche: virlo.topicAnalysis.niche,
              tone: parsedIntent.tone,
              platform,
              emotionalGoal: virlo.emotionalGoal,
              previousHooks: avoid,
              contentAngleLabel: contentAngle.label,
              hookFrameworkLabel: hookFramework.label,
              parsedIntent,
              contentBrief: contentBrief ?? undefined,
            })
          : null

        if (aiHook?.hook) {
          return {
            value: { text: aiHook.hook, variant: hookFramework.id },
            retries: 0,
          }
        }

        return pickValidatedHook(
          (attempt) =>
            buildHookCandidatePool(
              generationTopic,
              virlo.topicAnalysis.niche,
              virlo.emotionalGoal,
              virlo.creativeSeed.seed,
              attemptIndex + attempt,
              hookFramework,
              avoid
            ),
          parsedIntent.rawInput,
          recentTitles
        )
      })(),
    ])

    let title = titleResult.value
    let hook = hookResult.value.text
    const hookSource = hasAnyTextProviderKey() ? 'ai-router-or-virlo' : 'virlo'

    if (contentBrief) {
      hook = alignOutputToBrief(hook, contentBrief, 'hook').text
    } else {
      hook = formatFinalHook(hook)
    }

    const angleMeta = contentAngleMetaFromSelection(contentAngle, hookFramework)

    const payload = {
      title,
      hook,
      niche: virlo.topicAnalysis.niche,
      mock: false,
      source: hookSource,
      parsedIntent: serializeParsedIntent(parsedIntent),
      validationRetries: titleResult.retries + hookResult.retries,
      ...(getLastProviderForTask('hook')
        ? { aiProvider: getLastProviderForTask('hook') }
        : {}),
      virlo: {
        ...meta,
        hookVariant: hookResult.value.variant,
      },
      hookVariant: hookResult.value.variant,
      structureName: meta.structureName,
      ...angleMeta,
    }

    if (isHookGenerationCacheEnabled()) {
      setHookGenerationCache(cacheKey, payload)
    }

    if (user) {
      await trackUsageMetric(user.id, 'generations')
      void trackMp4ExportServer({
        event: Mp4ExportEvents.STORY_GENERATED,
        userId: user.id,
        page: '/api/generate-title',
        metadata: {
          hook: true,
          script: false,
          scenes: false,
          projectId: parseFeatureUsageProjectId(raw),
        },
      })
    }

    return NextResponse.json(payload)
  } catch (err) {
    logError('generate-title', err)
    return NextResponse.json({ error: 'Title generation paused' }, { status: 500 })
  }
}
