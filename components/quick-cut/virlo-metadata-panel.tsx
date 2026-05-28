'use client'

import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import type { VirloMetadata } from '@/lib/virlo-engine/types'

export function VirloMetadataPanel({
  virlo,
  hook,
  hookVariantNumber = 1,
  className,
  showRegenerate = true,
}: {
  virlo: VirloMetadata | null
  hook: string
  hookVariantNumber?: number
  className?: string
  showRegenerate?: boolean
}) {
  const isRegeneratingHook = useQuickCutGenerationStore((s) => s.isRegeneratingHook)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const previousHooks = useQuickCutGenerationStore((s) => s.previousHooks)
  if (!virlo && !hook) {
    return (
      <div
        className={cn(
          'rounded-xl border border-white/[0.08] bg-black/30 p-4 text-sm text-luxe/45 italic',
          className
        )}
      >
        Virlo director metadata appears as your story takes shape…
      </div>
    )
  }

  return (
    <div className={cn('rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-4 space-y-3', className)}>
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        <Sparkles className="w-3 h-3" /> Virlo AI Director
      </div>
      {hook ? (
        <blockquote className="font-display text-sm text-[#F4E7C1] italic leading-relaxed border-l-2 border-gold-500/40 pl-3">
          {hook}
        </blockquote>
      ) : null}
      <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
        Hook Variant: v{hookVariantNumber}
      </p>
      {showRegenerate && hook && !isGenerating ? (
        <button
          type="button"
          onClick={() => void regenerateHook()}
          disabled={isRegeneratingHook}
          className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/75 hover:text-gold-200 transition-colors disabled:opacity-50"
        >
          {isRegeneratingHook ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Regenerate hook
          {previousHooks.length > 0 ? (
            <span className="text-luxe/40 normal-case tracking-normal">
              ({previousHooks.length} tried)
            </span>
          ) : null}
        </button>
      ) : null}
      {virlo ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider text-[9px]">Structure</dt>
            <dd className="text-luxe/80">{virlo.structureName}</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider text-[9px]">Hook variant</dt>
            <dd className="text-luxe/80">{virlo.hookVariant}</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider text-[9px]">Emotion</dt>
            <dd className="text-luxe/80 capitalize">{virlo.emotionalGoal}</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider text-[9px]">Retention</dt>
            <dd className="text-luxe/80 capitalize">{virlo.retentionType.replace(/-/g, ' ')}</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider text-[9px]">Pacing</dt>
            <dd className="text-luxe/80 capitalize">{virlo.pacingStyle.replace(/-/g, ' ')}</dd>
          </div>
          <div>
            <dt className="text-luxe/40 uppercase tracking-wider text-[9px]">Seed</dt>
            <dd className="text-luxe/80 tabular-nums">{virlo.seed}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  )
}
