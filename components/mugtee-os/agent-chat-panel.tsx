'use client'

import { cn } from '@/lib/utils'
import type { AgentChatMessage } from '@/lib/ai-agent/types'

export function AgentChatPanel({
  messages,
  className,
}: {
  messages: AgentChatMessage[]
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 max-h-48 overflow-y-auto scrollbar-luxe p-3 space-y-2',
        className
      )}
    >
      {!messages.length ? (
        <p className="text-xs text-luxe/45">Ask Mugtee anything — scripts, reels, calendar, projects.</p>
      ) : (
        messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'text-xs rounded-lg px-2 py-1.5',
              m.role === 'user' ? 'bg-white/[0.06] text-luxe ml-4' : 'bg-cyan-500/10 text-cyan-100/90 mr-4'
            )}
          >
            {m.content}
          </div>
        ))
      )}
    </div>
  )
}
