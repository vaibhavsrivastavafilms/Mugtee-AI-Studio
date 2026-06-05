import { STORY_FRAMEWORK_IDS, STORY_FRAMEWORKS } from '@/lib/ai/prompts/director/story-frameworks'
import type { CreatorIntelligenceGraphData, Insight } from '@/lib/intelligence/types'

function topAffinityEntries(map: Record<string, number>, limit = 3): Array<[string, number]> {
  return Object.entries(map)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
}

function insightId(category: string, index: number): string {
  return `${category}-${index}-${Date.now()}`
}

/** Rule-based insights from merged graph data. */
export function generateInsights(graph: CreatorIntelligenceGraphData): Insight[] {
  const insights: Insight[] = []
  const now = new Date().toISOString()
  let idx = 0

  const topFrameworks = STORY_FRAMEWORK_IDS.map((id) => ({
    id,
    label: STORY_FRAMEWORKS[id].label,
    pct: graph.frameworkAffinity[id] ?? 0,
  }))
    .filter((f) => f.pct > 0)
    .sort((a, b) => b.pct - a.pct)

  if (topFrameworks[0] && topFrameworks[0].pct >= 20) {
    insights.push({
      id: insightId('framework', idx++),
      category: 'framework',
      text: `${topFrameworks[0].label} ${topFrameworks[0].pct}% — your dominant narrative framework across director projects.`,
      confidence: Math.min(95, topFrameworks[0].pct + 20),
      source: 'rule',
      createdAt: now,
    })
  }

  if (topFrameworks[1] && topFrameworks[1].pct >= 15) {
    insights.push({
      id: insightId('framework', idx++),
      category: 'framework',
      text: `${topFrameworks[1].label} ${topFrameworks[1].pct}% — strong secondary framework when you want variety.`,
      confidence: Math.min(85, topFrameworks[1].pct + 15),
      source: 'rule',
      createdAt: now,
    })
  }

  const topPalettes = topAffinityEntries(graph.visualAffinity.colorPalettes, 1)
  if (topPalettes[0] && topPalettes[0][1] >= 30) {
    insights.push({
      id: insightId('visual', idx++),
      category: 'visual',
      text: `${topPalettes[0][0]} ${topPalettes[0][1]}% of approved projects — your signature color palette.`,
      confidence: topPalettes[0][1],
      source: 'rule',
      createdAt: now,
    })
  }

  const topLighting = topAffinityEntries(graph.visualAffinity.lighting, 1)
  if (topLighting[0] && topLighting[0][1] >= 25) {
    insights.push({
      id: insightId('visual', idx++),
      category: 'visual',
      text: `${topLighting[0][0]} lighting ${topLighting[0][1]}% — lean into this for visual consistency.`,
      confidence: topLighting[0][1],
      source: 'rule',
      createdAt: now,
    })
  }

  const topVoice = topAffinityEntries(graph.voiceAffinity.narratorTones, 1)
  if (topVoice[0] && topVoice[0][1] >= 25) {
    insights.push({
      id: insightId('voice', idx++),
      category: 'voice',
      text: `${topVoice[0][0]} narrator tone ${topVoice[0][1]}% — matches your audience expectation.`,
      confidence: topVoice[0][1],
      source: 'rule',
      createdAt: now,
    })
  }

  const topMotion = topAffinityEntries(graph.motionAffinity.motionStyles, 1)
  if (topMotion[0] && topMotion[0][1] >= 25) {
    insights.push({
      id: insightId('motion', idx++),
      category: 'motion',
      text: `${topMotion[0][0]} motion ${topMotion[0][1]}% — your default kinetic language.`,
      confidence: topMotion[0][1],
      source: 'rule',
      createdAt: now,
    })
  }

  const pa = graph.producerAffinity
  if (pa.reportCount > 0) {
    if (pa.avgRetentionScore >= 70) {
      insights.push({
        id: insightId('producer', idx++),
        category: 'producer',
        text: `Retention scores average ${pa.avgRetentionScore}/100 — your hooks hold attention.`,
        confidence: pa.avgRetentionScore,
        source: 'aggregate',
        createdAt: now,
      })
    }
    if (pa.productionReadyRate >= 50) {
      insights.push({
        id: insightId('producer', idx++),
        category: 'producer',
        text: `${pa.productionReadyRate}% of producer reviews marked production-ready.`,
        confidence: pa.productionReadyRate,
        source: 'aggregate',
        createdAt: now,
      })
    }
    if (pa.topStrengths[0]) {
      insights.push({
        id: insightId('producer', idx++),
        category: 'producer',
        text: `Producer strength: "${pa.topStrengths[0]}" — double down on this.`,
        confidence: 75,
        source: 'aggregate',
        createdAt: now,
      })
    }
  }

  if (graph.audienceAffinity.niche) {
    insights.push({
      id: insightId('audience', idx++),
      category: 'audience',
      text: `Niche: ${graph.audienceAffinity.niche}${graph.audienceAffinity.platform ? ` on ${graph.audienceAffinity.platform}` : ''}.`,
      confidence: 80,
      source: 'rule',
      createdAt: now,
    })
  }

  if (graph.creatorProfile.identityLabel) {
    insights.push({
      id: insightId('identity', idx++),
      category: 'identity',
      text: `Creator identity: ${graph.creatorProfile.identityLabel} (${graph.creatorProfile.directorApprovedCount} director-approved projects).`,
      confidence: Math.min(90, 40 + graph.creatorProfile.memoryDepth / 2),
      source: 'rule',
      createdAt: now,
    })
  }

  if (topFrameworks[0] && graph.creatorProfile.preferredMood) {
    insights.push({
      id: insightId('recommendation', idx++),
      category: 'recommendation',
      text: `Recommended direction: ${topFrameworks[0].label} with ${graph.creatorProfile.preferredMood} mood — highest affinity match.`,
      confidence: Math.min(88, topFrameworks[0].pct + 10),
      source: 'rule',
      createdAt: now,
    })
  } else if (topFrameworks[0]) {
    insights.push({
      id: insightId('recommendation', idx++),
      category: 'recommendation',
      text: `Recommended direction: start with ${topFrameworks[0].label} framework for your next project.`,
      confidence: topFrameworks[0].pct,
      source: 'rule',
      createdAt: now,
    })
  }

  return insights.slice(0, 12)
}
