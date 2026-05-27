'use client'

import { Loader2, Sparkles } from 'lucide-react'
import { trackCreatorMilestone } from '@/lib/creator/session-insights'
import { TRUST_COPY } from '@/lib/creator/trust-copy'
import { SelectiveEvolutionMarker } from '@/components/cinematic/selective-evolution-marker'
import { SelectiveRefineGuidance } from '@/components/cinematic/selective-refine-guidance'
import { cn } from '@/lib/utils'

export function CinematicRefineAction({
  label,
  busy,
  disabled,
  onClick,
  showContinuity,
}: {
  label: string
  busy?: boolean
  disabled?: boolean
  onClick: () => void
  showContinuity?: boolean
}) {
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => {
          trackCreatorMilestone('regeneration_used')
          onClick()
        }}
        className={cn(
          'inline-flex items-center gap-1.5 min-h-[44px] px-2 sm:px-0 text-[10px] tracking-[0.18em] uppercase transition-colors disabled:opacity-40 disabled:pointer-events-none',
          busy ? 'text-[#E7C56A]' : 'text-[#C8A24E]/75 hover:text-[#E7C56A]'
        )}
      >
        {busy ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        {label}
      </button>
      {busy && showContinuity ? (
        <>
          <span className="text-[8px] tracking-[0.16em] uppercase text-white/30 hidden sm:inline">
            {TRUST_COPY.pacingContinuityProtected}
          </span>
          <SelectiveRefineGuidance visible seed={label.length % 3} />
          <SelectiveEvolutionMarker visible seed={label.length % 2} />
        </>
      ) : null}
    </span>
  )
}
