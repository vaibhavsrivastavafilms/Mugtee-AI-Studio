'use client'

import { useCompanionStore } from '@/stores/companion-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useStudioWorkspaceStore } from '@/stores/studio-workspace-store'
import { cn } from '@/lib/utils'

const FALLBACK_SUGGESTIONS = [
  'Improve Hook — sharpen the opening beat',
  'Increase Retention — tighten mid-roll pacing',
  'Make More Viral — boost scroll-stop energy',
]

type StudioDirectorSuggestionsProps = {
  className?: string
  maxItems?: number
}

export function StudioDirectorSuggestions({
  className,
  maxItems = 3,
}: StudioDirectorSuggestionsProps) {
  const directorNotes = useCompanionStore((s) => s.directorNotes)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const setContextSectionExpanded = useStudioWorkspaceStore((s) => s.setContextSectionExpanded)
  const setPanelPreferences = useStudioWorkspaceStore((s) => s.setPanelPreferences)

  const fromNotes = directorNotes
    .map((n) => n.text?.trim())
    .filter(Boolean)
    .slice(0, maxItems)

  const bullets =
    fromNotes.length > 0
      ? fromNotes
      : hook.trim()
        ? [
            'Hook is strong — consider a bolder visual open.',
            ...FALLBACK_SUGGESTIONS.slice(1),
          ]
        : FALLBACK_SUGGESTIONS

  const viewAll = () => {
    setPanelPreferences({ directorPanelOpen: true })
    setContextSectionExpanded('director', true)
    setPanelPreferences({ directorNotesExpanded: true })
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-luxe/70">AI Suggestions</p>
        <span className="text-[10px] tabular-nums text-luxe/40">{bullets.length}</span>
      </div>
      <ul className="space-y-1.5">
        {bullets.slice(0, maxItems).map((line, i) => (
          <li key={i} className="flex gap-2 text-[11px] text-luxe/55 leading-snug">
            <span className="text-luxe/25 shrink-0">•</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={viewAll}
        className="w-full h-7 rounded-md border border-white/[0.08] text-[10px] tracking-[0.12em] uppercase text-luxe/60 hover:text-luxe hover:border-white/[0.14] transition"
      >
        View All Suggestions
      </button>
    </div>
  )
}
