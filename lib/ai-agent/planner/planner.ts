import type { ExecutionPlan, PlannerSession } from '@/lib/ai-agent/types'
import { analyzeGoal } from '@/lib/ai-agent/planner/goal-analyzer'
import { decomposeTasks } from '@/lib/ai-agent/planner/task-decomposer'
import {
  buildExecutionPlan,
  planToTaskGraph,
} from '@/lib/ai-agent/planner/execution-planner'
import type { AgentTask } from '@/lib/ai-agent/types'

export type PlanResult = {
  plan: ExecutionPlan
  tasks: AgentTask[]
}

/** User Goal → Goal Analysis → Task Decomposition → Execution Plan */
export async function runPlanner(session: PlannerSession): Promise<PlanResult> {
  const analysis = await analyzeGoal(session.goal, session.memoryContext)
  const decomposed = await decomposeTasks(analysis)
  const plan = buildExecutionPlan(session.goal, analysis, decomposed)
  const tasks = planToTaskGraph(plan)
  return { plan, tasks }
}
