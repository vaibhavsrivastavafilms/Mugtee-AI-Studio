'use client'

import { Sparkles, Gauge, Heart, Target, Film } from 'lucide-react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ProjectCardModel } from '@/components/create/unified-projects-grid'

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

export function ProjectsInsightsPanel({
  project,
  className,
}: {
  project: ProjectCardModel | null
  className?: string
}) {
  return (
    <aside
      className={cn(
        'flex flex-col gap-4 rounded-2xl border border-gold-soft bg-black/30 p-4 lg:p-5 xl:sticky xl:top-24 xl:self-start',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-gold-300" />
        <div>
          <div className="font-display text-sm text-luxe">AI Director</div>
          <div className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
            Cinematic insights
          </div>
        </div>
      </div>

      {!project ? (
        <p className="text-xs text-muted-foreground leading-relaxed italic">
          Hover a reel to see tone, platform, and production metadata — every generation lives in
          your unified library.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-gold-500/20 bg-gold-500/[0.06] px-3 py-2.5">
            <div className="text-[9px] tracking-[0.22em] uppercase text-gold-300/80 mb-1">
              {project.mode === 'quick' ? 'Quick Cut' : 'Director Cut'}
            </div>
            <p className="text-sm text-luxe font-medium leading-snug line-clamp-2">{project.title}</p>
          </div>

          <StatRow icon={Film} label="Tone" value={project.style} />
          <StatRow icon={Target} label="Platform" value={project.platform} />
          <StatRow icon={Gauge} label="Duration" value={`${project.duration}s reel`} />
          <StatRow icon={Heart} label="Status" value={project.creationStatusLabel} />

          <p className="text-[10px] text-muted-foreground tracking-wide">
            Updated{' '}
            {project.updatedAt
              ? formatDistanceToNow(parseISO(project.updatedAt), { addSuffix: true })
              : 'recently'}
          </p>
        </div>
      )}
    </aside>
  )
}
