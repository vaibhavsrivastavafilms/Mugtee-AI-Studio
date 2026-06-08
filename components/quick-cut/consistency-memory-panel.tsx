'use client'

import { useEffect, useMemo, useState } from 'react'
import { Brain, MapPin, Palette, User } from 'lucide-react'
import {
  buildConsistencyMemory,
  getConsistencyMemory,
  persistConsistencyMemory,
  type ConsistencyMemory,
} from '@/lib/creator/consistency-memory'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'

function MemoryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User
  label: string
  value: string | null
}) {
  return (
    <div className="flex gap-2 text-[10px] border-b border-white/[0.04] pb-1.5 last:border-0">
      <Icon className="w-3.5 h-3.5 text-gold-300/55 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-wider text-luxe/40">{label}</p>
        <p className="text-luxe/65 leading-relaxed">
          {value?.trim() || '—'}
        </p>
      </div>
    </div>
  )
}

/** Phase 4 — character, style, and location memory with auto prompt injection. */
export function ConsistencyMemoryPanel({ className }: { className?: string }) {
  const mounted = useClientMounted()
  const [stored, setStored] = useState<ConsistencyMemory | null>(null)

  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      characterDescription: s.characterDescription,
      storyBible: s.storyBible,
      visualStyle: s.visualStyle,
      style: s.style,
      sceneBlueprints: s.sceneBlueprints,
      scenes: s.scenes,
      outputAlignmentControls: s.outputAlignmentControls,
      isComplete: s.isComplete,
    }))
  )

  const live = useMemo(
    () =>
      buildConsistencyMemory({
        characterDescription: state.characterDescription,
        storyBible: state.storyBible,
        visualStyle: state.visualStyle,
        style: state.style,
        sceneBlueprints: state.sceneBlueprints,
        scenes: state.scenes,
        outputAlignmentControls: state.outputAlignmentControls,
      }),
    [state]
  )

  useEffect(() => {
    if (!mounted) return
    setStored(getConsistencyMemory())
  }, [mounted])

  useEffect(() => {
    if (!mounted || !state.isComplete) return
    const next = buildConsistencyMemory({
      characterDescription: state.characterDescription,
      storyBible: state.storyBible,
      visualStyle: state.visualStyle,
      style: state.style,
      sceneBlueprints: state.sceneBlueprints,
      scenes: state.scenes,
      outputAlignmentControls: state.outputAlignmentControls,
    })
    persistConsistencyMemory(next)
    setStored(next)
  }, [mounted, state.isComplete, state])

  const memory = stored ?? live
  const hasThread =
    Boolean(memory.characterThread) ||
    Boolean(memory.styleThread) ||
    Boolean(memory.locationThread)

  if (!hasThread && state.scenes.length < 1) return null

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/15 bg-gradient-to-b from-black/50 to-black/30 p-3 space-y-2',
        className
      )}
      aria-label="Consistency memory"
    >
      <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 flex items-center gap-1.5">
        <Brain className="w-3 h-3" aria-hidden />
        Character Consistency Engine
      </p>
      <p className="text-[9px] text-luxe/40">Auto-injected into scene image prompts</p>
      <MemoryRow icon={User} label="Character memory" value={memory.characterThread} />
      <MemoryRow icon={Palette} label="Style memory" value={memory.styleThread} />
      <MemoryRow icon={MapPin} label="Location memory" value={memory.locationThread} />
      {memory.locations.length > 0 ? (
        <p className="text-[9px] text-luxe/35">
          Locations: {memory.locations.join(' · ')}
        </p>
      ) : null}
    </section>
  )
}
