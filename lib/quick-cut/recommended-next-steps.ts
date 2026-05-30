import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import {
  hasExportableScript,
  resolvePublishReadiness,
  type PublishReadinessInput,
} from '@/lib/quick-cut/asset-availability'
import type { DeepResearchReport } from '@/types/deep-research'

export type RecommendedNextStepActionType = 'navigate-tab' | 'scroll-section'

export type RecommendedNextStep = {
  id: string
  title: string
  explanation: string
  actionType: RecommendedNextStepActionType
  tabTarget?: QuickCutStageTab
  scrollTarget?: string
  /** Higher = shown first when trimming to max 3. */
  impact: number
}

export type RecommendedNextStepsInput = PublishReadinessInput & {
  researchReport?: DeepResearchReport | null
  researchDocument?: string | null
  isComplete?: boolean
  savedProjectId?: string | null
}

function hasDeepResearch(input: RecommendedNextStepsInput): boolean {
  if (input.researchReport?.topic?.trim()) return true
  return Boolean(input.researchDocument?.trim())
}

function hasSeriesResearch(report: DeepResearchReport | null | undefined): boolean {
  if (!report?.topic?.trim()) return false
  const angles = report.finalSummary?.top10Angles?.length ?? 0
  const hooks = report.hookAngles?.length ?? 0
  const storyboardIdeas = report.storyboardIdeas?.length ?? 0
  return angles >= 3 || hooks >= 5 || storyboardIdeas >= 5
}

function hasWorkspaceContext(input: RecommendedNextStepsInput): boolean {
  if (input.isComplete) return true
  if (input.savedProjectId?.trim()) return true
  return (
    hasExportableScript(input) ||
    input.scenes.length > 0 ||
    Boolean(input.voiceUrl?.trim()) ||
    Boolean(input.videoUrl?.trim())
  )
}

/** Rule-based workspace recommendations — max 3, ordered by impact. No AI / auto-execution. */
export function resolveRecommendedNextSteps(
  input: RecommendedNextStepsInput
): RecommendedNextStep[] {
  if (input.isGenerating && !input.isComplete) return []
  if (!hasWorkspaceContext(input)) return []

  const readiness = resolvePublishReadiness(input)
  const { project, exports } = readiness
  const scriptGenerated = project.scriptGenerated
  const candidates: RecommendedNextStep[] = []

  if (scriptGenerated && !project.sceneImagesGenerated) {
    candidates.push({
      id: 'storyboard-images',
      title: 'Generate Storyboard Images',
      explanation: 'Cinematic stills unlock exports, thumbnails, and MP4 compile.',
      actionType: 'navigate-tab',
      tabTarget: 'visuals',
      impact: 100,
    })
  }

  if (scriptGenerated && project.sceneImagesGenerated && !project.voiceGenerated) {
    candidates.push({
      id: 'voice',
      title: 'Generate Voice',
      explanation: 'Add narration so you can compile the final MP4 reel.',
      actionType: 'navigate-tab',
      tabTarget: 'voice',
      impact: 95,
    })
  }

  if (
    !project.videoRendered &&
    exports.mp4 &&
    !input.isRenderingVideo &&
    !input.renderPollUrl?.trim()
  ) {
    candidates.push({
      id: 'compile-mp4',
      title: 'Compile MP4',
      explanation: 'Your storyboard and voice are ready — compile the synced reel.',
      actionType: 'scroll-section',
      tabTarget: 'complete',
      scrollTarget: 'mp4-export',
      impact: 90,
    })
  }

  if (exports.creatorPack && input.isComplete) {
    candidates.push({
      id: 'creator-pack',
      title: 'Export Creator Pack',
      explanation: 'Bundle script, storyboard, images, and narration into one ZIP.',
      actionType: 'scroll-section',
      tabTarget: 'complete',
      scrollTarget: 'creator-pack',
      impact: 85,
    })
  }

  if (scriptGenerated && !readiness.projectReadyForPublishing && input.isComplete) {
    candidates.push({
      id: 'publish-review',
      title: 'Review Publish Center',
      explanation: 'See what is still missing before YouTube, Instagram, and TikTok.',
      actionType: 'navigate-tab',
      tabTarget: 'publish',
      impact: 80,
    })
  }

  if (scriptGenerated && !hasDeepResearch(input)) {
    candidates.push({
      id: 'repurpose',
      title: 'Repurpose Content',
      explanation: 'Run deep research for hooks, angles, and platform-ready variants.',
      actionType: 'scroll-section',
      tabTarget: 'script',
      scrollTarget: 'deep-research',
      impact: 65,
    })
  }

  if (scriptGenerated && hasDeepResearch(input) && !hasSeriesResearch(input.researchReport)) {
    candidates.push({
      id: 'content-series',
      title: 'Generate Content Series',
      explanation: 'Expand research into episodic hooks and storyboard ideas for a series.',
      actionType: 'scroll-section',
      tabTarget: 'script',
      scrollTarget: 'deep-research',
      impact: 60,
    })
  }

  const seen = new Set<string>()
  return candidates
    .sort((a, b) => b.impact - a.impact)
    .filter((step) => {
      if (seen.has(step.id)) return false
      seen.add(step.id)
      return true
    })
    .slice(0, 3)
}

/** Build input snapshot from Quick Cut generation store fields. */
export function recommendedNextStepsFromStore(state: {
  title: string
  hook: string
  script: string
  scriptBeats?: { narration: string }[]
  scenes: GeneratedScene[]
  voiceUrl: string | null
  videoUrl: string | null
  videoRenderEnabled: boolean
  isGenerating: boolean
  isComplete: boolean
  exportExpired?: boolean
  isRenderingVideo?: boolean
  renderPollUrl?: string | null
  renderError?: string | null
  researchReport?: DeepResearchReport | null
  researchDocument?: string | null
  savedProjectId?: string | null
}): RecommendedNextStep[] {
  return resolveRecommendedNextSteps({
    title: state.title,
    hook: state.hook,
    script: state.script,
    scriptBeats: state.scriptBeats,
    scenes: state.scenes,
    voiceUrl: state.voiceUrl,
    videoUrl: state.videoUrl,
    videoRenderEnabled: state.videoRenderEnabled,
    isGenerating: state.isGenerating,
    isComplete: state.isComplete,
    exportExpired: state.exportExpired,
    isRenderingVideo: state.isRenderingVideo,
    renderPollUrl: state.renderPollUrl,
    renderError: state.renderError,
    researchReport: state.researchReport,
    researchDocument: state.researchDocument,
    savedProjectId: state.savedProjectId,
  })
}
