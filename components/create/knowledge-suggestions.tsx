'use client'

import { useMemo } from 'react'
import { Library } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorKnowledge } from '@/hooks/use-creator-knowledge'
import {
  findDuplicateTitleMatch,
  suggestRelatedTopics,
} from '@/lib/creator/knowledge-base'
import { STUDIO } from '@/lib/create/routes'
import Link from 'next/link'

export function KnowledgeSuggestions({
  prompt,
  niche,
  onSelectTopic,
  className,
}: {
  prompt: string
  niche?: string
  onSelectTopic?: (topic: string) => void
  className?: string
}) {
  const { aggregate, sources, loading } = useCreatorKnowledge(40)

  const suggestions = useMemo(() => {
    if (loading || !sources.length) return []
    return suggestRelatedTopics({
      niche,
      prompt,
      excludeTitle: prompt.trim(),
      projects: sources,
      limit: 3,
    })
  }, [loading, sources, niche, prompt])

  const duplicateMatch = useMemo(() => {
    if (!aggregate?.titles.length || prompt.trim().length < 4) return null
    return findDuplicateTitleMatch(prompt.trim(), aggregate.titles)
  }, [aggregate?.titles, prompt])

  if (loading && !aggregate) return null
  if (!suggestions.length && !duplicateMatch) return null

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/35 p-3 sm:p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.18em] uppercase text-gold-300/80">
          <Library className="w-3.5 h-3.5" />
          From your library
        </div>
        <Link
          href={STUDIO.knowledge}
          className="text-[9px] tracking-wider uppercase text-luxe/45 hover:text-gold-200 transition"
        >
          Knowledge base
        </Link>
      </div>

      {duplicateMatch ? (
        <p className="text-[11px] text-amber-200/90 leading-relaxed" role="status">
          This idea is very close to &ldquo;{duplicateMatch}&rdquo; in your library — try a fresh
          angle to avoid repeating yourself.
        </p>
      ) : null}

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((topic) => (
            <button
              key={topic}
              type="button"
              onClick={() => onSelectTopic?.(topic)}
              className={cn(
                'max-w-full text-left rounded-full border border-gold-500/20 bg-gold-500/[0.06]',
                'px-3 py-1.5 text-[11px] text-luxe/85 hover:border-gold-500/40 hover:text-gold-100 transition truncate'
              )}
              title={topic}
            >
              {topic.length > 56 ? `${topic.slice(0, 56)}…` : topic}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
