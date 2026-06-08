'use client'

import { cn } from '@/lib/utils'
import type { SceneDirectorNotes } from '@/lib/quick-cut/scene-card-v2-helpers'

type SceneDirectorNotesPanelProps = {
  notes: SceneDirectorNotes
  className?: string
  defaultOpen?: boolean
}

export function SceneDirectorNotesPanel({
  notes,
  className,
  defaultOpen = false,
}: SceneDirectorNotesPanelProps) {
  const rows = [
    { label: 'Emotion', value: notes.emotion },
    { label: 'Narrative Role', value: notes.narrativeRole },
    { label: 'Motion Recommendation', value: notes.motionRecommendation },
    { label: 'Transition Recommendation', value: notes.transitionRecommendation },
  ]

  return (
    <details
      className={cn('rounded-lg border border-gold-500/15 bg-gold-500/[0.03]', className)}
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-[9px] tracking-[0.18em] uppercase text-gold-300/65">
        Director Notes
      </summary>
      <dl className="px-3 pb-3 space-y-1.5 border-t border-white/[0.05] pt-2">
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[7.5rem_1fr] gap-2 text-[10px]">
            <dt className="text-luxe/40">{row.label}</dt>
            <dd className="text-luxe/70 leading-snug">{row.value}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
