import type { AgentLabel, AgentPipelineStage } from '@/lib/agent/types'

export const AGENT_LABELS: AgentLabel[] = [
  {
    id: 'trend',
    name: 'Trend Agent',
    role: 'Surfaces timely angles from your opportunity feed',
    pipelineStep: 'create',
  },
  {
    id: 'research',
    name: 'Research Agent',
    role: 'Grounds your brief in niche patterns and memory',
    pipelineStep: 'create',
  },
  {
    id: 'story',
    name: 'Story Agent',
    role: 'Shapes narrative arc and emotional beats',
    pipelineStep: 'generate',
  },
  {
    id: 'hook',
    name: 'Hook Agent',
    role: 'Crafts scroll-stopping openings',
    pipelineStep: 'generate',
  },
  {
    id: 'growth',
    name: 'Growth Agent',
    role: 'Optimizes for retention and shareability',
    pipelineStep: 'director',
  },
  {
    id: 'memory',
    name: 'Memory Agent',
    role: 'Applies your creator DNA and past learnings',
    pipelineStep: 'export',
  },
]

const STEP_ORDER = ['create', 'generate', 'director', 'export'] as const

export function agentsForPipelineStep(step: string): AgentLabel[] {
  return AGENT_LABELS.filter((a) => a.pipelineStep === step)
}

export function activeAgentsForGeneration(generationStep: string): AgentLabel[] {
  const map: Record<string, AgentPipelineStage[]> = {
    idle: ['research', 'trend'],
    analyzing: ['research', 'memory'],
    title: ['research', 'hook'],
    hook: ['hook', 'memory'],
    script: ['story', 'memory'],
    scenes: ['story', 'growth'],
    images: ['growth', 'memory'],
    motion: ['story', 'growth'],
    voice: ['growth'],
    render: ['growth', 'memory'],
    complete: ['memory', 'growth'],
    error: ['hook', 'memory'],
  }
  const ids = map[generationStep] ?? ['research', 'story']
  return AGENT_LABELS.filter((a) => ids.includes(a.id))
}

export function workflowStripSteps(currentStep: string): Array<AgentLabel & { active: boolean }> {
  const idx = STEP_ORDER.indexOf(currentStep as (typeof STEP_ORDER)[number])
  return AGENT_LABELS.map((agent) => {
    const agentIdx = STEP_ORDER.indexOf(agent.pipelineStep as (typeof STEP_ORDER)[number])
    return {
      ...agent,
      active: idx >= 0 ? agentIdx <= idx : agent.pipelineStep === currentStep,
    }
  })
}
