import type { ParsedCreatorIntent } from '@/lib/input-understanding/types'
import { INSTRUCTION_PREFIXES } from '@/lib/input-understanding/intent-extraction'

const INLINE_INSTRUCTION_PATTERNS: RegExp[] = [
  /\bhelp me\b/gi,
  /\bcan you\b/gi,
  /\bi want to\b/gi,
  /\bi need to\b/gi,
  /\bwrite me\b/gi,
  /\bgenerate me\b/gi,
  /\bmake me\b/gi,
  /\bcreate me\b/gi,
  /\bplease create\b/gi,
  /\bplease write\b/gi,
  /\bplease generate\b/gi,
]

/** Remove instruction/meta phrases from text destined for title/hook/script prompts. */
export function sanitizeForGeneration(raw: string): string {
  let text = raw.trim()
  if (!text) return text

  const lower = text.toLowerCase()
  for (const prefix of INSTRUCTION_PREFIXES) {
    if (lower.startsWith(prefix)) {
      text = text.slice(prefix.length).trim()
      break
    }
  }

  text = text.replace(/^(?:a|an|the)\s+/i, '')

  for (const pattern of INLINE_INSTRUCTION_PATTERNS) {
    text = text.replace(pattern, ' ')
  }

  return text.replace(/\s+/g, ' ').trim()
}

/** Structured brief block for LLM prompts — never echoes raw instruction phrasing. */
export function formatIntentForPrompt(intent: ParsedCreatorIntent): string {
  const lines = [
    'PARSED CREATOR INTENT (use for generation — do NOT quote or repeat the raw user request):',
    `SUBJECT: ${intent.cleanTopic}`,
  ]
  if (intent.niche) lines.push(`NICHE: ${intent.niche}`)
  if (intent.goal) lines.push(`GOAL: ${intent.goal}`)
  if (intent.platform) lines.push(`PLATFORM HINT: ${intent.platform}`)
  if (intent.tone) lines.push(`TONE HINT: ${intent.tone}`)
  lines.push(
    'Write titles and hooks about the SUBJECT only. Never include phrases like "help me", "create a", or the user\'s full request.'
  )
  return lines.join('\n')
}

/** Prefer parsed clean topic; fall back to sanitized raw string. */
export function resolveGenerationTopic(
  intent: ParsedCreatorIntent | null | undefined,
  rawFallback: string
): string {
  if (intent?.cleanTopic?.trim()) return intent.cleanTopic.trim()
  const sanitized = sanitizeForGeneration(rawFallback)
  return sanitized || rawFallback.trim()
}
