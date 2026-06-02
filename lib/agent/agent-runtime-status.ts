import type { AgentPipelineStage } from '@/lib/agent/types'
import type { QuickCutGenerationStep } from '@/stores/quick-cut-generation-store'
import type { HookProgressPhase } from '@/lib/cinematic/hook-generation-progress'

export type AgentRuntimeStatus = 'idle' | 'active' | 'ready' | 'error'

export type AgentStatusContext = {
  generationStep: QuickCutGenerationStep | string
  isGenerating?: boolean
  isRegeneratingHook?: boolean
  hookProgressPhase?: HookProgressPhase | string
  memoryHydrated?: boolean
  memoryLoading?: boolean
  hasMemoryContext?: boolean
  pipelineError?: boolean
}

const PRIMARY_AGENT_BY_STEP: Partial<Record<string, AgentPipelineStage>> = {
  analyzing: 'research',
  title: 'research',
  hook: 'hook',
  script: 'story',
  scenes: 'story',
  images: 'growth',
  motion: 'growth',
  voice: 'growth',
  render: 'growth',
}

function hookAgentActive(ctx: AgentStatusContext): boolean {
  if (ctx.isRegeneratingHook) return true
  if (ctx.generationStep === 'hook') return true
  const phase = ctx.hookProgressPhase
  return Boolean(phase && phase !== 'idle')
}

function memoryAgentActive(ctx: AgentStatusContext): boolean {
  if (ctx.memoryLoading) return true
  if (!ctx.isGenerating) return false
  return ['hook', 'script', 'images', 'analyzing', 'title'].includes(String(ctx.generationStep))
}

export function resolveAgentRuntimeStatus(
  agentId: AgentPipelineStage,
  ctx: AgentStatusContext
): AgentRuntimeStatus {
  if (ctx.pipelineError && (agentId === 'hook' || agentId === 'memory')) {
    return 'error'
  }

  if (agentId === 'hook') {
    if (hookAgentActive(ctx)) return 'active'
    if (ctx.generationStep === 'complete' || ctx.generationStep === 'script') return 'ready'
    return 'idle'
  }

  if (agentId === 'memory') {
    if (memoryAgentActive(ctx)) return 'active'
    if (ctx.hasMemoryContext && ctx.memoryHydrated) return 'ready'
    if (ctx.memoryLoading) return 'active'
    return 'idle'
  }

  const primary = PRIMARY_AGENT_BY_STEP[String(ctx.generationStep)]
  if (primary === agentId && ctx.isGenerating) return 'active'
  if (ctx.isGenerating && primary && agentId !== primary) return 'idle'
  return 'idle'
}

export function agentStatusDotClass(status: AgentRuntimeStatus): string {
  switch (status) {
    case 'active':
      return 'bg-gold-400/90 animate-pulse shadow-[0_0_6px_rgba(212,175,55,0.6)]'
    case 'ready':
      return 'bg-emerald-400/90 shadow-[0_0_4px_rgba(52,211,153,0.45)]'
    case 'error':
      return 'bg-rose-400/90 shadow-[0_0_4px_rgba(251,113,133,0.45)]'
    default:
      return 'bg-gold-400/35'
  }
}

export function agentPillBorderClass(status: AgentRuntimeStatus, interactive: boolean): string {
  const base =
    status === 'active'
      ? 'border-gold-500/45 bg-gold-500/[0.12]'
      : status === 'ready'
        ? 'border-emerald-500/30 bg-emerald-500/[0.06]'
        : status === 'error'
          ? 'border-rose-500/35 bg-rose-500/[0.08]'
          : 'border-gold-500/25 bg-gold-500/[0.06]'

  return interactive
    ? `${base} cursor-pointer hover:border-gold-500/55 hover:bg-gold-500/[0.14] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/50`
    : base
}
