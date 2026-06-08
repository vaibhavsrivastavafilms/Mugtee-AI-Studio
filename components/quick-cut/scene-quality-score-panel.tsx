'use client'

import type { SceneQualityMetrics } from '@/lib/quick-cut/scene-review-queue'
import { cn } from '@/lib/utils'

type SceneQualityScorePanelProps = {
  metrics: SceneQualityMetrics
  className?: string
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-luxe/45">{label}</span>
        <span className="tabular-nums text-luxe/75">{value}</span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold-600/70 to-gold-300/90"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

export function SceneQualityScorePanel({ metrics, className }: SceneQualityScorePanelProps) {
  return (
    <div className={cn('rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2.5 space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[9px] tracking-[0.18em] uppercase text-gold-300/60">Director Quality Score</p>
        <p className="text-lg font-display tabular-nums text-gold-200/95">{metrics.overall}</p>
      </div>
      <ScoreRow label="Visual Impact" value={metrics.visualImpact} />
      <ScoreRow label="Story Alignment" value={metrics.storyAlignment} />
      <ScoreRow label="Emotion Match" value={metrics.emotionMatch} />
    </div>
  )
}
