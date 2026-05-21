'use client'
// MUGTEE "Continue Creating" — the lightweight come-back row.
//
// Surfaces up to 3 recent items the user was last working on:
//   1. Last script  (from useStore().content with a script body)
//   2. Last idea    (from localStorage `mugtee:library:ideas`)
//   3. Last prompts (from localStorage `mugtee:library:prompts`)
//
// Hidden entirely if nothing exists — we never show a hollow card.
// Zero new deps, ~100 lines.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, FileText, Lightbulb, Wand2, Sparkles } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { useRouter } from 'next/navigation'

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

  useEffect(() => {
    try { setIdeas(JSON.parse(localStorage.getItem('mugtee:library:ideas') || '[]')) } catch {}
    try { setPrompts(JSON.parse(localStorage.getItem('mugtee:library:prompts') || '[]')) } catch {}
    const refresh = () => {
      try { setIdeas(JSON.parse(localStorage.getItem('mugtee:library:ideas') || '[]')) } catch {}
      try { setPrompts(JSON.parse(localStorage.getItem('mugtee:library:prompts') || '[]')) } catch {}
    }
    window.addEventListener('focus', refresh)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh) }
  }, [])

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
        at: recentScript.created_at,
        preview: String((recentScript as any).script || recentScript.description || '').slice(0, 90),
      })
    }
    if (ideas[0]) r.push({ kind: 'idea',    id: ideas[0].id,   title: ideas[0].title || 'Saved idea',     at: ideas[0].created_at, payload: ideas[0] })
    if (prompts[0]) r.push({ kind: 'prompts', id: prompts[0].id, title: prompts[0].script_title || 'B-roll prompts', at: prompts[0].created_at })
    return r.slice(0, 3)
  }, [content, ideas, prompts])

  if (rows.length === 0) return null

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
      router.push(`/dashboard?${qs.toString()}`)
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
