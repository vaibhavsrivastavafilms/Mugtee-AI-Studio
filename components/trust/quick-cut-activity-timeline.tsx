'use client'

import { useEffect, useState } from 'react'
import { format, parseISO, isToday } from 'date-fns'
import { History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  loadCachedActivity,
  type CachedActivityEntry,
} from '@/lib/trust/activity-events'

type QuickCutActivityTimelineProps = {
  projectId: string | null
  title?: string
  className?: string
  limit?: number
}

function whenLabel(iso: string): string {
  try {
    const d = parseISO(iso)
    if (isToday(d)) return format(d, 'HH:mm')
    return format(d, 'MMM d, HH:mm')
  } catch {
    return ''
  }
}

export function QuickCutActivityTimeline({
  projectId,
  title,
  className,
  limit = 12,
}: QuickCutActivityTimelineProps) {
  const [rows, setRows] = useState<CachedActivityEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) {
      setRows([])
      setLoading(false)
      return
    }

    const cached = loadCachedActivity(projectId)
    setRows(cached.slice(0, limit))
    setLoading(false)

    const supabase = createSupabaseBrowserClient()
    if (!supabase) return

    let cancelled = false
    ;(async () => {
      const { data } = await supabase
        .from('team_activity')
        .select('id, event_type, target, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (cancelled || !data?.length) return

      const remote: CachedActivityEntry[] = data.map((row) => ({
        id: row.id as string,
        label: friendlyRemoteLabel(row.event_type as string),
        createdAt: row.created_at as string,
      }))

      const merged = [...remote]
      for (const c of cached) {
        if (!merged.some((m) => m.label === c.label && m.createdAt === c.createdAt)) {
          merged.push(c)
        }
      }
      merged.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setRows(merged.slice(0, limit))
    })()

    return () => {
      cancelled = true
    }
  }, [projectId, limit])

  if (!projectId) return null

  return (
    <section
      className={cn(
        'rounded-xl border border-white/[0.06] bg-black/30 px-4 py-3 space-y-2',
        className
      )}
      aria-label="Project activity"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80 inline-flex items-center gap-1.5">
          <History className="h-3 w-3" aria-hidden />
          Activity
        </span>
        {title ? (
          <span className="text-[10px] text-luxe/40 truncate max-w-[50%]">{title}</span>
        ) : null}
      </div>

      {loading && rows.length === 0 ? (
        <div className="space-y-1.5 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-3 bg-white/[0.04] rounded w-3/4" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[11px] text-luxe/45 italic">
          Generation milestones will appear here as you work.
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-baseline justify-between gap-3 text-[11px]"
            >
              <span className="text-luxe/75 tabular-nums shrink-0">{whenLabel(row.createdAt)}</span>
              <span className="text-luxe/55 text-right truncate">{row.label}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

function friendlyRemoteLabel(eventType: string): string {
  const map: Record<string, string> = {
    hook_generated: 'Hook generated',
    script_generated: 'Script generated',
    scenes_generated: 'Scenes generated',
    visuals_generated: 'Visuals generated',
    image_generated: 'Visuals generated',
    voiceover_generated: 'Voice generated',
    export_created: 'Export ready',
    regeneration_used: 'Regenerated content',
    content_created: 'Project created',
    project_opened: 'Opened workspace',
  }
  return map[eventType] ?? 'Activity recorded'
}
