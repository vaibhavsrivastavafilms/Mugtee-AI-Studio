'use client'

import { getCreatorOsProfile } from '@/lib/creator/creator-os-profile'
import { v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type CreatorMemoryPanelProps = {
  className?: string
}

/** Phase E — shows what Mugtee remembers (local additive profile). */
export function CreatorMemoryPanel({ className }: CreatorMemoryPanelProps) {
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const profile = useMemo(() => getCreatorOsProfile(), [isComplete])

  const rows = [
    { label: 'Last Reel', value: profile.lastReelTitle },
    { label: 'Preferred Voice', value: profile.voiceName },
    { label: 'Preferred Style', value: profile.visualStyle ?? profile.tone },
    { label: 'Favorite Platform', value: profile.platform },
    { label: 'Niche', value: profile.niche },
    { label: 'Duration', value: profile.duration ? `${profile.duration}s` : null },
    { label: 'Language', value: profile.language },
  ].filter((r) => r.value)

  if (rows.length === 0) {
    return (
      <div className={cn(v4PanelClass, 'px-3 py-3', className)}>
        <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45">Creator Memory</p>
        <p className="text-[10px] text-luxe/40 mt-1.5">Mugtee will learn your preferences after your first reel.</p>
      </div>
    )
  }

  return (
    <div className={cn(v4PanelClass, 'px-3 py-3', className)}>
      <p className="text-[9px] tracking-[0.18em] uppercase text-gold-300/60">What Mugtee Remembers</p>
      <ul className="mt-2 space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex justify-between gap-2 text-[10px]">
            <span className="text-luxe/45">{row.label}</span>
            <span className="text-luxe/75 truncate text-right">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
