import { getAnthropicClient, CLAUDE_SCRIPT_MODEL } from '@/lib/ai/anthropic-client'
import {
  allowAnthropicScript,
  allowOpenAIScript,
  FREE_OPENAI_CHAT_MODEL,
} from '@/lib/ai/free-tier'
import { generateScriptWithGemini } from '@/lib/ai/gemini-script'
import { getOpenAIClient } from '@/lib/ai/openai-client'
import {
  buildCinematicScriptPrompt,
} from '@/lib/ai/prompts/cinematic/build-prompt'
import { hasScriptGenerationKey } from '@/lib/ai/script-generation-keys'
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

type GenInput = {
  topic: string
  platform: string
  tone: string
  duration: number
  niche: CinematicNiche
  sessionSeed?: string | number
}

function buildUserPrompt(input: GenInput, retryNote?: string): string {
  return [
    buildCinematicScriptPrompt(input),
    retryNote
      ? `\nRETRY NOTE: Previous draft failed quality checks (${retryNote}). Fix niche drift, weak hook, repetitive scenes, or empty captions.`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function parseLlmJson(content: string): Record<string, unknown> {
  const trimmed = content.trim()
  try {
    return JSON.parse(trimmed) as Record<string, unknown>
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenced) {
      try {
        return JSON.parse(fenced[1].trim()) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    return {}
  }
}

async function generateWithClaude(userPrompt: string, retryNote?: string) {
  const anthropic = getAnthropicClient()
  const message = await anthropic.messages.create({
    model: CLAUDE_SCRIPT_MODEL,
    max_tokens: 8192,
    temperature: retryNote ? 0.75 : 0.85,
    system: buildVirloSystemPrompt(),
    messages: [{ role: 'user', content: userPrompt }],
  })

  const textBlock = message.content.find((block) => block.type === 'text')
  const content = textBlock && textBlock.type === 'text' ? textBlock.text : '{}'
  return parseLlmJson(content)
}

async function generateWithOpenAI(input: GenInput, retryNote?: string) {
  const openai = getOpenAIClient()
  const userPrompt = buildUserPrompt(input, retryNote)

  const completion = await openai.chat.completions.create({
    model: FREE_OPENAI_CHAT_MODEL,
    temperature: retryNote ? 0.75 : 0.85,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildVirloSystemPrompt() },
      { role: 'user', content: userPrompt },
    ],
  })

  const content = completion.choices[0]?.message?.content || '{}'
  return parseLlmJson(content)
}

/** Gemini (free) → Claude → OpenAI mini. Throws when no provider succeeds. */
async function generateScript(input: GenInput, retryNote?: string) {
  const userPrompt = buildUserPrompt(input, retryNote)
  const systemPrompt = buildVirloSystemPrompt()

  const gemini = await generateScriptWithGemini({
    systemPrompt,
    userPrompt,
    temperature: retryNote ? 0.75 : 0.85,
  })
  if (gemini && Object.keys(gemini).length > 0) return gemini

  if (allowAnthropicScript()) {
    try {
      return await generateWithClaude(userPrompt, retryNote)
    } catch {
      // Fall through when Claude fails.
    }
  }

  if (allowOpenAIScript()) {
    return await generateWithOpenAI(input, retryNote)
  }

  throw new Error('No script generation provider configured')
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

  if (!hasScriptGenerationKey()) {
    return {
      output: buildMockCinematicOutput({ topic, tone, duration, niche, virloContext }),
      mock: true,
      reason: 'missing_api_key',
      virlo,
    }
  }

  try {
    let parsed = await generateScript(genInput)
    const hookVariations = Array.isArray(parsed.hookVariations)
      ? parsed.hookVariations.filter((v): v is string => typeof v === 'string')
      : []

    let output = finalizeCinematicOutput(
      normalizeCinematicOutput(parsed, { topic, duration, tone, niche }),
      niche,
      { topic, duration, tone, hookVariations }
    )

    let validation = validateCinematicOutput(output, niche)
    if (!validation.valid) {
      parsed = await generateScript(genInput, validation.issues.join(', '))
      const retryHookVariations = Array.isArray(parsed.hookVariations)
        ? parsed.hookVariations.filter((v): v is string => typeof v === 'string')
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
