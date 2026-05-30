'use client'

import { V2EmptyState } from '@/components/v2/v2-empty-state'
import {
  CREATOR_TYPE_SHOWCASE,
  SHOWCASE_EXAMPLES,
  STARTER_PROMPT_CHIPS,
  nicheLabel,
} from '@/lib/showcase/examples'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function ProjectLibraryEmpty() {
  const examples = SHOWCASE_EXAMPLES.slice(0, 3)
  const niches = CREATOR_TYPE_SHOWCASE.slice(0, 4)

  return (
    <div className="space-y-8">
      <V2EmptyState />

      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--v2-gold)] text-center">
          Suggested creator niches
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {niches.map((niche) => (
            <Link
              key={niche.label}
              href="/create?mode=quick"
              className="px-3 py-2 rounded-full border border-[var(--v2-border)] text-[11px] text-[var(--v2-text-secondary)] hover:border-[var(--v2-gold)]/35 hover:text-[var(--v2-text-primary)] transition-colors duration-150"
            >
              {niche.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.24em] uppercase text-[var(--v2-gold)] text-center">
          Cinematic starter examples
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {examples.map((example) => (
            <Link
              key={example.slug}
              href={`/cinematic/examples/${example.slug}`}
              className="group rounded-xl border border-[var(--v2-border)] bg-[var(--v2-surface)] p-4 hover:border-[var(--v2-gold)]/35 transition-colors duration-150"
            >
              <div className="text-[9px] tracking-[0.22em] uppercase text-[var(--v2-gold)]/80 mb-2">
                {nicheLabel(example.niche)}
              </div>
              <div className="text-sm text-[var(--v2-text-primary)] font-medium leading-snug group-hover:text-[var(--v2-gold)] transition-colors duration-150">
                {example.title}
              </div>
              <p className="mt-2 text-[11px] text-[var(--v2-text-secondary)] italic line-clamp-2">
                {example.hook}
              </p>
              <span className="mt-3 inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-[var(--v2-text-secondary)] group-hover:text-[var(--v2-gold)] transition-colors duration-150">
                View example <ArrowRight className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {STARTER_PROMPT_CHIPS.slice(0, 3).map((chip) => (
          <Link
            key={chip.label}
            href={`/create?mode=quick&topic=${encodeURIComponent(chip.prompt)}`}
            className="px-3 py-1.5 rounded-full border border-[var(--v2-border)] text-[10px] text-[var(--v2-text-secondary)] hover:text-[var(--v2-text-primary)] hover:border-[var(--v2-gold)]/35 transition-colors duration-150"
          >
            {chip.label}
          </Link>
        ))}
      </div>
    </div>
  )
}
