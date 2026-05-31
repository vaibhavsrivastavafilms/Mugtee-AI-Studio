'use client'

import { useEffect, useRef, type ReactNode, RefObject } from 'react'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { Film, ImageIcon, Loader2, Mic, RefreshCw, Sparkles, Video, Download } from 'lucide-react'
import { CinematicGenerationLoader } from '@/components/v2/cinematic-generation-loader'
import { CinematicTitleReveal } from '@/components/cinematic/render/cinematic-title-reveal'
import { CinematicVoicePreview } from '@/components/quick-cut/cinematic-voice-preview'
import { VoiceSelectionModule } from '@/components/quick-cut/voice-selection-module'
import { LiveScriptReveal } from '@/components/quick-cut/live-script-reveal'
import { StoryboardPanel } from '@/components/quick-cut/storyboard-panel'
import { SceneVisualCard } from '@/components/quick-cut/scene-visual-card'
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
import { ScriptTypeLabel } from '@/components/quick-cut/script-type-label'

function SceneBreakdownList({
  scenes,
  loading,
  showImages,
  exportTitle,
  allowDownload,
}: {
  scenes: GeneratedScene[]
  loading?: boolean
  showImages?: boolean
  exportTitle?: string
  allowDownload?: boolean
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
            />
          </li>
        ) : (
          <li
            key={scene.id || i}
            className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5"
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
              <p className="text-[11px] text-luxe/55 leading-relaxed mt-0.5 line-clamp-3">
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
                <p className="text-[11px] text-luxe/65 leading-relaxed line-clamp-4">
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
  const scriptArchetypeDisplay = useQuickCutGenerationStore((s) => s.scriptArchetypeDisplay)
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
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const directingSceneLabel = useQuickCutGenerationStore((s) => s.directingSceneLabel)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const storyboardTracked = useRef(false)

  useEffect(() => {
    if (tab !== 'scenes' || scenes.length < 1 || storyboardTracked.current) return
    storyboardTracked.current = true
    trackEvent(AnalyticsEvents.STORYBOARD_VIEWED, {
      projectId: savedProjectId,
      metadata: { scene_count: scenes.length },
    })
  }, [tab, scenes.length, savedProjectId])

  const shell = (label: string, icon: ReactNode, children: ReactNode, loading?: boolean) => (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 min-h-[120px]',
        loading && 'shimmer-cinematic',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        {icon}
        {label}
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
            <CinematicTitleReveal
              title={title}
              subtitle={hook ? 'Hook ready — open Hook tab' : 'Generating hook…'}
              className="!text-left items-start"
            />
          </div>
        ) : (
          <p className="text-[12px] text-luxe/55 italic flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-400/70" />
            Generating viral title…
          </p>
        ),
        generationStep === 'title' || generationStep === 'analyzing' || isRegeneratingTitle
      )

    case 'hook':
      return shell(
        'Opening hook',
        <Film className="w-3 h-3" />,
        hook ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
                Hook Variant: v{hookVariantNumber}
              </span>
              {!isGenerating ? (
                <button
                  type="button"
                  onClick={() => void regenerateHook()}
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
            <p className="font-display text-lg sm:text-xl text-[#F4E7C1] italic leading-snug">
              {hook}
            </p>
          </div>
        ) : (
          <p className="text-[12px] text-luxe/55 italic">Crafting hook…</p>
        ),
        generationStep === 'hook' || isRegeneratingHook
      )

    case 'script':
      return script || scriptBeats.length || hook ? (
        <div className={cn('space-y-2', className)}>
          <DeepResearchPanel document={researchDocument} report={researchReport} mock={researchMock} />
          {!isGenerating ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void regenerateScript()}
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
          <ScriptTypeLabel
            label={scriptArchetypeDisplay ?? scriptArchetypeLabel}
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
          />
        </div>
      ) : (
        shell(
          'Cinematic script',
          <Film className="w-3 h-3" />,
          <p className="text-[12px] text-luxe/55 italic">Writing cinematic script…</p>,
          generationStep === 'script' || isRegeneratingScript
        )
      )

    case 'scenes':
      return shell(
        'Scene breakdown',
        <Film className="w-3 h-3" />,
        <SceneBreakdownList
          scenes={scenes}
          loading={generationStep === 'scenes'}
          showImages={scenes.some((s) => s.imageUrl?.trim())}
          exportTitle={title}
          allowDownload={isComplete}
        />,
        generationStep === 'scenes'
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
                <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover" />
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

    case 'voice':
      return (
        <div className={cn('space-y-3', className)}>
          <VoiceSelectionModule />
          <CinematicVoicePreview
            waveform={waveform}
            voiceUrl={voiceUrl}
            script={script}
            scenes={scenes}
            hook={hook}
            audioRef={audioRef}
            loading={generationStep === 'voice'}
            voiceName={voiceName}
          />
        </div>
      )

    case 'render':
      return shell(
        'Rendering reel',
        <Video className="w-3 h-3" />,
        <div className="space-y-3">
          {videoUrl ? (
            <p className="text-[12px] text-gold-200/90">Download ready — MP4 reel is live.</p>
          ) : (
            <>
              <p className="text-[12px] text-luxe/70 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gold-400/80 shrink-0" />
                {renderStatusLabel || 'Rendering reel…'}
              </p>
              <p className="text-[11px] text-luxe/45">
                Assembling film → rendering reel → download ready. Preview animates while the MP4 encodes.
              </p>
            </>
          )}
        </div>,
        generationStep === 'render' && !videoUrl
      )

    case 'complete':
      return isComplete ? (
        <QuickCutDownloadPanel className={className} supplementaryOnly />
      ) : (
        shell(
          'Download',
          <Download className="w-3 h-3" />,
          <p className="text-[12px] text-luxe/55 italic">Finishing touches…</p>
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
