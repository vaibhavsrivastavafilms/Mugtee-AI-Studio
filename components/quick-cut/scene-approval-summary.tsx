'use client'

import { useMemo, useState } from 'react'
import { Check, Lock } from 'lucide-react'
import {
  computeSceneApprovalSummary,
} from '@/lib/quick-cut/scene-review-state.client'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'
import { cn } from '@/lib/utils'

type SceneApprovalSummaryProps = {
  projectKey: string
  scenes: { id: string; imageUrl?: string | null }[]
  className?: string
  refreshKey?: number
}

/** Inform-only approval count before export — does not block. */
export function SceneApprovalSummary({
  projectKey,
  scenes,
  className,
  refreshKey = 0,
}: SceneApprovalSummaryProps) {
  const mounted = useClientMounted()
  const [tick] = useState(0)

  const summary = useMemo(() => {
    void refreshKey
    void tick
    if (!mounted) return null
    return computeSceneApprovalSummary(projectKey, scenes)
  }, [mounted, projectKey, scenes, refreshKey, tick])

  if (!summary || summary.withImages < 1) return null

  return (
    <p
      className={cn(
        'text-[10px] text-luxe/55 flex flex-wrap items-center gap-x-3 gap-y-1',
        className
      )}
    >
      <span className="inline-flex items-center gap-1 text-emerald-200/85">
        <Check className="w-3 h-3" aria-hidden />
        Approved: {summary.approved}/{summary.withImages} scenes
      </span>
      {summary.locked > 0 ? (
        <span className="inline-flex items-center gap-1 text-gold-200/80">
          <Lock className="w-3 h-3" aria-hidden />
          Locked: {summary.locked}
        </span>
      ) : null}
      {summary.pending > 0 ? (
        <span className="text-luxe/40">Pending: {summary.pending}</span>
      ) : null}
    </p>
  )
}
