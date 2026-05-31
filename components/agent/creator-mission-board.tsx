'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMissionStore } from '@/stores/mission-store'
import { DailyQuestCard } from '@/components/mission/daily-quest-card'
import { CreatorLevelBadge } from '@/components/mission/creator-level-badge'

const AGENT_MISSIONS = [
  {
    key: 'opportunity-create',
    title: 'Act on one opportunity',
    description: 'Pick from today\'s feed and start a project.',
    href: '/studio/growth',
  },
  {
    key: 'hook-test',
    title: 'Test a new hook angle',
    description: 'Generate with a curiosity-first opening.',
    href: '/studio/create',
  },
  {
    key: 'weekly-slot',
    title: 'Fill a weekly plan slot',
    description: 'Complete one item from your content roadmap.',
    href: '/studio/growth',
  },
]

export function CreatorMissionBoard({ className }: { className?: string }) {
  const fetchProfile = useMissionStore((s) => s.fetchProfile)
  const profileLoaded = useMissionStore((s) => s.profileLoaded)

  useEffect(() => {
    if (!profileLoaded) void fetchProfile()
  }, [fetchProfile, profileLoaded])

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[var(--v2-gold)] flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5" />
          Agent missions
        </p>
        <CreatorLevelBadge />
      </div>

      <DailyQuestCard />

      <ul className="space-y-2">
        {AGENT_MISSIONS.map((m) => (
          <li key={m.key}>
            <Link
              href={m.href}
              className="block rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 hover:border-gold-500/25 transition-colors"
            >
              <p className="text-xs font-medium text-luxe/85">{m.title}</p>
              <p className="text-[11px] text-luxe/45 mt-0.5">{m.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
