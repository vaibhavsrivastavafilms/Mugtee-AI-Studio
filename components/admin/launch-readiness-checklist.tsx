'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Circle, Loader2, RefreshCw, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  LAUNCH_CHECKLIST_ITEMS,
  checklistProgress,
  readChecklistState,
  runAutoProbes,
  writeChecklistState,
  type LaunchChecklistItemId,
  type LaunchChecklistState,
} from '@/lib/admin/launch-readiness'

function ChecklistRow({
  label,
  description,
  checked,
  autoHint,
  onToggle,
}: {
  label: string
  description: string
  checked: boolean
  autoHint?: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'w-full text-left rounded-xl border px-4 py-3 flex items-start gap-3 transition-colors',
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
        {autoHint ? (
          <p className="text-[10px] text-gold-300/70 mt-1 tracking-wide">{autoHint}</p>
        ) : null}
      </div>
    </button>
  )
}

export function LaunchReadinessChecklist() {
  const [state, setState] = useState<LaunchChecklistState>(() => defaultClientState())
  const [probes, setProbes] = useState<Partial<Record<LaunchChecklistItemId, { passed: boolean; hint: string }>>>({})
  const [probing, setProbing] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  function defaultClientState(): LaunchChecklistState {
    if (typeof window === 'undefined') {
      return Object.fromEntries(LAUNCH_CHECKLIST_ITEMS.map((i) => [i.id, false])) as LaunchChecklistState
    }
    return readChecklistState()
  }

  useEffect(() => {
    setState(readChecklistState())
    setHydrated(true)
  }, [])

  const refreshProbes = useCallback(async () => {
    setProbing(true)
    try {
      const results = await runAutoProbes()
      setProbes(results)
    } finally {
      setProbing(false)
    }
  }, [])

  useEffect(() => {
    void refreshProbes()
  }, [refreshProbes])

  const toggle = (id: LaunchChecklistItemId) => {
    setState((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      writeChecklistState(next)
      return next
    })
  }

  const progress = checklistProgress(state)
  const launchReady = progress.completed === progress.total

  if (!hydrated) {
    return (
      <div className="flex items-center gap-2 text-luxe/50 text-sm py-16 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading checklist…
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="w-5 h-5 text-gold-300" />
            <h1 className="font-display text-2xl text-luxe">Launch readiness</h1>
          </div>
          <p className="text-sm text-luxe/50">
            Manual QA checklist for public launch — persisted in this browser.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refreshProbes()}
          disabled={probing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-xs text-luxe hover:border-gold-500/30 disabled:opacity-50"
        >
          {probing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Run auto-checks
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 p-5">
        <div className="flex items-center justify-between gap-4 mb-3">
          <p className="text-[11px] tracking-[0.2em] uppercase text-gold-300/80">Progress</p>
          <span className="text-sm text-luxe">
            {progress.completed}/{progress.total} ({progress.percent}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              launchReady ? 'bg-emerald-500/80' : 'bg-gold-gradient'
            )}
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        {launchReady ? (
          <p className="mt-3 text-sm text-emerald-300/90">All items checked — ready for public launch.</p>
        ) : (
          <p className="mt-3 text-sm text-luxe/50">
            Complete manual checks after smoke-testing each flow.
          </p>
        )}
      </div>

      <div className="space-y-2">
        {LAUNCH_CHECKLIST_ITEMS.map((item) => {
          const probe = item.autoProbe ? probes[item.id] : undefined
          return (
            <ChecklistRow
              key={item.id}
              label={item.label}
              description={item.description}
              checked={state[item.id]}
              autoHint={
                probe
                  ? probe.passed
                    ? `Auto: ${probe.hint}`
                    : `Auto: ${probe.hint} (verify manually)`
                  : undefined
              }
              onToggle={() => toggle(item.id)}
            />
          )
        })}
      </div>

      <p className="text-[11px] text-luxe/45">
        Related:{' '}
        <Link href="/studio/admin" className="text-gold-300/80 hover:text-gold-200">
          Creator validation metrics
        </Link>
        {' · '}
        <Link href="/admin/feedback" className="text-gold-300/80 hover:text-gold-200">
          Creator feedback
        </Link>
      </p>
    </div>
  )
}
