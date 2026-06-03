import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AgentTask,
  AgentWorkflowMode,
  AgentWorkflowRecord,
  AgentWorkflowStatus,
  ExecutionPlan,
  ProjectPackage,
  StructuredAgentMessage,
} from '@/lib/ai-agent/types'

export async function createAgentWorkflow(
  supabase: SupabaseClient,
  input: {
    userId: string
    goal: string
    mode: AgentWorkflowMode
    plan?: ExecutionPlan | null
    tasks?: AgentTask[]
    metadata?: Record<string, unknown>
  }
): Promise<AgentWorkflowRecord> {
  const row = {
    user_id: input.userId,
    goal: input.goal,
    mode: input.mode,
    status: 'pending' as AgentWorkflowStatus,
    plan: input.plan ?? null,
    task_graph: input.tasks ?? [],
    agent_messages: [] as StructuredAgentMessage[],
    package: null,
    progress: 0,
    metadata: input.metadata ?? {},
  }

  const { data, error } = await supabase
    .from('agent_workflows')
    .insert(row)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as AgentWorkflowRecord
}

export async function listAgentWorkflowHistory(
  supabase: SupabaseClient,
  userId: string,
  limit = 20
): Promise<AgentWorkflowRecord[]> {
  const { data, error } = await supabase
    .from('agent_workflows')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(Math.min(50, Math.max(1, limit)))

  if (error) throw new Error(error.message)
  return (data as AgentWorkflowRecord[]) ?? []
}

export async function getAgentWorkflow(
  supabase: SupabaseClient,
  userId: string,
  workflowId: string
): Promise<AgentWorkflowRecord | null> {
  const { data, error } = await supabase
    .from('agent_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return (data as AgentWorkflowRecord) ?? null
}

export async function updateAgentWorkflow(
  supabase: SupabaseClient,
  userId: string,
  workflowId: string,
  patch: Partial<{
    status: AgentWorkflowStatus
    plan: ExecutionPlan | null
    task_graph: AgentTask[]
    agent_messages: StructuredAgentMessage[]
    package: ProjectPackage | null
    progress: number
    error: string | null
    metadata: Record<string, unknown>
  }>
): Promise<AgentWorkflowRecord> {
  const { data, error } = await supabase
    .from('agent_workflows')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', workflowId)
    .eq('user_id', userId)
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return data as AgentWorkflowRecord
}
