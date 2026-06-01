'use client'

import Image from 'next/image'
import { useEffect, useRef, type ReactNode, RefObject } from 'react'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { Film, ImageIcon, Loader2, Mic, RefreshCw, Sparkles, Video, Download } from 'lucide-react'
import { CinematicGenerationLoader } from '@/components/v2/cinematic-generation-loader'
import { CinematicVoicePreview } from '@/components/quick-cut/cinematic-voice-preview'
import { VoiceSelectionModule } from '@/components/quick-cut/voice-selection-module'
import { LiveScriptReveal } from '@/components/quick-cut/live-script-reveal'
import { StoryboardPanel } from '@/components/quick-cut/storyboard-panel'
import { StoryboardTimeline } from '@/components/cinematic/storyboard-timeline'
import { SceneVisualCard } from '@/components/quick-cut/scene-visual-card'
import { sceneScrollTargetId } from '@/lib/cinematic/storyboard-scroll'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { QuickCutDownloadPanel } from '@/components/quick-cut/download-panel'
import { PublishCenter } from '@/components/quick-cut/publish-center'
import { ContentRepurposePanel } from '@/components/quick-cut/content-repurpose-panel'
import { DeepResearchPanel } from '@/components/quick-cut/deep-research-panel'
import { cn } from '@/lib/utils'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { NarrativeStructureLabel } from '@/components/quick-cut/narrative-structure-label'
import { ContentAngleLabel } from '@/components/quick-cut/content-angle-label'
import { useDraftRegenerationGuard } from '@/components/trust/draft-protection-dialog'
import { MotionStagePanel, MotionStageShell } from '@/components/quick-cut/motion-stage-panel'
import { ReelComposer } from '@/components/reel-composer/ReelComposer'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import { SectionStatusBadge } from '@/components/quick-cut/section-status-badge'
import type { SectionId } from '@/lib/cinematic/section-generation-status'

function SceneBreakdownList({
  scenes,
  loading,
  showImages,
  exportTitle,
  allowDownload,
  onMotionPresetChange,
}: {
  scenes: GeneratedScene[]
  loading?: boolean
  showImages?: boolean
  exportTitle?: string
  allowDownload?: boolean
  onMotionPresetChange?: (sceneId: string, presetId: import('@/lib/motion/motion-presets').MotionPresetId) => void
}) {
  const exportBase = slugifyExportBase(exportTitle || 'mugtee-storyboard', 'mugtee-storyboard')
  if (scenes.length === 0 && !loading) {
    return (
      <p className="text-[12px] text-luxe/55 italic text-center py-6">
        Building scene breakdown…
      </p>
    )
  }

  return (
    <ul className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto scrollbar-luxe">
      {scenes.map((scene, i) =>
        showImages ? (
          <li key={scene.id || i}>
            <SceneVisualCard
              scene={scene}
              index={i}
              compact
              exportBaseName={exportBase}
              allowDownload={allowDownload}
              onMotionPresetChange={
                onMotionPresetChange
                  ? (presetId) => onMotionPresetChange(scene.id, presetId)
                  : undefined
              }
            />
          </li>
        ) : (
          <li
            key={scene.id || i}
            id={scene.id ? sceneScrollTargetId(scene.id) : undefined}
            className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5 scroll-mt-24"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
                SCENE {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-luxe/40">{scene.duration ?? 4}s</span>
            </div>
            <p className="text-sm text-luxe/90 font-medium leading-snug">
              {scene.title || `Beat ${i + 1}`}
            </p>
            {scene.description ? (
              <p
                data-rewrite-type="scene"
                className="select-text text-[11px] text-luxe/55 leading-relaxed mt-0.5 line-clamp-3"
              >
                {scene.description}
              </p>
            ) : null}
            {scene.cameraAngle ? (
              <p className="text-[10px] text-luxe/40 mt-1 tracking-wide">
                {scene.cameraAngle} · {scene.lightingMood}
              </p>
            ) : null}
            {scene.imagePrompt ? (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/60 mb-0.5">
                  Image prompt
                </p>
                <p
                  data-rewrite-type="visual_direction"
                  className="select-text text-[11px] text-luxe/65 leading-relaxed line-clamp-4"
                >
                  {scene.imagePrompt}
                </p>
              </div>
            ) : null}
          </li>
        )
      )}
      {loading && scenes.length === 0 ? (
        <li>
          <CinematicGenerationLoader step="scenes" message="Structuring beats…" />
        </li>
      ) : null}
    </ul>
  )
}

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
  const storyboardScenes = useQuickCutGenerationStore((s) => s.storyboardScenes)
  const visualTimeline = useQuickCutGenerationStore((s) => s.visualTimeline)
  const sceneCount = useQuickCutGenerationStore((s) => s.sceneCount)
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
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const directingSceneLabel = useQuickCutGenerationStore((s) => s.directingSceneLabel)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const setSceneMotionPreset = useQuickCutGenerationStore((s) => s.setSceneMotionPreset)
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
    if (tab !== 'scenes' || scenes.length < 1 || storyboardTracked.current) return
    storyboardTracked.current = true
    trackEvent(AnalyticsEvents.STORYBOARD_VIEWED, {
      projectId: savedProjectId,
      metadata: { scene_count: scenes.length },
    })
  }, [tab, scenes.length, savedProjectId])

  const shell = (label: string, icon: ReactNode, children: ReactNode, loading?: boolean, section?: SectionId) => (
    <div
      data-generation-stage-panel
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
        'hook'
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
                    {hookPreview && !hook ? ' · preview' : ''}
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
                  enabled={directorEditEnabled && Boolean(hook)}
                  defaultContentType="hook"
                  className="relative"
                >
                  <p
                    data-rewrite-type="hook"
                    className={cn(
                      'select-text font-display text-lg sm:text-xl text-[#F4E7C1] italic leading-snug',
                      hookPreview && !hook && 'opacity-80 animate-pulse'
                    )}
                  >
                    {hook || hookPreview}
                  </p>
                </RewriteProvider>
                {hookProgressLabel && !hook ? (
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
            hook={hook}
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
      return (
        <div className={cn('space-y-2', className)}>
          {storyBible ? (
            <p
              className="text-[10px] tracking-[0.18em] uppercase text-emerald-400/75 px-0.5"
              title={`${storyBible.visualStyle} · ${storyBible.colorPalette}`}
            >
              Cinematic continuity active
            </p>
          ) : null}
          <StoryboardTimeline
            scenes={scenes}
            loading={generationStep === 'scenes'}
            className="mb-2"
          />
          {shell(
            'Scene breakdown',
            <Film className="w-3 h-3" />,
            <RewriteProvider
              containerRef={scenesPanelRef}
              enabled={directorEditEnabled}
              defaultContentType="scene"
              className="relative"
            >
              <SceneBreakdownList
                scenes={scenes}
                loading={generationStep === 'scenes'}
                showImages={scenes.some((s) => s.imageUrl?.trim())}
                exportTitle={title}
                allowDownload={isComplete}
                onMotionPresetChange={setSceneMotionPreset}
              />
            </RewriteProvider>,
            generationStep === 'scenes',
            'visualDirection'
          )}
        </div>
      )

    case 'visuals': {
      const imagesLoading = generationStep === 'images'
      const firstScene = scenes[0]
      const firstGeneratedUrl = firstScene?.imageUrl?.trim()
      const thumb =
        firstGeneratedUrl ||
        (!imagesLoading && firstScene
          ? resolveScenePreviewUrl(firstScene, 0)
          : null)

      return (
        <div className={cn('space-y-3', className)}>
          <div className="flex flex-wrap items-center gap-2">
            <SectionStatusBadge section="storyboard" status={sectionStatus.storyboard} />
            <SectionStatusBadge section="thumbnail" status={sectionStatus.thumbnail} />
          </div>
          {storyBible ? (
            <p
              className="text-[10px] tracking-[0.18em] uppercase text-emerald-400/75"
              title={`${storyBible.visualStyle} · ${storyBible.colorPalette}`}
            >
              Visual continuity locked
            </p>
          ) : null}
          {imagesLoading && !firstGeneratedUrl ? (
            <div className="rounded-xl border border-gold-500/20 bg-black/30 p-3 flex items-center gap-3 shimmer-cinematic">
              <div className="w-14 aspect-[9/16] rounded-md border border-white/10 shrink-0 bg-white/[0.03] flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin text-gold-400/70" />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Thumbnail frame
                </p>
                <p className="text-[11px] text-luxe/50 mt-0.5">
                  {directingSceneLabel || 'Generating cinematic stills…'}
                </p>
              </div>
            </div>
          ) : thumb ? (
            <div className="rounded-xl border border-gold-500/20 bg-black/30 p-3 flex items-center gap-3">
              <div className="relative w-14 aspect-[9/16] rounded-md overflow-hidden border border-white/10 shrink-0">
                <Image
                  src={thumb}
                  alt=""
                  fill
                  sizes="56px"
                  className="object-cover"
                  unoptimized
                  loading="lazy"
                />
              </div>
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" /> Thumbnail frame
                </p>
                <p className="text-[11px] text-luxe/50 mt-0.5">First cinematic still for export</p>
              </div>
            </div>
          ) : null}
          <StoryboardPanel
            scenes={scenes}
            storyboardScenes={storyboardScenes}
            visualTimeline={visualTimeline}
            sceneCount={sceneCount}
            loading={generationStep === 'images'}
            interactive={isComplete}
            exportTitle={title}
            script={script}
            hook={hook}
            voiceUrl={voiceUrl}
            className={className}
          />
        </div>
      )
    }

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
          ) : renderError || sectionStatus.export === 'failed' ? (
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
              Compile MP4 to finish export.
            </p>
          )}
        </div>,
        isRenderingVideo && !videoUrl && !renderError && sectionStatus.export !== 'failed',
        'export'
      )

    case 'complete':
      return isComplete ? (
        <div className={cn('space-y-4', className)}>
          <ReelComposer
            timeline={reelTimeline}
            audioRef={audioRef}
            showDirectorTracks
          />
          <QuickCutDownloadPanel supplementaryOnly />
        </div>
      ) : (
        shell(
          'Download',
          <Download className="w-3 h-3" />,
          <p className="text-[12px] text-luxe/55 italic">
            {videoUrl ? 'Download ready.' : 'Finishing touches…'}
          </p>
        )
      )

    case 'publish':
      return <PublishCenter className={className} />

    case 'repurpose':
      return <ContentRepurposePanel className={className} />

    default:
      return null
  }
}
