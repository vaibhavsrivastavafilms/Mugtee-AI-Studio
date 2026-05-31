'use client'

import { Check, Loader2, X } from 'lucide-react'
import {
  SECTION_READY_LABELS,
  SECTION_STATUS_LABELS,
  type SectionGenerationStatus,
  type SectionId,
} from '@/lib/cinematic/section-generation-status'
import { cn } from '@/lib/utils'

export function SectionStatusBadge({
  section,
  status,
  className,
}: {
  section: SectionId
  status: SectionGenerationStatus
  className?: string
}) {
  if (status === 'idle') return null

  const label =
    status === 'completed'
      ? SECTION_READY_LABELS[section]
      : status === 'generating'
        ? `Generating ${SECTION_STATUS_LABELS[section].toLowerCase()}…`
        : `${SECTION_STATUS_LABELS[section]} failed`

  return (
    <p
      className={cn(
        'text-[10px] sm:text-[11px] tracking-[0.16em] uppercase flex flex-wrap items-center gap-1.5 max-w-full',
        status === 'completed' && 'text-emerald-400/85',
        status === 'generating' && 'text-gold-300/80',
        status === 'failed' && 'text-red-400/80',
        className
      )}
    >
      {status === 'completed' ? (
        <Check className="w-3 h-3 shrink-0" aria-hidden />
      ) : status === 'generating' ? (
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" aria-hidden />
      ) : (
        <X className="w-3 h-3 shrink-0" aria-hidden />
      )}
      {label}
    </p>
  )
}
