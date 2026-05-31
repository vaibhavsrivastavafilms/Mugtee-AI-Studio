'use client'

import { useMemo } from 'react'
import { BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { simulateAudience } from '@/lib/agent/audience-simulator'

export function AudienceSimulatorCard({
  hook,
  topic,
  script,
  platform,
  duration,
  className,
}: {
  hook?: string
  topic?: string
  script?: string
  platform?: string
  duration?: number
  className?: string
}) {
  const prediction = useMemo(
    () =>
      simulateAudience({
        hook: hook || topic,
        script,
        topic,
        platform,
        duration,
      }),
    [hook, topic, script, platform, duration]
  )

  const hasInput = Boolean((hook || topic)?.trim())
  if (!hasInput) return null

  const metrics = [
    { label: 'Retention', value: prediction.retention },
    { label: 'Emotion', value: prediction.emotion },
    { label: 'Curiosity', value: prediction.curiosity },
    { label: 'Share', value: prediction.shareability },
    { label: 'Comments', value: prediction.commentPotential },
  ]

  return (
    <div
      className={cn(
        'rounded-xl border border-gold-500/20 bg-gold-500/[0.04] p-4 space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80 flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          Audience simulator
        </p>
        <span className="text-sm font-medium text-[var(--v2-gold)]">
          {prediction.predictedPerformanceScore}
        </span>
      </div>
      <p className="text-[11px] text-luxe/55">{prediction.insight}</p>
      <div className="grid grid-cols-5 gap-1.5">
        {metrics.map((m) => (
          <div key={m.label} className="text-center">
            <div className="h-1 rounded-full bg-black/40 overflow-hidden">
              <div
                className="h-full bg-gold-500/70 rounded-full"
                style={{ width: `${m.value}%` }}
              />
            </div>
            <p className="text-[8px] text-luxe/40 mt-1 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
