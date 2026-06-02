'use client'

import { useState } from 'react'
import { ExternalLink, Download, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { UnifiedExportMenu } from '@/components/export/unified-export-menu'
import { QuickCutPlatformExportProfiles } from '@/components/quick-cut/platform-export-profiles'
import { ExportSatisfactionCard } from '@/components/feedback/export-satisfaction-card'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const secondaryButtonClass =
  'inline-flex min-h-[44px] items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity touch-manipulation border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 hover:bg-gold-500/10'

export function QuickCutDownloadPanel({
  className,
  supplementaryOnly = false,
  embedded = false,
}: {
  className?: string
  /** Hide video/script/narration menu items when primary actions live in GenerationResultsSection */
  supplementaryOnly?: boolean
  /** Strip outer card when nested inside ExportTabbedPanel */
  embedded?: boolean
}) {
  const [showExportFeedback, setShowExportFeedback] = useState(false)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const title = useQuickCutGenerationStore((s) => s.title)

  const handlePreviewReel = () => {
    if (!videoUrl?.trim()) return
    window.open(videoUrl, '_blank', 'noopener,noreferrer')
  }

  const handleShareReel = async () => {
    if (!videoUrl?.trim()) return
    try {
      if (navigator.share) {
        await navigator.share({ title: title || 'Mugtee reel', url: videoUrl })
      } else {
        await navigator.clipboard.writeText(videoUrl)
      }
    } catch {
      /* user cancelled share */
    }
  }

  return (
    <div
      data-recommend-target="creator-pack"
      className={cn(
        embedded ? 'space-y-3 min-w-0 overflow-x-hidden' : 'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3 min-w-0 overflow-x-hidden',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          {embedded ? (
            <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
              {supplementaryOnly ? 'More export assets' : 'Download assets'}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
                <Download className="w-3 h-3" />
                {supplementaryOnly ? 'More export assets' : 'Download assets'}
              </div>
              <p className="text-[11px] text-luxe/45 mt-1">
                All exports in one menu — scene images, creator pack, and platform ZIPs.
              </p>
            </>
          )}
        </div>
        <UnifiedExportMenu
          supplementaryOnly={supplementaryOnly}
          includeTextExports
          onExportComplete={() => setShowExportFeedback(true)}
          className="w-full sm:w-auto shrink-0"
          align="end"
        />
      </div>

      {!supplementaryOnly && videoUrl?.trim() ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handlePreviewReel} className={secondaryButtonClass}>
            <ExternalLink className="w-3 h-3" />
            Preview reel
          </button>
          <button type="button" onClick={() => void handleShareReel()} className={secondaryButtonClass}>
            <Share2 className="w-3 h-3" />
            Share link
          </button>
        </div>
      ) : null}

      {showExportFeedback ? (
        <ExportSatisfactionCard
          projectId={savedProjectId}
          className="w-full"
          onDismissed={() => setShowExportFeedback(false)}
        />
      ) : null}

      <QuickCutPlatformExportProfiles />
    </div>
  )
}
