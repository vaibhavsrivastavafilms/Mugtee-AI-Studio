'use client'

import { useRef } from 'react'
import { ScriptBeatsDisplay } from '@/components/quick-cut/script-beats-display'
import type { ScriptBeat } from '@/types/cinematic-script'
import { cn } from '@/lib/utils'
import { RewriteToolbar, type RewriteReplacePayload } from '@/components/rewrite/rewrite-toolbar'
import type { RewriteContext } from '@/lib/rewrite/rewrite-actions'

export function LiveScriptReveal({
  script,
  hook,
  scriptBeats,
  payoff,
  cta,
  active,
  className,
  directorEdit,
  rewriteContext,
  onDirectorReplace,
}: {
  script: string
  hook?: string
  scriptBeats?: ScriptBeat[]
  payoff?: string
  cta?: string
  active?: boolean
  className?: string
  directorEdit?: boolean
  rewriteContext?: RewriteContext
  onDirectorReplace?: (payload: RewriteReplacePayload) => void | Promise<void>
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  const inner = scriptBeats?.length || hook ? (
    <ScriptBeatsDisplay
      hook={hook || ''}
      scriptBeats={scriptBeats ?? []}
      payoff={payoff}
      cta={cta}
      active={active}
      selectable={Boolean(directorEdit)}
    />
  ) : script ? (
    <div className="rounded-xl border border-white/[0.08] bg-black/30 p-4">
      <pre
        data-rewrite-type="script"
        className="select-text whitespace-pre-wrap break-words text-[12px] leading-[1.65] text-luxe/75 font-sans max-h-[140px] overflow-y-auto scrollbar-luxe"
      >
        {script}
      </pre>
    </div>
  ) : null

  if (!inner) return null

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {directorEdit && onDirectorReplace ? (
        <RewriteToolbar
          containerRef={containerRef}
          context={rewriteContext}
          onReplace={onDirectorReplace}
          enabled={!active}
        />
      ) : null}
      {inner}
    </div>
  )
}
