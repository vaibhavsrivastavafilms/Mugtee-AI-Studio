'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DirectorTimeline } from '@/components/reel-composer/DirectorTimeline'
import { composeReelTimeline } from '@/lib/reel/compose-reel-timeline'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

function formatTimecode(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

type TrackRow = {
  id: string
  label: string
  color: string
  segments: { leftPct: number; widthPct: number; title: string }[]
}

type TimelineStudioPanelProps = {
  projectId?: string
  className?: string
}

export function TimelineStudioPanel({ projectId: _projectId, className }: TimelineStudioPanelProps) {
  const {
    scenes,
    reelTimeline,
    voiceUrl,
    duration,
    script,
    sceneMotion,
    sceneBlueprints,
  } = useQuickCutGenerationStore(
    useShallow((s) => ({
      scenes: s.scenes,
      reelTimeline: s.reelTimeline,
      voiceUrl: s.voiceUrl,
      duration: s.duration,
      script: s.script,
      sceneMotion: s.sceneMotion,
      sceneBlueprints: s.sceneBlueprints,
    }))
  )

  const [playheadSec, setPlayheadSec] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [zoom, setZoom] = useState(1)

  const timeline = useMemo(() => {
    if (reelTimeline) return reelTimeline
    return composeReelTimeline({
      scenes,
      voiceUrl,
      script,
      targetDurationSec: duration,
      sceneMotion,
      sceneBlueprints,
    })
  }, [reelTimeline, scenes, voiceUrl, script, duration, sceneMotion, sceneBlueprints])

  const totalSec = timeline?.totalDurationSec || duration || 60

  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setPlayheadSec((t) => {
        if (t >= totalSec) {
          setPlaying(false)
          return 0
        }
        return t + 0.25
      })
    }, 250)
    return () => window.clearInterval(id)
  }, [playing, totalSec])

  const tracks: TrackRow[] = useMemo(() => {
    if (!timeline || timeline.clips.length === 0) return []
    const total = timeline.totalDurationSec || 1
    const videoSegs = timeline.clips.map((clip) => ({
      leftPct: (clip.startSec / total) * 100,
      widthPct: Math.max(1.5, (clip.duration / total) * 100),
      title: clip.title ?? `Scene ${clip.index + 1}`,
    }))
    const voiceSegs = timeline.voiceUrl
      ? [{ leftPct: 0, widthPct: 100, title: 'Voiceover' }]
      : []
    const captionSegs = timeline.clips.map((clip) => ({
      leftPct: (clip.caption.startSec / total) * 100,
      widthPct: Math.max(1, ((clip.caption.endSec - clip.caption.startSec) / total) * 100),
      title: clip.caption.text.slice(0, 24),
    }))

    return [
      { id: 'video', label: 'Video', color: 'bg-studio-primary/70', segments: videoSegs },
      { id: 'broll', label: 'B-Roll', color: 'bg-violet-500/40', segments: videoSegs.slice(0, 1) },
      { id: 'images', label: 'Images', color: 'bg-studio-primary/50', segments: videoSegs },
      { id: 'voice', label: 'Voiceover', color: 'bg-emerald-500/50', segments: voiceSegs },
      { id: 'music', label: 'Music', color: 'bg-emerald-600/35', segments: [] },
      { id: 'sfx', label: 'SFX', color: 'bg-amber-600/40', segments: [] },
      { id: 'subs', label: 'Subtitles', color: 'bg-cyan-400/50', segments: captionSegs },
    ]
  }, [timeline])

  const seek = useCallback(
    (sec: number) => setPlayheadSec(Math.max(0, Math.min(totalSec, sec))),
    [totalSec]
  )

  if (!timeline || scenes.length === 0) {
    return (
      <div
        className={cn(
          'shrink-0 border-t border-white/[0.06] bg-[#0D0D0D] px-4 py-6 text-center',
          className
        )}
      >
        <p className="text-[11px] text-luxe/45 italic">
          Timeline tracks appear after scenes are generated.
        </p>
      </div>
    )
  }

  const playheadPct = totalSec > 0 ? (playheadSec / totalSec) * 100 : 0

  return (
    <div
      className={cn(
        'shrink-0 flex flex-col max-h-[min(42vh,320px)] min-h-[200px] border-t border-white/[0.06] bg-[#0D0D0D]',
        className
      )}
      aria-label="Studio timeline"
    >
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => seek(Math.max(0, playheadSec - 5))}
            className="p-1.5 rounded-lg text-luxe/50 hover:bg-white/[0.04]"
            aria-label="Skip back"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="p-1.5 rounded-lg text-studio-primary hover:bg-studio-primary-muted"
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => seek(Math.min(totalSec, playheadSec + 5))}
            className="p-1.5 rounded-lg text-luxe/50 hover:bg-white/[0.04]"
            aria-label="Skip forward"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        <span className="text-[11px] tabular-nums text-luxe/60">
          {formatTimecode(playheadSec)} / {formatTimecode(totalSec)}
        </span>
        <div className="flex-1" />
        <Volume2 className="w-4 h-4 text-luxe/40" />
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))}
          className="p-1.5 rounded-lg text-luxe/50 hover:bg-white/[0.04]"
          aria-label="Zoom out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(2, z + 0.15))}
          className="p-1.5 rounded-lg text-luxe/50 hover:bg-white/[0.04]"
          aria-label="Zoom in"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto scrollbar-luxe px-3 py-2">
        <div className="relative min-w-[480px]" style={{ transform: `scaleX(${zoom})`, transformOrigin: 'left' }}>
          {tracks.map((track) => (
            <div key={track.id} className="flex items-center gap-2 h-8 mb-1">
              <span className="w-16 shrink-0 text-[9px] tracking-[0.08em] uppercase text-luxe/40 truncate">
                {track.label}
              </span>
              <div className="relative flex-1 h-6 rounded-md bg-white/[0.03] border border-white/[0.05] overflow-hidden">
                {track.segments.map((seg, i) => (
                  <div
                    key={`${track.id}-${i}`}
                    title={seg.title}
                    className={cn('absolute top-0 bottom-0 rounded-sm', track.color)}
                    style={{ left: `${seg.leftPct}%`, width: `${seg.widthPct}%` }}
                  />
                ))}
                <span
                  className="absolute top-0 bottom-0 w-px bg-white/90 z-10 pointer-events-none"
                  style={{ left: `${playheadPct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2 border-t border-white/[0.05]">
          <DirectorTimeline
            timeline={timeline}
            currentTimeSec={playheadSec}
            onSeek={seek}
            className="opacity-90"
          />
        </div>
      </div>
    </div>
  )
}
