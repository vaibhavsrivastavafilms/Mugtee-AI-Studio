'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

const EXAMPLE =
  'Create a 45-second cinematic advertisement for Table Tales during monsoon in Ahmedabad.'

const GENERATION_UNAVAILABLE =
  "We couldn't start this generation right now."

type CreateProjectResponse = {
  projectId?: string
  requestId?: string
  error?: string | { code?: string; message?: string; stage?: string; failures?: Array<{ provider: string; code: string }> }
  success?: boolean
  ok?: boolean
}

type V3PromptHeroProps = {
  className?: string
}

function formatProviderFailure(code: string): string {
  switch (code) {
    case 'PROVIDER_RATE_LIMITED':
    case 'PROVIDER_QUOTA_EXCEEDED':
      return 'rate limited'
    case 'PROVIDER_AUTH_FAILED':
      return 'auth failed'
    case 'PROVIDER_INVALID_RESPONSE':
      return 'invalid response'
    case 'PROVIDER_TIMEOUT':
      return 'timed out'
    default:
      return 'unavailable'
  }
}

function readErrorMessage(data: CreateProjectResponse): string {
  if (!data.error) return GENERATION_UNAVAILABLE
  if (typeof data.error === 'string') {
    return data.error
  }

  const stage = data.error.stage ? `Stage: ${data.error.stage}. ` : ''
  const failures = data.error.failures?.filter(Boolean) ?? []
  if (failures.length > 0) {
    const summary = failures
      .map((f) => `${f.provider} (${formatProviderFailure(f.code)})`)
      .join(', ')
    return `${data.error.message ?? GENERATION_UNAVAILABLE} ${stage}Providers: ${summary}.`
  }

  return data.error.message ?? GENERATION_UNAVAILABLE
}

export function V3PromptHero({ className }: V3PromptHeroProps) {
  const router = useRouter()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingProjectId, setPendingProjectId] = useState<string | null>(null)

  const canSubmit = prompt.trim().length >= 8 && !loading

  async function submit(projectId?: string | null) {
    const trimmed = prompt.trim()
    if (trimmed.length < 8 || loading) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/v3/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: trimmed,
          ...(projectId ? { projectId } : {}),
        }),
      })
      const data = (await res.json()) as CreateProjectResponse

      if (data.projectId && res.ok) {
        router.push(`/v3/${data.projectId}`)
        return
      }

      if (data.projectId) {
        setPendingProjectId(data.projectId)
      }

      throw new Error(readErrorMessage(data))
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERATION_UNAVAILABLE)
      setLoading(false)
    }
  }

  return (
    <div className={cn('mx-auto flex w-full max-w-3xl flex-col items-center px-4', className)}>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 text-[11px] uppercase tracking-[0.32em] text-[#D4AF37]/80"
      >
        Mugtee Production OS
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="text-center font-display text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl"
      >
        One idea. One film.
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-4 max-w-xl text-center text-base text-white/60 sm:text-lg"
      >
        Describe what you want. Mugtee plans, writes, storyboards, generates, edits, and exports —
        autonomously.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-10 w-full rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/90 p-1 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-sm"
      >
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder={EXAMPLE}
          className="w-full resize-none rounded-xl bg-transparent px-5 py-4 text-base text-white placeholder:text-white/30 focus:outline-none sm:text-lg"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              void submit(pendingProjectId)
            }
          }}
        />
        <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] px-4 py-3">
          <p className="text-xs text-white/40">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-[#D4AF37]/70" aria-hidden />
            Ctrl+Enter to generate
          </p>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit(pendingProjectId)}
            className={cn(
              'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-8 text-sm font-semibold transition',
              'bg-[#D4AF37] bg-[linear-gradient(135deg,#F4D58D_0%,#D4AF37_50%,#B8962E_100%)] text-[#0B0B0B]',
              'shadow-[0_0_28px_rgba(212,175,55,0.35)] hover:opacity-95 active:scale-[0.98]',
              'disabled:cursor-not-allowed disabled:bg-none disabled:bg-[#1a1608] disabled:text-[#F4E7A8]',
              'disabled:border disabled:border-[rgba(212,175,55,0.5)] disabled:shadow-none'
            )}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting…
              </>
            ) : (
              'Generate'
            )}
          </button>
        </div>
      </motion.div>

      {error ? (
        <div className="mt-4 flex flex-col items-center gap-3" role="alert">
          <p className="text-center text-sm text-red-300/90">{error}</p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void submit(pendingProjectId)}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      ) : null}

      <button
        type="button"
        className="mt-6 text-sm text-white/45 underline-offset-4 hover:text-[#E6C76A] hover:underline"
        onClick={() => setPrompt(EXAMPLE)}
      >
        Try the example prompt
      </button>
    </div>
  )
}
