'use client'

import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Monitor,
  Timer,
} from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { LiveScriptReveal } from '@/components/quick-cut/live-script-reveal'
import { PreviewExportTabbedPanel } from '@/components/quick-cut/preview-export-tabbed-panel'
import { displayHookText } from '@/lib/cinematic/hook-format'
import { relSavedLabel } from '@/stores/cinematic-project'
import { sumSceneDurationSec } from '@/lib/cinematic/scene-duration'
import { formatPlaybackTime } from '@/lib/media/format-playback-time'
import { resolveMp4ExportUiState } from '@/lib/quick-cut/mp4-export-readiness.client'
import { cn } from '@/lib/utils'
import { CelebrationState } from '@/components/companion/celebration-state'
import { FirstSuccessCelebration } from '@/components/onboarding/first-success-celebration'
import { hasCompletedFirstGeneration } from '@/lib/onboarding/onboarding-state'
import { companionCopy } from '@/lib/companion/microcopy'
import { useCompanionStore } from '@/stores/companion-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { NarrativeStructureLabel } from '@/components/quick-cut/narrative-structure-label'
import { ContentAngleLabel } from '@/components/quick-cut/content-angle-label'
import { OutputQualityBadges } from '@/components/proof/output-quality-badges'
import { OutputRatingCard } from '@/components/feedback/output-rating-card'

const REEL_RESOLUTION_LABEL = '1080×1920'

export function GenerationResultsSection({
  audioRef,
  className,
}: {
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
}) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const displayHook = displayHookText(hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const setProjectId = useCompanionStore((s) => s.setProjectId)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const scriptArchetypeLabel = useQuickCutGenerationStore((s) => s.scriptArchetypeLabel)
  const narrativeArchetypeLabel = useQuickCutGenerationStore((s) => s.narrativeArchetypeLabel)
  const narrativeFlowDisplay = useQuickCutGenerationStore((s) => s.narrativeFlowDisplay)
  const contentAngleLabel = useQuickCutGenerationStore((s) => s.contentAngleLabel)
  const hookFrameworkLabel = useQuickCutGenerationStore((s) => s.hookFrameworkLabel)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)

  useEffect(() => {
    if (savedProjectId) setProjectId(savedProjectId)
  }, [savedProjectId, setProjectId])

  const returningCreatorRef = useRef(hasCompletedFirstGeneration())
  const [scriptOpen, setScriptOpen] = useState(false)

  const mp4Export = resolveMp4ExportUiState({
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    exportExpired,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
  })
  const { exportReadyBadge } = mp4Export

  const durationLabel = useMemo(() => {
    const sceneTotal = scenes.length > 0 ? sumSceneDurationSec(scenes) : 0
    const seconds = sceneTotal > 0 ? sceneTotal : duration
    return formatPlaybackTime(seconds)
  }, [scenes, duration])

  const createdLabel = useMemo(() => {
    if (lastSavedAt) {
      const relative = relSavedLabel(lastSavedAt)
      if (relative) return relative.replace(/^Synced /, '')
    }
    return 'Just now'
  }, [lastSavedAt])

  const hasScriptContent = Boolean(script?.trim() || scriptBeats.length || hook?.trim())
  const captionReady = Boolean(cta?.trim() || script?.trim())
  const outputQuality = {
    hookGenerated: Boolean(hook?.trim()),
    storyboardReady: scenes.length > 0,
    captionReady,
    exportReady: exportReadyBadge,
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-gold-500/20 bg-black/35 p-4 sm:p-5 space-y-5 min-w-0',
        className
      )}
      aria-label="Generation results"
    >
      <FirstSuccessCelebration className="w-full" />
      {returningCreatorRef.current ? (
        <CelebrationState title={title} className="w-full" />
      ) : null}

      <OutputQualityBadges state={outputQuality} />

      <div className="flex flex-col items-center text-center gap-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-[10px] tracking-[0.22em] uppercase text-emerald-200/90">
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden />
          {companionCopy('exportReady')}
        </div>
        {title ? (
          <p className="font-display text-lg text-[#F4E7C1] italic leading-snug line-clamp-2">
            {title}
          </p>
        ) : null}
      </div>

      <PreviewExportTabbedPanel
        audioRef={audioRef}
        preferredSubTab="preview"
        projectId={savedProjectId ?? undefined}
      />

      {hasScriptContent ? (
        <Collapsible open={scriptOpen} onOpenChange={setScriptOpen}>
          <CollapsibleTrigger
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/30 px-4 py-3 text-left hover:border-gold-500/25 transition-colors"
          >
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
              <FileText className="w-3 h-3" aria-hidden />
              Script
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 text-luxe/45 shrink-0 transition-transform',
                scriptOpen && 'rotate-180'
              )}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-2">
            <NarrativeStructureLabel
              archetypeLabel={narrativeArchetypeLabel ?? scriptArchetypeLabel}
              narrativeFlowDisplay={narrativeFlowDisplay}
            />
            <ContentAngleLabel
              angleLabel={contentAngleLabel}
              hookFrameworkLabel={hookFrameworkLabel}
            />
            <LiveScriptReveal
              script={script}
              hook={displayHook}
              scriptBeats={scriptBeats}
              payoff={payoff}
              cta={cta}
              className="max-h-[min(320px,40vh)] overflow-y-auto scrollbar-luxe"
            />
          </CollapsibleContent>
        </Collapsible>
      ) : null}

      {isComplete ? (
        <OutputRatingCard projectId={savedProjectId} className="w-full" />
      ) : null}

      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5">
          <dt className="inline-flex items-center gap-1 text-[9px] tracking-[0.18em] uppercase text-gold-300/60 mb-1">
            <Timer className="w-3 h-3" aria-hidden />
            Duration
          </dt>
          <dd className="text-sm text-luxe/90 tabular-nums">{durationLabel}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5">
          <dt className="inline-flex items-center gap-1 text-[9px] tracking-[0.18em] uppercase text-gold-300/60 mb-1">
            <Monitor className="w-3 h-3" aria-hidden />
            Resolution
          </dt>
          <dd className="text-sm text-luxe/90 tabular-nums">{REEL_RESOLUTION_LABEL}</dd>
        </div>
        <div className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5">
          <dt className="inline-flex items-center gap-1 text-[9px] tracking-[0.18em] uppercase text-gold-300/60 mb-1">
            <Clock className="w-3 h-3" aria-hidden />
            Created
          </dt>
          <dd className="text-sm text-luxe/90">{createdLabel}</dd>
        </div>
      </dl>
    </section>
  )
}
