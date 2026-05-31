export type ParsedCreatorIntent = {
  /** Subject for display / niche routing — e.g. "Psychology" */
  topic: string
  niche?: string
  goal?: string
  platform?: string
  tone?: string
  /** Topic string for generation — no instruction verbs or meta-requests */
  cleanTopic: string
  rawInput: string
}

export function normalizeParsedIntent(raw: unknown): ParsedCreatorIntent | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const rawInput =
    typeof o.rawInput === 'string' && o.rawInput.trim()
      ? o.rawInput.trim()
      : typeof o.raw_input === 'string' && o.raw_input.trim()
        ? o.raw_input.trim()
        : ''
  const cleanTopic =
    typeof o.cleanTopic === 'string' && o.cleanTopic.trim()
      ? o.cleanTopic.trim()
      : typeof o.clean_topic === 'string' && o.clean_topic.trim()
        ? o.clean_topic.trim()
        : ''
  const topic =
    typeof o.topic === 'string' && o.topic.trim()
      ? o.topic.trim()
      : cleanTopic
  if (!rawInput && !cleanTopic && !topic) return null
  return {
    topic: topic || cleanTopic || rawInput,
    cleanTopic: cleanTopic || topic || rawInput,
    rawInput: rawInput || cleanTopic || topic,
    niche: typeof o.niche === 'string' && o.niche.trim() ? o.niche.trim() : undefined,
    goal: typeof o.goal === 'string' && o.goal.trim() ? o.goal.trim() : undefined,
    platform: typeof o.platform === 'string' && o.platform.trim() ? o.platform.trim() : undefined,
    tone: typeof o.tone === 'string' && o.tone.trim() ? o.tone.trim() : undefined,
  }
}

export function serializeParsedIntent(intent: ParsedCreatorIntent): ParsedCreatorIntent {
  return {
    topic: intent.topic.slice(0, 280),
    cleanTopic: intent.cleanTopic.slice(0, 280),
    rawInput: intent.rawInput.slice(0, 500),
    niche: intent.niche?.slice(0, 80),
    goal: intent.goal?.slice(0, 80),
    platform: intent.platform?.slice(0, 80),
    tone: intent.tone?.slice(0, 80),
  }
}
