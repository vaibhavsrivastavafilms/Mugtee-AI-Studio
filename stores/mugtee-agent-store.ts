'use client'

import { create } from 'zustand'
import type {
  AgentChatMessage,
  AgentTask,
  AgentWorkflowMode,
  CommandIntent,
  ExecutionPlan,
  ProjectPackage,
} from '@/lib/ai-agent/types'

type MugteeAgentStore = {
  goal: string
  mode: AgentWorkflowMode
  workflowId: string | null
  plan: ExecutionPlan | null
  tasks: AgentTask[]
  package: ProjectPackage | null
  status: string | null
  loading: boolean
  error: string | null
  messages: AgentChatMessage[]
  memorySnippet: string | null
  lastIntent: CommandIntent | null
  recoverAction: string | null

  setGoal: (goal: string) => void
  setMode: (mode: AgentWorkflowMode) => void
  sendCommand: (command: string) => Promise<boolean>
  planGoal: () => Promise<boolean>
  executeWorkflow: (confirm?: boolean) => Promise<boolean>
  pollWorkflow: () => Promise<void>
  loadHistory: () => Promise<void>
  reset: () => void
}

function pushMessage(
  messages: AgentChatMessage[],
  role: AgentChatMessage['role'],
  content: string
): AgentChatMessage[] {
  return [
    ...messages,
    {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      role,
      content,
      at: new Date().toISOString(),
    },
  ]
}

export const useMugteeAgentStore = create<MugteeAgentStore>((set, get) => ({
  goal: '',
  mode: 'autonomous',
  workflowId: null,
  plan: null,
  tasks: [],
  package: null,
  status: null,
  loading: false,
  error: null,
  messages: [],
  memorySnippet: null,
  lastIntent: null,
  recoverAction: null,

  setGoal: (goal) => set({ goal }),
  setMode: (mode) => set({ mode }),

  sendCommand: async (command) => {
    const trimmed = command.trim()
    if (!trimmed) {
      set({ error: 'Enter a command' })
      return false
    }
    set({
      loading: true,
      error: null,
      recoverAction: null,
      goal: trimmed,
      messages: pushMessage(get().messages, 'user', trimmed),
    })
    try {
      const res = await fetch('/api/agent/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: trimmed, action: 'execute', mode: get().mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (data.navigate && typeof data.navigate === 'string') {
        window.location.href = data.navigate
        return true
      }
      if (!res.ok) {
        set({
          error: data.error ?? 'Command failed',
          recoverAction: 'Retry the command or switch to Manual mode',
        })
        return false
      }
      const assistantParts: string[] = []
      if (data.intent?.intent) assistantParts.push(`Intent: ${data.intent.intent}`)
      if (data.status) assistantParts.push(`Status: ${data.status}`)
      if (data.package?.projectId) {
        assistantParts.push(`Project ready — open /create/${data.package.projectId}`)
      }
      if (data.package?.script) {
        assistantParts.push(String(data.package.script).slice(0, 400))
      }
      set({
        workflowId: data.workflowId ?? get().workflowId,
        plan: data.plan ?? get().plan,
        tasks: data.tasks ?? get().tasks,
        package: data.package ?? get().package,
        status: data.status ?? 'completed',
        lastIntent: data.intent ?? null,
        memorySnippet:
          data.toolOutputs?.find((t: { tool: string }) => t.tool === 'searchMemory')?.output
            ?.contextSnippet ?? get().memorySnippet,
        messages: pushMessage(
          get().messages,
          'assistant',
          assistantParts.join('\n\n') || 'Done.'
        ),
      })
      return true
    } catch {
      set({ error: 'Network error', recoverAction: 'Check connection and retry' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  planGoal: async () => {
    const { goal, mode } = get()
    if (!goal.trim()) {
      set({ error: 'Enter a goal first' })
      return false
    }
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/agent/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, mode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        set({ error: data.error ?? 'Planning failed' })
        return false
      }
      set({
        workflowId: data.workflowId,
        plan: data.plan,
        tasks: data.tasks ?? [],
        status: 'planning',
      })
      return true
    } catch {
      set({ error: 'Network error' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  executeWorkflow: async (confirm) => {
    const { workflowId, mode } = get()
    if (!workflowId) {
      set({ error: 'Plan a goal first' })
      return false
    }
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId,
          confirm: mode === 'manual' ? confirm ?? true : true,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        set({
          error: data.error ?? 'Execution failed',
          recoverAction: 'Re-run execute or edit the goal',
        })
        return false
      }
      if (data.manual) {
        set({ status: 'awaiting_confirm', error: null })
        return true
      }
      set({
        tasks: data.tasks ?? get().tasks,
        package: data.package ?? null,
        status: data.status ?? 'executing',
      })
      return true
    } catch {
      set({ error: 'Network error' })
      return false
    } finally {
      set({ loading: false })
    }
  },

  pollWorkflow: async () => {
    const { workflowId } = get()
    if (!workflowId) return
    try {
      const res = await fetch(`/api/agent/workflow/${workflowId}`, { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.workflow) {
        set({
          tasks: data.workflow.task_graph ?? [],
          package: data.workflow.package ?? null,
          status: data.workflow.status,
          plan: data.workflow.plan ?? get().plan,
        })
      }
    } catch {
      /* ignore */
    }
  },

  loadHistory: async () => {
    try {
      const res = await fetch('/api/agent/history?limit=5', { cache: 'no-store' })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.workflows?.[0]) {
        const w = data.workflows[0]
        set({
          memorySnippet: get().memorySnippet,
          status: w.status,
          goal: w.goal ?? get().goal,
        })
      }
    } catch {
      /* ignore */
    }
  },

  reset: () =>
    set({
      workflowId: null,
      plan: null,
      tasks: [],
      package: null,
      status: null,
      error: null,
      recoverAction: null,
      lastIntent: null,
    }),
}))
