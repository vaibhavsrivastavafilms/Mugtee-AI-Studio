'use client'
// Phase 13F — Dedicated script workspace. Reads from the existing content_pieces store (no new table).
// Persistent because content_pieces is already authed/Supabase-backed/realtime-synced.

import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowLeft, Copy, Check, Plus, Pencil, CalendarCheck, Wand2, Download, Loader2, Brain, Film } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { PLATFORM_META, STATUS_META } from '@/lib/dummy-data'
import { toast } from 'sonner'

export default function ScriptWorkspace() {
  const params = useParams() as { id: string }
  const router = useRouter()
  const { content, updateContent, loading } = useStore()
  const piece = useMemo(() => content.find(c => c.id === params.id), [content, params.id])

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [flowLoading, setFlowLoading] = useState(false)
  const [flowOut, setFlowOut] = useState<any | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500) } catch {}
  }

  const beginEdit = () => { setDraft(piece?.script || piece?.description || ''); setEditing(true) }
  const saveEdit = async () => {
    if (!piece) return
    await updateContent(piece.id, { script: draft } as any)
    setEditing(false)
    toast.success('Script saved')
  }

  const exportTxt = () => {
    if (!piece) return
    const text = `# ${piece.title}\n\n${(piece as any).script || piece.description || ''}\n`
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `${piece.title.replace(/[^a-z0-9-_]+/gi,'-').toLowerCase()}.txt`; a.click(); URL.revokeObjectURL(url)
  }

  const genFlow = async () => {
    if (!piece) return
    setFlowLoading(true); setFlowOut(null)
    try {
      const src = (piece as any).script || piece.description || piece.title
      const res = await fetch('/api/ai/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'flow_prompts', context: { script_input: src, platform: piece.platform, language: 'english' } }) })
      const d = await res.json()
      if (!res.ok || d.error) { toast.error(d.error || 'Flow generation failed'); return }
      setFlowOut(d.output)
    } catch (e:any) { toast.error(e?.message || 'Network error') }
    finally { setFlowLoading(false) }
  }

  if (loading.initial) {
    return <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading workspace…</div>
  }
  if (!piece) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground mb-2">Not found</div>
        <h1 className="font-display text-3xl mb-3">This script no longer exists</h1>
        <p className="text-luxe/70 text-sm mb-6">It may have been deleted or moved to trash.</p>
        <Button onClick={() => router.push('/pipeline')} className="bg-gold-gradient text-black gap-2"><ArrowLeft className="w-4 h-4" /> Back to Pipeline</Button>
      </div>
    )
  }

  const platformMeta = PLATFORM_META[piece.platform]
  const statusMeta   = STATUS_META[piece.status]
  const scriptText = (piece as any).script || piece.description || ''
  const tags = piece.tags || []

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="max-w-5xl mx-auto space-y-4 sm:space-y-5 pb-24 sm:pb-12 px-1 sm:px-0">
      {/* Top bar — sticky on mobile so actions stay reachable while reading long scripts */}
      <div className="sticky top-0 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 py-2 sm:py-0 sm:static bg-background/85 backdrop-blur sm:bg-transparent sm:backdrop-blur-0 sm:rounded-none flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-xs tracking-[0.2em] uppercase text-muted-foreground hover:text-gold-300 transition">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </button>
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          <Button onClick={() => copy('script', scriptText)} variant="ghost" className="h-9 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0">
            {copied === 'script' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} Copy
          </Button>
          <Button onClick={beginEdit} variant="ghost" className="h-9 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0"><Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Continue editing</span><span className="sm:hidden">Edit</span></Button>
          <Button onClick={exportTxt} variant="ghost" className="h-9 px-3 text-xs text-luxe/80 hover:text-gold-300 hover:bg-white/5 gap-1.5 min-h-[44px] sm:min-h-0"><Download className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Export</span></Button>
          <Button onClick={() => router.push('/pipeline')} className="h-9 px-3 text-xs bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5 min-h-[44px] sm:min-h-0"><Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Open in Pipeline</span><span className="sm:hidden">Pipeline</span></Button>
        </div>
      </div>

      {/* Hero */}
      <div className="glass-strong rounded-3xl p-6 sm:p-8 border border-gold-soft">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Script workspace</span>
          {tags.includes('faceless') && <span className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-gold-500/10 border border-gold-500/30 text-gold-300 inline-flex items-center gap-1"><Brain className="w-2.5 h-2.5" /> Faceless</span>}
        </div>
        <h1 className="font-display text-3xl sm:text-4xl leading-tight mb-2">{piece.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span className={`px-1.5 py-0.5 rounded uppercase tracking-wider ${platformMeta.color} bg-white/[0.03] border border-white/[0.06]`}>{platformMeta.label}</span>
          <span className="px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/[0.03] border border-white/[0.06]">{statusMeta.label}</span>
          {piece.scheduled_at && <span className="inline-flex items-center gap-1"><CalendarCheck className="w-3 h-3 text-gold-400/80" /> {format(parseISO(piece.scheduled_at), 'MMM d · HH:mm')}</span>}
          {piece.created_at && <span className="opacity-60">created {format(parseISO(piece.created_at), 'MMM d, yyyy')}</span>}
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {tags.map(t => <span key={t} className="text-[9px] tracking-widest uppercase px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-muted-foreground">{t}</span>)}
          </div>
        )}
      </div>

      {/* Script body */}
      <div className="rounded-2xl glass border border-gold-soft p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300">Full script</span>
          {!editing && <span className="text-[10px] text-muted-foreground">{scriptText.split(/\s+/).filter(Boolean).length} words</span>}
        </div>
        {editing ? (
          <>
            <textarea value={draft} onChange={e => setDraft(e.target.value)} className="w-full min-h-[280px] bg-white/[0.03] border border-white/[0.08] rounded-lg p-3 text-[13px] leading-relaxed font-mono text-luxe/90 focus:outline-none focus:border-gold-500/50" />
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="ghost" onClick={() => setEditing(false)} className="text-muted-foreground">Cancel</Button>
              <Button onClick={saveEdit} className="bg-gold-gradient text-black gap-2"><Check className="w-4 h-4" /> Save</Button>
            </div>
          </>
        ) : scriptText ? (
          <pre className="text-[13px] sm:text-[13px] leading-[1.75] sm:leading-relaxed text-luxe/90 whitespace-pre-wrap font-mono break-words">{scriptText}</pre>
        ) : (
          <div className="text-[12px] text-muted-foreground italic">No script body yet. Click <span className="text-gold-300">Continue editing</span> to start writing.</div>
        )}
      </div>

      {/* Flow prompts panel */}
      <div className="rounded-2xl glass border border-gold-soft p-5 sm:p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-1.5"><Wand2 className="w-3 h-3" /> Flow / B-roll prompts</span>
          <Button onClick={genFlow} disabled={flowLoading} className="h-7 px-3 text-[11px] bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5">
            {flowLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />} {flowLoading ? 'Generating…' : flowOut ? 'Regenerate' : 'Generate'}
          </Button>
        </div>
        {flowOut ? (
          <div className="space-y-2">
            {flowOut.style_summary && <div className="text-[11px] italic text-luxe/70 mb-2">Style · {flowOut.style_summary}</div>}
            {(flowOut.scene_prompts || []).map((p:any, i:number) => (
              <div key={i} className="group flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                <span className="text-[9px] tracking-widest uppercase text-gold-400/80 mt-0.5 shrink-0 w-16">{p.type}</span>
                <span className="text-[12px] text-luxe/85 flex-1 leading-snug">{p.prompt}</span>
                <button onClick={() => copy('p'+i, p.prompt)} className="opacity-0 group-hover:opacity-100 text-[10px] uppercase text-muted-foreground hover:text-gold-300 inline-flex items-center gap-1 transition-opacity">
                  {copied === 'p'+i ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[12px] text-muted-foreground italic">Click Generate to produce 8-12 cinematic image/B-roll prompts derived from this script.</div>
        )}
      </div>

      {/* Media attached */}
      {piece.media_url && (
        <div className="rounded-2xl glass border border-gold-soft p-5">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 mb-2 inline-flex items-center gap-1.5"><Film className="w-3 h-3" /> Media attached</span>
          <div className="text-[11px] text-luxe/70 font-mono break-all mt-1">{piece.media_url}</div>
        </div>
      )}
    </motion.div>
  )
}
