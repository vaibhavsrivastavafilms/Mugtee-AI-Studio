import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildVisualEnhancePrompt } from '@/lib/ai/prompts/cinematic/regen-prompts'
import { parseRegenContext } from '@/lib/cinematic/regen-context'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { callCinematicRegen } from '@/lib/cinematic/regen-openai'
import {
  mockVisualEnhance,
  normalizeVisualEnhance,
  validateVisualDirection,
} from '@/lib/cinematic/regenerate'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

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
        visual: mockVisualEnhance(ctx, sceneIndex),
        mock: true,
      })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = buildVisualEnhancePrompt(ctx, sceneIndex)

    try {
      let raw = await callCinematicRegen(openai, prompt)
      let visual = normalizeVisualEnhance(raw, ctx, sceneIndex)
      let validation = validateVisualDirection(visual)

      if (!validation.valid) {
        raw = await callCinematicRegen(
          openai,
          prompt,
          validation.issues.join(', ')
        )
        visual = normalizeVisualEnhance(raw, ctx, sceneIndex)
        validation = validateVisualDirection(visual)
      }

      return NextResponse.json({
        sceneIndex,
        visual,
        mock: false,
        validation,
      })
    } catch (err) {
      logError('enhance-visual.openai', err)
      return NextResponse.json({
        sceneIndex,
        visual: mockVisualEnhance(ctx, sceneIndex),
        mock: true,
      })
    }
  } catch (err) {
    logError('enhance-visual.exception', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
