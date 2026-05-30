import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import { FREE_OPENAI_CHAT_MODEL } from '@/lib/ai/free-tier'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { inferNicheFromBrief } from '@/lib/cinematic/niches'
import { normalizeProjectLanguage } from '@/lib/cinematic/language-detection'
import { normalizeCreatorBlueprintId } from '@/lib/cinematic/creator-blueprints'
import {
  buildContentSeriesPrompt,
  buildMockContentSeries,
  coerceEpisodeCount,
  normalizeContentSeries,
  parseLlmJson,
  type ContentSeriesEpisodeCount,
} from '@/lib/cinematic/content-series'
import { coerceTopic, logError } from '@/lib/workspace/validation'
import type { CreatorMemoryBiasHints } from '@/lib/creator/creator-memory'
import { SOFT_ERROR_COPY } from '@/lib/creator/soft-error-copy'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

function parseCreatorMemoryBias(raw: unknown): CreatorMemoryBiasHints | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const o = raw as Record<string, unknown>
  const str = (key: string) => {
    const v = o[key]
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 120) : undefined
  }
  const recentTones = Array.isArray(o.recentTones)
    ? o.recentTones.filter((v): v is string => typeof v === 'string').slice(0, 5)
    : undefined
  const hints: CreatorMemoryBiasHints = {
    niche: str('niche'),
    visualStyle: str('visualStyle'),
    pacing: str('pacing'),
    hookStyle: str('hookStyle'),
    platform: str('platform'),
    recentTones: recentTones?.length ? recentTones : undefined,
  }
  return Object.values(hints).some(Boolean) ? hints : undefined
}

export async function POST(req: NextRequest) {
  try {
    const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null

    if (raw?.mock === true) {
      const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
      const episodeCount = coerceEpisodeCount(raw.episodeCount) as ContentSeriesEpisodeCount
      return NextResponse.json({
        series: buildMockContentSeries({
          topic: topic || 'Cinematic series',
          episodeCount,
          niche: typeof raw.niche === 'string' ? raw.niche : undefined,
        }),
        mock: true,
      })
    }

    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
    }

    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return NextResponse.json({ error: 'Body must be a JSON object' }, { status: 400 })
    }

    const topic = coerceTopic(raw.topic ?? raw.prompt ?? raw.idea)
    if (topic.length < 6) {
      return NextResponse.json(
        { error: 'Topic must be at least 6 characters' },
        { status: 400 }
      )
    }

    const episodeCount = coerceEpisodeCount(raw.episodeCount) as ContentSeriesEpisodeCount
    const tone = typeof raw.tone === 'string' ? raw.tone : 'cinematic'
    const niche = inferNicheFromBrief({
      topic,
      tone,
      niche: typeof raw.niche === 'string' ? raw.niche : undefined,
    })
    const language = normalizeProjectLanguage(raw.language)
    const blueprintId = normalizeCreatorBlueprintId(raw.blueprintId)
    const creatorMemoryBias = parseCreatorMemoryBias(raw.creatorMemoryBias)

    const input = {
      topic,
      niche,
      episodeCount,
      creatorMemoryBias,
      blueprintId,
      language,
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim()
    if (!apiKey) {
      return NextResponse.json({
        series: buildMockContentSeries(input),
        mock: true,
        reason: 'missing_api_key',
      })
    }

    const { system, user: userPrompt } = buildContentSeriesPrompt(input)
    const openai = getOpenAIClient()
    const completion = await openai.chat.completions.create({
      model: FREE_OPENAI_CHAT_MODEL,
      temperature: 0.85,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
    })

    const content = completion.choices[0]?.message?.content ?? ''
    const parsed = parseLlmJson(content)
    const series = normalizeContentSeries(parsed, episodeCount)

    if (!series) {
      return NextResponse.json(
        { error: 'Could not parse series plan — try again.', reason: 'invalid_output' },
        { status: 502 }
      )
    }

    return NextResponse.json({ series, mock: false, niche })
  } catch (err) {
    logError('generate-series.openai', err)
    const message = err instanceof Error ? err.message : 'Series generation failed'
    return NextResponse.json(
      { error: SOFT_ERROR_COPY.storyPaused, reason: 'provider_failed', detail: message },
      { status: 502 }
    )
  }
}
