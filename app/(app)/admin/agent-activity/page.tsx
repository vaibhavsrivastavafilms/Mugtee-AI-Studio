import { AgentWorkflowAnalytics } from '@/components/admin/agent-workflow-analytics'

export const dynamic = 'force-dynamic'

export default function AdminAgentActivityPage() {
  return (
    <main className="min-h-[calc(100dvh-4rem)] px-4 sm:px-6 py-8 space-y-6">
      <header>
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">Admin</p>
        <h1 className="font-display text-2xl text-luxe">MugteeOS Agent Activity</h1>
        <p className="text-sm text-luxe/55 mt-1">
          Command intents, tool latency, and workflow completion over the last 30 days.
        </p>
      </header>
      <AgentWorkflowAnalytics />
    </main>
  )
}
