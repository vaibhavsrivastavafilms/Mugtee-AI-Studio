'use client'

import { activeAgentsForGeneration } from '@/lib/agent/agent-labels'
import { cn } from '@/lib/utils'

export function AgentWorkflowStrip({
  generationStep,
  className,
}: {
  generationStep: string
  className?: string
}) {
  const agents = activeAgentsForGeneration(generationStep)

  return (
    <div className={cn('flex flex-wrap gap-2 justify-center', className)}>
      {agents.map((agent) => (
        <span
          key={agent.id}
          title={agent.role}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gold-500/25 bg-gold-500/[0.06] text-[9px] tracking-wide uppercase text-gold-200/90"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400/80 animate-pulse" />
          {agent.name}
        </span>
      ))}
    </div>
  )
}
