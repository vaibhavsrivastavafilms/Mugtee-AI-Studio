'use client'

import { useMemo, type RefObject } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { qcV2GoldButton, qcV2GhostButton, qcV2Panel } from '@/lib/quick-cut/quick-cut-v2-design'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { directorWorkspaceHref } from '@/lib/create/routes'
import { resolveActiveThumbnailUrl } from '@/lib/cinematic/thumbnail-cover'
import { formatTimingBlock } from '@/lib/generation/generation-eta'
import { useUnifiedExportActions } from '@/lib/export/use-unified-export-actions.client'
import { QUICK_PLATFORM_OPTIONS, type QuickPlatformValue } from '@/lib/studio/quick-create-options'

type QuickCutV2CompletionScreenProps = {
  projectId?: string
  platform?: QuickPlatformValue
  audioRef?: RefObject<HTMLAudioElement | null>
  className?: string
}

export function QuickCutV2CompletionScreen({
  projectId,
  platform = 'youtube_short',
  audioRef,
  className,
}: QuickCutV2CompletionScreenProps) {
  const {
    projectName,
    duration,
    language,
    videoUrl,
    savedProjectId,
    generationStartedAt,
    exportCompletedAt,
  } = useQuickCutProjectStatus()

  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const thumbnailImageUrl = useQuickCutGenerationStore((s) => s.thumbnailImageUrl)
  const generationCoreCompletedAt = useQuickCutGenerationStore((s) => s.generationCoreCompletedAt)
  const renderStartedAt = useQuickCutGenerationStore((s) => s.renderStartedAt)

  const pid = projectId ?? savedProjectId
  const actions = useUnifiedExportActions({ supplementaryOnly: true })
  const platformLabel =
    QUICK_PLATFORM_OPTIONS.find((o) => o.value === platform)?.label ?? 'Social Reels'

  const thumb =
    thumbnailImageUrl?.trim() ||
    resolveActiveThumbnailUrl(null, scenes) ||
    null

  const totalTime = useMemo(() => {
    if (!generationStartedAt) return null
    const end = exportCompletedAt ?? generationCoreCompletedAt ?? Date.now()
    return formatTimingBlock({
      generationMs: Math.max(0, end - generationStartedAt),
      exportMs:
        exportCompletedAt && renderStartedAt
          ? Math.max(0, exportCompletedAt - renderStartedAt)
          : null,
    })
  }, [generationStartedAt, exportCompletedAt, generationCoreCompletedAt, renderStartedAt])

  const previewVideo = () => {
    if (videoUrl) window.open(videoUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className={cn('space-y-5 sm:space-y-6', className)}>
      <div className="text-center space-y-2">
        <p className="text-sm uppercase tracking-[0.22em] text-[#D4AF37]">✓ Your Reel Is Ready</p>
        {totalTime ? (
          <p className="text-sm text-white/55">
            Total generation time: {totalTime.total ?? totalTime.generation ?? '—'}
          </p>
        ) : null}
      </div>

      <div className={cn(qcV2Panel, 'overflow-hidden')}>
        <div className="relative aspect-[9/16] max-h-[min(52vh,520px)] mx-auto bg-black">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              playsInline
              className="w-full h-full object-contain"
              poster={thumb ?? undefined}
            />
          ) : thumb ? (
            <Image src={thumb} alt="" fill className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 bg-[#111111]" />
          )}
        </div>
        <div className="p-4 sm:p-5 space-y-1 border-t border-[rgba(212,175,55,0.15)]">
          <p className="text-lg font-semibold text-white truncate">{projectName}</p>
          <p className="text-sm text-white/65">
            {duration} sec · {language || 'English'} · {platformLabel}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button type="button" className={qcV2GoldButton} onClick={previewVideo} disabled={!videoUrl}>
          <Play className="w-4 h-4" />
          Preview Reel
        </button>
        <button
          type="button"
          className={qcV2GoldButton}
          onClick={() => void actions.handleDownloadMp4()}
          disabled={actions.downloadingMp4}
        >
          Download MP4
        </button>
        {pid ? (
          <Link href={directorWorkspaceHref(pid)} className={cn(qcV2GhostButton, 'w-full')}>
            Open Director Mode
          </Link>
        ) : null}
        <button
          type="button"
          className={qcV2GhostButton}
          onClick={() => void actions.handleExportCreatorPack()}
          disabled={actions.creatorPackState === 'preparing'}
        >
          Download Assets
        </button>
      </div>
    </div>
  )
}
