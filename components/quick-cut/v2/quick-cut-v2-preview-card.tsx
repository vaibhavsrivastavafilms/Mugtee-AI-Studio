'use client'

import Image from 'next/image'
import { cn } from '@/lib/utils'
import { qcV2Panel } from '@/lib/quick-cut/quick-cut-v2-design'
import { QUICK_PLATFORM_OPTIONS } from '@/lib/studio/quick-create-options'
import { useQuickCutProjectStatus } from '@/lib/quick-cut/use-quick-cut-project-status'
import { resolveActiveThumbnailUrl } from '@/lib/cinematic/thumbnail-cover'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type QuickCutV2PreviewCardProps = {
  platformLabel?: string
  className?: string
}

export function QuickCutV2PreviewCard({ platformLabel, className }: QuickCutV2PreviewCardProps) {
  const { projectName, duration, language } = useQuickCutProjectStatus()
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const thumbnailImageUrl = useQuickCutGenerationStore((s) => s.thumbnailImageUrl)
  const thumb =
    thumbnailImageUrl?.trim() ||
    resolveActiveThumbnailUrl(null, scenes) ||
    null

  const platform =
    platformLabel ??
    QUICK_PLATFORM_OPTIONS.find((o) => o.value === 'youtube_short')?.label ??
    'Social Reels'

  return (
    <div className={cn(qcV2Panel, 'p-4 sm:p-5 flex gap-4 items-center', className)}>
      <div className="relative w-20 h-28 sm:w-24 sm:h-32 shrink-0 rounded-xl overflow-hidden bg-[#050505] border border-[rgba(212,175,55,0.15)]">
        {thumb ? (
          <Image src={thumb} alt="" fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#111111,#050505)]" />
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <p className="text-base font-semibold text-white truncate">{projectName}</p>
        <p className="text-sm text-white/70">{duration} Seconds</p>
        <p className="text-sm text-white/70 capitalize">{language || 'English'}</p>
        <p className="text-sm text-[#E6C76A]">{platform}</p>
      </div>
    </div>
  )
}
