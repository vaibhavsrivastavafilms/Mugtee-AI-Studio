import type { SupabaseClient } from '@supabase/supabase-js'
import { parseUserCommand } from '@/lib/ai-agent/command-parser'
import { dispatchIntent } from '@/lib/ai-agent/action-dispatcher'
import { analyzeCommandIntent } from '@/lib/ai-agent/intent-router'
import { loadAgentMemoryContext } from '@/lib/ai-agent/memory-engine'
import { runPlanner } from '@/lib/ai-agent/planner/planner'
import { executeRegisteredToolWithRetry } from '@/lib/ai-agent/tool-executor'
import { executeWorkflowBatch } from '@/lib/ai-agent/workflow-engine'
import { createAgentWorkflow } from '@/lib/ai-agent/workflow-store.server'
import { MugteeAgentEvents, trackAgentEvent } from '@/lib/ai-agent/agent-analytics'
import type { AgentWorkflowMode, AgentTask, ProjectPackage } from '@/lib/ai-agent/types'
import type { MugteeToolName } from '@/lib/ai-agent/tool-registry'
import { buildExecutionPlan, planToTaskGraph } from '@/lib/ai-agent/planner/execution-planner'
import { analyzeGoal } from '@/lib/ai-agent/planner/goal-analyzer'
import { decomposeTasks } from '@/lib/ai-agent/planner/task-decomposer'

export type RunAgentCommandInput = {
  supabase: SupabaseClient
  userId: string
  command: string
  mode?: AgentWorkflowMode
  projectId?: string
  action?: 'intent' | 'execute' | 'tool'
  tool?: MugteeToolName
  toolInput?: Record<string, unknown>
}

export type RunAgentCommandResult = {
  ok: boolean
  intent?: { intent: string; args: Record<string, unknown>; confidence?: number }
  routed?: ReturnType<typeof dispatchIntent>
  workflowId?: string
  tasks?: AgentTask[]
  package?: ProjectPackage | null
  status?: string
  toolOutputs?: Array<{ tool: string; output: Record<string, unknown> }>
  navigate?: string
  error?: string
  latencyMs: number
}

async function runToolChain(
  tools: MugteeToolName[],
  goal: string,
  ctx: {
    supabase: SupabaseClient
    userId: string
    memoryContext?: string
    projectId?: string
  }
): Promise<{ outputs: Array<{ tool: string; output: Record<string, unknown> }>; projectId?: string; script?: string; package: ProjectPackage }> {
  const outputs: Array<{ tool: string; output: Record<string, unknown> }> = []
  let projectId = ctx.projectId
  let script: string | undefined

  for (const tool of tools) {
    const started = Date.now()
    const output = await executeRegisteredToolWithRetry(
      tool,
      { topic: goal, projectId, script, ...outputs[outputs.length - 1]?.output },
      {
        supabase: ctx.supabase,
        userId: ctx.userId,
        goal,
        memoryContext: ctx.memoryContext,
        projectId,
        script,
      }
    )
    if (typeof output.projectId === 'string') projectId = output.projectId
    if (typeof output.script === 'string') script = output.script
    outputs.push({ tool, output })
    void trackAgentEvent(MugteeAgentEvents.TOOL_EXECUTED, ctx.userId, {
      tool,
      latencyMs: Date.now() - started,
      success: true,
    })
  }

  return {
    outputs,
    projectId,
    script,
    package: { goal, projectId, script, metadata: { tools: tools.join(',') } },
  }
}

/** Main orchestrator: parse → memory → intent → dispatch → plan/execute → result */
export async function runMugteeAgentCommand(
  input: RunAgentCommandInput
): Promise<RunAgentCommandResult> {
  const started = Date.now()
  const mode = input.mode ?? 'autonomous'
  const parsed = parseUserCommand(input.command)

  if (parsed.isAssetSearch && parsed.assetQuery) {
    return {
      ok: true,
      navigate: `/studio/assets?q=${encodeURIComponent(parsed.assetQuery)}`,
      latencyMs: Date.now() - started,
    }
  }

  const { context } = await loadAgentMemoryContext(
    input.supabase,
    input.userId,
    parsed.text
  )

  if (input.action === 'tool' && input.tool) {
    const output = await executeRegisteredToolWithRetry(input.tool, input.toolInput ?? {}, {
      supabase: input.supabase,
      userId: input.userId,
      goal: parsed.text,
      memoryContext: context,
      projectId: input.projectId,
    })
    return {
      ok: true,
      toolOutputs: [{ tool: input.tool, output }],
      latencyMs: Date.now() - started,
    }
  }

  const intent = await analyzeCommandIntent(parsed.text, context)
  void trackAgentEvent(MugteeAgentEvents.COMMAND_RECEIVED, input.userId, {
    intent: intent.intent,
    confidence: intent.confidence,
  })
  void trackAgentEvent(MugteeAgentEvents.INTENT_PARSED, input.userId, {
    intent: intent.intent,
    args: intent.args,
  })

  if (input.action === 'intent') {
    const routed = dispatchIntent(intent, parsed.text)
    return {
      ok: true,
      intent,
      routed,
      latencyMs: Date.now() - started,
    }
  }

  const routed = dispatchIntent(intent, parsed.text)
  if (routed.kind === 'navigate' && routed.href) {
    return { ok: true, intent, routed, navigate: routed.href, latencyMs: Date.now() - started }
  }

  if (routed.kind === 'tools' && routed.tools.length) {
    try {
      const { outputs, package: pkg } = await runToolChain(routed.tools, routed.goal, {
        supabase: input.supabase,
        userId: input.userId,
        memoryContext: context,
        projectId: input.projectId ?? (intent.args.projectId as string | undefined),
      })
      return {
        ok: true,
        intent,
        routed,
        package: pkg,
        toolOutputs: outputs,
        status: 'completed',
        latencyMs: Date.now() - started,
      }
    } catch (e) {
      return {
        ok: false,
        intent,
        routed,
        error: e instanceof Error ? e.message : 'Tool chain failed',
        latencyMs: Date.now() - started,
      }
    }
  }

  const analysis = await analyzeGoal(routed.goal, context)
  const decomposed = await decomposeTasks(analysis)
  const plan = buildExecutionPlan(routed.goal, analysis, decomposed)
  let tasks = planToTaskGraph(plan)

  if (!tasks.length && routed.tools.length) {
    tasks = routed.tools.map((tool, i) => ({
      id: `cmd_${i + 1}`,
      type: tool,
      tool,
      agent: 'content' as const,
      dependencies: i > 0 ? [`cmd_${i}`] : [],
      status: 'pending' as const,
      input: intent.args,
    }))
  }

  const workflow = await createAgentWorkflow(input.supabase, {
    userId: input.userId,
    goal: routed.goal,
    mode,
    plan,
    tasks,
    metadata: { intent: intent.intent, source: 'mugtee_os_command' },
  })

  void trackAgentEvent(MugteeAgentEvents.WORKFLOW_STARTED, input.userId, {
    workflowId: workflow.id,
  })

  if (mode === 'manual') {
    return {
      ok: true,
      intent,
      routed,
      workflowId: workflow.id,
      tasks,
      status: 'planning',
      latencyMs: Date.now() - started,
    }
  }

  let result = await executeWorkflowBatch({
    supabase: input.supabase,
    userId: input.userId,
    workflowId: workflow.id,
    goal: routed.goal,
    mode,
    tasks,
    memoryContext: context,
    projectId: input.projectId,
  })

  let loops = 0
  while (result.status === 'executing' && loops < 24) {
    loops += 1
    result = await executeWorkflowBatch({
      supabase: input.supabase,
      userId: input.userId,
      workflowId: workflow.id,
      goal: routed.goal,
      mode,
      tasks: result.tasks,
      memoryContext: context,
      projectId: result.package.projectId,
    })
  }

  return {
    ok: result.status !== 'failed',
    intent,
    routed,
    workflowId: workflow.id,
    tasks: result.tasks,
    package: result.package,
    status: result.status,
    error: result.status === 'failed' ? 'One or more workflow tasks failed' : undefined,
    latencyMs: Date.now() - started,
  }
}
