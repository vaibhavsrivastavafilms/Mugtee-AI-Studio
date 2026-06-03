'use client'

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { useMugteeAgentStore } from '@/stores/mugtee-agent-store'
import type { AgentWorkflowMode, CommandIntent } from '@/lib/ai-agent/types'

type MugteeAgentContextValue = {
  goal: string
  mode: AgentWorkflowMode
  lastIntent: CommandIntent | null
  setGoal: (g: string) => void
  setMode: (m: AgentWorkflowMode) => void
  sendCommand: (command: string) => Promise<boolean>
  planGoal: () => Promise<boolean>
  runWorkflow: () => Promise<boolean>
}

const MugteeAgentContext = createContext<MugteeAgentContextValue | null>(null)

export function MugteeAgentProvider({ children }: { children: ReactNode }) {
  const goal = useMugteeAgentStore((s) => s.goal)
  const mode = useMugteeAgentStore((s) => s.mode)
  const lastIntent = useMugteeAgentStore((s) => s.lastIntent)
  const setGoal = useMugteeAgentStore((s) => s.setGoal)
  const setMode = useMugteeAgentStore((s) => s.setMode)
  const sendCommand = useMugteeAgentStore((s) => s.sendCommand)
  const planGoal = useMugteeAgentStore((s) => s.planGoal)
  const executeWorkflow = useMugteeAgentStore((s) => s.executeWorkflow)

  const runWorkflow = useCallback(async () => {
    const ok = await planGoal()
    if (!ok) return false
    return executeWorkflow(true)
  }, [planGoal, executeWorkflow])

  const value = useMemo(
    () => ({
      goal,
      mode,
      lastIntent,
      setGoal,
      setMode,
      sendCommand,
      planGoal,
      runWorkflow,
    }),
    [goal, mode, lastIntent, setGoal, setMode, sendCommand, planGoal, runWorkflow]
  )

  return (
    <MugteeAgentContext.Provider value={value}>{children}</MugteeAgentContext.Provider>
  )
}

export function useMugteeAgent() {
  const ctx = useContext(MugteeAgentContext)
  if (!ctx) throw new Error('useMugteeAgent must be used within MugteeAgentProvider')
  return ctx
}
