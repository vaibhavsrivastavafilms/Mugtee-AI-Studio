'use client'
// MUGTEE "Continue Creating" — the lightweight come-back row.
//
// V3.5 — Now memory-aware. If we know the last workspace (project_id + stage),
// render a cinematic "memory line" above the chips so returning creators feel
// like Mugtee remembers their creative journey, not just a flat list of files.
//
// Surfaces up to 3 recent items the user was last working on:
//   1. Last script  (from useStore().content with a script body)
//   2. Last idea    (from localStorage `mugtee:library:ideas`)
//   3. Last prompts (from localStorage `mugtee:library:prompts`)
//
// Hidden entirely if nothing exists — we never show a hollow card.
// Zero new deps, ~140 lines.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, FileText, Lightbulb, Wand2, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'
import { readLastWorkspace, type LastWorkspace } from '@/lib/last-workspace'
import { memoryLineForStage, STAGE_META, type ProjectStage } from '@/lib/project-stage'

type Row =
  | { kind: 'script';  id: string; title: string; href: string; at: string; preview?: string }
  | { kind: 'idea';    id: string; title: string; at: string; payload: any }
  | { kind: 'prompts'; id: string; title: string; at: string }

const KIND_META: Record<Row['kind'], { label: string; icon: any; tone: string }> = {
  script:  { label: 'Last script',  icon: FileText,  tone: 'text-gold-300' },
  idea:    { label: 'Last idea',    icon: Lightbulb, tone: 'text-amber-300' },
  prompts: { label: 'Last prompts', icon: Wand2,     tone: 'text-emerald-300' },
}

export function ContinueCreating() {
  const { content } = useStore()
  const router = useRouter()
  const [ideas, setIdeas] = useState<any[]>([])
  const [prompts, setPrompts] = useState<any[]>([])
  // V3.5 — Read the last workspace from localStorage for the memory line.
  const [lastWs, setLastWs] = useState<LastWorkspace | null>(null)

  useEffect(() => {
    try { setIdeas(JSON.parse(localStorage.getItem('mugtee:library:ideas') || '[]')) } catch {}
    try { setPrompts(JSON.parse(localStorage.getItem('mugtee:library:prompts') || '[]')) } catch {}
    setLastWs(readLastWorkspace())
    const refresh = () => {
      try { setIdeas(JSON.parse(localStorage.getItem('mugtee:library:ideas') || '[]')) } catch {}
      try { setPrompts(JSON.parse(localStorage.getItem('mugtee:library:prompts') || '[]')) } catch {}
      setLastWs(readLastWorkspace())
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh) }
  }, [])

  // V3.5 — Cross-reference last workspace with the live store so the title is
  // always fresh + the link is guaranteed to resolve. If the project no longer
  // exists (deleted), we silently drop the memory line.
  const memoryProject = useMemo(() => {
    if (!lastWs?.project_id) return null
    const proj = content.find((c: any) => c.id === lastWs.project_id)
    if (!proj) return null
    return { id: proj.id, title: proj.title || lastWs.title || 'Untitled project', stage: (lastWs.stage as ProjectStage) || 'scripting' }
  }, [lastWs, content])

  const rows: Row[] = useMemo(() => {
    const r: Row[] = []
    const recentScript = [...content]
      .filter((c: any) => Boolean(c.script || c.description))
      .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0]
    if (recentScript) {
      r.push({
        kind: 'script',
        id: recentScript.id,
        title: recentScript.title || 'Untitled script',
        href: `/script/${recentScript.id}`,
        at: recentScript.created_at ?? new Date().toISOString(),
        preview: String((recentScript as any).script || recentScript.description || '').slice(0, 90),
      })
    }
    if (ideas[0]) r.push({ kind: 'idea',    id: ideas[0].id,   title: ideas[0].title || 'Saved idea',     at: ideas[0].created_at, payload: ideas[0] })
    if (prompts[0]) r.push({ kind: 'prompts', id: prompts[0].id, title: prompts[0].script_title || 'B-roll prompts', at: prompts[0].created_at })
    return r.slice(0, 3)
  }, [content, ideas, prompts])

  // V3.5 — Hide only if BOTH there's nothing in rows AND no memory line to show.
  // (Previously: `if (rows.length === 0) return null` — that would hide the new
  // cinematic memory greeting even when we had a remembered workspace.)
  if (rows.length === 0 && !memoryProject) return null

  const openRow = (row: Row) => {
    if (row.kind === 'script')  router.push(row.href)
    if (row.kind === 'prompts') router.push('/media?tab=prompts')
    if (row.kind === 'idea') {
      const idea = (row as any).payload || {}
      const qs = new URLSearchParams({
        topic: idea.title || '',
        niche: idea.niche || 'general',
        platform: idea.platform || 'instagram',
        autorun: '1',
      })
      router.push(`/create?mode=quick&${qs.toString()}`)
    }
  }

  return (
    <motion.section initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="max-w-5xl mx-auto px-4 sm:px-0 -mt-3">
      <div className="flex items-center justify-between mb-2.5">
        <div className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.3em] uppercase text-gold-300/85">
          <Sparkles className="w-3 h-3" /> Continue Creating
        </div>
        <Link href="/media" className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 transition">Library →</Link>
      </div>

      {/* V3.5 — Cinematic memory line. Subtle, emotionally intelligent, non-spammy.
          Renders ONLY when we have a remembered workspace that still exists in the store. */}
      {memoryProject && (() => {
        const line = memoryLineForStage(memoryProject.stage, memoryProject.title)
        if (!line) return null
        const meta = STAGE_META[memoryProject.stage]
        return (
          <motion.button
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            onClick={() => router.push(`/script/${memoryProject.id}`)}
            className="group w-full text-left mb-3 rounded-2xl bg-gradient-to-br from-gold-500/[0.06] via-amber-500/[0.03] to-transparent border border-gold-500/20 hover:border-gold-500/45 px-4 py-3 transition flex items-center gap-3"
            title={`Resume ${memoryProject.title}`}
          >
            <span className={`text-[10px] tracking-[0.25em] uppercase ${meta.tone} inline-flex items-center gap-1.5 shrink-0`}>
              <span>{meta.emoji}</span> {meta.label}
            </span>
            <span className="text-[12.5px] sm:text-[13px] text-luxe/90 truncate flex-1">{line}</span>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold-300 group-hover:translate-x-0.5 transition shrink-0" />
          </motion.button>
        )
      })()}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {rows.map((row) => {
          const meta = KIND_META[row.kind]
          const Icon = meta.icon
          return (
            <button
              key={`${row.kind}-${row.id}`}
              onClick={() => openRow(row)}
              className="group text-left rounded-2xl glass border border-gold-soft hover:border-gold-500/40 p-3.5 transition flex items-start gap-2.5 min-h-[80px]"
            >
              <div className="w-8 h-8 shrink-0 rounded-lg bg-gold-500/10 border border-gold-500/25 inline-flex items-center justify-center">
                <Icon className={`w-3.5 h-3.5 ${meta.tone}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] tracking-[0.25em] uppercase text-gold-400/80 mb-0.5">{meta.label}</div>
                <div className="text-[13px] font-medium text-luxe truncate">{row.title}</div>
                <div className="text-[10px] text-muted-foreground tracking-wider mt-0.5">
                  {row.at ? formatDistanceToNow(parseISO(row.at), { addSuffix: true }) : 'recently'}
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold-300 group-hover:translate-x-0.5 transition shrink-0 mt-1" />
            </button>
          )
        })}
      </div>
    </motion.section>
  )
}
