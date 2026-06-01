import { buildHookLayer } from '@/lib/ai/prompts/cinematic/output-format'
import { buildVirloSystemPrompt } from '@/lib/virlo-engine/virlo-prompt'
import { injectContext } from '@/lib/ai/providers/context-injection'
import type { HookInput, ScriptInput } from '@/lib/ai/providers/types'

export function buildHookUserPrompt(input: HookInput): string {
  const avoid =
    input.previousHooks?.length ?
      `Avoid repeating these hooks:\n${input.previousHooks.map((h) => `- ${h}`).join('\n')}`
    : ''

  return injectContext(
    [
      `Generate a viral short-form video hook for this topic.`,
      `TOPIC: ${input.topic}`,
      input.platform ? `PLATFORM: ${input.platform}` : '',
      input.tone ? `TONE: ${input.tone}` : '',
      input.emotionalGoal ? `EMOTIONAL GOAL: ${input.emotionalGoal}` : '',
      input.contentAngleLabel ? `CONTENT ANGLE: ${input.contentAngleLabel}` : '',
      input.hookFrameworkLabel ? `HOOK FRAMEWORK: ${input.hookFrameworkLabel}` : '',
      buildHookLayer(),
      avoid,
      `Return JSON: { "hook": "...", "title": "optional short title", "hookFramework": "framework id" }`,
    ]
      .filter(Boolean)
      .join('\n'),
    input.context
  )
}

export function buildHookSystemPrompt(): string {
  return buildVirloSystemPrompt()
}

export function buildScriptMessages(input: ScriptInput): {
  systemPrompt: string
  userPrompt: string
} {
  return {
    systemPrompt: input.systemPrompt,
    userPrompt: injectContext(input.userPrompt, input.context),
  }
}

export function extractHookFromParsed(parsed: Record<string, unknown>): string {
  const hook = typeof parsed.hook === 'string' ? parsed.hook.trim() : ''
  return hook
}

export function extractTitleFromParsed(parsed: Record<string, unknown>): string | undefined {
  const title = typeof parsed.title === 'string' ? parsed.title.trim() : ''
  return title || undefined
}
