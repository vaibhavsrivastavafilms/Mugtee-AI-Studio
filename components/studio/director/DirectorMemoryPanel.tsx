'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { useDirectorMemoryStore } from '@/stores/director-memory-store'
import { frequenciesToPercentages, scoreLabel } from '@/lib/director/memory/memory-score'

function MemoryBar({
  label,
  percent,
  accent = 'gold',
}: {
  label: string
  percent: number
  accent?: 'gold' | 'purple'
}) {
  const barColor = accent === 'gold' ? 'bg-gold-400/80' : 'bg-purple-400/70'
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="text-white/65 truncate">{label}</span>
        <span className="text-gold-300/80 shrink-0 tabular-nums">{percent}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-black/60 border border-white/[0.06] overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', barColor)}
          style={{ width: `${Math.max(4, percent)}%` }}
        />
      </div>
    </div>
  )
}

function MemorySection({
  title,
  score,
  items,
  emptyHint,
}: {
  title: string
  score: number
  items: Array<{ label: string; percent: number }>
  emptyHint: string
}) {
  return (
    <article className="rounded-xl border border-gold-500/15 bg-black/50 p-4 space-y-3">
      <header className="flex items-center justify-between gap-2">
        <h3 className="text-[11px] uppercase tracking-[0.16em] text-gold-200/90">{title}</h3>
        <span className="text-[10px] text-white/40">{scoreLabel(score)} · {score}</span>
      </header>
      {items.length ? (
        <div className="space-y-2.5">
          {items.map((item) => (
            <MemoryBar key={item.label} label={item.label} percent={item.percent} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-white/35 italic">{emptyHint}</p>
      )}
    </article>
  )
}

export function DirectorMemoryPanel() {
  const memory = useDirectorMemoryStore((s) => s.creatorMemory)
  const scores = useDirectorMemoryStore((s) => s.memoryScore)
  const loading = useDirectorMemoryStore((s) => s.loading)
  const error = useDirectorMemoryStore((s) => s.error)
  const lastLearningRun = useDirectorMemoryStore((s) => s.lastLearningRun)
  const loadMemory = useDirectorMemoryStore((s) => s.loadMemory)

  useEffect(() => {
    void loadMemory()
  }, [loadMemory])

  const projects = memory?.storyMemory.projectCount ?? 0

  return (
    <DirectorPanelShell
      title="Director Memory"
      subtitle="Your cinematic instincts — learned from completed director projects, not analytics."
    >
      <div
        className="rounded-2xl border border-gold-500/25 p-5 space-y-4"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(212, 175, 55, 0.08), transparent), rgba(0,0,0,0.55)',
        }}
      >
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold-400/70">Profile depth</p>
            <p className="mt-1 text-3xl font-light text-gold-100 tabular-nums">
              {scores?.overall ?? 0}
              <span className="text-base text-white/40 ml-1">/ 100</span>
            </p>
          </div>
          <div className="text-right text-[10px] text-white/40 space-y-0.5">
            <p>{projects} project{projects === 1 ? '' : 's'} learned</p>
            {lastLearningRun ? (
              <p>Last update {new Date(lastLearningRun).toLocaleDateString()}</p>
            ) : null}
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-white/45 animate-pulse">Loading director profile…</p>
        ) : null}
        {error ? <p className="text-xs text-red-400/90">{error}</p> : null}

        {!loading && projects === 0 ? (
          <p className="text-sm text-white/50 leading-relaxed">
            Complete and export a director project to start building your memory profile. Mugtee will
            learn how you think — frameworks, camera, voice, and motion — not just what you generated.
          </p>
        ) : null}
      </div>

      {memory && scores ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <MemorySection
            title="Story"
            score={scores.story}
            items={[
              ...frequenciesToPercentages(memory.storyMemory.frameworks, 4),
              ...frequenciesToPercentages(memory.storyMemory.hookStyles, 3),
            ].slice(0, 5)}
            emptyHint="Story patterns emerge after your first completed project."
          />
          <MemorySection
            title="Visual"
            score={scores.visual}
            items={[
              ...frequenciesToPercentages(memory.visualMemory.shotTypes, 3),
              ...frequenciesToPercentages(memory.visualMemory.lighting, 2),
            ].slice(0, 5)}
            emptyHint="Camera and lighting preferences will appear here."
          />
          <MemorySection
            title="Voice"
            score={scores.voice}
            items={[
              ...frequenciesToPercentages(memory.voiceMemory.narratorTones, 3),
              ...frequenciesToPercentages(memory.voiceMemory.pacing, 2),
            ].slice(0, 5)}
            emptyHint="Narration style builds with each voice-directed project."
          />
          <MemorySection
            title="Motion"
            score={scores.motion}
            items={frequenciesToPercentages(memory.motionMemory.motionStyles, 5)}
            emptyHint="Zoom, pan, and drift habits surface after motion planning."
          />
        </div>
      ) : null}

      {memory?.creatorPreferences.projectCount ? (
        <article className="rounded-xl border border-gold-500/15 bg-black/50 p-4 space-y-2">
          <h3 className="text-[11px] uppercase tracking-[0.16em] text-gold-200/90">Preferences</h3>
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {memory.creatorPreferences.avgSceneCount > 0 ? (
              <div>
                <dt className="text-[10px] text-white/35 uppercase tracking-wide">Avg scenes</dt>
                <dd className="text-white/75 mt-0.5">
                  {Math.round(memory.creatorPreferences.avgSceneCount)}
                </dd>
              </div>
            ) : null}
            {memory.creatorPreferences.avgDurationSec > 0 ? (
              <div>
                <dt className="text-[10px] text-white/35 uppercase tracking-wide">Avg duration</dt>
                <dd className="text-white/75 mt-0.5">
                  {Math.round(memory.creatorPreferences.avgDurationSec)}s
                </dd>
              </div>
            ) : null}
            {memory.creatorPreferences.preferredFramework ? (
              <div>
                <dt className="text-[10px] text-white/35 uppercase tracking-wide">Framework</dt>
                <dd className="text-white/75 mt-0.5">
                  {memory.creatorPreferences.preferredFramework}
                </dd>
              </div>
            ) : null}
            {memory.creatorPreferences.preferredGenre ? (
              <div>
                <dt className="text-[10px] text-white/35 uppercase tracking-wide">Genre</dt>
                <dd className="text-white/75 mt-0.5">{memory.creatorPreferences.preferredGenre}</dd>
              </div>
            ) : null}
            {memory.creatorPreferences.preferredMood ? (
              <div className="col-span-2">
                <dt className="text-[10px] text-white/35 uppercase tracking-wide">Mood</dt>
                <dd className="text-white/75 mt-0.5">{memory.creatorPreferences.preferredMood}</dd>
              </div>
            ) : null}
          </dl>
        </article>
      ) : null}
    </DirectorPanelShell>
  )
}
