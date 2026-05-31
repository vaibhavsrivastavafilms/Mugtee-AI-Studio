'use client'

import { EmptyStateExamples } from '@/components/proof/empty-state-examples'
import { EMPTY_STATE_STARTERS } from '@/lib/proof/showcase-examples'
import { cn } from '@/lib/utils'

type RetentionEmptyStateRecoveryProps = {
  className?: string
}

/** Empty-state recovery — reuses proof starters with retention copy. Prefills via /studio/create?topic=… */
export function RetentionEmptyStateRecovery({ className }: RetentionEmptyStateRecoveryProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="px-0.5">
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-400/70">
          Start With These Ideas
        </p>
        <p className="text-xs text-luxe/45 mt-0.5">
          Apple Documentary, AI Startup Story, Psychology Reel, Motivation Script — pick one to
          begin.
        </p>
      </div>
      <EmptyStateExamples starters={EMPTY_STATE_STARTERS} />
    </div>
  )
}
