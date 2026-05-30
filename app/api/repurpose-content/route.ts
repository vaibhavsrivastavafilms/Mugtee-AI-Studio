import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { CINEMATIC_SYSTEM_PROMPT } from '@/lib/ai/prompts/cinematic/system'
import { callCinematicRegen } from '@/lib/cinematic/regen-openai'
import { parseJsonBody, requireCinematicUser } from '@/lib/cinematic/regen-auth'
import {
  buildRepurposePrompt,
  isRepurposeOutputType,
  normalizeRepurposeContent,
  type RepurposeProjectInput,
} from '@/lib/cinematic/content-repurpose'
import { creatorProfileDirective, normalizeCreatorMemoryProfile } from '@/lib/creator/creator-memory'
import { logError } from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 90

function parseProjectInput(body: Record<string, unknown>): RepurposeProjectInput {
  const scenes = Array.isArray(body.scenes) ? body.scenes : undefined
  const creatorProfile = normalizeCreatorMemoryProfile(
    body.creatorProfile ?? body.creator_profile
  )
  return {
    title: typeof body.title === 'string' ? body.title.slice(0, 300) : '',
    hook: typeof body.hook === 'string' ? body.hook.slice(0, 500) : '',
    script: typeof body.script === 'string' ? body.script.slice(0, 12_000) : '',
    payoff: typeof body.payoff === 'string' ? body.payoff.slice(0, 500) : undefined,
    cta: typeof body.cta === 'string' ? body.cta.slice(0, 500) : undefined,
    scenes: scenes as RepurposeProjectInput['scenes'],
    creatorProfile: creatorProfileDirective(creatorProfile) ? creatorProfile : null,
    niche: typeof body.niche === 'string' ? body.niche.slice(0, 80) : undefined,
    style: typeof body.style === 'string' ? body.style.slice(0, 80) : undefined,
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireCinematicUser()
    if (auth.response) return auth.response

    const parsed = parseJsonBody(await req.json().catch(() => null))
    if (parsed.response) return parsed.response

    const body = parsed.body!
    const outputType = body.outputType ?? body.output_type
    if (!isRepurposeOutputType(outputType)) {
      return NextResponse.json({ error: 'Invalid outputType' }, { status: 400 })
    }

    const input = parseProjectInput(body)
    if (!input.script?.trim() && !input.hook?.trim()) {
      return NextResponse.json(
        { error: 'Project needs a hook or script to repurpose' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      const content = normalizeRepurposeContent(outputType, {}, input)
      return NextResponse.json({
        outputType,
        content,
        generatedAt: new Date().toISOString(),
        mock: true,
      })
    }

    const openai = getOpenAIClient()
    const prompt = buildRepurposePrompt(outputType, input)

    try {
      const raw = await callCinematicRegen(
        openai,
        prompt,
        undefined,
        0.82,
        `${CINEMATIC_SYSTEM_PROMPT}\nYou repurpose reel content into platform-native formats. Output JSON only.`
      )
      const content = normalizeRepurposeContent(outputType, raw, input)
      return NextResponse.json({
        outputType,
        content,
        generatedAt: new Date().toISOString(),
        mock: false,
      })
    } catch (err) {
      logError('repurpose-content.openai', err)
      const content = normalizeRepurposeContent(outputType, {}, input)
      return NextResponse.json({
        outputType,
        content,
        generatedAt: new Date().toISOString(),
        mock: true,
      })
    }
  } catch (err) {
    logError('repurpose-content.exception', err)
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
