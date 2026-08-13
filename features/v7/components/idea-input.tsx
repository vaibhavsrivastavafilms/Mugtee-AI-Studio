'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const EXAMPLE =
  'Create a 45-second cinematic restaurant advertisement for Table Tales during monsoon.'

export function V7IdeaInput({
  className,
  onProductionCreated,
}: {
  className?: string
  onProductionCreated?: (productionId: string) => void
}) {
  const router = useRouter()
  const [idea, setIdea] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    const trimmed = idea.trim()
    if (trimmed.length < 8 || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/v7/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea: trimmed }),
      })
      const data = (await res.json()) as {
        productionId?: string
        success?: boolean
        message?: string
        error?: string | { message?: string }
      }

      if (!res.ok || !data.productionId) {
        const msg =
          typeof data.message === 'string' && data.message
            ? data.message
            : typeof data.error === 'string'
              ? data.error
              : data.error?.message ?? 'Could not start production.'
        throw new Error(msg)
      }

      onProductionCreated?.(data.productionId)
      router.push(`/studio/${data.productionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start production.')
      setLoading(false)
    }
  }

  return (
    <div className={cn('mx-auto flex w-full max-w-3xl flex-col items-center px-4', className)}>
      <p className="mb-3 text-[11px] uppercase tracking-[0.32em] text-[#D4AF37]/80">
        Mugtee Production OS
      </p>
      <h1 className="text-center font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        One idea. One film.
      </h1>
      <p className="mt-4 max-w-xl text-center text-base text-white/60 sm:text-lg">
        Describe your idea. Mugtee researches, writes, directs, animates, and exports — autonomously.
      </p>

      <div className="mt-10 w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/90 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
        <textarea
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          rows={4}
          placeholder={EXAMPLE}
          className="w-full resize-none rounded-xl bg-transparent px-5 py-4 text-base text-white placeholder:text-white/30 focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void submit()
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
          <p className="text-xs text-white/40">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#D4AF37]/70" aria-hidden />
            Ctrl+Enter to start
          </p>
          <button
            type="button"
            disabled={idea.trim().length < 8 || loading}
            onClick={() => void submit()}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-[#D4AF37] px-8 text-sm font-semibold text-[#0B0B0B] disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              'Create Film'
            )}
          </button>
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-center text-sm text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        className="mt-6 text-sm text-white/45 hover:text-[#E6C76A] hover:underline"
        onClick={() => setIdea(EXAMPLE)}
      >
        Try the example
      </button>
    </div>
  )
}
