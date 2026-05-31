'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { StoryVaultEntry } from '@/lib/multiverse/types'
import { cn } from '@/lib/utils'
import { BookOpen } from 'lucide-react'

export function StoryVaultTimeline({ className }: { className?: string }) {
  const [entries, setEntries] = useState<StoryVaultEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetch('/api/multiverse/story-vault', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEntries(d?.entries ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4 text-gold-400" />
        <div>
          <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/70">Story Vault</p>
          <h3 className="font-display text-lg text-luxe/90">Your creative timeline</h3>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-luxe/45 py-4">Loading timeline…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-luxe/45 py-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4">
          Complete your first project — every hook, script, and export becomes part of your story vault.
        </p>
      ) : (
        <ol className="relative border-l border-gold-500/20 ml-2 space-y-4 pl-5">
          {entries.slice(0, 12).map((entry) => (
            <li key={entry.id} className="relative">
              <span className="absolute -left-[1.35rem] top-1.5 w-2 h-2 rounded-full bg-gold-500/50 ring-2 ring-black" />
              <p className="text-sm text-luxe/85">{entry.title}</p>
              {entry.highlight ? (
                <p className="text-[11px] text-luxe/45 italic mt-0.5">&ldquo;{entry.highlight}&rdquo;</p>
              ) : null}
              <p className="text-[10px] text-luxe/35 mt-0.5">
                {entry.type.replace(/_/g, ' ')} ·{' '}
                {formatDistanceToNow(parseISO(entry.at), { addSuffix: true })}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
