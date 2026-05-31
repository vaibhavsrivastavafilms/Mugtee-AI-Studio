import { NextRequest, NextResponse } from 'next/server'

import { getOpenAIClient } from '@/lib/ai/openai-client'

import { buildHookRegenPrompt } from '@/lib/ai/prompts/cinematic/regen-prompts'

import { parseRegenContext, type RegenProjectContext } from '@/lib/cinematic/regen-context'

import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'

import { callCinematicRegen } from '@/lib/cinematic/regen-openai'
import { buildVirloSystemPrompt } from '@/lib/virlo-engine/virlo-prompt'

import {

  mockHookRegen,

  normalizeHookRegen,

  validateRegeneratedHook,

} from '@/lib/cinematic/regenerate'

import {

  isHookTooSimilar,

  MAX_HOOK_SIMILARITY_RETRIES,

  rotatedHookFramework,

} from '@/lib/cinematic/hook-variation'

import { logError } from '@/lib/workspace/validation'
import {
  FeatureUsageFeatures,
  parseFeatureUsageProjectId,
  trackFeatureUsage,
} from '@/lib/analytics/feature-usage'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'



export const runtime = 'nodejs'

export const dynamic = 'force-dynamic'



function allSessionHooks(ctx: RegenProjectContext): string[] {

  const seen = new Set<string>()

  const out: string[] = []

  for (const hook of [...ctx.previousHooks, ...(ctx.hook ? [ctx.hook] : [])]) {

    const trimmed = hook.trim()

    if (!trimmed || seen.has(trimmed)) continue

    seen.add(trimmed)

    out.push(trimmed)

  }

  return out

}



async function generateDistinctHook(

  openai: ReturnType<typeof getOpenAIClient>,

  ctx: RegenProjectContext

): Promise<{

  hook: string

  hookFramework: string

  retries: number

  mock: boolean

}> {

  const sessionHooks = allSessionHooks(ctx)

  let lastResult: { hook: string; hookFramework: string } = {
    hook: ctx.hook,
    hookFramework: rotatedHookFramework(ctx.hookVariantIndex).id,
  }

  let retries = 0



  for (let attempt = 0; attempt < MAX_HOOK_SIMILARITY_RETRIES; attempt++) {

    const attemptCtx: RegenProjectContext = {

      ...ctx,

      hookVariantIndex: ctx.hookVariantIndex + attempt,

      strongVariation: attempt > 0 || ctx.strongVariation,

    }



    const prompt = buildHookRegenPrompt(attemptCtx)

    const framework = rotatedHookFramework(attemptCtx.hookVariantIndex)



    let raw: Record<string, unknown>

    try {

      raw = await callCinematicRegen(

        openai,

        prompt,

        attempt > 0 ? 'Previous output was too similar — use a radically different framework and opening.' : undefined,

        attempt > 0 ? 0.95 : undefined,

        buildVirloSystemPrompt()

      )

    } catch (err) {

      if (attempt === MAX_HOOK_SIMILARITY_RETRIES - 1) throw err

      retries += 1

      continue

    }



    const result = normalizeHookRegen(raw, attemptCtx)

    const validation = validateRegeneratedHook(result.hook, attemptCtx.niche, attemptCtx.hook)



    if (!validation.valid) {

      try {

        raw = await callCinematicRegen(

          openai,

          prompt,

          validation.issues.join(', '),

          0.92

        )

      } catch {

        retries += 1

        continue

      }

    }



    const normalized = normalizeHookRegen(raw, attemptCtx)

    lastResult = {

      hook: normalized.hook,

      hookFramework:

        typeof raw.hookFramework === 'string' ? raw.hookFramework : framework.id,

    }



    if (!isHookTooSimilar(normalized.hook, sessionHooks)) {

      return { ...lastResult, retries: attempt, mock: false }

    }



    retries = attempt + 1

  }



  return { ...lastResult, retries, mock: false }

}



export async function POST(req: NextRequest) {

  try {

    const auth = await requireCinematicUser()

    if (auth.response) return auth.response

    const blocked = await guardUsageLimit(auth.user!.id, 'generations')
    if (blocked) return blocked



    const parsed = parseJsonBody(await req.json().catch(() => null))

    if (parsed.response) return parsed.response



    const ctx = parseRegenContext(parsed.body!)
    const projectId = parseFeatureUsageProjectId(parsed.body)

    if (!ctx.hook && !ctx.summary && !ctx.script) {

      return NextResponse.json(

        { error: 'Project context required' },

        { status: 400 }

      )

    }



    const hookVariantNumber =

      typeof parsed.body?.hookVariantNumber === 'number' &&

      parsed.body.hookVariantNumber >= 1

        ? Math.floor(parsed.body.hookVariantNumber) + 1

        : ctx.previousHooks.length + 2



    const framework = rotatedHookFramework(ctx.hookVariantIndex)



    if (!process.env.OPENAI_API_KEY) {

      const mock = mockHookRegen(ctx)

      await trackUsageMetric(auth.user!.id, 'generations')
      void trackFeatureUsage(auth.user!.id, FeatureUsageFeatures.HOOK_GENERATION, projectId)

      return NextResponse.json({

        ...mock,

        hookFramework: framework.id,

        hookVariantNumber,

        mock: true,

      })

    }



    const openai = getOpenAIClient()



    try {

      const result = await generateDistinctHook(openai, ctx)

      const validation = validateRegeneratedHook(result.hook, ctx.niche, ctx.hook)



      await trackUsageMetric(auth.user!.id, 'generations')
      void trackFeatureUsage(auth.user!.id, FeatureUsageFeatures.HOOK_GENERATION, projectId)

      return NextResponse.json({

        hook: result.hook,

        hookFramework: result.hookFramework,

        hookVariantNumber,

        similarityRetries: result.retries,

        mock: false,

        validation,

      })

    } catch (err) {

      logError('regenerate-hook.openai', err)

      const mock = mockHookRegen(ctx)

      await trackUsageMetric(auth.user!.id, 'generations')
      void trackFeatureUsage(auth.user!.id, FeatureUsageFeatures.HOOK_GENERATION, projectId)

      return NextResponse.json({

        ...mock,

        hookFramework: framework.id,

        hookVariantNumber,

        mock: true,

      })

    }

  } catch (err) {

    logError('regenerate-hook.exception', err)

    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })

  }

}

