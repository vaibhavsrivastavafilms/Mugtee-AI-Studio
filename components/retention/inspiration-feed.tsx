'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Lightbulb } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  getRotatedInspirationIdeas,
  inspirationCategoryLabel,
  inspirationIdeaHref,
} from '@/lib/retention/inspiration-ideas'

type InspirationFeedProps = {
  className?: string
  count?: number
}

export function InspirationFeed({ className, count = 4 }: InspirationFeedProps) {
  const ideas = useMemo(() => getRotatedInspirationIdeas(count), [count])

  return (
    <section
      className={cn(
        'rounded-2xl border border-white/[0.06] bg-black/25 backdrop-blur-sm p-4 sm:p-5 space-y-4',
        className
      )}
      aria-label="Creator inspiration feed"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/10 text-gold-300">
          <Lightbulb className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="font-display text-base text-[#F4E7C1]">Creator inspiration</p>
          <p className="text-xs text-luxe/50 mt-0.5 leading-relaxed">
            Fresh ideas rotate daily — click to prefill your create flow. You press generate when
            ready.
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <Link
              href={inspirationIdeaHref(idea)}
              className={cn(
                'group flex items-center justify-between gap-3 rounded-xl',
                'border border-white/[0.08] bg-black/35 px-3.5 py-3 min-h-[52px]',
                'hover:border-gold-500/30 hover:bg-gold-500/[0.05] transition-colors'
              )}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#F4E7C1]/90 truncate">{idea.label}</p>
                <Badge
                  variant="outline"
                  className="mt-1 border-gold-500/20 text-[9px] text-gold-200/70"
                >
                  {inspirationCategoryLabel(idea.category)}
                </Badge>
              </div>
              <ArrowRight className="h-4 w-4 text-luxe/30 group-hover:text-gold-300 transition shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
