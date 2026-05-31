'use client'

import { useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { resolveProactiveSuggestions, resolveDashboardProactiveSuggestions } from '@/lib/sidekick/proactive-suggestions'
import { cn } from '@/lib/utils'

export function ProactiveSuggestions({
  hook,
  script,
  title,
  hasScenes,
  hasVoice,
  variant = 'contextual',
  className,
}: {
  hook?: string | null
  script?: string | null
  title?: string | null
  hasScenes?: boolean
  hasVoice?: boolean
  variant?: 'contextual' | 'dashboard'
  className?: string
}) {
  const suggestions = useMemo(
    () =>
      variant === 'dashboard'
        ? resolveDashboardProactiveSuggestions()
        : resolveProactiveSuggestions({
            hook,
            script,
            title,
            hasScenes,
            hasVoice,
          }),
    [variant, hook, script, title, hasScenes, hasVoice]
  )

  if (!suggestions.length) return null

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-[10px] tracking-[0.24em] uppercase text-gold-300/70 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Mugtee noticed
      </p>
      <ul className="space-y-2">
        {suggestions.map((s) => (
          <li
            key={s.id}
            className="rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2.5"
          >
            <p className="text-xs font-medium text-gold-100/90">{s.title}</p>
            <p className="text-[11px] text-luxe/55 mt-0.5 leading-snug">{s.body}</p>
            {s.actionLabel ? (
              <span className="inline-block mt-1.5 text-[9px] tracking-[0.16em] uppercase text-gold-300/60">
                {s.actionLabel}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
