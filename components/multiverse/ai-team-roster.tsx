'use client'

import { useEffect, useState } from 'react'
import { AI_TEAM_ROSTER, unlockedTeamMembers, lockedTeamMembers } from '@/lib/multiverse/ai-team-unlock'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

export function AiTeamRoster({
  creatorLevel,
  className,
}: {
  creatorLevel: number
  className?: string
}) {
  const unlocked = unlockedTeamMembers(creatorLevel)
  const locked = lockedTeamMembers(creatorLevel)

  return (
    <section className={cn('space-y-4', className)}>
      <div>
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/70 mb-1">AI Team</p>
        <h3 className="font-display text-lg text-luxe/90">Your unlocked agents</h3>
        <p className="text-[11px] text-luxe/45 mt-0.5">
          {unlocked.length} of {AI_TEAM_ROSTER.length} team members active
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {unlocked.map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-3"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg" aria-hidden>{member.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-luxe/85">{member.label}</p>
                <p className="text-[10px] text-gold-300/60 uppercase tracking-wider">{member.role}</p>
                <p className="text-[11px] text-luxe/50 mt-1 leading-snug">{member.personality}</p>
              </div>
            </div>
          </div>
        ))}
        {locked.slice(0, 3).map((member) => (
          <div
            key={member.id}
            className="rounded-xl border border-white/[0.05] bg-white/[0.02] p-3 opacity-60"
          >
            <div className="flex items-start gap-2">
              <span className="text-lg grayscale" aria-hidden>{member.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-luxe/55">{member.label}</p>
                  <Lock className="w-3 h-3 text-luxe/35 shrink-0" />
                </div>
                <p className="text-[10px] text-luxe/40">Unlocks at Lv {member.unlockLevel}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export function AiTeamRosterLoader({ className }: { className?: string }) {
  const [level, setLevel] = useState(1)

  useEffect(() => {
    void fetch('/api/mission/profile', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.mission?.creator_level) setLevel(Number(d.mission.creator_level) || 1)
      })
      .catch(() => {})
  }, [])

  return <AiTeamRoster creatorLevel={level} className={className} />
}
