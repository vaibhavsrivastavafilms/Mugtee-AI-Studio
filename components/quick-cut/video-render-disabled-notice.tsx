'use client'

import { AlertCircle, Package } from 'lucide-react'
import { REEL_EXPORT_DISABLED_USER_MSG } from '@/lib/video/reel-render-errors'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { isClientVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled.client'

type VideoRenderDisabledNoticeProps = {
  className?: string
  /** Show "Prepare export package" when storyboard is complete */
  showPackageAction?: boolean
}

/** Shown when VIDEO_RENDER_ENABLED is off — clarifies preview/package vs MP4. */
export function VideoRenderDisabledNotice({
  className,
  showPackageAction = true,
}: VideoRenderDisabledNoticeProps) {
  const configVideoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const videoRenderEnabled = isClientVideoRenderEnabled(configVideoRenderEnabled)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)

  if (videoRenderEnabled || !isComplete) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2.5 space-y-2',
        className
      )}
      role="status"
    >
      <div className="flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-300/90 shrink-0 mt-0.5" aria-hidden />
        <div className="space-y-1 min-w-0">
          <p className="text-[10px] tracking-[0.18em] uppercase text-amber-200/85 font-semibold">
            MP4 compile unavailable
          </p>
          <p className="text-[11px] text-luxe/70 leading-relaxed">{REEL_EXPORT_DISABLED_USER_MSG}</p>
        </div>
      </div>
      {showPackageAction && !exportPackageReady ? (
        <button
          type="button"
          onClick={() => void retryVideoRender()}
          disabled={isRenderingVideo}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/[0.08] px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-gold-200 hover:bg-gold-500/12 transition disabled:opacity-50"
        >
          <Package className="w-3 h-3" aria-hidden />
          {isRenderingVideo ? 'Preparing…' : 'Prepare storyboard export'}
        </button>
      ) : exportPackageReady ? (
        <p className="text-[10px] text-emerald-300/80 flex items-center gap-1">
          <Package className="w-3 h-3" aria-hidden />
          Storyboard export package ready — download script, images, and audio below.
        </p>
      ) : null}
    </div>
  )
}
