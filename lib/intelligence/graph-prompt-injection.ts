import { STORY_FRAMEWORK_IDS, STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import type { CreatorIntelligenceGraphData, Insight } from '@/lib/intelligence/types'

function topEntries(map: Record<string, number>, limit = 3): string[] {
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([k, v]) => `${k} (${v}%)`)
}

/** Format unified intelligence graph for LLM injection (Director Mode only). */
export function formatIntelligenceGraphForPrompt(
  graph: CreatorIntelligenceGraphData | null | undefined,
  insights: Insight[] | null | undefined
): string {
  if (!graph) return ''

  const hasContent =
    graph.creatorProfile.projectCount > 0 ||
    graph.producerAffinity.reportCount > 0 ||
    (insights?.length ?? 0) > 0

  if (!hasContent) return ''

  const sections: string[] = ['CREATOR INTELLIGENCE GRAPH (Director Mode — learned patterns):']

  const profile = graph.creatorProfile
  sections.push(
    `Identity: ${profile.identityLabel} · ${profile.directorApprovedCount} approved projects · memory depth ${profile.memoryDepth}/100`
  )

  if (profile.preferredFramework || profile.preferredGenre || profile.preferredMood) {
    const prefs = [
      profile.preferredFramework ? `framework: ${profile.preferredFramework}` : '',
      profile.preferredGenre ? `genre: ${profile.preferredGenre}` : '',
      profile.preferredMood ? `mood: ${profile.preferredMood}` : '',
    ].filter(Boolean)
    if (prefs.length) sections.push(`Creative defaults: ${prefs.join(' · ')}`)
  }

  const fwLine = STORY_FRAMEWORK_IDS.map((id) => {
    const pct = graph.frameworkAffinity[id] ?? 0
    if (pct <= 0) return null
    return `${STORY_FRAMEWORKS[id].label} ${pct}%`
  })
    .filter(Boolean)
    .join(', ')

  if (fwLine) sections.push(`Framework affinity: ${fwLine}`)

  const visualParts = [
    topEntries(graph.visualAffinity.colorPalettes, 2).length
      ? `palettes: ${topEntries(graph.visualAffinity.colorPalettes, 2).join(', ')}`
      : '',
    topEntries(graph.visualAffinity.lighting, 2).length
      ? `lighting: ${topEntries(graph.visualAffinity.lighting, 2).join(', ')}`
      : '',
    topEntries(graph.visualAffinity.shotTypes, 2).length
      ? `shots: ${topEntries(graph.visualAffinity.shotTypes, 2).join(', ')}`
      : '',
  ].filter(Boolean)

  if (visualParts.length) sections.push(`Visual affinity: ${visualParts.join(' · ')}`)

  const voiceParts = topEntries(graph.voiceAffinity.narratorTones, 2)
  if (voiceParts.length) sections.push(`Voice affinity: ${voiceParts.join(', ')}`)

  const motionParts = topEntries(graph.motionAffinity.motionStyles, 2)
  if (motionParts.length) sections.push(`Motion affinity: ${motionParts.join(', ')}`)

  const pa = graph.producerAffinity
  if (pa.reportCount > 0) {
    sections.push(
      `Producer patterns (${pa.reportCount} reviews): story ${pa.avgStoryScore}, retention ${pa.avgRetentionScore}, cinematic ${pa.avgCinematicScore}${pa.topStrengths[0] ? ` · strength: ${pa.topStrengths[0]}` : ''}`
    )
  }

  const aud = graph.audienceAffinity
  if (aud.niche || aud.emotionalGoal) {
    sections.push(
      `Audience: ${[aud.niche, aud.platform, aud.emotionalGoal].filter(Boolean).join(' · ')}`
    )
  }

  const topInsights = (insights ?? []).slice(0, 5).map((i) => i.text)
  if (topInsights.length) {
    sections.push(`Key insights: ${topInsights.join(' | ')}`)
  }

  sections.push(
    'Honor these affinities when proposing story direction, framework, treatment, and production choices.'
  )

  return sections.filter(Boolean).join('\n')
}
