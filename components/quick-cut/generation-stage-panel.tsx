'use client'

import type { ReactNode, RefObject } from 'react'
import { Film, ImageIcon, Loader2, Mic, RefreshCw, Sparkles, Video } from 'lucide-react'
import { CinematicTitleReveal } from '@/components/cinematic/render/cinematic-title-reveal'
import { CinematicVoicePreview } from '@/components/quick-cut/cinematic-voice-preview'
import { LiveScriptReveal } from '@/components/quick-cut/live-script-reveal'
import { StoryboardGenerator } from '@/components/quick-cut/storyboard-generator'
import { SceneVisualCard } from '@/components/quick-cut/scene-visual-card'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import type { QuickCutStageTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { cn } from '@/lib/utils'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

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
        <li className="flex items-center justify-center gap-2 py-8 text-luxe/45 text-[12px]">
          <Loader2 className="w-4 h-4 animate-spin text-gold-400/70" />
          Structuring beats…
        </li>
      ) : null}
    </ul>
  )
}

export function GenerationStagePanel({
  tab,
  className,
  audioRef,
}: {
  tab: QuickCutStageTab
  className?: string
  audioRef?: RefObject<HTMLAudioElement | null>
}) {
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const hookVariantNumber = useQuickCutGenerationStore((s) => s.hookVariantNumber)
  const isRegeneratingHook = useQuickCutGenerationStore((s) => s.isRegeneratingHook)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const waveform = useQuickCutGenerationStore((s) => s.waveform)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const directingSceneLabel = useQuickCutGenerationStore((s) => s.directingSceneLabel)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)

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
          <CinematicTitleReveal
            title={title}
            subtitle={hook ? 'Hook ready — open Hook tab' : 'Generating hook…'}
            className="!text-left items-start"
          />
        ) : (
          <p className="text-[12px] text-luxe/55 italic flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-gold-400/70" />
            Generating viral title…
          </p>
        ),
        generationStep === 'title' || generationStep === 'analyzing'
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
                  Regenerate Hook
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
      return script ? (
        <LiveScriptReveal
          script={script}
          active={
            Boolean(script) &&
            (generationStep === 'script' || generationStep === 'scenes')
          }
          className={className}
        />
      ) : (
        shell(
          'Cinematic script',
          <Film className="w-3 h-3" />,
          <p className="text-[12px] text-luxe/55 italic">Writing cinematic script…</p>,
          generationStep === 'script'
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
          <StoryboardGenerator
            scenes={scenes}
            loading={generationStep === 'images'}
            interactive={isComplete}
            exportTitle={title}
            allowDownload={isComplete}
          />
        </div>
      )
    }

    case 'voice':
      return (
        <CinematicVoicePreview
          waveform={waveform}
          voiceUrl={voiceUrl}
          script={script}
          scenes={scenes}
          hook={hook}
          audioRef={audioRef}
          loading={generationStep === 'voice'}
          className={className}
        />
      )

    case 'render':
      return shell(
        'Video assembly',
        <Video className="w-3 h-3" />,
        <div className="space-y-3">
          {videoUrl ? (
            <p className="text-[12px] text-gold-200/90">MP4 ready — preview above.</p>
          ) : (
            <>
              <p className="text-[12px] text-luxe/70 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-gold-400/80 shrink-0" />
                {renderStatusLabel || 'Ken Burns motion · subtitles · MP4 compile…'}
              </p>
              <p className="text-[11px] text-luxe/45">
                Scene crossfades animate in the player while the final reel encodes.
              </p>
            </>
          )}
        </div>,
        generationStep === 'render' && !videoUrl
      )

    case 'complete':
      return shell(
        'Production',
        <Mic className="w-3 h-3" />,
        isComplete ? (
          <p className="text-[12px] text-luxe/75">
            {videoUrl
              ? 'Your cinematic MP4 is ready to download.'
              : 'Preview assembled — export may still be compiling.'}
          </p>
        ) : (
          <p className="text-[12px] text-luxe/55 italic">Finishing touches…</p>
        )
      )

    default:
      return null
  }
}
