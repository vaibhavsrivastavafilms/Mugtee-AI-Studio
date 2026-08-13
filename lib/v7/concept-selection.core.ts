import type { V7Concept, V7CreativeBrief } from '@/types/v7/production'

export const V7_CONCEPT_SELECTION_KEY = 'concept_selection'

export type { V7Concept } from '@/types/v7/production'

export type V7ConceptSelectionState = {
  awaiting: boolean
  concepts: V7Concept[]
  selectedIndex: number | null
  selectedAt: string | null
}

export function readConceptSelectionState(
  timeline: Record<string, unknown> | null | undefined
): V7ConceptSelectionState | null {
  const raw = timeline?.[V7_CONCEPT_SELECTION_KEY]
  if (!raw || typeof raw !== 'object') return null
  const state = raw as Partial<V7ConceptSelectionState>
  if (!Array.isArray(state.concepts)) return null
  return {
    awaiting: Boolean(state.awaiting),
    concepts: state.concepts as V7Concept[],
    selectedIndex:
      typeof state.selectedIndex === 'number' && Number.isFinite(state.selectedIndex)
        ? state.selectedIndex
        : null,
    selectedAt: typeof state.selectedAt === 'string' ? state.selectedAt : null,
  }
}

export function isAwaitingConceptSelection(
  timeline: Record<string, unknown> | null | undefined
): boolean {
  const state = readConceptSelectionState(timeline)
  return Boolean(state?.awaiting && state.concepts.length > 0 && state.selectedIndex == null)
}

export function mergeConceptSelectionTimeline(
  timeline: Record<string, unknown> | null | undefined,
  patch: Partial<V7ConceptSelectionState>
): Record<string, unknown> {
  const base = { ...(timeline ?? {}) }
  const current = readConceptSelectionState(base) ?? {
    awaiting: false,
    concepts: [],
    selectedIndex: null,
    selectedAt: null,
  }
  base[V7_CONCEPT_SELECTION_KEY] = {
    ...current,
    ...patch,
  }
  return base
}

export function applySelectedConceptToBrief(
  brief: V7CreativeBrief,
  concept: V7Concept
): V7CreativeBrief {
  const duration =
    Number.isFinite(concept.estimatedDuration) && concept.estimatedDuration > 0
      ? Math.round(concept.estimatedDuration)
      : brief.duration

  return {
    ...brief,
    title: concept.title.trim() || brief.title,
    duration,
    style: concept.tone.trim()
      ? `${brief.style}. Selected angle: ${concept.coreAngle}. Tone: ${concept.tone}`
      : brief.style,
    emotion: concept.tone.trim() || brief.emotion,
    selectedConcept: concept,
  }
}

export function validateConceptIndex(
  concepts: V7Concept[],
  index: number
): V7Concept | null {
  if (!Number.isInteger(index) || index < 0 || index >= concepts.length) return null
  return concepts[index] ?? null
}
