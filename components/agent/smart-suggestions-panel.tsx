'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

export function SmartSuggestionsPanel({ className }: { className?: string }) {
  const suggestions = useCreatorAgentStore((s) => s.suggestions)
  const fetchSuggestions = useCreatorAgentStore((s) => s.fetchSuggestions)

  useEffect(() => {
    void fetchSuggestions()
  }, [fetchSuggestions])

  if (!suggestions.length) return null

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/70 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Smart suggestions
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li key={s.id}>
            {s.href ? (
              <Link
                href={s.href}
                className="block rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2.5 hover:border-gold-500/30 transition-colors"
              >
                <SuggestionBody suggestion={s} />
              </Link>
            ) : (
              <div className="rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2.5">
                <SuggestionBody suggestion={s} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function SuggestionBody({
  suggestion,
}: {
  suggestion: { title: string; body: string; actionLabel?: string }
}) {
  return (
    <>
      <p className="text-xs font-medium text-gold-100/90">{suggestion.title}</p>
      <p className="text-[11px] text-luxe/55 mt-0.5 leading-snug">{suggestion.body}</p>
      {suggestion.actionLabel ? (
        <span className="inline-block mt-1.5 text-[9px] tracking-[0.16em] uppercase text-gold-300/60">
          {suggestion.actionLabel}
        </span>
      ) : null}
    </>
  )
}
