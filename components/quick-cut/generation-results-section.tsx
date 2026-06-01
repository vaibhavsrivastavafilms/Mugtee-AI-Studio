'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileText,
  Loader2,
  Mic,
  Monitor,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { ReelComposer } from '@/components/reel-composer/ReelComposer'
import { QuickCutViewScriptButton } from '@/components/quick-cut/view-script-button'
import { LiveScriptReveal } from '@/components/quick-cut/live-script-reveal'
import { relSavedLabel } from '@/stores/cinematic-project'
import { sumSceneDurationSec } from '@/lib/cinematic/scene-duration'
import { formatPlaybackTime } from '@/lib/media/format-playback-time'
import { downloadMp3File } from '@/lib/quick-cut/download-audio'
import { resolveMp4Download } from '@/lib/quick-cut/resolve-mp4-download.client'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { buildQuickCutScriptText } from '@/lib/quick-cut/download-script'
import {
  ASSET_UNAVAILABLE_MSG,
  EXPORT_EXPIRED_MSG,
  resolveQuickCutExportAssets,
} from '@/lib/quick-cut/asset-availability'
import { resolveMp4ExportUiState } from '@/lib/quick-cut/mp4-export-readiness.client'
import { trackClientUsage } from '@/lib/usage/plan-limit-toast.client'
import { useUsage } from '@/lib/usage'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { cn } from '@/lib/utils'
import { ProactiveSuggestions } from '@/components/sidekick/proactive-suggestions'
import { CelebrationState } from '@/components/companion/celebration-state'
import { FirstSuccessCelebration } from '@/components/onboarding/first-success-celebration'
import { hasCompletedFirstGeneration } from '@/lib/onboarding/onboarding-state'
import { ReflectionLoop } from '@/components/companion/reflection-loop'
import { StoryExpansionCard } from '@/components/companion/story-expansion-card'
import { EmotionalStoryCard } from '@/components/companion/emotional-story-card'
import { ContentQualityCard } from '@/components/quality/content-quality-card'
import { companionCopy } from '@/lib/companion/microcopy'
import { useCompanionStore } from '@/stores/companion-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { NarrativeStructureLabel } from '@/components/quick-cut/narrative-structure-label'
import { ContentAngleLabel } from '@/components/quick-cut/content-angle-label'
import { useReelDownloadReadiness } from '@/lib/export/reel-download-readiness.client'
import { useReelExportAutoResume } from '@/lib/export/use-reel-export-auto-resume.client'
import { OutputQualityBadges } from '@/components/proof/output-quality-badges'
import { OutputRatingCard } from '@/components/feedback/output-rating-card'
import { ExportSatisfactionCard } from '@/components/feedback/export-satisfaction-card'

const actionButtonClass =
  'inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation'

const primaryActionClass = cn(actionButtonClass, 'bg-gold-gradient text-black shadow-gold-glow hover:opacity-90')
const secondaryActionClass = cn(
  actionButtonClass,
  'border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 hover:bg-gold-500/10'
)

const REEL_RESOLUTION_LABEL = '1080×1920'

export function GenerationResultsSection({
  audioRef,
  className,
}: {
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
}) {
  const { isUnlimited } = useUsage()

  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scriptArchetypeLabel = useQuickCutGenerationStore((s) => s.scriptArchetypeLabel)
  const narrativeArchetypeLabel = useQuickCutGenerationStore((s) => s.narrativeArchetypeLabel)
  const narrativeFlowDisplay = useQuickCutGenerationStore((s) => s.narrativeFlowDisplay)
  const contentAngleLabel = useQuickCutGenerationStore((s) => s.contentAngleLabel)
  const hookFrameworkLabel = useQuickCutGenerationStore((s) => s.hookFrameworkLabel)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const setProjectId = useCompanionStore((s) => s.setProjectId)

  useEffect(() => {
    if (savedProjectId) setProjectId(savedProjectId)
  }, [savedProjectId, setProjectId])
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore((s) => s.assemblyPreviewAutoplay)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const updateReelTimelineClip = useQuickCutGenerationStore((s) => s.updateReelTimelineClip)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)

  const returningCreatorRef = useRef(hasCompletedFirstGeneration())

  const [downloadingMp4, setDownloadingMp4] = useState(false)
  const [downloadingMp3, setDownloadingMp3] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [scriptOpen, setScriptOpen] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)
  const [showExportFeedback, setShowExportFeedback] = useState(false)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)

  const exportBase = slugifyExportBase(title || 'mugtee-reel', 'mugtee-reel')
  const mp4Name = `${exportBase}.mp4`
  const mp3Name = `${exportBase}-narration.mp3`

  const exportAssets = resolveQuickCutExportAssets({
    title,
    hook,
    script,
    scriptBeats,
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    isGenerating,
  })
  const hasScript = exportAssets.script
  const hasNarration = exportAssets.narration
  const reelReadiness = useReelDownloadReadiness({
    projectId: savedProjectId,
    videoUrl,
    isRendering: isRenderingVideo,
    renderPollUrl,
    exportExpired,
  })
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
    downloadValidated: videoUrl?.trim()
      ? reelReadiness.ready || !savedProjectId
      : undefined,
    reelValidating: reelReadiness.validating,
    downloadingMp4,
  })
  const {
    canCompileMp4,
    mp4DownloadReady,
    mp4Compiling,
    exportReadyBadge,
    hasMp4Action: hasMp4,
    mp4ButtonEnabled,
  } = mp4Export

  useReelExportAutoResume({ canCompileMp4 })

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

  const scriptInput = useMemo(
    () => ({ title, hook, script, scriptBeats, payoff, cta, isUnlimited }),
    [title, hook, script, scriptBeats, payoff, cta, isUnlimited]
  )

  const guardExport = useCallback(async () => trackClientUsage('exports'), [])

  const handleDownloadMp4 = useCallback(async () => {
    if (downloadingMp4) return
    if (!videoUrl?.trim() && !canCompileMp4 && !savedProjectId) return
    if (!(await guardExport())) return
    trackEvent(AnalyticsEvents.EXPORT_STARTED, {
      projectId: savedProjectId,
      metadata: { asset: 'video_mp4' },
    })
    setAssetError(null)
    setDownloadingMp4(true)
    if (mp4Compiling || reelReadiness.validating) {
      toast.message('Preparing your video…')
    }
    try {
      if (videoUrl?.trim() || savedProjectId) {
        await resolveMp4Download({
          projectId: savedProjectId,
          videoUrl,
          filename: mp4Name,
          compileIfNeeded: canCompileMp4 && !videoUrl,
          onProgress: (label) => toast.message(label, { id: 'mp4-export-progress' }),
        })
        toast.success('Video ready for download.', { id: 'mp4-export-progress' })
        setShowExportFeedback(true)
      } else {
        await retryVideoRender()
        const url = useQuickCutGenerationStore.getState().videoUrl
        const err = useQuickCutGenerationStore.getState().renderError
        if (!url) throw new Error(err || 'Video compile failed')
        await resolveMp4Download({
          projectId: savedProjectId,
          videoUrl: url,
          filename: mp4Name,
        })
        toast.success('Video ready for download.')
        setShowExportFeedback(true)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      const expired = message === EXPORT_EXPIRED_MSG || message.includes('Export job expired')
      useQuickCutGenerationStore.setState({
        renderError: message,
        ...(expired ? { exportExpired: true, videoUrl: null } : {}),
      })
      setAssetError(message)
      toast.error('Download failed. Please try again.', { id: 'mp4-export-progress' })
    } finally {
      setDownloadingMp4(false)
    }
  }, [
    videoUrl,
    mp4Name,
    downloadingMp4,
    savedProjectId,
    canCompileMp4,
    retryVideoRender,
    guardExport,
    mp4Compiling,
    reelReadiness.validating,
  ])

  const handleDownloadMp3 = useCallback(async () => {
    if (!hasNarration || downloadingMp3) return
    if (!(await guardExport())) return
    trackEvent(AnalyticsEvents.EXPORT_STARTED, {
      projectId: savedProjectId,
      metadata: { asset: 'narration_mp3' },
    })
    setAssetError(null)
    setDownloadingMp3(true)
    try {
      await downloadMp3File(voiceUrl!, mp3Name)
      setShowExportFeedback(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      setAssetError(message)
    } finally {
      setDownloadingMp3(false)
    }
  }, [voiceUrl, mp3Name, downloadingMp3, hasNarration, savedProjectId, guardExport])

  const handleCopyScript = useCallback(async () => {
    if (!hasScript) return
    try {
      await navigator.clipboard.writeText(buildQuickCutScriptText(scriptInput))
      setCopiedScript(true)
      toast.success('Script copied')
      window.setTimeout(() => setCopiedScript(false), 2000)
    } catch {
      toast.error('Could not copy script')
    }
  }, [hasScript, scriptInput])

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

      <ReelComposer
        timeline={reelTimeline}
        audioRef={audioRef}
        className="mx-auto"
        showDirectorTracks
      />

      <ReelAssemblyPlayer
        scenes={scenes}
        title={title}
        hook={hook}
        script={script}
        videoUrl={videoUrl}
        voiceUrl={voiceUrl}
        audioRef={audioRef}
        isLive={false}
        generationStep="complete"
        mp4Compiling={mp4Compiling}
        autoPlayPreview={
          (Boolean(voiceUrl) && !videoUrl) || assemblyPreviewAutoplay
        }
        hideInlineActions
        className="mx-auto"
      />

      {assetError ? (
        <p className="text-[11px] text-amber-200/80 text-center" role="alert">
          {assetError}
        </p>
      ) : null}

      <ProactiveSuggestions
        hook={hook}
        script={script}
        title={title}
        hasScenes={scenes.length > 0}
        hasVoice={Boolean(voiceUrl?.trim())}
      />

      <EmotionalStoryCard hook={hook} script={script} scenes={scenes} duration={duration} />

      <ContentQualityCard />

      <StoryExpansionCard title={title} hook={hook} script={script} niche={niche} />

      <ReflectionLoop />

      <div className="flex flex-wrap items-stretch justify-center gap-2">
        <button
          type="button"
          data-recommend-target="mp4-export"
          onClick={() => void handleDownloadMp4()}
          disabled={!mp4ButtonEnabled}
          className={hasMp4 ? primaryActionClass : secondaryActionClass}
        >
          {downloadingMp4 || mp4Compiling || reelReadiness.validating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Download className="w-3.5 h-3.5" aria-hidden />
          )}
          {downloadingMp4
            ? 'Downloading…'
            : mp4Compiling || reelReadiness.validating
              ? 'Preparing…'
              : mp4DownloadReady
                ? 'Download MP4'
                : 'Compile MP4'}
        </button>

        {reelReadiness.validationError && !mp4Compiling ? (
          <button
            type="button"
            onClick={() => void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())}
            className={cn(actionButtonClass, 'border border-gold-500/30 bg-gold-500/[0.06] text-gold-200')}
          >
            Retry export
          </button>
        ) : null}

        {reelReadiness.validationError && !mp4Compiling ? (
          <p className="w-full text-center text-[11px] text-amber-200/80" role="status">
            {reelReadiness.validationError}
          </p>
        ) : null}

        {assetError ? (
          <p className="w-full text-center text-[11px] text-amber-200/80" role="alert">
            {assetError}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => void handleDownloadMp3()}
          disabled={!hasNarration || downloadingMp3}
          className={hasNarration ? secondaryActionClass : secondaryActionClass}
        >
          {downloadingMp3 ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          ) : (
            <Mic className="w-3.5 h-3.5" aria-hidden />
          )}
          {downloadingMp3 ? 'Downloading…' : 'Download Audio'}
        </button>

        <QuickCutViewScriptButton
          compact
          triggerClassName={cn(
            secondaryActionClass,
            '!rounded-xl !min-h-[44px] !px-4 !py-2 !text-[10px]'
          )}
        />

        <button
          type="button"
          onClick={() => void handleCopyScript()}
          disabled={!hasScript}
          className={secondaryActionClass}
        >
          {copiedScript ? (
            <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden />
          ) : (
            <Copy className="w-3.5 h-3.5" aria-hidden />
          )}
          {copiedScript ? 'Copied' : 'Copy Script'}
        </button>
      </div>

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
              hook={hook}
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

      {showExportFeedback ? (
        <ExportSatisfactionCard
          projectId={savedProjectId}
          className="w-full"
          onDismissed={() => setShowExportFeedback(false)}
        />
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
