'use client'

import { RefreshCw } from 'lucide-react'
import {
  findScenesMissingExportImages,
  isMissingScenesExportError,
} from '@/lib/export/scene-export-validation'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const actionClass =
  'inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity disabled:opacity-50 border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 hover:bg-gold-500/10 touch-manipulation'

type RegenerateMissingScenesBannerProps = {
  className?: string
}

export function RegenerateMissingScenesBanner({ className }: RegenerateMissingScenesBannerProps) {
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const regenerateMissingSceneImages = useQuickCutGenerationStore(
    (s) => s.regenerateMissingSceneImages
  )

  const missingExportScenes = findScenesMissingExportImages(scenes)
  const mp4Compiling =
    isRenderingVideo || Boolean(renderPollUrl && !videoUrl?.trim() && !renderError?.trim())

  const show =
    missingExportScenes.length > 0 &&
    (isMissingScenesExportError(renderError) || (!videoUrl && !mp4Compiling))

  if (!show) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3 py-2.5 space-y-2',
        className
      )}
      role="alert"
    >
      <p className="text-[11px] text-amber-200/85 text-center leading-relaxed">
        Scene{missingExportScenes.length === 1 ? '' : 's'}{' '}
        {missingExportScenes.map((s) => s.index).join(', ')}{' '}
        {missingExportScenes.length === 1 ? 'is' : 'are'} missing storyboard images — MP4 export
        is blocked until they are regenerated.
      </p>
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => void regenerateMissingSceneImages()}
          className={actionClass}
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden />
          Regenerate missing scenes ({missingExportScenes.map((s) => s.index).join(', ')})
        </button>
      </div>
    </div>
  )
}
