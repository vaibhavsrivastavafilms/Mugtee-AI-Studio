import {
  STORY_FRAMEWORKS,
  formatFrameworkForPrompt,
  type StoryFrameworkId,
} from '@/lib/ai/prompts/director/story-frameworks'
import type { FrameworkAnalysis } from '@/lib/director/framework-types'
import type { DirectorBlueprint, DirectorTreatment, StoryDirectionOption } from '@/lib/director/types'
import { EMPTY_DIRECTOR_BLUEPRINT } from '@/lib/director/types'

export function buildFrameworkAnalysis(
  frameworkId: StoryFrameworkId,
  storyDirection?: StoryDirectionOption | null,
  idea?: string
): FrameworkAnalysis {
  const fw = STORY_FRAMEWORKS[frameworkId]
  const [act1, act2, act3] = fw.structure
  const hook = storyDirection?.hook || fw.hookPattern
  const topic = storyDirection?.title || idea || 'Untitled'

  const sceneBeats = fw.structure.flatMap((act, actIdx) =>
    act.beats.map((beat, beatIdx) => ({
      index: actIdx * 3 + beatIdx + 1,
      beat: `${act.name}: ${beat}`,
      durationSec: actIdx === 0 ? 8 : actIdx === 1 ? 12 : 10,
    }))
  )

  return {
    act1: act1 ? `${act1.purpose}\n${act1.beats.join(' → ')}` : '',
    act2: act2 ? `${act2.purpose}\n${act2.beats.join(' → ')}` : '',
    act3: act3 ? `${act3.purpose}\n${act3.beats.join(' → ')}` : '',
    conflict: act1?.beats[1] || fw.tagline,
    escalation: act2?.beats.join(' · ') || fw.emotionalArc,
    patternInterrupt: act2?.beats[2] || 'Mid-story reveal that reframes stakes',
    breakthrough: act3?.beats[0] || fw.hookPattern,
    resolution: act3?.beats[1] || 'Earned payoff tied to audience desire',
    lesson: act3?.beats[2] || `Takeaway under ${fw.label}`,
    sceneBeats,
  }
}

export function blueprintFromFramework(input: {
  frameworkId: StoryFrameworkId
  analysis: FrameworkAnalysis
  storyDirection?: StoryDirectionOption | null
  treatment?: DirectorTreatment | null
  prev?: DirectorBlueprint | null
}): DirectorBlueprint {
  const fw = STORY_FRAMEWORKS[input.frameworkId]
  const direction = input.storyDirection
  const treatment = input.treatment
  const prev = input.prev ?? { ...EMPTY_DIRECTOR_BLUEPRINT }
  const a = input.analysis

  const title = direction?.title || prev.title || fw.label
  const hook = direction?.hook || fw.hookPattern

  const summary = [
    direction?.logline,
    `Framework: ${fw.label} — ${fw.tagline}`,
    `Arc: ${fw.emotionalArc}`,
  ]
    .filter(Boolean)
    .join('\n')

  const scriptSections = [
    `HOOK: ${hook}`,
    '',
    `ACT 1 — ${fw.structure[0]?.name || 'Setup'}`,
    a.act1,
    '',
    `ACT 2 — ${fw.structure[1]?.name || 'Confrontation'}`,
    a.act2,
    `Conflict: ${a.conflict}`,
    `Escalation: ${a.escalation}`,
    `Pattern interrupt: ${a.patternInterrupt}`,
    '',
    `ACT 3 — ${fw.structure[2]?.name || 'Resolution'}`,
    a.act3,
    `Breakthrough: ${a.breakthrough}`,
    `Resolution: ${a.resolution}`,
    `Lesson: ${a.lesson}`,
    '',
    treatment?.visualStyle ? `VISUAL: ${treatment.visualStyle}` : '',
    treatment?.cameraLanguage ? `CAMERA: ${treatment.cameraLanguage}` : '',
    '',
    '--- FRAMEWORK CONSTRAINTS ---',
    formatFrameworkForPrompt(input.frameworkId),
  ]
    .filter(Boolean)
    .join('\n')

  return {
    title,
    hook,
    summary: summary || prev.summary,
    script: scriptSections || prev.script,
    sceneBeats: a.sceneBeats.length ? a.sceneBeats : prev.sceneBeats,
    locked: prev.locked,
    approved: prev.approved,
  }
}
