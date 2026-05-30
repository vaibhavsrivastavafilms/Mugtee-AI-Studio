'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  recommendedNextStepsFromStore,
  type RecommendedNextStep,
} from '@/lib/quick-cut/recommended-next-steps'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

function scrollToRecommendTarget(target: string) {
  window.setTimeout(() => {
    const el = document.querySelector(`[data-recommend-target="${target}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 120)
}

function triggerRecommendTarget(target: string) {
  window.setTimeout(() => {
    const el = document.querySelector(
      `[data-recommend-target="${target}"]`
    ) as HTMLButtonElement | null
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el?.click()
  }, 120)
}

function RecommendationCard({
  step,
  onAction,
}: {
  step: RecommendedNextStep
  onAction: (step: RecommendedNextStep) => void
}) {
  return (
    <div className="rounded-xl border border-gold-500/20 bg-black/35 p-3.5 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium text-[#F4E7C1]">{step.title}</p>
        <p className="text-[11px] text-luxe/55 leading-relaxed">{step.explanation}</p>
      </div>
      <button
        type="button"
        onClick={() => onAction(step)}
        className={cn(
          'inline-flex shrink-0 items-center justify-center gap-1.5',
          'min-h-[36px] px-3 py-1.5 rounded-lg',
          'text-[10px] font-semibold tracking-[0.12em] uppercase',
          'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90 transition-opacity'
        )}
      >
        Go
        <ArrowRight className="w-3 h-3" aria-hidden />
      </button>
    </div>
  )
}

export function RecommendedNextSteps({ className }: { className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const repurposedAssets = useQuickCutGenerationStore((s) => s.repurposedAssets)
  const contentSeries = useQuickCutGenerationStore((s) => s.contentSeries)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)

  const steps = recommendedNextStepsFromStore({
    title,
    hook,
    script,
    scriptBeats,
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    isGenerating,
    isComplete,
    exportExpired,
    isRenderingVideo,
    renderPollUrl,
    renderError,
    repurposedAssets,
    contentSeries,
    savedProjectId,
  })

  const handleAction = (step: RecommendedNextStep) => {
    if (step.tabTarget) {
      setActiveStageTab(step.tabTarget, true)
    }
    if (step.actionType === 'trigger-element' && step.scrollTarget) {
      triggerRecommendTarget(step.scrollTarget)
      return
    }
    if (step.scrollTarget) {
      scrollToRecommendTarget(step.scrollTarget)
    }
  }

  if (steps.length === 0) return null

  return (
    <section
      className={cn('rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3', className)}
      aria-label="Recommended next steps"
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <Sparkles className="w-3 h-3" aria-hidden />
        Recommended Next Steps
      </div>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <RecommendationCard step={step} onAction={handleAction} />
          </li>
        ))}
      </ul>
    </section>
  )
}
