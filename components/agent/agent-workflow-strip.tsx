'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { activeAgentsForGeneration } from '@/lib/agent/agent-labels'
import {
  agentPillBorderClass,
  agentStatusDotClass,
  resolveAgentRuntimeStatus,
  type AgentStatusContext,
} from '@/lib/agent/agent-runtime-status'
import type { AgentPipelineStage } from '@/lib/agent/types'
import { STUDIO } from '@/lib/create/routes'
import { cn } from '@/lib/utils'
import type { MemoryProfile } from '@/lib/memory/types'
import { useCreatorMemoryStore } from '@/stores/creator-memory-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

function hasUsableMemory(profile: MemoryProfile): boolean {
  const dna = profile.creatorDna
  const mem = profile.creatorMemory
  return Boolean(
    dna?.audience?.trim() ||
      dna?.creatorType?.trim() ||
      dna?.visualStyle?.trim() ||
      (mem && Object.keys(mem).length > 0)
  )
}

function agentActionLabel(agentId: AgentPipelineStage, status: string): string {
  if (agentId === 'hook') {
    if (status === 'active') return 'Working on your hook…'
    if (status === 'ready') return 'Jump to hook'
    return 'Open hook stage'
  }
  if (agentId === 'memory') {
    if (status === 'active') return 'Loading creator memory…'
    if (status === 'ready') return 'Creator memory synced'
    return 'Set up creator profile'
  }
  return ''
}

export function AgentWorkflowStrip({
  generationStep: generationStepProp,
  className,
  interactive = true,
}: {
  generationStep?: string
  className?: string
  /** When false, pills are status-only (no navigation). */
  interactive?: boolean
}) {
  const router = useRouter()

  const pipeline = useQuickCutGenerationStore(
    useShallow((s) => ({
      generationStep: s.generationStep,
      isGenerating: s.isGenerating,
      isRegeneratingHook: s.isRegeneratingHook,
      hookProgressPhase: s.hookProgressPhase,
      setActiveStageTab: s.setActiveStageTab,
    }))
  )

  const memoryProfile = useCreatorMemoryStore((s) => s.profile)
  const memoryHydrated = useCreatorMemoryStore((s) => s.hydrated)
  const memoryLoading = useCreatorMemoryStore((s) => s.loading)
  const hydrateMemory = useCreatorMemoryStore((s) => s.hydrate)

  useEffect(() => {
    void hydrateMemory()
  }, [hydrateMemory])

  const step = generationStepProp ?? pipeline.generationStep
  const agents = activeAgentsForGeneration(step)

  const statusCtx: AgentStatusContext = useMemo(
    () => ({
      generationStep: step,
      isGenerating: pipeline.isGenerating,
      isRegeneratingHook: pipeline.isRegeneratingHook,
      hookProgressPhase: pipeline.hookProgressPhase,
      memoryHydrated: memoryHydrated,
      memoryLoading: memoryLoading,
      hasMemoryContext: hasUsableMemory(memoryProfile),
      pipelineError: step === 'error',
    }),
    [step, pipeline, memoryHydrated, memoryLoading, memoryProfile]
  )

  const onAgentClick = useCallback(
    (agentId: AgentPipelineStage) => {
      if (!interactive) return

      if (agentId === 'hook') {
        pipeline.setActiveStageTab('hook', true)
        requestAnimationFrame(() => {
          document
            .getElementById('workflow-stage-hook')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
        })
        toast.message('Hook Agent', { description: 'Focused the hook stage.' })
        return
      }

      if (agentId === 'memory') {
        router.push(`${STUDIO.settings}#creator-profile`)
        toast.message('Memory Agent', {
          description: statusCtx.hasMemoryContext
            ? 'Creator memory is active in this run.'
            : 'Tune your profile so Mugtee remembers your style.',
        })
        return
      }

      if (agentId === 'story') {
        pipeline.setActiveStageTab('script', true)
      } else if (agentId === 'growth') {
        pipeline.setActiveStageTab('scenes', true)
      } else {
        pipeline.setActiveStageTab('title', true)
      }
    },
    [interactive, pipeline, router, statusCtx.hasMemoryContext]
  )

  if (!agents.length) return null

  return (
    <div className={cn('flex flex-wrap gap-2 justify-center', className)} role="list" aria-label="Active agents">
      {agents.map((agent) => {
        const status = resolveAgentRuntimeStatus(agent.id, statusCtx)
        const actionHint = agentActionLabel(agent.id, status)

        return (
          <button
            key={agent.id}
            type="button"
            role="listitem"
            title={[agent.role, actionHint].filter(Boolean).join(' — ')}
            disabled={!interactive}
            onClick={() => onAgentClick(agent.id)}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] tracking-wide uppercase text-gold-200/90 transition-colors',
              agentPillBorderClass(status, interactive),
              !interactive && 'cursor-default opacity-90'
            )}
          >
            <span
              className={cn('w-1.5 h-1.5 rounded-full shrink-0', agentStatusDotClass(status))}
              aria-hidden
            />
            <span>{agent.name}</span>
            <span className="sr-only">{status === 'active' ? ', working' : status === 'ready' ? ', ready' : ''}</span>
          </button>
        )
      })}
    </div>
  )
}
