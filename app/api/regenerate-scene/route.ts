import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { buildSceneRegenPrompt } from '@/lib/ai/prompts/cinematic/regen-prompts'
import { parseRegenContext } from '@/lib/cinematic/regen-context'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { callCinematicRegen } from '@/lib/cinematic/regen-openai'
import {
  mockSceneRegen,
  normalizeSceneRegen,
  otherScenesForValidation,
  validateRegeneratedScene,
} from '@/lib/cinematic/regenerate'
import { logError } from '@/lib/workspace/validation'
import { guardUsageLimit, trackUsageMetric } from '@/lib/usage/api-guards'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const blocked = await guardUsageLimit(auth.user!.id, 'generations')
    if (blocked) return blocked

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const ctx = parseRegenContext(parsed.body!)
    const sceneIndex =
      typeof parsed.body!.sceneIndex === 'number'
        ? parsed.body!.sceneIndex
        : Number(parsed.body!.sceneIndex)

    if (!Number.isFinite(sceneIndex) || sceneIndex < 1) {
      return NextResponse.json({ error: 'sceneIndex required' }, { status: 400 })
    }

    const target = ctx.scenes.find((s) => s.index === sceneIndex)
    if (!target) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        sceneIndex,
        ...mockSceneRegen(ctx, sceneIndex),
        mock: true,
      })
    }

    const openai = getOpenAIClient()
    const prompt = buildSceneRegenPrompt(ctx, sceneIndex)
    const others = otherScenesForValidation(ctx, sceneIndex)

    try {
      let raw = await callCinematicRegen(openai, prompt)
      let scene = normalizeSceneRegen(raw, ctx, sceneIndex)
      let validation = validateRegeneratedScene(scene, others, ctx.niche)

      if (!validation.valid) {
        raw = await callCinematicRegen(
          openai,
          prompt,
          validation.issues.join(', ')
        )
        scene = normalizeSceneRegen(raw, ctx, sceneIndex)
        validation = validateRegeneratedScene(scene, others, ctx.niche)
      }

      await trackUsageMetric(auth.user!.id, 'generations')

      return NextResponse.json({
        sceneIndex,
        ...scene,
        mock: false,
        validation,
      })
    } catch (err) {
      logError('regenerate-scene.openai', err)
      await trackUsageMetric(auth.user!.id, 'generations')
      return NextResponse.json({
        sceneIndex,
        ...mockSceneRegen(ctx, sceneIndex),
        mock: true,
      })
    }
  } catch (err) {
    logError('regenerate-scene.exception', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
