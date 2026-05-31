'use client'

import { useCallback, useMemo, useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { copyTextToClipboard, deriveThumbnailConcept } from '@/lib/workspace/output-workspace-utils'
import { resolveActiveThumbnailUrl } from '@/lib/cinematic/thumbnail-cover'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { WorkspaceSectionShell } from '@/components/workspace/output-workspace/workspace-section-shell'
import { SectionActionButton } from '@/components/workspace/output-workspace/section-action-button'
import { cn } from '@/lib/utils'

type ThumbnailSectionProps = {
  loading?: boolean
}

export function ThumbnailSection({ loading }: ThumbnailSectionProps) {
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const title = useQuickCutGenerationStore((s) => s.title)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const visualStyle = useQuickCutGenerationStore((s) => s.visualStyle)
  const thumbnailImageUrl = useQuickCutGenerationStore((s) => s.thumbnailImageUrl)
  const isRegeneratingThumbnail = useQuickCutGenerationStore((s) => s.isRegeneratingThumbnail)
  const regenerateThumbnailImage = useQuickCutGenerationStore((s) => s.regenerateThumbnailImage)

  const [busyAction, setBusyAction] = useState<'copy' | null>(null)

  const thumbnailConcept = useMemo(
    () =>
      deriveThumbnailConcept({
        hook,
        title,
        scenes,
        visualStyleLabel: visualStyle?.label ?? null,
      }),
    [hook, title, scenes, visualStyle?.label]
  )

  const displayImageUrl = useMemo(
    () => resolveActiveThumbnailUrl(thumbnailImageUrl, scenes),
    [thumbnailImageUrl, scenes]
  )

  const hasConcept = Boolean(thumbnailConcept.trim())
  const hasImage = Boolean(displayImageUrl)
  const hasContent = hasImage || hasConcept

  const runCopy = useCallback(async () => {
    if (!hasConcept) return
    setBusyAction('copy')
    const ok = await copyTextToClipboard(thumbnailConcept)
    toast[ok ? 'success' : 'error'](ok ? 'Thumbnail idea copied' : 'Could not copy')
    setBusyAction(null)
  }, [hasConcept, thumbnailConcept])

  const runRegenerate = useCallback(async () => {
    try {
      await regenerateThumbnailImage()
    } catch {
      toast.message('Could not regenerate thumbnail — try again')
    }
  }, [regenerateThumbnailImage])

  return (
    <WorkspaceSectionShell
      title="Thumbnail"
      subtitle="Cover frame · 9:16"
      loading={loading}
      empty={!hasContent}
      emptyMessage="Thumbnail appears once hook or storyboard exists."
      actions={
        <>
          <SectionActionButton
            label="Copy"
            disabled={!hasConcept}
            loading={busyAction === 'copy'}
            onClick={() => void runCopy()}
          />
          <SectionActionButton
            label="Regenerate"
            loading={isRegeneratingThumbnail}
            onClick={() => void runRegenerate()}
          />
        </>
      }
    >
      <div className="space-y-3">
        {hasImage ? (
          <div
            className={cn(
              'relative mx-auto w-full max-w-[220px] overflow-hidden rounded-lg border border-white/[0.08]',
              'aspect-[9/16] bg-black/50'
            )}
          >
            <Image
              src={displayImageUrl!}
              alt={thumbnailConcept || 'Cover thumbnail'}
              fill
              unoptimized
              className="object-cover"
              sizes="220px"
            />
          </div>
        ) : null}
        {hasConcept ? (
          <p className="text-xs text-luxe/55 leading-relaxed">
            <span className="text-[9px] uppercase tracking-[0.18em] text-gold-300/60 block mb-1">
              Cover concept
            </span>
            {thumbnailConcept}
          </p>
        ) : null}
      </div>
    </WorkspaceSectionShell>
  )
}
