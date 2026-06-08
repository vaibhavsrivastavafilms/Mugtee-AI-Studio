'use client'

import { useMemo } from 'react'
import { Check, Loader2 } from 'lucide-react'
import {
  cinematicExportHeadline,
  resolveCinematicExportStages,
} from '@/lib/quick-cut/cinematic-export-stages'
import type { ExportFrameProgress } from '@/lib/quick-cut/generation-hud'
import { cn } from '@/lib/utils'

const EXPORT_FPS = 30
const RESOLUTION = '1080×1920'

type CinematicExportHudProps = {
  exportProgress: ExportFrameProgress | null
  renderStatusLabel?: string | null
  videoUrl?: string | null
  sceneCount: number
  etaLabel?: string | null
  className?: string
}

export function CinematicExportHud({
  exportProgress,
  renderStatusLabel,
  videoUrl,
  sceneCount,
  etaLabel,
  className,
}: CinematicExportHudProps) {
  const complete = Boolean(videoUrl?.trim())
  const active = exportProgress?.isActive || Boolean(renderStatusLabel?.trim() && !complete)

  const stages = useMemo(
    () =>
      resolveCinematicExportStages({
        exportProgress,
        renderStatusLabel,
        videoUrl,
      }),
    [exportProgress, renderStatusLabel, videoUrl]
  )

  const headline = cinematicExportHeadline(stages, complete)

  if (!active && !complete) return null

  const pct = complete ? 100 : (exportProgress?.progressPercent ?? 0)

  return (
    <div
      className={cn(
        'rounded-lg border border-gold-500/15 bg-black/40 px-3 py-2.5 space-y-2',
        className
      )}
      aria-label="Export progress"
    >
      <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/75">{headline}</p>

      <ul className="space-y-1">
        {stages.map((stage) => (
          <li key={stage.id} className="flex items-center gap-2 text-[10px]">
            {stage.status === 'done' ? (
              <Check className="w-3 h-3 text-emerald-400/80 shrink-0" aria-hidden />
            ) : stage.status === 'active' ? (
              <Loader2 className="w-3 h-3 text-gold-300/80 animate-spin shrink-0" aria-hidden />
            ) : (
              <span className="w-3 h-3 rounded-full border border-white/15 shrink-0" />
            )}
            <span
              className={cn(
                stage.status === 'active' && 'text-gold-100/90',
                stage.status === 'done' && 'text-luxe/55',
                stage.status === 'pending' && 'text-luxe/35'
              )}
            >
              Step {stage.step} · {stage.label}
            </span>
          </li>
        ))}
      </ul>

      {exportProgress && !complete ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-1 text-[9px] text-luxe/50 pt-1 border-t border-white/[0.06]">
          <span>
            Progress <span className="tabular-nums text-gold-200/85">{pct}%</span>
          </span>
          <span>
            Frames{' '}
            <span className="tabular-nums text-luxe/70">
              {exportProgress.currentFrame} / {exportProgress.totalFrames}
            </span>
          </span>
          {etaLabel ? (
            <span>
              ETA <span className="tabular-nums text-luxe/70">{etaLabel}</span>
            </span>
          ) : null}
          <span>Resolution {RESOLUTION}</span>
          <span>{EXPORT_FPS} fps</span>
          <span>Scenes {sceneCount}</span>
          <span className="col-span-2 sm:col-span-3 truncate text-luxe/40">
            Status {renderStatusLabel || exportProgress.label}
          </span>
        </div>
      ) : null}
    </div>
  )
}
