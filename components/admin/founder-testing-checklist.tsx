'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  FOUNDER_CATEGORY_LABELS,
  FOUNDER_TESTING_ITEMS,
  defaultFounderTestingState,
  founderTestingProgress,
  readFounderTestingState,
  writeFounderTestingState,
  type FounderTestingCategory,
  type FounderTestingItemId,
  type FounderTestingState,
} from '@/lib/admin/founder-testing-checklist'

function ChecklistRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-xl border px-4 py-3 min-h-[44px] flex items-start gap-3 transition-colors touch-manipulation',
        checked
          ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
          : 'border-white/10 bg-black/30 hover:border-gold-500/25'
      )}
    >
      {checked ? (
        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
      ) : (
        <Circle className="w-5 h-5 shrink-0 text-luxe/30 mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-luxe">{label}</p>
        <p className="text-[11px] text-luxe/50 mt-0.5">{description}</p>
      </div>
    </button>
  )
}

const CATEGORIES: FounderTestingCategory[] = ['bugs', 'ux_issues', 'launch_blockers']

export function FounderTestingChecklist() {
  const [state, setState] = useState<FounderTestingState>(() => defaultFounderTestingState())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(readFounderTestingState())
    setHydrated(true)
  }, [])

  const toggle = useCallback((id: FounderTestingItemId) => {
    setState((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      writeFounderTestingState(next)
      return next
    })
  }, [])

  const progress = founderTestingProgress(state)

  if (!hydrated) {
    return (
      <p className="text-sm text-luxe/50 py-16 text-center">Loading founder checklist…</p>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList className="w-5 h-5 text-gold-300" />
          <h1 className="font-display text-2xl text-luxe">Founder testing checklist</h1>
        </div>
        <p className="text-sm text-luxe/50">
          Track bugs, UX issues, and launch blockers — saved in this browser only.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-[11px] tracking-[0.2em] uppercase text-gold-300/80">Cleared</p>
          <span className="text-sm text-luxe">
            {progress.completed}/{progress.total} ({progress.percent}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-gold-gradient transition-all duration-300"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {CATEGORIES.map((category) => (
        <section key={category} className="space-y-2">
          <h2 className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80">
            {FOUNDER_CATEGORY_LABELS[category]}
          </h2>
          {FOUNDER_TESTING_ITEMS.filter((i) => i.category === category).map((item) => (
            <ChecklistRow
              key={item.id}
              label={item.label}
              description={item.description}
              checked={state[item.id]}
              onToggle={() => toggle(item.id)}
            />
          ))}
        </section>
      ))}

      <p className="text-[11px] text-luxe/45">
        Automated launch probes:{' '}
        <Link href="/admin/launch-readiness" className="text-gold-300/80 hover:text-gold-200">
          Launch readiness
        </Link>
        {' · '}
        <Link href="/admin/analytics" className="text-gold-300/80 hover:text-gold-200">
          Conversion analytics
        </Link>
      </p>
    </div>
  )
}
