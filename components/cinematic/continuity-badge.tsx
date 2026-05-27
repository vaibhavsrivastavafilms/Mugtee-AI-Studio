'use client'

import { REFINEMENT_CONTINUITY_LINE } from '@/lib/creator/output-confidence'

export function ContinuityBadge({ visible }: { visible?: boolean }) {
  if (!visible) return null
  return (
    <p className="text-[9px] tracking-[0.2em] uppercase text-[#C8A24E]/55 text-center py-2 animate-in fade-in duration-500">
      {REFINEMENT_CONTINUITY_LINE}
    </p>
  )
}
