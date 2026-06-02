'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AGENT_LABELS } from '@/lib/agent/agent-labels'
import {
  agentPillBorderClass,
  agentStatusDotClass,
  resolveAgentRuntimeStatus,
  type AgentStatusContext,
} from '@/lib/agent/agent-runtime-status'
import { quickCutStudioHref, STUDIO } from '@/lib/create/routes'
import { cn } from '@/lib/utils'
import { useCompanionMemoryContext } from '@/hooks/use-companion-memory-context'
import { useMugteeCompanionStore } from '@/stores/mugtee-companion-store'
import { useCreatorMemoryStore } from '@/stores/creator-memory-store'

const COMPANION_AGENTS = AGENT_LABELS.filter((a) => a.id === 'hook' || a.id === 'memory')

export function CompanionAgentStrip({ className }: { className?: string }) {
  const router = useRouter()
  const submitPrompt = useMugteeCompanionStore((s) => s.submitPrompt)
  const isProcessing = useMugteeCompanionStore((s) => s.isProcessing)
  const { creatorMemory, reloadMemory } = useCompanionMemoryContext()

  const memoryHydrated = useCreatorMemoryStore((s) => s.hydrated)
  const memoryLoading = useCreatorMemoryStore((s) => s.loading)
  const hydrateMemory = useCreatorMemoryStore((s) => s.hydrate)

  useEffect(() => {
    void hydrateMemory()
  }, [hydrateMemory])

  const hasMemory = useMemo(() => {
    const keys = Object.keys(creatorMemory ?? {})
    return keys.length > 0 || memoryHydrated
  }, [creatorMemory, memoryHydrated])

  const statusCtx: AgentStatusContext = useMemo(
    () => ({
      generationStep: 'idle',
      isGenerating: isProcessing,
      isRegeneratingHook: false,
      hookProgressPhase: 'idle',
      memoryHydrated: memoryHydrated,
      memoryLoading: memoryLoading,
      hasMemoryContext: hasMemory,
      pipelineError: false,
    }),
    [isProcessing, memoryHydrated, memoryLoading, hasMemory]
  )

  const onHookClick = useCallback(() => {
    if (isProcessing) {
      toast.message('Hook Agent', { description: 'Mugtee is still replying — try again in a moment.' })
      return
    }
    void submitPrompt('Help me craft a scroll-stopping hook for my next reel. Give me 3 options.')
  }, [isProcessing, submitPrompt])

  const onMemoryClick = useCallback(async () => {
    if (memoryLoading) return
    await reloadMemory()
    if (hasMemory) {
      router.push(`${STUDIO.settings}#creator-profile`)
      toast.message('Memory Agent', { description: 'Creator memory is loaded for this session.' })
      return
    }
    router.push(`${STUDIO.settings}#creator-profile`)
    toast.message('Memory Agent', {
      description: 'Set up your creator profile so Mugtee remembers your niche and style.',
    })
  }, [hasMemory, memoryLoading, reloadMemory, router])

  const onMemorySecondary = useCallback(() => {
    router.push(quickCutStudioHref())
  }, [router])

  return (
    <div
      className={cn('flex flex-wrap items-center justify-center gap-2', className)}
      role="list"
      aria-label="Companion agents"
    >
      {COMPANION_AGENTS.map((agent) => {
        const status =
          agent.id === 'hook' && isProcessing
            ? 'active'
            : resolveAgentRuntimeStatus(agent.id, statusCtx)

        const onClick = agent.id === 'hook' ? onHookClick : onMemoryClick
        const onContextMenu =
          agent.id === 'memory'
            ? (e: { preventDefault: () => void }) => {
                e.preventDefault()
                onMemorySecondary()
              }
            : undefined

        return (
          <button
            key={agent.id}
            type="button"
            role="listitem"
            onClick={onClick}
            onContextMenu={onContextMenu}
            title={
              agent.id === 'hook'
                ? `${agent.role} — Ask Mugtee for hook ideas`
                : `${agent.role} — ${hasMemory ? 'Memory synced' : 'Set up creator profile'} (right-click: open studio)`
            }
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] tracking-[0.2em] uppercase transition-colors',
              agentPillBorderClass(status, true)
            )}
          >
            <span
              className={cn('w-1.5 h-1.5 rounded-full shrink-0', agentStatusDotClass(status))}
              aria-hidden
            />
            {agent.name}
          </button>
        )
      })}
    </div>
  )
}
