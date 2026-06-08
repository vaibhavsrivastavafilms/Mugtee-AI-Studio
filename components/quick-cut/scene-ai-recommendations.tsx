'use client'

import { Sparkles } from 'lucide-react'
import type { SceneAiRecommendation } from '@/lib/quick-cut/scene-review-queue'
import { cn } from '@/lib/utils'

type SceneAiRecommendationsProps = {
  recommendations: SceneAiRecommendation[]
  className?: string
}

export function SceneAiRecommendations({ recommendations, className }: SceneAiRecommendationsProps) {
  if (recommendations.length === 0) return null

  return (
    <div className={cn('rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2.5 space-y-2', className)}>
      <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/45 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-gold-300/60" aria-hidden />
        AI Recommendations
      </p>
      <ul className="space-y-1.5">
        {recommendations.map((rec) => (
          <li key={rec.id} className="text-[10px]">
            <span className="text-gold-200/85 font-medium">{rec.label}</span>
            <span className="text-luxe/50"> — {rec.detail}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
