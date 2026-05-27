import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildCaptionImprovePrompt } from '@/lib/ai/prompts/cinematic/regen-prompts'
import { parseRegenContext } from '@/lib/cinematic/regen-context'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { callCinematicRegen } from '@/lib/cinematic/regen-openai'
import {
  captionImproveResult,
  mockCaptionImprove,
  normalizeCaptionImprove,
  validateRegeneratedCaptions,
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

    if (!process.env.OPENAI_API_KEY) {
      const pack = mockCaptionImprove(ctx)
      return NextResponse.json({
        ...captionImproveResult(pack),
        mock: true,
      })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = buildCaptionImprovePrompt(ctx)

    try {
      let raw = await callCinematicRegen(openai, prompt)
      let pack = normalizeCaptionImprove(raw, ctx)
      let validation = validateRegeneratedCaptions(pack, ctx.niche)

      if (!validation.valid) {
        raw = await callCinematicRegen(
          openai,
          prompt,
          validation.issues.join(', ')
        )
        pack = normalizeCaptionImprove(raw, ctx)
        validation = validateRegeneratedCaptions(pack, ctx.niche)
      }

      return NextResponse.json({
        ...captionImproveResult(pack),
        mock: false,
        validation,
      })
    } catch (err) {
      logError('improve-caption.openai', err)
      const pack = mockCaptionImprove(ctx)
      return NextResponse.json({
        ...captionImproveResult(pack),
        mock: true,
      })
    }
  } catch (err) {
    logError('improve-caption.exception', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
