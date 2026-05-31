'use client'

import {
  IMPROVEMENT_REASON_LABELS,
  type ImprovementReason,
} from '@/lib/creator/moment-feedback'
import { cn } from '@/lib/utils'

const REASON_ORDER: ImprovementReason[] = [
  'hook_weak',
  'script_generic',
  'storyboard_unclear',
  'caption_weak',
  'not_my_niche',
  'other',
]

export function ImprovementReasonPicker({
  value,
  onChange,
  className,
}: {
  value: ImprovementReason | null
  onChange: (reason: ImprovementReason) => void
  className?: string
}) {
  return (
    <div
      className={cn('flex flex-wrap gap-2', className)}
      role="group"
      aria-label="What could be better?"
    >
      {REASON_ORDER.map((reason) => (
        <button
          key={reason}
          type="button"
          onClick={() => onChange(reason)}
          className={cn(
            'min-h-[36px] px-3 py-1.5 rounded-lg border text-[11px] transition-colors touch-manipulation',
            value === reason
              ? 'border-gold-500/40 bg-gold-500/10 text-gold-200'
              : 'border-white/10 text-luxe/55 hover:border-white/20 hover:text-luxe/80'
          )}
        >
          {IMPROVEMENT_REASON_LABELS[reason]}
        </button>
      ))}
    </div>
  )
}
