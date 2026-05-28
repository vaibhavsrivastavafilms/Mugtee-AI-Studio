import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildCinematicScriptPrompt,
} from '@/lib/ai/prompts/cinematic/build-prompt'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import { buildVirloSystemPrompt } from '@/lib/virlo-engine/virlo-prompt'
import type { VirloMetadata } from '@/lib/virlo-engine/types'
import {
  buildMockCinematicOutput,
  finalizeCinematicOutput,
  normalizeCinematicOutput,
  validateCinematicOutput,
  type CinematicGenerationOutput,
} from '@/lib/cinematic/generation'
import { inferNicheFromBrief, type CinematicNiche } from '@/lib/cinematic/niches'
import { coerceDuration, coercePlatform, coerceTone } from '@/lib/workspace/validation'

export type ScriptGenerationInput = {
  topic: string
  platform?: string
  tone?: string
  duration?: number
  niche?: string
  sessionSeed?: string | number
}

async function generateWithOpenAI(
  input: {
    topic: string
    platform: string
    tone: string
    duration: number
    niche: CinematicNiche
    sessionSeed?: string | number
  },
  retryNote?: string
) {
  const openai = getOpenAIClient()
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
      { role: 'system', content: buildVirloSystemPrompt() },
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

/** Shared script shaping used by Quick Cut orchestration and generate-script API. */
export async function runScriptGeneration(
  input: ScriptGenerationInput
): Promise<{
  output: CinematicGenerationOutput
  mock: boolean
  reason?: string
  virlo?: VirloMetadata
}> {
  const topic = input.topic.trim()
  const platform = coercePlatform(input.platform)
  const tone = coerceTone(input.tone)
  const duration = coerceDuration(input.duration)
  const niche = inferNicheFromBrief({
    topic,
    tone,
    style: input.tone,
    niche: input.niche,
  })

  const virloContext = buildVirloContext(topic, {
    platform,
    tone,
    duration,
    niche,
    sessionSeed: input.sessionSeed,
  })
  const virlo = virloMetadataFromContext(virloContext)

  const genInput = { topic, platform, tone, duration, niche, sessionSeed: input.sessionSeed }

  if (!process.env.OPENAI_API_KEY) {
    return {
      output: buildMockCinematicOutput({ topic, tone, duration, niche, virloContext }),
      mock: true,
      reason: 'missing_api_key',
      virlo,
    }
  }

  try {
    let parsed = await generateWithOpenAI(genInput)
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
      parsed = await generateWithOpenAI(genInput, validation.issues.join(', '))
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

    return { output, mock: false, virlo }
  } catch {
    return {
      output: buildMockCinematicOutput({ topic, tone, duration, niche, virloContext }),
      mock: true,
      reason: 'provider_fallback',
      virlo,
    }
  }
}
