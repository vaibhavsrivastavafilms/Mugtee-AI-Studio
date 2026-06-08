import { STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import type { VirloMarketIntelligence } from '@/lib/virlo/types'

/** Format Virlo market intelligence for LLM injection (Director Mode only). */
export function formatVirloMarketForPrompt(
  market: VirloMarketIntelligence | null | undefined
): string {
  if (!market || market.patternCount === 0) return ''

  const sections: string[] = ['VIRLO MARKET INTELLIGENCE (Director Mode — external trend signals):']

  if (market.platform) {
    sections.push(`Platform lens: ${market.platform}`)
  }

  const formatItems = (label: string, items: VirloMarketIntelligence['workingNow']) => {
    if (!items.length) return
    const lines = items.slice(0, 4).map((i) => {
      const fw = STORY_FRAMEWORKS[i.framework as keyof typeof STORY_FRAMEWORKS]
      const fwLabel = fw?.label ?? i.framework
      return `${fwLabel} (${i.hookType ?? 'hook'}) — virality ${i.avgVirality}%${i.sampleTriggers[0] ? ` · "${i.sampleTriggers[0]}"` : ''}`
    })
    sections.push(`${label}: ${lines.join(' | ')}`)
  }

  formatItems('Working now', market.workingNow)
  formatItems('Emerging', market.emerging)
  formatItems('Oversaturated (avoid)', market.oversaturated)
  formatItems('Fading', market.fading)

  if (market.recommendedPatterns.length) {
    const rec = market.recommendedPatterns[0]!
    const fw = STORY_FRAMEWORKS[rec.framework as keyof typeof STORY_FRAMEWORKS]
    sections.push(
      `Top market opportunity: ${fw?.label ?? rec.framework} with ${rec.hookType ?? 'strong'} hooks (${rec.avgVirality}% avg virality)`
    )
  }

  sections.push(
    'Blend these external signals with creator preferences — favor working/emerging patterns unless creator DNA strongly conflicts.'
  )

  return sections.filter(Boolean).join('\n')
}
