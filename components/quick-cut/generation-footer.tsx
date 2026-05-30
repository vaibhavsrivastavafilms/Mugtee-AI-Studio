'use client'

import { CinematicTitleReveal } from '@/components/cinematic/render/cinematic-title-reveal'
import { GenerationSaveIndicator } from '@/components/quick-cut/generation-save-indicator'
import { ContentSeriesTrigger } from '@/components/quick-cut/content-series-panel'
import { RenderProgress } from '@/components/quick-cut/render-progress'
import { resolveQuickCutProgressLabel } from '@/lib/quick-cut/asset-availability'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

/** Bottom padding for scrollable content so it clears the fixed generation footer. */
export const GENERATION_FOOTER_CLEARANCE = 'pb-44 sm:pb-48'

export function QuickCutGenerationFooter({ className }: { className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)

  const subtitle = hook
    ? 'Hook ready — open Hook tab'
    : generationStep === 'title' || generationStep === 'analyzing'
      ? 'Generating hook…'
      : isComplete
        ? resolveQuickCutProgressLabel({
            generationStep,
            isComplete,
            videoUrl,
            videoRenderEnabled,
            renderError,
            renderPollUrl,
            isRenderingVideo,
            renderStatusLabel,
            exportPackageReady,
            exportExpired,
            hasScript: Boolean(script?.trim() || hook?.trim() || title?.trim() || scriptBeats.length),
            hasImages: scenes.some((scene) => Boolean(scene.imageUrl?.trim())),
            hasNarration: Boolean(voiceUrl?.trim()),
          })
        : 'In production…'

  return (
    <footer
      className={cn(
        'fixed bottom-0 inset-x-0 z-40',
        'border-t border-gold-500/15 bg-black/85 backdrop-blur-xl',
        'pb-[max(0.75rem,env(safe-area-inset-bottom))]',
        className
      )}
      aria-label="Generation progress"
    >
      <div
        className={cn(
          'max-w-6xl mx-auto',
          'px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]',
          'py-3 sm:py-4 space-y-3 sm:space-y-4'
        )}
      >
        {title ? (
          <CinematicTitleReveal
            title={title}
            subtitle={subtitle}
            className="!text-left items-start !space-y-1"
          />
        ) : null}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <GenerationSaveIndicator />
            <ContentSeriesTrigger variant="footer" />
          </div>
          <RenderProgress className="flex-1" />
        </div>
      </div>
    </footer>
  )
}
