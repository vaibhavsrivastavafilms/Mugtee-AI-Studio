import {
  FREE_GEMINI_TEXT_MODEL,
  GOOGLE_GENERATIVE_API_BASE,
  getGeminiApiKey,
} from '@/lib/ai/free-tier'
import {
  buildHookSystemPrompt,
  buildHookUserPrompt,
  buildScriptMessages,
  extractHookFromParsed,
  extractTitleFromParsed,
} from '@/lib/ai/providers/prompt-helpers'
import { fetchWithTimeout, parseLlmJsonText } from '@/lib/ai/providers/shared'
import type {
  AIProvider,
  CaptionResult,
  HookInput,
  HookResult,
  ScriptInput,
  ScriptResult,
  TitleResult,
} from '@/lib/ai/providers/types'
import { getTaskTimeoutMs, hasProviderKey } from '@/lib/ai/providers/task-routing'

async function callGemini(params: {
  systemPrompt: string
  userPrompt: string
  temperature?: number
  jsonMode?: boolean
  timeoutMs: number
}): Promise<string> {
  const key = getGeminiApiKey()
  if (!key) throw new Error('GEMINI_API_KEY not configured')

  const model = process.env.GEMINI_TEXT_MODEL?.trim() || FREE_GEMINI_TEXT_MODEL
  const url = `${GOOGLE_GENERATIVE_API_BASE}/models/${model}:generateContent?key=${encodeURIComponent(key)}`

  const res = await fetchWithTimeout(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: params.systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: params.userPrompt }] }],
        generationConfig: {
          temperature: params.temperature ?? 0.85,
          ...(params.jsonMode ? { responseMimeType: 'application/json' } : {}),
        },
      }),
    },
    params.timeoutMs
  )

  if (!res.ok) {
    // Capture the response body — Google returns the real reason here
    // (e.g. API_KEY_INVALID, quota, model not found). `Gemini HTTP 400` alone is useless.
    const errBody = await res.text().catch(() => '')
    let detail = ''
    try {
      const parsed = JSON.parse(errBody) as {
        error?: { status?: string; message?: string }
      }
      detail = [parsed.error?.status, parsed.error?.message].filter(Boolean).join(': ')
    } catch {
      detail = errBody.slice(0, 300)
    }
    console.error('[Gemini] request failed', {
      httpStatus: res.status,
      model,
      detail: detail.slice(0, 300),
    })
    throw new Error(`Gemini HTTP ${res.status}${detail ? `: ${detail.slice(0, 200)}` : ''}`)
  }

  const json = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> }
      finishReason?: string
      safetyRatings?: Array<{ category?: string; probability?: string }>
    }>
    promptFeedback?: { blockReason?: string; safetyRatings?: unknown }
    usageMetadata?: {
      promptTokenCount?: number
      candidatesTokenCount?: number
      totalTokenCount?: number
    }
  }

  const candidate = json.candidates?.[0]
  const finishReason = candidate?.finishReason
  const blockReason = json.promptFeedback?.blockReason

  // Safety block / non-STOP finish reasons produce empty text — surface them explicitly.
  if (blockReason) {
    console.error('[Gemini] prompt blocked', {
      blockReason,
      promptFeedback: json.promptFeedback,
    })
    throw new Error(`Gemini prompt blocked: ${blockReason}`)
  }
  if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
    console.error('[Gemini] abnormal finishReason', {
      finishReason,
      safetyRatings: candidate?.safetyRatings,
      usageMetadata: json.usageMetadata,
    })
  }

  const text =
    candidate?.content?.parts
      ?.map((p) => p.text)
      .filter(Boolean)
      .join('') ?? ''

  if (process.env.NODE_ENV === 'development') {
    console.log('[Gemini] response', {
      model,
      finishReason: finishReason ?? 'none',
      promptTokens: json.usageMetadata?.promptTokenCount,
      completionTokens: json.usageMetadata?.candidatesTokenCount,
      textLength: text.length,
    })
  }

  return text
}

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini' as const

  isAvailable(): boolean {
    return hasProviderKey('gemini')
  }

  async generateHook(input: HookInput): Promise<HookResult> {
    const text = await callGemini({
      systemPrompt: buildHookSystemPrompt(),
      userPrompt: buildHookUserPrompt(input),
      temperature: 0.88,
      jsonMode: true,
      timeoutMs: getTaskTimeoutMs('hook'),
    })
    const parsed = parseLlmJsonText(text)
    const hook = extractHookFromParsed(parsed)
    if (!hook) throw new Error('Gemini returned empty hook')
    return {
      hook,
      title: extractTitleFromParsed(parsed),
      hookFramework:
        typeof parsed.hookFramework === 'string' ? parsed.hookFramework : undefined,
      provider: this.id,
    }
  }

  async generateScript(input: ScriptInput): Promise<ScriptResult> {
    const { systemPrompt, userPrompt } = buildScriptMessages(input)
    const text = await callGemini({
      systemPrompt,
      userPrompt,
      temperature: input.temperature ?? 0.85,
      jsonMode: true,
      timeoutMs: getTaskTimeoutMs('script'),
    })
    return { parsed: parseLlmJsonText(text), provider: this.id }
  }

  async generateTitle(input: HookInput): Promise<TitleResult> {
    const result = await this.generateHook(input)
    return { title: result.title ?? result.hook.slice(0, 80), provider: this.id }
  }

  async generateCaption(
    input: HookInput & { script?: string }
  ): Promise<CaptionResult> {
    const text = await callGemini({
      systemPrompt: 'Return JSON captions only.',
      userPrompt: [
        input.context?.injectionBlock,
        `TOPIC: ${input.topic}`,
        input.script ? `SCRIPT:\n${input.script.slice(0, 2000)}` : '',
      ]
        .filter(Boolean)
        .join('\n\n'),
      jsonMode: true,
      timeoutMs: getTaskTimeoutMs('caption'),
    })
    return { captions: parseLlmJsonText(text), provider: this.id }
  }
}
