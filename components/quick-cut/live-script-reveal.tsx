'use client'

import { ScriptBeatsDisplay } from '@/components/quick-cut/script-beats-display'
import type { MugteeScriptBeat } from '@/lib/cinematic/script-sop'
import { cn } from '@/lib/utils'

export function LiveScriptReveal({
  script,
  hook,
  scriptBeats,
  payoff,
  cta,
  active,
  className,
}: {
  script: string
  hook?: string
  scriptBeats?: MugteeScriptBeat[]
  payoff?: string
  cta?: string
  active?: boolean
  className?: string
}) {
  if (scriptBeats?.length || hook) {
    return (
      <ScriptBeatsDisplay
        hook={hook || ''}
        scriptBeats={scriptBeats ?? []}
        payoff={payoff}
        cta={cta}
        active={active}
        className={className}
      />
    )
  }

  if (!script) return null

  return (
    <div className={cn('rounded-xl border border-white/[0.08] bg-black/30 p-4', className)}>
      <pre className="whitespace-pre-wrap break-words text-[12px] leading-[1.65] text-luxe/75 font-sans max-h-[140px] overflow-y-auto scrollbar-luxe">
        {script}
      </pre>
    </div>
  )
}
