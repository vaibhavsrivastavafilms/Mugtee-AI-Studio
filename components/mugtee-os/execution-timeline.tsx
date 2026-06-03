'use client'

import { Check, Clock, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AgentTask } from '@/lib/ai-agent/types'

const ICON = {
  completed: Check,
  running: Clock,
  retrying: Clock,
  pending: Square,
  failed: Square,
} as const

export function ExecutionTimeline({
  tasks,
  className,
}: {
  tasks: AgentTask[]
  className?: string
}) {
  if (!tasks.length) {
    return (
      <p className={cn('text-xs text-luxe/45', className)}>No tasks yet — plan or run a command.</p>
    )
  }

  return (
    <ul className={cn('space-y-2', className)}>
      {tasks.map((t) => {
        const Icon = ICON[t.status] ?? Square
        const done = t.status === 'completed'
        const running = t.status === 'running' || t.status === 'retrying'
        return (
          <li
            key={t.id}
            className="flex items-start gap-2 text-xs border border-white/[0.06] rounded-lg px-2.5 py-2 bg-white/[0.02]"
          >
            <Icon
              className={cn(
                'h-3.5 w-3.5 mt-0.5 shrink-0',
                done && 'text-emerald-400',
                running && 'text-cyan-400 animate-pulse',
                t.status === 'failed' && 'text-red-400',
                t.status === 'pending' && 'text-luxe/35'
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="text-luxe/90 truncate">{t.type}{t.tool ? ` · ${t.tool}` : ''}</p>
              {t.error ? <p className="text-red-400/90 mt-0.5">{t.error}</p> : null}
            </div>
            <span className="capitalize text-luxe/45 shrink-0">{t.status}</span>
          </li>
        )
      })}
    </ul>
  )
}
