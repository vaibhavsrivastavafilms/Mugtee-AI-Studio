import type { CreatorMemory } from '@/lib/companion/types'
import type { CreatorDna, MemoryGraph, MemoryProfile } from '@/lib/memory/types'
import { buildCreatorMemoryPromptSection } from '@/lib/companion/creator-memory'

function formatDnaSection(dna: CreatorDna): string {
  const lines = [
    dna.creatorType ? `Creator type: ${dna.creatorType}` : '',
    dna.audience ? `Audience: ${dna.audience}` : '',
    dna.format ? `Preferred format: ${dna.format}` : '',
    dna.emotionalTrigger ? `Emotional trigger: ${dna.emotionalTrigger}` : '',
    dna.voice ? `Voice: ${dna.voice}` : '',
    dna.visualStyle ? `Visual style: ${dna.visualStyle}` : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return ['CREATOR DNA:', ...lines].join('\n')
}

function formatGraphHints(graph: MemoryGraph): string {
  const hooks = graph.nodes?.filter((n) => n.type === 'hook').slice(0, 3) ?? []
  const themes = graph.nodes?.filter((n) => n.type === 'theme').slice(0, 3) ?? []
  const lines = [
    hooks.length ? `Strong hooks: ${hooks.map((h) => h.label).join(' · ')}` : '',
    themes.length ? `Recurring themes: ${themes.map((t) => t.label).join(' · ')}` : '',
  ].filter(Boolean)
  if (!lines.length) return ''
  return ['MEMORY GRAPH HINTS:', ...lines].join('\n')
}

function formatRecentLearnings(profile: MemoryProfile): string {
  const recent = profile.learningEvents.slice(0, 5)
  if (!recent.length) return ''
  const lines = recent.map((e) => {
    const hook = typeof e.payload?.hook === 'string' ? ` — "${e.payload.hook.slice(0, 60)}"` : ''
    return `- ${e.type.replace(/_/g, ' ')}${hook}`
  })
  return ['RECENT LEARNING SIGNALS:', ...lines].join('\n')
}

export type MemoryPromptInput = {
  profile?: MemoryProfile | null
  /** Legacy companion memory — merged if profile absent */
  companionMemory?: CreatorMemory | null
}

/** Inject creator memory before generation prompts */
export function formatCreatorMemoryForPrompt(input: MemoryPromptInput): string {
  const sections: string[] = []

  if (input.profile) {
    const { creatorMemory, creatorDna, memoryGraph, relationshipLevel } = input.profile
    const legacy = buildCreatorMemoryPromptSection(creatorMemory)
    if (legacy) sections.push(legacy)
    const dna = formatDnaSection(creatorDna)
    if (dna) sections.push(dna)
    const graph = formatGraphHints(memoryGraph)
    if (graph) sections.push(graph)
    const learnings = formatRecentLearnings(input.profile)
    if (learnings) sections.push(learnings)
    if (relationshipLevel !== 'explorer') {
      sections.push(
        `CREATOR RELATIONSHIP: ${relationshipLevel.replace(/_/g, ' ')} — personalize tone to match shared creative history.`
      )
    }
  } else if (input.companionMemory) {
    const legacy = buildCreatorMemoryPromptSection(input.companionMemory)
    if (legacy) sections.push(legacy)
  }

  return sections.filter(Boolean).join('\n\n')
}
