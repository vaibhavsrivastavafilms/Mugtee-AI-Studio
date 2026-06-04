'use client'

import { useEffect, useRef, type ReactNode, RefObject } from 'react'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { Film, Loader2, Mic, RefreshCw, Sparkles, Video } from 'lucide-react'
import { CinematicVoicePreview } from '@/components/quick-cut/cinematic-voice-preview'
import { VoiceSelectionModule } from '@/components/quick-cut/voice-selection-module'
import { LiveScriptReveal } from '@/components/quick-cut/live-script-reveal'
import { StoryboardScenesTabbedPanel } from '@/components/quick-cut/storyboard-scenes-tabbed-panel'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { ExportTabbedPanel } from '@/components/quick-cut/export-tabbed-panel'
import type { ExportSubTab } from '@/components/quick-cut/export-tabbed-panel'
import { DeepResearchPanel } from '@/components/quick-cut/deep-research-panel'
import { cn } from '@/lib/utils'
import { displayHookText } from '@/lib/cinematic/hook-format'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { NarrativeStructureLabel } from '@/components/quick-cut/narrative-structure-label'
import { ContentAngleLabel } from '@/components/quick-cut/content-angle-label'
import { useDraftRegenerationGuard } from '@/components/trust/draft-protection-dialog'
import { MotionStagePanel, MotionStageShell } from '@/components/quick-cut/motion-stage-panel'
import { ReelComposer } from '@/components/reel-composer/ReelComposer'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import { SectionStatusBadge } from '@/components/quick-cut/section-status-badge'
import type { SectionId } from '@/lib/cinematic/section-generation-status'

export function GenerationStagePanel({
  tab,
  className,
  audioRef,
  onRegenerate,
}: {
  tab: QuickCutStageTab
  className?: string
  audioRef?: RefObject<HTMLAudioElement | null>
  onRegenerate?: () => void
}) {
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const displayHook = displayHookText(hook)
  const hookPreview = useQuickCutGenerationStore((s) => s.hookPreview)
  const hookProgressLabel = useQuickCutGenerationStore((s) => s.hookProgressLabel)
  const hookVariantNumber = useQuickCutGenerationStore((s) => s.hookVariantNumber)
  const isRegeneratingHook = useQuickCutGenerationStore((s) => s.isRegeneratingHook)
  const isRegeneratingTitle = useQuickCutGenerationStore((s) => s.isRegeneratingTitle)
  const isRegeneratingScript = useQuickCutGenerationStore((s) => s.isRegeneratingScript)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const regenerateTitle = useQuickCutGenerationStore((s) => s.regenerateTitle)
  const regenerateScript = useQuickCutGenerationStore((s) => s.regenerateScript)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const scriptArchetypeLabel = useQuickCutGenerationStore((s) => s.scriptArchetypeLabel)
  const narrativeArchetypeLabel = useQuickCutGenerationStore((s) => s.narrativeArchetypeLabel)
  const narrativeFlowDisplay = useQuickCutGenerationStore((s) => s.narrativeFlowDisplay)
  const contentAngleLabel = useQuickCutGenerationStore((s) => s.contentAngleLabel)
  const hookFrameworkLabel = useQuickCutGenerationStore((s) => s.hookFrameworkLabel)
  const researchDocument = useQuickCutGenerationStore((s) => s.researchDocument)
  const researchReport = useQuickCutGenerationStore((s) => s.researchReport)
  const researchMock = useQuickCutGenerationStore((s) => s.researchMock)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const voiceName = useQuickCutGenerationStore((s) => s.voiceName)
  const waveform = useQuickCutGenerationStore((s) => s.waveform)
  const isRegeneratingVoice = useQuickCutGenerationStore((s) => s.isRegeneratingVoice)
  const regenerateVoice = useQuickCutGenerationStore((s) => s.regenerateVoice)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const updateReelTimelineClip = useQuickCutGenerationStore((s) => s.updateReelTimelineClip)
  const storyboardTracked = useRef(false)
  const hookPanelRef = useRef<HTMLDivElement>(null)
  const scenesPanelRef = useRef<HTMLDivElement>(null)
  const { requestRegeneration, dialog: draftProtectionDialog } = useDraftRegenerationGuard()

  const guardedRegenerateHook = async () => {
    if (!hook.trim()) return
    const choice = await requestRegeneration('hook')
    if (choice === 'cancel' || choice === 'keep') return
    await regenerateHook()
  }

  const guardedRegenerateScript = async () => {
    if (!script.trim() && scriptBeats.length < 1) return
    const choice = await requestRegeneration('script')
    if (choice === 'cancel' || choice === 'keep') return
    await regenerateScript()
  }

  const directorEditEnabled =
    !isGenerating && !isRegeneratingScript && !isRegeneratingHook

  useEffect(() => {
    if (
      (tab !== 'scenes' && tab !== 'visuals') ||
      scenes.length < 1 ||
      storyboardTracked.current
    ) {
      return
    }
    storyboardTracked.current = true
    trackEvent(AnalyticsEvents.STORYBOARD_VIEWED, {
      projectId: savedProjectId,
      metadata: { scene_count: scenes.length },
    })
  }, [tab, scenes.length, savedProjectId])

  const shell = (
    label: string,
    icon: ReactNode,
    children: ReactNode,
    loading?: boolean,
    section?: SectionId,
    workflowTab?: QuickCutStageTab
  ) => (
    <div
      data-generation-stage-panel
      data-workflow-tab={workflowTab}
      id={workflowTab ? `workflow-stage-${workflowTab}` : undefined}
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 min-h-[120px]',
        loading && 'shimmer-cinematic',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
          {icon}
          {label}
        </div>
        {section ? (
          <SectionStatusBadge section={section} status={sectionStatus[section]} />
        ) : null}
      </div>
      {children}
    </div>
  )

  switch (tab) {
    case 'title':
      return shell(
        'Viral title',
        <Sparkles className="w-3 h-3" />,
        title ? (
          <div className="space-y-3">
            {!isGenerating ? (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void regenerateTitle()}
                  disabled={isRegeneratingTitle}
                  className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/75 hover:text-gold-200 transition-colors disabled:opacity-50"
                >
                  {isRegeneratingTitle ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                  Regenerate Title
                </button>
              </div>
            ) : null}
            <ContentAngleLabel
              angleLabel={contentAngleLabel}
              hookFrameworkLabel={hookFrameworkLabel}
            />
            <p className="font-display text-lg sm:text-xl text-[#F4E7C1] tracking-tight leading-snug">
              {title}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-luxe/55 italic flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-400/70" />
            {hookProgressLabel ?? 'Generating viral title…'}
          </p>
        ),
        generationStep === 'title' ||
          generationStep === 'analyzing' ||
          isRegeneratingTitle,
        'hook',
        'title'
      )

    case 'hook':
      return (
        <>
          {draftProtectionDialog}
          {shell(
            'Opening hook',
            <Film className="w-3 h-3" />,
            hook || hookPreview ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
                    Hook Variant: v{hookVariantNumber}
                    {hookPreview && !displayHook ? ' · preview' : ''}
                  </span>
                  {!isGenerating ? (
                    <button
                      type="button"
                      onClick={() => void guardedRegenerateHook()}
                      disabled={isRegeneratingHook}
                      className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/75 hover:text-gold-200 transition-colors disabled:opacity-50"
                    >
                      {isRegeneratingHook ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      Mugtee&apos;s Hook
                    </button>
                  ) : null}
                </div>
                <ContentAngleLabel
                  angleLabel={contentAngleLabel}
                  hookFrameworkLabel={hookFrameworkLabel}
                />
                <RewriteProvider
                  containerRef={hookPanelRef}
                  enabled={directorEditEnabled && Boolean(displayHook)}
                  defaultContentType="hook"
                  className="relative"
                >
                  <p
                    data-rewrite-type="hook"
                    className={cn(
                      'select-text font-display text-lg sm:text-xl text-[#F4E7C1] italic leading-snug',
                      hookPreview && !displayHook && 'opacity-80 animate-pulse'
                    )}
                  >
                    {displayHook || hookPreview}
                  </p>
                </RewriteProvider>
                {hookProgressLabel && !displayHook ? (
                  <p className="text-[11px] text-luxe/45 italic">{hookProgressLabel}</p>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[12px] text-luxe/55 italic flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gold-400/70" />
                  {hookProgressLabel ?? 'Crafting hook…'}
                </p>
              </div>
            ),
            generationStep === 'hook' ||
              generationStep === 'title' ||
              generationStep === 'analyzing' ||
              isRegeneratingHook,
            'hook',
            'hook'
          )}
        </>
      )

    case 'script':
      return script || scriptBeats.length || hook ? (
        <>
          {draftProtectionDialog}
        <div className={cn('space-y-2', className)}>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SectionStatusBadge section="script" status={sectionStatus.script} />
            <SectionStatusBadge section="captions" status={sectionStatus.captions} />
          </div>
          <DeepResearchPanel document={researchDocument} report={researchReport} mock={researchMock} />
          {!isGenerating ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void guardedRegenerateScript()}
                disabled={isRegeneratingScript}
                className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/75 hover:text-gold-200 transition-colors disabled:opacity-50"
              >
                {isRegeneratingScript ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                Mugtee&apos;s Script
              </button>
            </div>
          ) : null}
          <NarrativeStructureLabel
            archetypeLabel={narrativeArchetypeLabel ?? scriptArchetypeLabel}
            narrativeFlowDisplay={narrativeFlowDisplay}
            className="px-0.5"
          />
          <ContentAngleLabel
            angleLabel={contentAngleLabel}
            hookFrameworkLabel={hookFrameworkLabel}
            className="px-0.5"
          />
          <LiveScriptReveal
            script={script}
            hook={displayHook}
            scriptBeats={scriptBeats}
            payoff={payoff}
            cta={cta}
            active={
              Boolean(script || scriptBeats.length) &&
              !isRegeneratingScript &&
              (generationStep === 'script' || generationStep === 'scenes')
            }
            directorEdit={directorEditEnabled}
          />
        </div>
        </>
      ) : (
        shell(
          'Cinematic script',
          <Film className="w-3 h-3" />,
          <p className="text-[12px] text-luxe/55 italic">Mugtee is directing your next viral story.</p>,
          generationStep === 'script' || isRegeneratingScript
        )
      )

    case 'scenes':
    case 'visuals':
      return (
        <StoryboardScenesTabbedPanel
          className={className}
          preferredSubTab={tab === 'visuals' ? 'storyboard' : 'breakdown'}
          scenesPanelRef={scenesPanelRef}
          directorEditEnabled={directorEditEnabled}
        />
      )

    case 'motion':
      return (
        <MotionStageShell className={className}>
          <MotionStagePanel scenes={scenes} />
          {reelTimeline ? (
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-black/30 p-3 space-y-2">
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/70">
                Director timeline
              </p>
              <ReelComposer timeline={reelTimeline} showDirectorTracks />
            </div>
          ) : null}
        </MotionStageShell>
      )

    case 'voice':
      return (
        <div className={cn('space-y-3', className)}>
          <SectionStatusBadge section="voice" status={sectionStatus.voice} className="justify-end" />
          <VoiceSelectionModule />
          <CinematicVoicePreview
            waveform={waveform}
            voiceUrl={voiceUrl}
            script={script}
            scenes={scenes}
            hook={hook}
            audioRef={audioRef}
            loading={generationStep === 'voice'}
            regenerating={isRegeneratingVoice}
            voiceName={voiceName}
            onRegenerate={() => void regenerateVoice()}
          />
          {reelTimeline && voiceUrl ? (
            <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3 space-y-2">
              <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/70">
                Reel preview
              </p>
              <ReelComposer timeline={reelTimeline} audioRef={audioRef} />
            </div>
          ) : null}
        </div>
      )

    case 'render':
      return shell(
        'Rendering reel',
        <Video className="w-3 h-3" />,
        <div className="space-y-3">
          {videoUrl ? (
            <p className="text-[12px] text-gold-200/90">Download ready — MP4 reel is live.</p>
          ) : videoRenderEnabled && (renderError || sectionStatus.export === 'failed') ? (
            <>
              <p className="text-[12px] text-red-300/90" role="alert">
                {renderError || 'Export failed — try again.'}
              </p>
              <button
                type="button"
                onClick={() => void retryVideoRender()}
                disabled={isRenderingVideo}
                className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/80 hover:text-gold-200 transition-colors disabled:opacity-50"
              >
                {isRenderingVideo ? (
                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="w-3 h-3" aria-hidden />
                )}
                Retry compile
              </button>
            </>
          ) : isRenderingVideo ? (
            <>
              <p className="text-[12px] text-luxe/70 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gold-400/80 shrink-0" />
                {renderStatusLabel || 'Rendering reel…'}
              </p>
              <p className="text-[11px] text-luxe/45">
                Assembling film → rendering reel → download ready. Preview animates while the MP4 encodes.
              </p>
            </>
          ) : (
            <p className="text-[12px] text-luxe/55 italic">
              Export Creator Pack to finish.
            </p>
          )}
        </div>,
        isRenderingVideo && !videoUrl && !renderError && sectionStatus.export !== 'failed',
        'export'
      )

    case 'complete':
      return isComplete ? null : (
        <ExportTabbedPanel
          audioRef={audioRef}
          className={className}
          preferredSubTab="download"
        />
      )

    case 'publish':
      return (
        <ExportTabbedPanel
          audioRef={audioRef}
          className={className}
          preferredSubTab={'publish' satisfies ExportSubTab}
        />
      )

    case 'repurpose':
      return (
        <ExportTabbedPanel
          audioRef={audioRef}
          className={className}
          preferredSubTab={'repurpose' satisfies ExportSubTab}
        />
      )

    default:
      return null
  }
}
