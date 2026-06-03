'use client'

import { Brain } from 'lucide-react'
import { cn } from '@/lib/utils'

export function MemoryPanel({
  snippet,
  className,
}: {
  snippet: string | null
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-3 space-y-2',
        className
      )}
    >
      <div className="flex items-center gap-2 text-cyan-300/90">
        <Brain className="h-3.5 w-3.5" />
        <h3 className="text-[10px] uppercase tracking-wider">Creator memory</h3>
      </div>
      {snippet ? (
        <p className="text-[11px] text-luxe/65 whitespace-pre-wrap line-clamp-6">{snippet}</p>
      ) : (
        <p className="text-[11px] text-luxe/45">
          Memory loads automatically for commands like &ldquo;Create tomorrow&apos;s Table Tales post&rdquo;.
        </p>
      )}
    </section>
  )
}
