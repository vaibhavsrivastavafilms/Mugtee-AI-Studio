'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  isAwaitingConceptSelection,
  readConceptSelectionState,
} from '@/lib/v7/concept-selection.core'
import type { V7ProductionSnapshot } from '@/types/v7/production'

type Props = {
  snapshot: V7ProductionSnapshot
  onSelected: () => Promise<void>
}

export function V7ConceptSelector({ snapshot, onSelected }: Props) {
  const selection = readConceptSelectionState(snapshot.production.timeline_json)
  const awaiting = isAwaitingConceptSelection(snapshot.production.timeline_json)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!awaiting || !selection?.concepts.length) return null

  async function continueProduction() {
    if (selectedIndex == null || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/v7/productions/${snapshot.production.id}/select-concept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conceptIndex: selectedIndex }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string }
      if (!res.ok || !data.ok) {
        throw new Error(data.message ?? data.error ?? 'Could not select concept')
      }
      await onSelected()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not select concept')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mb-8 overflow-x-hidden rounded-2xl border border-[#D4AF37]/25 bg-[#0a0a0a]/90 p-4 sm:p-6">
      <h2 className="text-lg font-semibold text-white">Choose your story</h2>
      <p className="mt-1 text-sm text-white/55">
        Pick one creative direction. Mugtee will build the full film from your selection.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {selection.concepts.map((concept, index) => {
          const active = selectedIndex === index
          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={cn(
                'min-h-[44px] rounded-xl border p-4 text-left transition',
                active
                  ? 'border-[#D4AF37] bg-[#D4AF37]/10 ring-1 ring-[#D4AF37]/40'
                  : 'border-white/[0.08] bg-black/30 hover:border-white/20'
              )}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]/80">
                Concept {index + 1}
              </p>
              <p className="mt-2 font-medium text-white">{concept.title}</p>
              <p className="mt-2 text-sm text-white/70">{concept.hook}</p>
              <p className="mt-2 text-xs text-white/45">{concept.coreAngle}</p>
            </button>
          )
        })}
      </div>

      {error ? (
        <p className="mt-3 text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-5">
        <Button
          type="button"
          disabled={selectedIndex == null || busy}
          onClick={() => void continueProduction()}
          className="min-h-[44px] w-full bg-gold-gradient text-black sm:w-auto sm:px-8"
        >
          {busy ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting production…
            </>
          ) : (
            'Continue production'
          )}
        </Button>
      </div>
    </section>
  )
}
