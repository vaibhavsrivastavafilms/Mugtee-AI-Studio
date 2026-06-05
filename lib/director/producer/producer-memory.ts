import type { ProducerMemory, ProducerRecommendations } from '@/lib/director/producer/types'
import { EMPTY_PRODUCER_MEMORY } from '@/lib/director/producer/types'

export type AggregatedProducerMemory = ProducerMemory & {
  acceptedTexts: string[]
  rejectedTexts: string[]
}

function collectSuggestionTexts(
  recommendations: ProducerRecommendations,
  ids: string[]
): string[] {
  const all = [
    ...recommendations.strengths,
    ...recommendations.risks,
    ...recommendations.opportunities,
    ...recommendations.suggestions,
  ]
  return ids
    .map((id) => all.find((item) => item.id === id)?.text)
    .filter((t): t is string => Boolean(t))
}

/** Record accept/reject feedback on a producer suggestion. */
export function recordSuggestionFeedback(
  memory: ProducerMemory,
  suggestionId: string,
  accepted: boolean
): ProducerMemory {
  const acceptedIds = new Set(memory.acceptedSuggestionIds)
  const rejectedIds = new Set(memory.rejectedSuggestionIds)

  if (accepted) {
    acceptedIds.add(suggestionId)
    rejectedIds.delete(suggestionId)
  } else {
    rejectedIds.add(suggestionId)
    acceptedIds.delete(suggestionId)
  }

  return {
    acceptedSuggestionIds: [...acceptedIds],
    rejectedSuggestionIds: [...rejectedIds],
  }
}

/** Merge producer memory from report + creator aggregate for prompt injection. */
export function mergeProducerMemoryForPrompt(
  reportMemory: ProducerMemory | null | undefined,
  creatorMemory: ProducerMemory | null | undefined,
  recommendations?: ProducerRecommendations
): string {
  const report = reportMemory ?? EMPTY_PRODUCER_MEMORY
  const creator = creatorMemory ?? EMPTY_PRODUCER_MEMORY

  const acceptedIds = [...new Set([...creator.acceptedSuggestionIds, ...report.acceptedSuggestionIds])]
  const rejectedIds = [...new Set([...creator.rejectedSuggestionIds, ...report.rejectedSuggestionIds])]

  if (!acceptedIds.length && !rejectedIds.length) return ''

  const lines = ['PRODUCER MEMORY (creator feedback on past suggestions):']

  if (recommendations && acceptedIds.length) {
    const texts = collectSuggestionTexts(recommendations, acceptedIds)
    if (texts.length) {
      lines.push(`Accepted guidance: ${texts.slice(0, 5).join(' | ')}`)
    }
  }

  if (recommendations && rejectedIds.length) {
    const texts = collectSuggestionTexts(recommendations, rejectedIds)
    if (texts.length) {
      lines.push(`Rejected guidance (do not repeat): ${texts.slice(0, 5).join(' | ')}`)
    }
  }

  if (!recommendations) {
    if (acceptedIds.length) lines.push(`Accepted suggestion IDs: ${acceptedIds.slice(0, 8).join(', ')}`)
    if (rejectedIds.length) lines.push(`Rejected suggestion IDs: ${rejectedIds.slice(0, 8).join(', ')}`)
  }

  lines.push('Honor accepted patterns. Avoid rejected patterns.')

  return lines.join('\n')
}

/** Aggregate report-level producer memory into creator-level memory. */
export function aggregateProducerMemory(
  existing: ProducerMemory | null | undefined,
  reportMemory: ProducerMemory
): ProducerMemory {
  const base = existing ?? EMPTY_PRODUCER_MEMORY
  return {
    acceptedSuggestionIds: [
      ...new Set([...base.acceptedSuggestionIds, ...reportMemory.acceptedSuggestionIds]),
    ],
    rejectedSuggestionIds: [
      ...new Set([...base.rejectedSuggestionIds, ...reportMemory.rejectedSuggestionIds]),
    ],
  }
}

export function parseProducerMemory(raw: unknown): ProducerMemory {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ...EMPTY_PRODUCER_MEMORY }
  const r = raw as Partial<ProducerMemory>
  return {
    acceptedSuggestionIds: Array.isArray(r.acceptedSuggestionIds)
      ? r.acceptedSuggestionIds.map(String)
      : [],
    rejectedSuggestionIds: Array.isArray(r.rejectedSuggestionIds)
      ? r.rejectedSuggestionIds.map(String)
      : [],
  }
}
