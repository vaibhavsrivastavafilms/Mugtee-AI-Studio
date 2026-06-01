'use client'
// MUGTEE V3.5 — Project Activity Timeline.
//
// Cinematic chronological production log for a single project. Reads from
// the EXISTING `team_activity` table (no new infra) filtered by project_id.
// Owner-only via RLS. Lazy-loaded (50 most recent — older items collapse).
//
// Renders as a minimal vertical rail with hh:mm timestamps. Mobile-first.

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { format, parseISO, isToday, isYesterday } from 'date-fns'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { deriveStage, STAGE_META } from '@/lib/project-stage'
import type { EventType } from '@/lib/log-event'
import {
  FileText, Wand2, Image as ImageIcon, Volume2, Download, RotateCcw,
  Sparkles, History, Eye, Brain
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityRow {
  id: string
  actor: string | null
  action: string | null
  target: string | null
  event_type: string | null
  metadata: Record<string, any> | null
  created_at: string
}

const EVENT_ICON: Record<string, any> = {
  project_opened:         Eye,
  hook_generated:         Sparkles,
  script_generated:       FileText,
  scenes_generated:       ImageIcon,
  visuals_generated:      ImageIcon,
  rewrite_applied:        Wand2,
  narration_extracted:    Volume2,
  flow_prompts_generated: Brain,
  image_generated:        ImageIcon,
  voiceover_generated:    Volume2,
  export_created:         Download,
  regeneration_used:      RotateCcw,
  content_created:        Sparkles,
  content_updated:        Wand2,
}

const EVENT_TONE: Record<string, string> = {
  project_opened:         'text-muted-foreground',
  hook_generated:         'text-gold-300',
  script_generated:       'text-gold-300',
  scenes_generated:       'text-cyan-300',
  visuals_generated:      'text-cyan-300',
  rewrite_applied:        'text-amber-200',
  narration_extracted:    'text-rose-300',
  flow_prompts_generated: 'text-cyan-300',
  image_generated:        'text-cyan-300',
  voiceover_generated:    'text-purple-300',
  export_created:         'text-emerald-300',
  regeneration_used:      'text-amber-300',
  content_created:        'text-gold-300',
  content_updated:        'text-luxe/70',
}

function friendlyLabel(row: ActivityRow): string {
  const map: Record<string, string> = {
    project_opened:         'Opened workspace',
    hook_generated:         'Hook generated',
    script_generated:       'Script generated',
    scenes_generated:       'Scenes generated',
    visuals_generated:      'Visuals generated',
    rewrite_applied:        `Applied ${row.metadata?.variant ? `\u201C${row.metadata.variant}\u201D ` : ''}rewrite`,
    narration_extracted:    'Extracted narration',
    flow_prompts_generated: `Generated ${row.metadata?.count || ''} visual prompts`.trim(),
    image_generated:        `Created ${row.metadata?.count || ''} storyboard image${row.metadata?.count > 1 ? 's' : ''}`.trim(),
    voiceover_generated:    'Generated voiceover',
    export_created:         `Exported ${row.metadata?.format || 'document'}`,
    regeneration_used:      'Regenerated content',
    content_created:        'Created project',
    content_updated:        'Updated metadata',
  }
  return (row.event_type && map[row.event_type]) || (row.action ? row.action.charAt(0).toUpperCase() + row.action.slice(1) : 'Activity')
}

function whenLabel(iso: string): string {
  try {
    const d = parseISO(iso)
    if (isToday(d))     return format(d, 'h:mm a')
    if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a')
    return format(d, 'MMM d, h:mm a')
  } catch { return '' }
}

export function ProjectActivityTimeline({
  projectId,
  className,
  limit = 50,
  showStage = true,
}: { projectId: string; className?: string; limit?: number; showStage?: boolean }) {
  const [rows, setRows]       = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!projectId) return
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const { data } = await supabase
        .from('team_activity')
        .select('id, actor, action, target, event_type, metadata, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (cancelled) return
      setRows(((data as any) || []) as ActivityRow[])
      setLoading(false)
    })()

    // Lightweight realtime — reuses the same channel pattern from lib/store.tsx.
    const channel = supabase
      .channel(`rt-activity-${projectId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'team_activity', filter: `project_id=eq.${projectId}` },
        (payload: any) => {
          const row = payload.new as ActivityRow
          if (!row) return
          setRows(prev => [row, ...prev].slice(0, limit))
        }
      )
      .subscribe()

    return () => { cancelled = true; supabase.removeChannel(channel) }
  }, [projectId, limit])

  const stage = useMemo(() => deriveStage(rows.map(r => ({ event_type: r.event_type, action: r.action }))), [rows])
  const visible = expanded ? rows : rows.slice(0, 8)
  const hidden  = Math.max(0, rows.length - visible.length)

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn('rounded-2xl glass border border-gold-soft p-5 sm:p-6', className)}
    >
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-1.5">
            <History className="w-3 h-3" /> Activity timeline
          </span>
          {showStage && rows.length > 0 && (
            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[9.5px] tracking-[0.22em] uppercase', STAGE_META[stage].tone)}>
              <span>{STAGE_META[stage].emoji}</span> {STAGE_META[stage].label}
            </span>
          )}
        </div>
        {rows.length > 0 && (
          <span className="text-[10px] tracking-wider uppercase text-muted-foreground">
            {rows.length} event{rows.length === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0,1,2].map(i => (
            <div key={i} className="flex items-start gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-full bg-white/[0.04] shrink-0" />
              <div className="flex-1 space-y-1.5 py-1">
                <div className="h-3 w-2/3 bg-white/[0.04] rounded" />
                <div className="h-2 w-1/3 bg-white/[0.03] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-[12px] text-muted-foreground italic">No events yet. Generate or edit something \u2014 it\u2019ll show up here, live.</div>
      ) : (
        <>
          <ol className="relative space-y-2.5 pl-[26px]">
            {/* Vertical guide */}
            <span aria-hidden className="absolute left-[13px] top-1 bottom-1 w-px bg-gradient-to-b from-gold-500/30 via-white/[0.04] to-transparent" />
            {visible.map(row => {
              const Icon = EVENT_ICON[row.event_type || ''] || Sparkles
              const tone = EVENT_TONE[row.event_type || ''] || 'text-luxe/70'
              return (
                <li key={row.id} className="relative">
                  <span className={cn('absolute -left-[26px] top-0.5 w-7 h-7 rounded-full inline-flex items-center justify-center bg-white/[0.03] border border-white/[0.08] ring-2 ring-background', tone)}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] text-luxe/90 leading-snug">
                      {friendlyLabel(row)}
                      {row.target && row.event_type !== 'content_created' && (
                        <span className="text-muted-foreground"> \u2014 {row.target}</span>
                      )}
                    </div>
                    <div className="text-[10.5px] tracking-wider text-muted-foreground/80">
                      {whenLabel(row.created_at)}
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
          {hidden > 0 && (
            <button
              onClick={() => setExpanded(true)}
              className="mt-3 text-[10.5px] tracking-wider uppercase text-gold-300 hover:text-gold-200 transition"
            >
              Show {hidden} earlier event{hidden === 1 ? '' : 's'} \u2192
            </button>
          )}
        </>
      )}
    </motion.section>
  )
}

export default ProjectActivityTimeline
