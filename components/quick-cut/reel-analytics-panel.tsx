'use client'

import { useMemo } from 'react'
import { sumSceneDurationSec } from '@/lib/cinematic/scene-duration'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type ReelAnalyticsPanelProps = {
  className?: string
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/35 px-2.5 py-1.5">
      <p className="text-[8px] uppercase tracking-wider text-luxe/40">{label}</p>
      <p className="text-[11px] text-luxe/75 truncate">{value}</p>
    </div>
  )
}

export function ReelAnalyticsPanel({ className }: ReelAnalyticsPanelProps) {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      scenes: s.scenes,
      duration: s.duration,
      reelTimeline: s.reelTimeline,
      voiceName: s.voiceName,
      niche: s.niche,
      generationStartedAt: s.generationStartedAt,
      exportCompletedAt: s.exportCompletedAt,
      videoUrl: s.videoUrl,
    }))
  )

  const durationSec = useMemo(() => {
    if (state.reelTimeline?.totalDurationSec) return state.reelTimeline.totalDurationSec
    const fromScenes = sumSceneDurationSec(state.scenes)
    return fromScenes > 0 ? fromScenes : state.duration
  }, [state])

  const generatedDate = state.exportCompletedAt ?? state.generationStartedAt

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/15 bg-gradient-to-b from-black/50 to-black/30 p-3 space-y-2',
        className
      )}
      aria-label="Reel analytics"
    >
      <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85">Reel Analytics</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Scenes" value={String(state.scenes.length)} />
        <Stat label="Duration" value={`${Math.round(durationSec)}s`} />
        <Stat label="Voice" value={state.voiceName?.trim() || 'Auto'} />
        <Stat label="Platform" value={state.niche?.trim() || 'Reel'} />
        <Stat label="Resolution" value="1080×1920" />
        <Stat label="FPS" value="30" />
        <Stat label="File Size" value={state.videoUrl ? 'MP4 ready' : '—'} />
        <Stat
          label="Generated"
          value={
            generatedDate
              ? new Date(generatedDate).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : '—'
          }
        />
      </div>
    </section>
  )
}
