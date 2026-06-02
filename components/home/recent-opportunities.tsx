'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { MugteeAvatar } from '@/components/avatar'
import { useMugteeCompanionStore } from '@/stores/mugtee-companion-store'
import { useCompanionMemoryContext } from '@/hooks/use-companion-memory-context'
import { buildTodaysBrief } from '@/lib/sidekick/todays-brief'
import { quickCutStudioHref } from '@/lib/create/routes'
import type { CreatorMemoryProfile } from '@/lib/creator/creator-memory'

export function RecentOpportunities({
  profile,
}: {
  profile: CreatorMemoryProfile | null
}) {
  const recentOpportunities = useMugteeCompanionStore((s) => s.recentOpportunities)
  const setRecentOpportunities = useMugteeCompanionStore((s) => s.setRecentOpportunities)

  const brief = useMemo(
    () => (profile ? buildTodaysBrief(profile, null) : null),
    [profile]
  )

  useEffect(() => {
    if (!brief) return
    setRecentOpportunities([
      {
        id: 'today-primary',
        title: brief.recommendedTopic,
        hook: brief.recommendedHook,
        href: quickCutStudioHref({ topic: brief.recommendedTopic.slice(0, 120) }),
      },
      {
        id: 'today-secondary',
        title: brief.contentType,
        hook: brief.reason,
        href: quickCutStudioHref({ topic: brief.recommendedHook.slice(0, 120) }),
      },
    ])
  }, [brief, setRecentOpportunities])

  if (!recentOpportunities.length) return null

  return (
    <section className="w-full max-w-lg mx-auto space-y-3 px-2">
      <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/70 text-center">
        Recent opportunities
      </p>
      <ul className="space-y-2">
        {recentOpportunities.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link
              href={item.href}
              className="block rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-4 py-3 hover:border-gold-500/30 hover:bg-gold-500/[0.07] transition group"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-gold-400/80 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-luxe/90 font-medium leading-snug group-hover:text-gold-100 transition">
                    {item.title}
                  </p>
                  <p className="text-[11px] text-luxe/55 mt-1 line-clamp-2">&ldquo;{item.hook}&rdquo;</p>
                </div>
              </div>
            </Link>
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
