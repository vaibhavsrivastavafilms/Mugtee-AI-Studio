'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Play, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMugteeAgentStore } from '@/stores/mugtee-agent-store'

const STATUS_COLORS: Record<string, string> = {
  pending: 'text-luxe/50',
  running: 'text-cyan-400',
  retrying: 'text-amber-400',
  completed: 'text-emerald-400',
  failed: 'text-red-400',
}

export function ExecutionBoard({ className }: { className?: string }) {
  const goal = useMugteeAgentStore((s) => s.goal)
  const mode = useMugteeAgentStore((s) => s.mode)
  const setGoal = useMugteeAgentStore((s) => s.setGoal)
  const setMode = useMugteeAgentStore((s) => s.setMode)
  const plan = useMugteeAgentStore((s) => s.plan)
  const tasks = useMugteeAgentStore((s) => s.tasks)
  const pkg = useMugteeAgentStore((s) => s.package)
  const status = useMugteeAgentStore((s) => s.status)
  const loading = useMugteeAgentStore((s) => s.loading)
  const error = useMugteeAgentStore((s) => s.error)
  const planGoal = useMugteeAgentStore((s) => s.planGoal)
  const executeWorkflow = useMugteeAgentStore((s) => s.executeWorkflow)
  const pollWorkflow = useMugteeAgentStore((s) => s.pollWorkflow)
  const workflowId = useMugteeAgentStore((s) => s.workflowId)
  const recoverAction = useMugteeAgentStore((s) => s.recoverAction)
  const sendCommand = useMugteeAgentStore((s) => s.sendCommand)

  useEffect(() => {
    if (!workflowId || status === 'completed' || status === 'failed') return
    const t = setInterval(() => void pollWorkflow(), 2500)
    return () => clearInterval(t)
  }, [workflowId, status, pollWorkflow])

  return (
    <div
      className={cn(
        'rounded-2xl border border-cyan-500/20 bg-black/40 backdrop-blur-md',
        'shadow-[0_0_40px_-12px_rgba(34,211,238,0.35)]',
        className
      )}
    >
      <div className="border-b border-white/[0.06] px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <h2 className="font-display text-sm tracking-wide text-luxe">MugteeOS Execution</h2>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <span className="text-luxe/50">Mode</span>
          <button
            type="button"
            onClick={() => setMode('autonomous')}
            className={cn(
              'px-2 py-0.5 rounded-full border transition-colors',
              mode === 'autonomous'
                ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                : 'border-white/10 text-luxe/60'
            )}
          >
            Autonomous
          </button>
          <button
            type="button"
            onClick={() => setMode('manual')}
            className={cn(
              'px-2 py-0.5 rounded-full border transition-colors',
              mode === 'manual'
                ? 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10'
                : 'border-white/10 text-luxe/60'
            )}
          >
            Manual
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <label className="block text-[11px] uppercase tracking-wider text-luxe/50">Goal</label>
        <textarea
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder='e.g. Create a viral reel for Table Tales'
          rows={2}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-luxe resize-none focus:outline-none focus:border-cyan-500/40"
        />

        <div className="flex gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => void planGoal()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-sm py-2 hover:bg-cyan-500/30 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Plan
          </button>
          <button
            type="button"
            disabled={loading || !workflowId}
            onClick={() => void executeWorkflow(true)}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] border border-white/10 text-luxe text-sm py-2 hover:bg-white/[0.1] disabled:opacity-50"
          >
            <Play className="h-4 w-4" />
            Execute
          </button>
        </div>

        {error ? (
          <div className="space-y-1">
            <p className="text-xs text-red-400">{error}</p>
            {recoverAction ? (
              <button
                type="button"
                className="text-[10px] text-cyan-300/80 hover:underline"
                onClick={() => void sendCommand(goal)}
              >
                {recoverAction}
              </button>
            ) : null}
          </div>
        ) : null}
        {status ? (
          <p className="text-[11px] text-cyan-300/80 uppercase tracking-wider">Status: {status}</p>
        ) : null}

        {plan ? (
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider text-luxe/50">Plan</h3>
            <p className="text-xs text-luxe/80">{plan.analysis.intent}</p>
            <ul className="text-[11px] text-luxe/60 list-disc pl-4">
              {plan.analysis.deliverables?.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {tasks.length ? (
          <section className="space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider text-luxe/50">Tasks</h3>
            <ul className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-luxe">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex justify-between gap-2 text-xs border border-white/[0.05] rounded-lg px-2 py-1.5"
                >
                  <span className="text-luxe/85 truncate">
                    {t.type}
                    {t.agent ? ` · ${t.agent}` : ''}
                  </span>
                  <span className={cn('shrink-0 capitalize', STATUS_COLORS[t.status] ?? '')}>
                    {t.status}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {pkg?.projectId ? (
          <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-2">
            <h3 className="text-[11px] uppercase tracking-wider text-emerald-300/80">Package</h3>
            {pkg.script ? (
              <p className="text-xs text-luxe/70 line-clamp-4 whitespace-pre-wrap">{pkg.script}</p>
            ) : null}
            <Link
              href={`/create/${pkg.projectId}`}
              className="text-xs text-cyan-300 hover:underline"
            >
              Open project →
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  )
}
