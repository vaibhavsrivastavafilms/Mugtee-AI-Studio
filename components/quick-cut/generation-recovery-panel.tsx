'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Check, Circle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PERSISTED_STEP_LABELS,
  PERSISTED_STEP_ORDER,
  type PersistedGenerationStep,
} from '@/lib/cinematic/generation-state'
import { GENERATION_RECOVERY_MESSAGE } from '@/lib/cinematic/generation-errors'
import { GenerationSaveIndicator } from '@/components/quick-cut/generation-save-indicator'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import {
  formatProviderLabel,
  PROVIDER_UNAVAILABLE_HEADLINE,
  type ProviderFailureSummary,
} from '@/lib/ai/providers/provider-diagnostics.client'

type GenerationRecoveryPanelProps = {
  lastCompletedStep: PersistedGenerationStep | null
  failedAtStep?: PersistedGenerationStep | null
  onContinue: () => void
  onReturnToWorkspace: () => void
  isResuming?: boolean
  workspaceHref?: string
  className?: string
}

function stepStatus(
  step: PersistedGenerationStep,
  lastCompleted: PersistedGenerationStep | null,
  failedAt: PersistedGenerationStep | null | undefined
): 'done' | 'current' | 'pending' {
  if (!lastCompleted) {
    if (failedAt === step) return 'current'
    return 'pending'
  }
  const lastIdx = PERSISTED_STEP_ORDER.indexOf(lastCompleted)
  const stepIdx = PERSISTED_STEP_ORDER.indexOf(step)
  if (stepIdx <= lastIdx) return 'done'
  if (failedAt === step || stepIdx === lastIdx + 1) return 'current'
  return 'pending'
}

function ProviderFailureList({ providers }: { providers: ProviderFailureSummary[] }) {
  const actionable = providers.filter((p) => !p.skipped || p.reason !== 'Not configured')
  if (actionable.length === 0) return null

  return (
    <ul className="text-left max-w-sm mx-auto space-y-2 rounded-xl border border-amber-500/20 bg-black/30 px-4 py-3">
      {actionable.map((p) => (
        <li key={p.provider} className="text-sm">
          <span className="font-medium text-gold-200/90">{formatProviderLabel(p.provider)}</span>
          <span className="text-luxe/65"> — {p.reason}</span>
          {p.status != null ? (
            <span className="text-luxe/40 text-xs ml-1">({p.status})</span>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function GenerationRecoveryPanel({
  lastCompletedStep,
  failedAtStep,
  onContinue,
  onReturnToWorkspace,
  isResuming = false,
  workspaceHref = '/studio/quick-cut',
  className,
}: GenerationRecoveryPanelProps) {
  const providerDiagnostics = useQuickCutGenerationStore((s) => s.providerDiagnostics)
  const providerRetryAfterSeconds = useQuickCutGenerationStore((s) => s.providerRetryAfterSeconds)
  const [retryCountdown, setRetryCountdown] = useState(providerRetryAfterSeconds ?? 0)

  useEffect(() => {
    setRetryCountdown(providerRetryAfterSeconds ?? 0)
  }, [providerRetryAfterSeconds])

  useEffect(() => {
    if (providerRetryAfterSeconds == null || providerRetryAfterSeconds <= 0) return
    const timer = setInterval(() => {
      setRetryCountdown((n) => (n > 0 ? n - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [providerRetryAfterSeconds])

  const inferredFailed =
    failedAtStep ??
    (lastCompletedStep
      ? PERSISTED_STEP_ORDER[
          Math.min(
            PERSISTED_STEP_ORDER.indexOf(lastCompletedStep) + 1,
            PERSISTED_STEP_ORDER.length - 1
          )
        ]
      : 'hook')

  const hasProviderDetails =
    providerDiagnostics != null && providerDiagnostics.length > 0

  return (
    <div
      className={cn(
        'rounded-2xl border border-gold-500/25 bg-gradient-to-b from-gold-500/[0.08] to-black/40 p-6 sm:p-8 text-center space-y-5',
        className
      )}
      role="alert"
    >
      <div className="space-y-2">
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">
          {hasProviderDetails ? 'AI provider issue' : 'Generation interrupted'}
        </p>
        <h3 className="font-display text-xl sm:text-2xl text-[#F4E7C1] italic">
          {hasProviderDetails ? PROVIDER_UNAVAILABLE_HEADLINE : 'Your previous outputs are safe'}
        </h3>
        <p className="text-sm text-luxe/70 max-w-md mx-auto leading-relaxed">
          {hasProviderDetails
            ? 'Each provider reported a specific issue below. Your previous outputs are still saved.'
            : GENERATION_RECOVERY_MESSAGE}
        </p>
      </div>

      {hasProviderDetails ? (
        <ProviderFailureList providers={providerDiagnostics} />
      ) : null}

      {retryCountdown > 0 ? (
        <p className="text-xs text-amber-200/80 tracking-wide">
          Retry in {retryCountdown} second{retryCountdown === 1 ? '' : 's'}.
        </p>
      ) : null}

      <ul className="text-left max-w-xs mx-auto space-y-2">
        {PERSISTED_STEP_ORDER.map((step) => {
          const status = stepStatus(step, lastCompletedStep, inferredFailed)
          return (
            <li
              key={step}
              className="flex items-center gap-3 text-sm text-luxe/80"
            >
              {status === 'done' ? (
                <Check className="h-4 w-4 shrink-0 text-gold-400" aria-hidden />
              ) : status === 'current' ? (
                <Loader2
                  className="h-4 w-4 shrink-0 text-amber-300/90 animate-spin"
                  aria-hidden
                />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-white/20" aria-hidden />
              )}
              <span
                className={cn(
                  status === 'done' && 'text-gold-200/90',
                  status === 'current' && 'text-amber-200/90',
                  status === 'pending' && 'text-luxe/45'
                )}
              >
                {status === 'done' ? '✓ ' : status === 'current' ? '⏳ ' : ''}
                {PERSISTED_STEP_LABELS[step]}
              </span>
            </li>
          )
        })}
      </ul>

      <GenerationSaveIndicator className="justify-center" />

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={onContinue}
          disabled={isResuming || retryCountdown > 0}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gold-gradient text-black text-[12px] font-semibold tracking-[0.12em] uppercase shadow-gold-glow disabled:opacity-60"
        >
          {isResuming ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Continuing…
            </>
          ) : retryCountdown > 0 ? (
            `Retry in ${retryCountdown}s`
          ) : (
            'Retry →'
          )}
        </button>
        <Link
          href={workspaceHref}
          onClick={(e) => {
            e.preventDefault()
            onReturnToWorkspace()
          }}
          className="inline-flex min-h-[44px] items-center justify-center px-6 py-2.5 rounded-xl border border-gold-500/30 text-gold-200/80 text-[12px] tracking-[0.12em] uppercase hover:border-gold-400/50 hover:text-gold-100 transition-colors"
        >
          Return to Workspace
        </Link>
      </div>
    </div>
  )
}
