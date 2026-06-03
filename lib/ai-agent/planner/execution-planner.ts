import type { AgentTask, DecomposedTask, ExecutionPlan, GoalAnalysis } from '@/lib/ai-agent/types'
import { routeIntent } from '@/lib/ai-agent/intent-router'

export function buildExecutionPlan(
  goal: string,
  analysis: GoalAnalysis,
  decomposed: DecomposedTask[]
): ExecutionPlan {
  const routed = routeIntent(analysis)
  const tasks = decomposed.length
    ? decomposed
    : defaultTasksForIntent(goal, routed.tools)

  return {
    goal,
    analysis,
    tasks,
    estimatedSteps: tasks.length,
  }
}

function defaultTasksForIntent(goal: string, tools: string[]): DecomposedTask[] {
  const base: DecomposedTask[] = [
    {
      id: 'memory',
      type: 'memory',
      tool: 'searchMemory',
      agent: 'memory',
      description: 'Load creator memory',
      dependencies: [],
    },
    {
      id: 'project',
      type: 'project',
      tool: 'createProject',
      agent: 'coordinator',
      description: 'Create project shell',
      dependencies: ['memory'],
      input: { title: goal.slice(0, 80) },
    },
    {
      id: 'hooks',
      type: 'hooks',
      tool: 'generateHooks',
      agent: 'creative',
      description: 'Generate hooks',
      dependencies: ['project'],
    },
    {
      id: 'script',
      type: 'script',
      tool: 'generateScript',
      agent: 'content',
      description: 'Generate script',
      dependencies: ['hooks'],
    },
    {
      id: 'storyboard',
      type: 'storyboard',
      tool: 'generateStoryboard',
      agent: 'creative',
      description: 'Storyboard beats',
      dependencies: ['script'],
    },
    {
      id: 'voice',
      type: 'voiceover',
      tool: 'generateVoiceover',
      agent: 'content',
      description: 'Voiceover',
      dependencies: ['script'],
    },
    {
      id: 'caption',
      type: 'caption',
      tool: 'generateCaption',
      agent: 'content',
      description: 'Captions',
      dependencies: ['script'],
    },
  ]

  return base.filter((t) => !t.tool || tools.includes(t.tool) || tools.length === 0)
}

export function planToTaskGraph(plan: ExecutionPlan): AgentTask[] {
  return plan.tasks.map((t) => ({
    id: t.id,
    type: t.type,
    tool: t.tool,
    agent: t.agent,
    dependencies: t.dependencies ?? [],
    status: 'pending' as const,
    input: t.input,
  }))
}
