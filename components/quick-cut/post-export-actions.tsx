'use client'

import {
  Clapperboard,
  Download,
  FileText,
  ImageIcon,
  Mic,
  Play,
  RefreshCw,
  Sparkles,
  Subtitles,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUnifiedExportActions } from '@/lib/export/use-unified-export-actions.client'
import { executeRecommendedNextStep } from '@/lib/quick-cut/recommend-step-navigation'
import { recommendedNextStepsFromStore } from '@/lib/quick-cut/recommended-next-steps'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

const actionClass =
  'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-gold-500/25 bg-black/40 px-3 py-2 text-[10px] font-semibold tracking-[0.1em] uppercase text-gold-100/90 hover:bg-gold-500/[0.08] transition-colors disabled:opacity-45 touch-manipulation'

/** Compact post-export actions — preserves existing layout, no redesign. */
export function PostExportActions({
  className,
  hideHeader = false,
}: {
  className?: string
  hideHeader?: boolean
}) {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      title: s.title,
      hook: s.hook,
      script: s.script,
      scriptBeats: s.scriptBeats,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      videoUrl: s.videoUrl,
      videoRenderEnabled: s.videoRenderEnabled,
      isGenerating: s.isGenerating,
      isComplete: s.isComplete,
      exportExpired: s.exportExpired,
      isRenderingVideo: s.isRenderingVideo,
      renderPollUrl: s.renderPollUrl,
      renderError: s.renderError,
      repurposedAssets: s.repurposedAssets,
      contentSeries: s.contentSeries,
      savedProjectId: s.savedProjectId,
      thumbnailImageUrl: s.thumbnailImageUrl,
      exportPackageReady: s.exportPackageReady,
    }))
  )

  const actions = useUnifiedExportActions({ supplementaryOnly: true })

  const ready =
    state.isComplete &&
    !state.isGenerating &&
    (Boolean(state.videoUrl) || state.exportPackageReady)

  if (!ready) return null

  const similarStep = recommendedNextStepsFromStore(state).find(
    (s) => s.id === 'similar_reel' || s.id === 'repurpose' || s.title.toLowerCase().includes('similar')
  )
  const seriesStep = recommendedNextStepsFromStore(state).find(
    (s) => s.id === 'content_series' || s.title.toLowerCase().includes('series')
  )

  const scrollToPreview = () => {
    document.getElementById('reel-preview-player')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/20 bg-gradient-to-b from-black/50 to-black/30 p-3 sm:p-4 space-y-3',
        className
      )}
      aria-label="Post-export actions"
    >
      {hideHeader ? null : (
        <div className="text-center space-y-1">
          <p className="text-[10px] tracking-[0.24em] uppercase text-emerald-200/85">✓ Your Reel Is Ready</p>
          <p className="text-[11px] text-luxe/55">Preview, download, or continue creating.</p>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className={actionClass} onClick={scrollToPreview}>
          <Play className="w-3.5 h-3.5" aria-hidden />
          Preview Reel
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={!state.videoUrl || actions.downloadingMp4}
          onClick={() => void actions.handleDownloadMp4()}
        >
          <Video className="w-3.5 h-3.5" aria-hidden />
          Download MP4
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={!state.voiceUrl || actions.downloadingMp3}
          onClick={() => void actions.handleDownloadMp3()}
        >
          <Mic className="w-3.5 h-3.5" aria-hidden />
          Download Audio
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={!actions.hasThumbnail}
          onClick={() => void actions.handleDownloadThumbnail()}
        >
          <ImageIcon className="w-3.5 h-3.5" aria-hidden />
          Download Thumbnail
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={!actions.hasCaptions}
          onClick={() => void actions.handleDownloadCaptions()}
        >
          <Subtitles className="w-3.5 h-3.5" aria-hidden />
          Download Captions
        </button>
        <button
          type="button"
          className={actionClass}
          disabled={!actions.hasScript}
          onClick={() => void actions.handleDownloadTxt()}
        >
          <FileText className="w-3.5 h-3.5" aria-hidden />
          Download Script
        </button>
        {similarStep ? (
          <button
            type="button"
            className={actionClass}
            onClick={() => executeRecommendedNextStep(similarStep)}
          >
            <Sparkles className="w-3.5 h-3.5" aria-hidden />
            Generate Similar Reel
          </button>
        ) : (
          <button type="button" className={actionClass} onClick={() => window.location.reload()}>
            <RefreshCw className="w-3.5 h-3.5" aria-hidden />
            Generate Similar Reel
          </button>
        )}
        {seriesStep ? (
          <button
            type="button"
            className={actionClass}
            onClick={() => executeRecommendedNextStep(seriesStep)}
          >
            <Clapperboard className="w-3.5 h-3.5" aria-hidden />
            Turn Into Series
          </button>
        ) : null}
        <button type="button" className={actionClass} onClick={() => void actions.handleExportCreatorPack()}>
          <Download className="w-3.5 h-3.5" aria-hidden />
          Creator Pack
        </button>
      </div>
    </section>
  )
}
