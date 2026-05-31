'use client'

import { useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

const FORMAT_LABELS: Record<string, string> = {
  short: 'Short',
  reel: 'Reel',
  long_form: 'Long-form',
  experimental: 'Experimental',
}

export function WeeklyPlannerCard({ className }: { className?: string }) {
  const weeklyPlan = useCreatorAgentStore((s) => s.weeklyPlan)
  const fetchWeeklyPlan = useCreatorAgentStore((s) => s.fetchWeeklyPlan)

  useEffect(() => {
    void fetchWeeklyPlan()
  }, [fetchWeeklyPlan])

  if (!weeklyPlan) return null

  const preview = weeklyPlan.slots.slice(0, 5)

  return (
    <div
      className={cn(
        'rounded-2xl border border-gold-500/20 bg-gold-500/[0.04] p-5 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-[var(--v2-gold)]" />
        <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/80">Weekly plan</p>
      </div>
      {weeklyPlan.summary ? (
        <p className="text-xs text-luxe/55 leading-relaxed">{weeklyPlan.summary}</p>
      ) : null}
      <ul className="space-y-2">
        {preview.map((slot) => (
          <li
            key={slot.id}
            className="flex items-start gap-2 text-xs border-b border-white/[0.04] pb-2 last:border-0"
          >
            <span className="shrink-0 text-[9px] tracking-wider uppercase text-gold-300/60 mt-0.5">
              {FORMAT_LABELS[slot.format] ?? slot.format}
            </span>
            <span className="text-luxe/75">{slot.title}</span>
          </li>
        ))}
      </ul>
      {weeklyPlan.slots.length > 5 ? (
        <p className="text-[10px] text-luxe/40">+{weeklyPlan.slots.length - 5} more slots this week</p>
      ) : null}
    </div>
  )
}
