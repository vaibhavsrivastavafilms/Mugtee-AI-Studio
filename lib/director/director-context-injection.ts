import { STORY_FRAMEWORKS, formatFrameworkForPrompt } from '@/lib/ai/prompts/director/story-frameworks'
import type { DirectorStudioContext } from '@/lib/director/types'
import { formatDirectorCreatorMemoryForPrompt } from '@/lib/director/memory/memory-prompt-injection'
import type { CreatorMemoryProfile } from '@/lib/director/memory/types'
import type { ProducerReport } from '@/lib/director/producer/types'
import { formatIntelligenceGraphForPrompt } from '@/lib/intelligence/graph-prompt-injection'
import type { CreatorIntelligenceGraphData, Insight } from '@/lib/intelligence/types'
import { formatVirloMarketForPrompt } from '@/lib/virlo/virlo-prompt-injection'
import type { VirloMarketIntelligence } from '@/lib/virlo/types'

export { formatDirectorCreatorMemoryForPrompt }
export { formatIntelligenceGraphForPrompt }

/** Format approved producer review summary for generation context. */
export function formatProducerReportForPrompt(
  report: ProducerReport | null | undefined,
  producerApproved?: boolean
): string {
  if (!report || !producerApproved) return ''

  const { scores, recommendations, storyReadinessScore, readinessLabel } = report
  const acceptedStrengths = recommendations.strengths.slice(0, 3).map((s) => s.text)
  const topSuggestions = recommendations.suggestions.slice(0, 2).map((s) => s.text)

  return [
    'AI PRODUCER REVIEW (approved — honor in generation):',
    `Readiness: ${readinessLabel} (${storyReadinessScore}/100)`,
    `Scores — Story: ${scores.storyStrength}, Audience: ${scores.audienceFit}, Emotion: ${scores.emotionalImpact}, Retention: ${scores.retention}, Cinematic: ${scores.cinematicQuality}`,
    acceptedStrengths.length ? `Locked strengths: ${acceptedStrengths.join(' | ')}` : '',
    topSuggestions.length ? `Producer guidance: ${topSuggestions.join(' | ')}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

/** Build producer summary string for DirectorStudioContext. */
export function buildProducerSummary(
  report: ProducerReport | null | undefined,
  producerApproved?: boolean
): string | null {
  const formatted = formatProducerReportForPrompt(report, producerApproved)
  return formatted || null
}

export type DirectorPromptIntelligence = {
  graphData: CreatorIntelligenceGraphData
  insights: Insight[]
  virloMarket?: VirloMarketIntelligence | null
}

/** Format director studio snapshot for LLM context injection. */
export function formatDirectorStudioForPrompt(
  ctx: DirectorStudioContext | null | undefined,
  intelligence?: DirectorPromptIntelligence | null
): string {
  if (!ctx) return ''
  const sections: string[] = []

  if (intelligence) {
    const intelSection = formatIntelligenceGraphForPrompt(
      intelligence.graphData,
      intelligence.insights
    )
    if (intelSection) sections.push(intelSection)

    const virloSection = formatVirloMarketForPrompt(intelligence.virloMarket)
    if (virloSection) sections.push(virloSection)
  }

  if (ctx.producerApproved && ctx.producerSummary) {
    sections.push(ctx.producerSummary)
  }

  if (ctx.activeStoryDirection) {
    const d = ctx.activeStoryDirection
    sections.push(
      [
        'DIRECTOR STORY DIRECTION (locked):',
        `Title: ${d.title}`,
        `Logline: ${d.logline}`,
        `Hook: ${d.hook}`,
        `Emotional promise: ${d.emotionalPromise}`,
      ].join('\n')
    )
  }

  if (ctx.activeFramework) {
    const f = ctx.activeFramework
    const fw = STORY_FRAMEWORKS[f.framework]
    sections.push(
      [
        'STORY FRAMEWORK (locked):',
        `Framework: ${fw?.label ?? f.frameworkName}`,
        `Core emotion: ${f.coreEmotion}`,
        `Audience desire: ${f.audienceDesire}`,
        `Narrative tension: ${f.narrativeTension}`,
        `Curiosity gap: ${f.curiosityGap}`,
        `Transformation: ${f.transformation}`,
        `Confidence: ${f.confidenceScore}%`,
        formatFrameworkForPrompt(f.framework),
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.frameworkAnalysis) {
    const a = ctx.frameworkAnalysis
    sections.push(
      [
        'FRAMEWORK NARRATIVE SCAFFOLD:',
        `Act 1: ${a.act1}`,
        `Act 2: ${a.act2}`,
        `Conflict: ${a.conflict}`,
        `Escalation: ${a.escalation}`,
        `Pattern interrupt: ${a.patternInterrupt}`,
        `Act 3: ${a.act3}`,
        `Breakthrough: ${a.breakthrough}`,
        `Resolution: ${a.resolution}`,
        `Lesson: ${a.lesson}`,
        a.sceneBeats.length
          ? `Scene beats: ${a.sceneBeats.map((b) => `${b.index}. ${b.beat}`).join(' | ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.directorTreatment) {
    const t = ctx.directorTreatment
    sections.push(
      [
        'DIRECTOR TREATMENT (locked):',
        `Genre: ${t.genre}`,
        `Mood: ${t.mood}`,
        `Arc: ${t.emotionalArc}`,
        `Visual: ${t.visualStyle}`,
        `Camera: ${t.cameraLanguage}`,
        `Lighting: ${t.lightingStyle}`,
        `Palette: ${t.colorPalette}`,
        `Music direction: ${t.musicDirection}`,
        t.referenceFilms.length ? `References: ${t.referenceFilms.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.storyDirectorPackage) {
    const pkg = ctx.storyDirectorPackage
    const topHook = [...pkg.cinematicHookOptions].sort((a, b) => a.rank - b.rank)[0]?.hook
    sections.push(
      [
        'AI STORY DIRECTOR PACKAGE (locked):',
        `Framework: ${pkg.frameworkLabel}`,
        pkg.storyAnalysis ? `Analysis: ${pkg.storyAnalysis.slice(0, 1200)}` : '',
        topHook ? `Primary hook: ${topHook}` : '',
        pkg.fullCinematicScript
          ? `Script excerpt: ${pkg.fullCinematicScript.slice(0, 1500)}`
          : '',
        pkg.scenes.length
          ? `Scenes (${pkg.scenes.length}): ${pkg.scenes
              .slice(0, 8)
              .map((s) => `${s.index}. ${s.title}`)
              .join(' | ')}`
          : '',
        pkg.viralityAnalysis.retentionBeats.length
          ? `Retention beats: ${pkg.viralityAnalysis.retentionBeats.slice(0, 5).join('; ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.blueprint?.hook || ctx.blueprint?.script) {
    const b = ctx.blueprint
    sections.push(
      [
        'DIRECTOR BLUEPRINT (approved):',
        b.title ? `Title: ${b.title}` : '',
        b.hook ? `Hook: ${b.hook}` : '',
        b.summary ? `Summary: ${b.summary}` : '',
        b.script ? `Script excerpt: ${b.script.slice(0, 2000)}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    )
  }

  if (ctx.characterBible?.protagonist) {
    const p = ctx.characterBible.protagonist
    sections.push(
      `CHARACTER BIBLE: ${p.name} — ${p.appearance}. Wardrobe: ${p.wardrobe}. Arc: ${p.arc}`
    )
  }

  if (ctx.cameraLanguage?.scenes?.length) {
    const lines = ctx.cameraLanguage.scenes
      .slice(0, 12)
      .map(
        (s) =>
          `Scene ${s.sceneIndex}: ${s.shotType}, ${s.lens}, ${s.movement} — ${s.notes}`
      )
    sections.push(`CINEMATOGRAPHY PLAN:\n${lines.join('\n')}`)
  }

  if (ctx.storyboardPlan?.scenes?.length) {
    const lines = ctx.storyboardPlan.scenes
      .slice(0, 12)
      .map((s) => `Scene ${s.sceneIndex}: ${s.visualPrompt} | ${s.cameraSetup}`)
    sections.push(`STORYBOARD PLAN:\n${lines.join('\n')}`)
  }

  if (ctx.voiceProfile?.narratorTone) {
    sections.push(
      `VOICE DIRECTION: ${ctx.voiceProfile.narratorTone}, pacing ${ctx.voiceProfile.pacing}`
    )
  }

  if (ctx.musicDirection?.genre) {
    sections.push(
      `MUSIC DIRECTION: ${ctx.musicDirection.genre}, ${ctx.musicDirection.tempo}, ${ctx.musicDirection.emotionalCurve}`
    )
  }

  if (ctx.motionPlan?.scenes?.length) {
    const lines = ctx.motionPlan.scenes
      .slice(0, 12)
      .map((s) => `Scene ${s.sceneIndex}: ${s.motionStyle} (${s.durationSec}s)`)
    sections.push(`MOTION PLAN:\n${lines.join('\n')}`)
  }

  return sections.filter(Boolean).join('\n\n')
}
