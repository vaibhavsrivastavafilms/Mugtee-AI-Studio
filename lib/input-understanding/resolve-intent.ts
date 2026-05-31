import { parseCreatorIntent, parseCreatorIntentSync } from '@/lib/input-understanding/intent-extraction'
import { normalizeParsedIntent, type ParsedCreatorIntent } from '@/lib/input-understanding/types'

export function resolveParsedIntentSync(
  raw: Record<string, unknown> | null | undefined,
  topicFallback: string
): ParsedCreatorIntent {
  const fromBody = normalizeParsedIntent(raw?.parsedIntent ?? raw?.parsed_intent)
  if (fromBody?.cleanTopic) return fromBody
  return parseCreatorIntentSync(topicFallback)
}

export async function resolveParsedIntentAsync(
  raw: Record<string, unknown> | null | undefined,
  topicFallback: string
): Promise<ParsedCreatorIntent> {
  const fromBody = normalizeParsedIntent(raw?.parsedIntent ?? raw?.parsed_intent)
  if (fromBody?.cleanTopic) return fromBody
  return parseCreatorIntent(topicFallback)
}
