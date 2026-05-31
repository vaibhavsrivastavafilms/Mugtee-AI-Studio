'use client'

import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companionCopy } from '@/lib/companion/microcopy'
import { useCompanionStore } from '@/stores/companion-store'

type StoryExpansionCardProps = {
  title?: string
  hook?: string
  script?: string
  niche?: string
  className?: string
}

export function StoryExpansionCard({
  title,
  hook,
  script,
  niche,
  className,
}: StoryExpansionCardProps) {
  const expansions = useCompanionStore((s) => s.expansions)
  const fetchExpansions = useCompanionStore((s) => s.fetchExpansions)

  useEffect(() => {
    if (!hook && !script && !title) return
    void fetchExpansions({ title, hook, script, niche })
  }, [title, hook, script, niche, fetchExpansions])

  if (!expansions.length) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <Sparkles className="w-3 h-3" />
        {companionCopy('expansionTitle')}
      </div>

      <ul className="space-y-2">
        {expansions.map((exp) => (
          <li
            key={exp.id}
            className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5"
          >
            <p className="text-[12px] font-medium text-luxe/85">{exp.title}</p>
            <p className="text-[11px] text-luxe/55 mt-0.5 leading-relaxed">{exp.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
