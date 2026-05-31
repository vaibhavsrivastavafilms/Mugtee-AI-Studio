import type { CreativeBrief, StoryExpansionSuggestion } from '@/lib/companion/types'

type ExpansionInput = {
  title?: string
  hook?: string
  script?: string
  brief?: CreativeBrief | null
  niche?: string
}

export function suggestStoryExpansions(input: ExpansionInput): StoryExpansionSuggestion[] {
  const theme = input.brief?.theme ?? input.title ?? input.hook?.slice(0, 60) ?? 'This story'
  const takeaway = input.brief?.takeaway ?? 'the core idea'
  const protagonist = input.brief?.protagonist ?? 'your audience'

  const suggestions: StoryExpansionSuggestion[] = [
    {
      id: 'sequel',
      title: 'Part two — what happened next',
      description: `Pick up right after "${takeaway.slice(0, 40)}…" — same tone, new stakes.`,
      type: 'sequel',
    },
    {
      id: 'deep_dive',
      title: 'Deep dive on one beat',
      description: `Expand the moment ${protagonist} changed — one scene, documentary slow burn.`,
      type: 'deep_dive',
    },
    {
      id: 'spinoff',
      title: 'Opposite angle',
      description: `Same theme (${theme.slice(0, 50)}…) but flip the emotion — if this was hope, try dread.`,
      type: 'spinoff',
    },
    {
      id: 'series_hook',
      title: 'Series hook',
      description: 'End with an open question that demands episode two — Mugtee can draft the cliffhanger.',
      type: 'series_hook',
    },
  ]

  if (input.niche) {
    suggestions[0].description += ` Niche: ${input.niche}.`
  }

  return suggestions.slice(0, 3)
}
