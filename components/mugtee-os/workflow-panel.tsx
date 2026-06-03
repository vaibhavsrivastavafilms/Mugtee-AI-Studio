'use client'

import type { ExecutionPlan } from '@/lib/ai-agent/types'
import { cn } from '@/lib/utils'

export function WorkflowPanel({
  plan,
  workflowId,
  status,
  className,
}: {
  plan: ExecutionPlan | null
  workflowId: string | null
  status: string | null
  className?: string
}) {
  return (
    <section className={cn('space-y-2', className)}>
      <h3 className="text-[10px] uppercase tracking-wider text-luxe/50">Workflow</h3>
      {workflowId ? (
        <p className="text-[10px] font-mono text-luxe/40 truncate">{workflowId}</p>
      ) : null}
      {status ? (
        <p className="text-[11px] text-cyan-300/80 uppercase tracking-wider">Status: {status}</p>
      ) : null}
      {plan ? (
        <>
          <p className="text-xs text-luxe/80">{plan.analysis.intent}</p>
          <ul className="text-[11px] text-luxe/60 list-disc pl-4">
            {plan.analysis.deliverables?.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-xs text-luxe/45">Plan appears after you run a command.</p>
      )}
    </section>
  )
}
