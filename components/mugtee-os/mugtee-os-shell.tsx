'use client'

import Link from 'next/link'
import { MugteeAgentProvider } from '@/components/mugtee-os/mugtee-agent-provider'
import { ExecutionBoard } from '@/components/mugtee-os/execution-board'
import { CommandBar } from '@/components/mugtee-os/command-bar'
import { VoiceInput } from '@/components/mugtee-os/voice-input'
import { AgentChatPanel } from '@/components/mugtee-os/agent-chat-panel'
import { WorkflowPanel } from '@/components/mugtee-os/workflow-panel'
import { ExecutionTimeline } from '@/components/mugtee-os/execution-timeline'
import { MemoryPanel } from '@/components/mugtee-os/memory-panel'
import { useMugteeAgentStore } from '@/stores/mugtee-agent-store'

function MugteeOsPanels() {
  const messages = useMugteeAgentStore((s) => s.messages)
  const plan = useMugteeAgentStore((s) => s.plan)
  const tasks = useMugteeAgentStore((s) => s.tasks)
  const workflowId = useMugteeAgentStore((s) => s.workflowId)
  const status = useMugteeAgentStore((s) => s.status)
  const memorySnippet = useMugteeAgentStore((s) => s.memorySnippet)
  const pkg = useMugteeAgentStore((s) => s.package)
  const sendCommand = useMugteeAgentStore((s) => s.sendCommand)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">MugteeOS</p>
        <h1 className="font-display text-2xl text-luxe">Command Center</h1>
        <p className="text-sm text-luxe/55">
          Voice or Cmd+K → intent → tools → workflow. Teal glass UI with creator memory.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ExecutionBoard />
          <AgentChatPanel messages={messages} />
        </div>
        <div className="space-y-4 rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md p-4">
          <WorkflowPanel plan={plan} workflowId={workflowId} status={status} />
          <MemoryPanel snippet={memorySnippet} />
          <section>
            <h3 className="text-[10px] uppercase tracking-wider text-luxe/50 mb-2">Timeline</h3>
            <ExecutionTimeline tasks={tasks} />
          </section>
          {pkg?.projectId ? (
            <Link
              href={`/create/${pkg.projectId}`}
              className="inline-block text-xs text-cyan-300 hover:underline"
            >
              Open project →
            </Link>
          ) : null}
        </div>
      </div>

      <VoiceInput onFinalTranscript={(text) => void sendCommand(text)} />
    </div>
  )
}

export function MugteeOsShell() {
  return (
    <MugteeAgentProvider>
      <MugteeOsPanels />
      <CommandBar />
    </MugteeAgentProvider>
  )
}
