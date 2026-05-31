'use client'

import { useEffect, useRef } from 'react'
import { Clapperboard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { companionCopy } from '@/lib/companion/microcopy'
import { DIRECTOR_NOTE_SESSION_CAP } from '@/lib/companion/types'
import { useCompanionStore } from '@/stores/companion-store'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

type DirectorNotesPanelProps = {
  className?: string
}

export function DirectorNotesPanel({ className }: DirectorNotesPanelProps) {
  const directorNotes = useCompanionStore((s) => s.directorNotes)
  const loading = useCompanionStore((s) => s.directorNotesLoading)
  const capReached = useCompanionStore((s) => s.directorSessionCapReached)
  const fetchDirectorNote = useCompanionStore((s) => s.fetchDirectorNote)
  const setProjectId = useCompanionStore((s) => s.setProjectId)

  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const title = useQuickCutGenerationStore((s) => s.title)
  const style = useQuickCutGenerationStore((s) => s.style)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)

  const triggeredRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (savedProjectId) setProjectId(savedProjectId)
  }, [savedProjectId, setProjectId])

  useEffect(() => {
    if (isGenerating || capReached || directorNotes.length >= DIRECTOR_NOTE_SESSION_CAP) return

    const triggers: Array<{ key: string; ctx: Parameters<typeof fetchDirectorNote>[0] }> = []
    if (hook && generationStep !== 'idle') {
      triggers.push({ key: 'hook', ctx: { hook, title, style, generationStep: 'hook' } })
    }
    if (script && ['script', 'scenes', 'visuals', 'voice'].includes(generationStep)) {
      triggers.push({
        key: 'script',
        ctx: { hook, script, title, style, generationStep },
      })
    }
    if (generationStep === 'scenes') {
      triggers.push({
        key: 'scenes',
        ctx: { hook, script, title, style, generationStep: 'scenes' },
      })
    }

    for (const t of triggers) {
      if (triggeredRef.current.has(t.key)) continue
      if (directorNotes.length >= DIRECTOR_NOTE_SESSION_CAP) break
      triggeredRef.current.add(t.key)
      void fetchDirectorNote(t.ctx)
      break
    }
  }, [
    hook,
    script,
    title,
    style,
    generationStep,
    isGenerating,
    capReached,
    directorNotes.length,
    fetchDirectorNote,
  ])

  return (
    <div className={cn('rounded-xl border border-white/[0.06] bg-black/40 p-3 space-y-2', className)}>
      <div className="flex items-center gap-2 text-gold-300/75">
        <Clapperboard className="w-3.5 h-3.5" />
        <p className="text-[9px] tracking-[0.2em] uppercase">{companionCopy('directorPanelTitle')}</p>
      </div>

      {directorNotes.length === 0 && !loading ? (
        <p className="text-[11px] text-luxe/50 italic leading-relaxed">
          {companionCopy('directorPanelEmpty')}
        </p>
      ) : null}

      <ul className="space-y-2">
        {directorNotes.map((note) => (
          <li
            key={note.id}
            className="rounded-lg border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2 text-[12px] text-luxe/80 leading-relaxed"
          >
            {note.text}
          </li>
        ))}
      </ul>

      {loading ? (
        <p className="text-[10px] text-luxe/45 flex items-center gap-1.5">
          <Loader2 className="w-3 h-3 animate-spin" />
          Mugtee on set…
        </p>
      ) : null}

      {capReached ? (
        <p className="text-[10px] text-luxe/40 italic">{companionCopy('sessionCapReached')}</p>
      ) : null}
    </div>
  )
}
