import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { buildHookRegenPrompt } from '@/lib/ai/prompts/cinematic/regen-prompts'
import { parseRegenContext } from '@/lib/cinematic/regen-context'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { callCinematicRegen } from '@/lib/cinematic/regen-openai'
import {
  mockHookRegen,
  normalizeHookRegen,
  validateRegeneratedHook,
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
    if (!ctx.hook && !ctx.summary && !ctx.script) {
      return NextResponse.json(
        { error: 'Project context required' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ...mockHookRegen(ctx), mock: true })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const prompt = buildHookRegenPrompt(ctx)

    try {
      let raw = await callCinematicRegen(openai, prompt)
      let result = normalizeHookRegen(raw, ctx)
      let validation = validateRegeneratedHook(result.hook, ctx.niche, ctx.hook)

      if (!validation.valid) {
        raw = await callCinematicRegen(
          openai,
          prompt,
          validation.issues.join(', ')
        )
        result = normalizeHookRegen(raw, ctx)
        validation = validateRegeneratedHook(result.hook, ctx.niche, ctx.hook)
      }

      return NextResponse.json({ ...result, mock: false, validation })
    } catch (err) {
      logError('regenerate-hook.openai', err)
      return NextResponse.json({ ...mockHookRegen(ctx), mock: true })
    }
  } catch (err) {
    logError('regenerate-hook.exception', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
