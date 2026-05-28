import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { buildVoiceSuggestPrompt } from '@/lib/ai/prompts/cinematic/regen-prompts'
import { parseRegenContext } from '@/lib/cinematic/regen-context'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import { callCinematicRegen } from '@/lib/cinematic/regen-openai'
import {
  mockVoiceSuggest,
  normalizeVoiceSuggest,
} from '@/lib/cinematic/regenerate'
import { voiceStyleLabel } from '@/lib/cinematic/voice-match'
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
      const result = mockVoiceSuggest(ctx)
      return NextResponse.json({
        ...result,
        label: voiceStyleLabel(result.suggestedVoiceStyle),
        mock: true,
      })
    }

    const openai = getOpenAIClient()
    const prompt = buildVoiceSuggestPrompt(ctx)

    try {
      const raw = await callCinematicRegen(openai, prompt)
      const result = normalizeVoiceSuggest(raw, ctx)
      return NextResponse.json({
        ...result,
        label: voiceStyleLabel(result.suggestedVoiceStyle),
        mock: false,
      })
    } catch (err) {
      logError('suggest-voice.openai', err)
      const result = mockVoiceSuggest(ctx)
      return NextResponse.json({
        ...result,
        label: voiceStyleLabel(result.suggestedVoiceStyle),
        mock: true,
      })
    }
  } catch (err) {
    logError('suggest-voice.exception', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
