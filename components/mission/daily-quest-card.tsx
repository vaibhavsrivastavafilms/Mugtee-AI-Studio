'use client'

import { cn } from '@/lib/utils'
import { DAILY_QUESTS } from '@/lib/mission/daily-quests'
import { useMissionStore } from '@/stores/mission-store'

export function DailyQuestCard({ className }: { className?: string }) {
  const quests = useMissionStore((s) => s.profile.daily_quests)

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 backdrop-blur-sm p-4',
        className
      )}
    >
      <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/75 mb-3">Daily Quests</p>
      <ul className="space-y-2">
        {DAILY_QUESTS.map((quest) => {
          const progress = quests[quest.id]
          const done = progress?.completed
          const count = progress?.count ?? 0
          return (
            <li
              key={quest.id}
              className={cn(
                'rounded-lg border px-3 py-2 text-xs',
                done
                  ? 'border-[var(--v2-gold)]/30 bg-[var(--v2-gold)]/[0.06]'
                  : 'border-white/[0.06] bg-black/20'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={done ? 'text-[var(--v2-gold)]' : 'text-luxe/75'}>
                  {quest.title}
                </span>
                <span className="text-[10px] text-luxe/50 shrink-0">
                  {done ? '✓' : `${Math.min(count, quest.target)}/${quest.target}`}
                </span>
              </div>
              <p className="text-[10px] text-luxe/45 mt-0.5">{quest.description}</p>
              {quest.xpReward > 0 ? (
                <p className="text-[10px] text-gold-300/60 mt-1">+{quest.xpReward} XP</p>
              ) : quest.badge ? (
                <p className="text-[10px] text-gold-300/60 mt-1">Badge: {quest.badge}</p>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
