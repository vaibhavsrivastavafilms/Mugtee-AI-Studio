'use client'

import { useEffect } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import { useCreatorMemoryStore } from '@/stores/creator-memory-store'

type CreatorTimelineProps = {
  className?: string
  limit?: number
}

const TYPE_COLORS: Record<string, string> = {
  export_success: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-200',
  hook_accept: 'bg-gold-500/20 border-gold-500/30 text-gold-200',
  hook_regen: 'bg-amber-500/15 border-amber-500/25 text-amber-200',
  project_save: 'bg-white/[0.04] border-white/[0.08] text-luxe/70',
  reflection: 'bg-violet-500/15 border-violet-500/25 text-violet-200',
  journal: 'bg-white/[0.04] border-white/[0.08] text-luxe/60',
}

export function CreatorTimeline({ className, limit = 12 }: CreatorTimelineProps) {
  const timeline = useCreatorMemoryStore((s) => s.timeline)
  const refreshTimeline = useCreatorMemoryStore((s) => s.refreshTimeline)

  useEffect(() => {
    void refreshTimeline()
  }, [refreshTimeline])

  const entries = timeline.slice(0, limit)

  return (
    <div className={cn('rounded-xl border border-white/[0.06] bg-white/[0.02] p-4', className)}>
      <p className="text-[10px] tracking-wider uppercase text-luxe/45 mb-4">Creator timeline</p>
      {entries.length === 0 ? (
        <p className="text-xs text-luxe/45 py-4 text-center">
          Your creative journey will appear here as you create.
        </p>
      ) : (
        <ol className="relative border-l border-gold-500/15 ml-2 space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="ml-4">
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-gold-500/60 ring-2 ring-[var(--v2-bg,#0a0a0b)]" />
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <span
                  className={cn(
                    'text-[9px] tracking-wider uppercase px-1.5 py-0.5 rounded border',
                    TYPE_COLORS[entry.type] ?? 'bg-white/[0.03] border-white/[0.06] text-luxe/50'
                  )}
                >
                  {entry.type.replace(/_/g, ' ')}
                </span>
                <time className="text-[10px] text-luxe/35">
                  {formatDistanceToNow(parseISO(entry.at), { addSuffix: true })}
                </time>
              </div>
              <p className="text-sm text-luxe/75">{entry.label}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
