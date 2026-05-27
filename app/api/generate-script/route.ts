import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  buildCinematicScriptPrompt,
  CINEMATIC_SYSTEM_PROMPT,
} from '@/lib/ai/prompts/cinematic/build-prompt'
import {
  buildMockCinematicOutput,
  finalizeCinematicOutput,
  normalizeCinematicOutput,
  validateCinematicOutput,
} from '@/lib/cinematic/generation'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import {
  coerceDuration,
  coercePlatform,
  coerceTopic,
  coerceTone,
  logError,
} from '@/lib/workspace/validation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function generateWithOpenAI(
  openai: OpenAI,
  input: {
    topic: string
    platform: string
    tone: string
    duration: number
    niche: ReturnType<typeof inferNicheFromBrief>
  },
  retryNote?: string
) {
  const userPrompt = [
    buildCinematicScriptPrompt(input),
    retryNote
      ? `\nRETRY NOTE: Previous draft failed quality checks (${retryNote}). Fix niche drift, weak hook, repetitive scenes, or empty captions.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: retryNote ? 0.75 : 0.85,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: CINEMATIC_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = completion.choices[0]?.message?.content || '{}'
  try {
    return JSON.parse(content)
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json(
        { error: 'Body must be a JSON object' },
        { status: 400 }
      )
    }

    const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
    if (topic.length < 6) {
      return NextResponse.json(
        { error: 'Topic must be at least 6 characters' },
        { status: 400 }
      )
    }

    const platform = coercePlatform(raw.platform)
    const tone = coerceTone(raw.tone ?? raw.style)
    const duration = coerceDuration(raw.duration)
    const niche = inferNicheFromBrief({
      topic,
      tone,
      style: typeof raw.style === 'string' ? raw.style : tone,
      niche: typeof raw.niche === 'string' ? raw.niche : undefined,
    })

    const input = { topic, platform, tone, duration, niche }

    if (!process.env.OPENAI_API_KEY) {
      const output = buildMockCinematicOutput({ topic, tone, duration, niche })
      return NextResponse.json({ output, mock: true, reason: 'missing_api_key' })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    try {
      let parsed = await generateWithOpenAI(openai, input)
      const hookVariations = Array.isArray((parsed as Record<string, unknown>)?.hookVariations)
        ? ((parsed as Record<string, unknown>).hookVariations as unknown[]).filter(
            (v): v is string => typeof v === 'string'
          )
        : []

      let output = finalizeCinematicOutput(
        normalizeCinematicOutput(parsed, { topic, duration, tone, niche }),
        niche,
        { topic, duration, tone, hookVariations }
      )

      let validation = validateCinematicOutput(output, niche)
      if (!validation.valid) {
        parsed = await generateWithOpenAI(
          openai,
          input,
          validation.issues.join(', ')
        )
        const retryHookVariations = Array.isArray(
          (parsed as Record<string, unknown>)?.hookVariations
        )
          ? ((parsed as Record<string, unknown>).hookVariations as unknown[]).filter(
              (v): v is string => typeof v === 'string'
            )
          : hookVariations
        output = finalizeCinematicOutput(
          normalizeCinematicOutput(parsed, { topic, duration, tone, niche }),
          niche,
          { topic, duration, tone, hookVariations: retryHookVariations }
        )
        validation = validateCinematicOutput(output, niche)
      }

      return NextResponse.json({
        output,
        mock: false,
        niche,
        validation,
      })
    } catch (err) {
      logError('generate-script.openai', err, { topic: topic.slice(0, 40) })
      const output = buildMockCinematicOutput({ topic, tone, duration, niche })
      return NextResponse.json({
        output,
        mock: true,
        reason: 'provider_fallback',
        niche,
      })
    }
  } catch (err) {
    logError('generate-script.exception', err)
    return NextResponse.json(
      { error: 'Unexpected error' },
      { status: 500 }
    )
  }
}
