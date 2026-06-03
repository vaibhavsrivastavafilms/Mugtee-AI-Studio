import type { AgentTask, TaskStatus } from '@/lib/ai-agent/types'

const MAX_RETRIES = 1

export function getReadyTasks(tasks: AgentTask[]): AgentTask[] {
  const completed = new Set(
    tasks.filter((t) => t.status === 'completed').map((t) => t.id)
  )
  return tasks.filter((t) => {
    if (t.status !== 'pending' && t.status !== 'retrying') return false
    return t.dependencies.every((d) => completed.has(d))
  })
}

export function markTask(
  tasks: AgentTask[],
  id: string,
  patch: Partial<Pick<AgentTask, 'status' | 'output' | 'error' | 'retryCount'>>
): AgentTask[] {
  return tasks.map((t) => (t.id === id ? { ...t, ...patch } : t))
}

export function failTaskWithRetry(tasks: AgentTask[], id: string, error: string): AgentTask[] {
  const task = tasks.find((t) => t.id === id)
  const retries = task?.retryCount ?? 0
  if (retries < MAX_RETRIES) {
    return markTask(tasks, id, {
      status: 'retrying',
      error,
      retryCount: retries + 1,
    })
  }
  return markTask(tasks, id, { status: 'failed', error })
}

export function workflowProgress(tasks: AgentTask[]): number {
  if (!tasks.length) return 0
  const done = tasks.filter(
    (t) => t.status === 'completed' || t.status === 'failed'
  ).length
  return Math.round((done / tasks.length) * 100)
}

export function isGraphComplete(tasks: AgentTask[]): boolean {
  return tasks.every((t) => t.status === 'completed' || t.status === 'failed')
}

export function graphHasFailure(tasks: AgentTask[]): boolean {
  return tasks.some((t) => t.status === 'failed')
}

export function normalizeRetryingToPending(tasks: AgentTask[]): AgentTask[] {
  return tasks.map((t) =>
    t.status === 'retrying' ? { ...t, status: 'pending' as TaskStatus } : t
  )
}
