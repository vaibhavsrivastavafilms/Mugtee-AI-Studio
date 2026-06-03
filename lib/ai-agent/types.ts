import { z } from 'zod'

export const TaskStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'failed',
  'retrying',
])
export type TaskStatus = z.infer<typeof TaskStatusSchema>

export const AgentWorkflowModeSchema = z.enum(['autonomous', 'manual'])
export type AgentWorkflowMode = z.infer<typeof AgentWorkflowModeSchema>

export const AgentWorkflowStatusSchema = z.enum([
  'pending',
  'planning',
  'executing',
  'completed',
  'failed',
  'cancelled',
])
export type AgentWorkflowStatus = z.infer<typeof AgentWorkflowStatusSchema>

export type AgentTask = {
  id: string
  type: string
  tool?: string
  agent?: AgentRole
  dependencies: string[]
  status: TaskStatus
  output?: unknown
  error?: string
  retryCount?: number
  input?: Record<string, unknown>
}

export const AgentRoleSchema = z.enum([
  'coordinator',
  'content',
  'strategy',
  'creative',
  'memory',
])
export type AgentRole = z.infer<typeof AgentRoleSchema>

export type StructuredAgentMessage = {
  from: AgentRole
  to: AgentRole
  kind: 'task_assign' | 'task_result' | 'plan_ready' | 'memory_context' | 'error'
  taskId?: string
  payload: Record<string, unknown>
  at: string
}

export const GoalAnalysisSchema = z.object({
  goal: z.string(),
  intent: z.string(),
  audience: z.string().optional(),
  platform: z.string().optional(),
  tone: z.string().optional(),
  deliverables: z.array(z.string()),
  constraints: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
})
export type GoalAnalysis = z.infer<typeof GoalAnalysisSchema>

export const DecomposedTaskSchema = z.object({
  id: z.string(),
  type: z.string(),
  tool: z.string().optional(),
  agent: AgentRoleSchema.optional(),
  description: z.string(),
  dependencies: z.array(z.string()),
  input: z.record(z.string(), z.unknown()).optional(),
})
export type DecomposedTask = z.infer<typeof DecomposedTaskSchema>

export const ExecutionPlanSchema = z.object({
  goal: z.string(),
  analysis: GoalAnalysisSchema,
  tasks: z.array(DecomposedTaskSchema),
  estimatedSteps: z.number().optional(),
})
export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>

export type PlannerSession = {
  goal: string
  memoryContext?: string
  memoryCacheKey?: string
}

export type ProjectPackage = {
  goal: string
  projectId?: string
  script?: string
  hooks?: string[]
  storyboard?: unknown
  voiceover?: { audioUrl?: string | null; mock?: boolean; provider?: string }
  captions?: string[]
  calendar?: string[]
  metadata?: Record<string, unknown>
}

export type AgentWorkflowRecord = {
  id: string
  user_id: string
  goal: string
  mode: AgentWorkflowMode
  status: AgentWorkflowStatus
  plan: ExecutionPlan | null
  task_graph: AgentTask[]
  agent_messages: StructuredAgentMessage[]
  package: ProjectPackage | null
  progress: number
  error: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

/** Cmd+K / voice command layer */
export const CommandIntentSchema = z.object({
  intent: z.string(),
  args: z.record(z.string(), z.unknown()),
  confidence: z.number().min(0).max(1).optional(),
})
export type CommandIntent = z.infer<typeof CommandIntentSchema>

export type AgentChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  at: string
  meta?: Record<string, unknown>
}

export type AgentToolCallRecord = {
  id: string
  tool: string
  status: TaskStatus
  startedAt: string
  endedAt?: string
  error?: string
  output?: unknown
}

export type MugteeAgentState = {
  command: string
  intent: CommandIntent | null
  messages: AgentChatMessage[]
  toolCalls: AgentToolCallRecord[]
  workflowId: string | null
  tasks: AgentTask[]
  package: ProjectPackage | null
  status: AgentWorkflowStatus | 'idle' | 'listening'
  error: string | null
  memorySnippet: string | null
}
