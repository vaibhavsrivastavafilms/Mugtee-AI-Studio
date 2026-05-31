import type { SectionId, SectionStatusMap } from '@/lib/cinematic/section-generation-status'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'

export type MissionStepState = 'completed' | 'in_progress' | 'pending'

export type MissionStep = {
  id: string
  label: string
  section: SectionId | null
  generationSteps: QuickCutGenerationStep[]
}

export const MISSION_STEPS: MissionStep[] = [
  {
    id: 'analyze',
    label: 'Analyze Audience',
    section: null,
    generationSteps: ['analyzing'],
  },
  {
    id: 'angle',
    label: 'Discover Story Angle',
    section: 'contentDirectorBrief',
    generationSteps: ['title', 'analyzing'],
  },
  {
    id: 'hook',
    label: 'Craft Hook',
    section: 'hook',
    generationSteps: ['hook'],
  },
  {
    id: 'script',
    label: 'Write Script',
    section: 'script',
    generationSteps: ['script'],
  },
  {
    id: 'scenes',
    label: 'Build Scenes',
    section: 'visualDirection',
    generationSteps: ['scenes'],
  },
  {
    id: 'visuals',
    label: 'Generate Visuals',
    section: 'storyboard',
    generationSteps: ['images', 'motion'],
  },
  {
    id: 'voice',
    label: 'Create Voice',
    section: 'voice',
    generationSteps: ['voice'],
  },
  {
    id: 'render',
    label: 'Render Reel',
    section: null,
    generationSteps: ['render'],
  },
  {
    id: 'export',
    label: 'Export Creator Pack',
    section: 'export',
    generationSteps: ['render', 'complete'],
  },
]

function sectionState(
  section: SectionId | null,
  sectionStatus: SectionStatusMap
): MissionStepState | null {
  if (!section) return null
  const status = sectionStatus[section]
  if (status === 'completed') return 'completed'
  if (status === 'generating') return 'in_progress'
  if (status === 'failed') return 'in_progress'
  return 'pending'
}

export function resolveMissionStepState(
  step: MissionStep,
  sectionStatus: SectionStatusMap,
  generationStep: QuickCutGenerationStep
): MissionStepState {
  const fromSection = step.section ? sectionState(step.section, sectionStatus) : null
  if (fromSection === 'completed') return 'completed'
  if (fromSection === 'in_progress') return 'in_progress'

  const stepIndex = MISSION_STEPS.findIndex((s) => s.id === step.id)
  const activeIndex = MISSION_STEPS.findIndex((s) =>
    s.generationSteps.includes(generationStep)
  )

  if (generationStep === 'complete') return 'completed'

  if (step.generationSteps.includes(generationStep)) return 'in_progress'

  if (activeIndex >= 0 && stepIndex < activeIndex) {
    const laterSections = MISSION_STEPS.slice(stepIndex + 1, activeIndex + 1)
    const anyLaterDone = laterSections.some(
      (s) => s.section && sectionStatus[s.section] === 'completed'
    )
    if (anyLaterDone || stepIndex < activeIndex) return 'completed'
  }

  if (activeIndex >= 0 && stepIndex > activeIndex) return 'pending'

  return 'pending'
}

export function missionCompletionPercent(
  sectionStatus: SectionStatusMap,
  generationStep: QuickCutGenerationStep
): number {
  const completed = MISSION_STEPS.filter(
    (s) => resolveMissionStepState(s, sectionStatus, generationStep) === 'completed'
  ).length
  const inProgress = MISSION_STEPS.some(
    (s) => resolveMissionStepState(s, sectionStatus, generationStep) === 'in_progress'
  )
  const base = (completed / MISSION_STEPS.length) * 100
  return Math.min(100, Math.round(base + (inProgress ? 100 / MISSION_STEPS.length / 2 : 0)))
}
