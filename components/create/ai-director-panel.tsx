'use client'

import { useMemo } from 'react'
import { Sparkles, Gauge, Heart, Target } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { buildVirloContext, virloMetadataFromContext } from '@/lib/virlo-engine'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { cn } from '@/lib/utils'

type VirloDisplay = {
  structureName: string
  emotionalGoal: string
  pacingStyle: string
  retentionType: string
  hookVariant: string
}

function StatRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Sparkles
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5">
      <Icon className="w-3.5 h-3.5 text-gold-300/80 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <div className="text-[9px] tracking-[0.22em] uppercase text-muted-foreground">{label}</div>
        <div className="text-xs text-luxe/85 capitalize truncate" title={value}>
          {value.replace(/-/g, ' ')}
        </div>
      </div>
    </div>
  )
}

export function AiDirectorPanel({ className }: { className?: string }) {
  const { prompt, style, duration, niche, hook } = useCinematicProjectStore(
    useShallow((s) => ({
      prompt: s.prompt,
      style: s.style,
      duration: s.duration,
      niche: s.niche,
      hook: s.hook,
    }))
  )

  const virlo = useMemo<VirloDisplay | null>(() => {
    const idea = prompt.trim()
    if (idea.length < 6) return null
    try {
      const ctx = buildVirloContext(idea, {
        tone: style,
        duration,
        niche,
        skipMemory: true,
      })
      const meta = virloMetadataFromContext(ctx)
      return {
        structureName: meta.structureName,
        emotionalGoal: meta.emotionalGoal,
        pacingStyle: meta.pacingStyle,
        retentionType: meta.retentionType,
        hookVariant: meta.hookVariant,
      }
    } catch {
      return null
    }
  }, [prompt, style, duration, niche])

  return (
    <aside
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-gold-soft bg-black/30 p-4 lg:p-5',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold-300" />
        <div>
          <div className="font-display text-sm text-luxe">AI Director</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Virlo metadata
          </div>
        </div>
      </div>

      {!virlo ? (
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          Shape your idea in the center panel — pacing, tone, and retention signals appear here.
        </p>
      ) : (
        <div className="space-y-2">
          <StatRow icon={Target} label="Structure" value={virlo.structureName} />
          <StatRow icon={Heart} label="Emotional goal" value={virlo.emotionalGoal} />
          <StatRow icon={Gauge} label="Pacing" value={virlo.pacingStyle} />
          <StatRow icon={Sparkles} label="Retention" value={virlo.retentionType} />
          {hook ? (
            <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.06] px-3 py-2.5">
              <div className="text-[9px] tracking-[0.22em] uppercase text-gold-300/80 mb-1">
                Hook · {virlo.hookVariant.replace(/-/g, ' ')}
              </div>
              <p className="text-xs text-luxe/80 leading-relaxed line-clamp-4">{hook}</p>
            </div>
          ) : null}
        </div>
      )}
    </aside>
  )
}
