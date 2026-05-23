'use client'
// Phase V1.2 — Mugtee Library.
// V3.8 — Tab ORDER + 3 new asset tabs.
// Tabs: Prompts · Ideas · Scripts · Images · Narrations · Media · Exports
//   • Prompts    → localStorage `mugtee:library:prompts` (auto-saved by script flow_prompts)
//   • Ideas      → localStorage `mugtee:library:ideas`   (auto-saved by Viral Studio panel)
//   • Scripts    → pulled from useStore() (content_pieces with script body)
//   • Images     → /api/library/assets?kind=image    (cross-project view of project_assets)
//   • Narrations → /api/library/assets?kind=voiceover
//   • Media      → existing useStore().media grid (uploads)
//   • Exports    → /api/library/assets?kind=export
//
// EXTREME LOW CREDIT MODE: zero new DB tables, zero new deps. Cross-project tabs
// reuse the existing project_assets table via a single thin /api/library/assets endpoint.

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Play, FileVideo, Image as ImgIcon, Music, Plus, Trash2, ImagePlus, Archive,
  FileText, Lightbulb, Wand2, ArrowRight, Sparkles, Clock, Volume2, Download, RotateCcw, ExternalLink,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Skeleton, EmptyState } from '@/components/ui/state'
import { UploadDropzone } from '@/components/media/upload-dropzone'
import { useConfirm } from '@/components/ui/confirm'
import { cn } from '@/lib/utils'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'

const ICONS: any = { video: FileVideo, image: ImgIcon, audio: Music }

function formatBytes(n?: number | null) {
  if (!n) return ''
  if (n > 1e9) return (n / 1e9).toFixed(1) + ' GB'
  if (n > 1e6) return (n / 1e6).toFixed(1) + ' MB'
  if (n > 1e3) return (n / 1e3).toFixed(1) + ' KB'
  return n + ' B'
}

type TabId = 'prompts' | 'ideas' | 'scripts' | 'images' | 'narrations' | 'media' | 'exports'
const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: 'prompts',    label: 'Prompts',    icon: Wand2 },
  { id: 'ideas',      label: 'Ideas',      icon: Lightbulb },
  { id: 'scripts',    label: 'Scripts',    icon: FileText },
  { id: 'images',     label: 'Images',     icon: ImgIcon },
  { id: 'narrations', label: 'Narrations', icon: Volume2 },
  { id: 'media',      label: 'Media',      icon: Music },
  { id: 'exports',    label: 'Exports',    icon: Download },
]

// V3.8 — Cross-project asset shape from /api/library/assets.
type LibraryAsset = { id: string; project_id: string | null; kind: string; url: string | null; title: string | null; prompt: string | null; metadata: any; created_at: string }

// ─── localStorage Library Helpers ──────────────────────────────────
// Shared with /lib/library.ts (re-exported) — keep this file the canonical writer.
export type LibraryIdea = { id: string; title: string; hook?: string; angle?: string; niche?: string; platform?: string; created_at: string }
export type LibraryPrompt = { id: string; script_title?: string; prompts: { type: string; prompt: string }[]; created_at: string }

function readIdeas(): LibraryIdea[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('mugtee:library:ideas') || '[]') } catch { return [] }
}
function readPrompts(): LibraryPrompt[] {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem('mugtee:library:prompts') || '[]') } catch { return [] }
}
function writeIdeas(rows: LibraryIdea[]) { try { localStorage.setItem('mugtee:library:ideas', JSON.stringify(rows.slice(0, 100))) } catch {} }
function writePrompts(rows: LibraryPrompt[]) { try { localStorage.setItem('mugtee:library:prompts', JSON.stringify(rows.slice(0, 50))) } catch {} }

export default function MediaPage() {
  const router = useRouter()
  const { content, media, loading, removeMedia, archiveMedia } = useStore()
  const confirm = useConfirm()
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<TabId>('prompts')
  // Phase 3N — accept `?tab=` deep-link from sidebar Storyboards/Voiceovers.
  const searchParams = useSearchParams()
  useEffect(() => {
    const t = searchParams.get('tab')
    if (!t) return
    const valid = ['prompts','ideas','scripts','images','narrations','media','exports'] as const
    if ((valid as readonly string[]).includes(t) && t !== tab) {
      setTab(t as TabId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // V3.8 — Cross-project library assets (Images / Narrations / Exports).
  // Reuses /api/library/assets which thin-queries the existing project_assets table.
  const [libAssets, setLibAssets] = useState<LibraryAsset[]>([])
  const [libLoading, setLibLoading] = useState(false)
  useEffect(() => {
    // Only fetch when one of the asset-driven tabs is selected — keeps Prompts/Ideas/Scripts fast.
    if (tab !== 'images' && tab !== 'narrations' && tab !== 'exports') return
    const kind = tab === 'images' ? 'image' : tab === 'narrations' ? 'voiceover' : 'export'
    let cancelled = false
    setLibLoading(true)
    ;(async () => {
      try {
        const r = await fetch(`/api/library/assets?kind=${kind}&limit=80`)
        const d = await r.json()
        if (cancelled) return
        setLibAssets((d?.assets || []) as LibraryAsset[])
      } catch {
        if (!cancelled) setLibAssets([])
      } finally {
        if (!cancelled) setLibLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tab])

  // Phase 3G — counter synchronization. Independent lightweight fetch so the
  // tab chip counts (Images / Narrations / Exports) reflect REAL persisted
  // assets regardless of which tab is currently active. Refreshes on mount,
  // on tab switch, and whenever the window regains focus.
  const [assetCounts, setAssetCounts] = useState<{ image: number; voiceover: number; export: number }>({ image: 0, voiceover: 0, export: 0 })
  useEffect(() => {
    let cancelled = false
    const fetchCounts = async () => {
      try {
        const r = await fetch('/api/library/assets?kind=image,voiceover,export&limit=100')
        const d = await r.json()
        if (cancelled) return
        const arr = (d?.assets || []) as LibraryAsset[]
        setAssetCounts({
          image:     arr.filter(a => a.kind === 'image').length,
          voiceover: arr.filter(a => a.kind === 'voiceover').length,
          export:    arr.filter(a => a.kind === 'export').length,
        })
      } catch {}
    }
    fetchCounts()
    const onFocus = () => { fetchCounts() }
    window.addEventListener('focus', onFocus)
    return () => { cancelled = true; window.removeEventListener('focus', onFocus) }
  }, [tab])

  // Localstorage-backed collections
  const [ideas, setIdeas] = useState<LibraryIdea[]>([])
  const [prompts, setPrompts] = useState<LibraryPrompt[]>([])
  useEffect(() => { setIdeas(readIdeas()); setPrompts(readPrompts()) }, [])
  // Cross-tab sync — also refreshes whenever the tab regains focus (covers same-tab writes from other components).
  useEffect(() => {
    const refresh = () => { setIdeas(readIdeas()); setPrompts(readPrompts()) }
    window.addEventListener('storage', refresh)
    window.addEventListener('focus', refresh)
    return () => { window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh) }
  }, [])

  // Scripts derived from content_pieces — any piece that has a non-empty script OR description.
  const scripts = useMemo(() => {
    return content
      .filter(c => Boolean((c as any).script || c.description))
      .sort((a, b) => (new Date(b.created_at || 0).getTime()) - (new Date(a.created_at || 0).getTime()))
  }, [content])

  const counts: Record<TabId, number> = {
    prompts:    prompts.length,
    ideas:      ideas.length,
    scripts:    scripts.length,
    // Phase 3G — counts come from the dedicated `assetCounts` aggregate so
    // they reflect the REAL persisted totals, not just whatever tab is open.
    images:     assetCounts.image,
    narrations: assetCounts.voiceover,
    media:      media.length,
    exports:    assetCounts.export,
  }

  const deleteIdea = (id: string) => { const next = ideas.filter(i => i.id !== id); setIdeas(next); writeIdeas(next); toast.success('Idea removed') }
  const deletePrompt = (id: string) => { const next = prompts.filter(p => p.id !== id); setPrompts(next); writePrompts(next); toast.success('Prompts removed') }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6">
      <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs tracking-[0.3em] uppercase text-gold-400/80 mb-2">Library</div>
          <h1 className="font-display text-4xl sm:text-5xl"><span className="text-gold-gradient">Everything</span> you've created</h1>
          <p className="text-luxe/70 mt-2 text-sm">Auto-saved scripts, ideas, prompts &amp; media — pick up where you left off.</p>
        </div>
        {tab === 'media' && (
          <Dialog open={creating} onOpenChange={setCreating}>
            <DialogTrigger asChild>
              <Button className="bg-gold-gradient text-black gap-2 shadow-gold-glow"><Plus className="w-4 h-4" /> Upload</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong sm:max-w-2xl">
              <DialogHeader><DialogTitle className="font-display text-2xl">Upload media</DialogTitle></DialogHeader>
              <UploadDropzone />
            </DialogContent>
          </Dialog>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto scrollbar-luxe -mx-4 px-4">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          const count = counts[t.id]
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs tracking-wide transition shrink-0 min-h-[40px]',
                active
                  ? 'bg-gold-500/15 border border-gold-500/40 text-gold-100 shadow-[0_0_22px_-8px_rgba(245,196,77,0.6)]'
                  : 'bg-white/[0.03] border border-white/[0.06] text-luxe/75 hover:bg-white/[0.06] hover:text-luxe',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-gold-300' : 'text-muted-foreground')} />
              <span className="font-medium">{t.label}</span>
              <span className={cn('text-[10px] tabular-nums px-1.5 py-0.5 rounded-md', active ? 'bg-gold-500/20 text-gold-200' : 'bg-white/[0.04] text-muted-foreground')}>{count}</span>
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-4}} transition={{duration:0.18}}>
          {tab === 'scripts' && <ScriptsTab scripts={scripts as any} onOpen={(id) => router.push(`/script/${id}`)} />}
          {tab === 'ideas'   && <IdeasTab   ideas={ideas} onDelete={deleteIdea} onLaunch={(idea) => {
            const qs = new URLSearchParams({ topic: idea.title, niche: idea.niche || 'general', platform: idea.platform || 'instagram', autorun: '1' })
            router.push(`/dashboard?${qs.toString()}`)
          }} />}
          {tab === 'prompts' && <PromptsTab prompts={prompts} onDelete={deletePrompt} />}
          {tab === 'media' && (
            loading.media ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{[0,1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="aspect-video" />)}</div>
            ) : media.length === 0 ? (
              <EmptyState icon={ImagePlus} title="No assets yet" description="Drop in your first thumbnail, B-roll clip, or audio asset." action={<Button className="bg-gold-gradient text-black" onClick={()=>setCreating(true)}><Plus className="w-4 h-4 mr-1" /> Add asset</Button>} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((m, i) => {
                  const Icon = ICONS[m.type || 'image']
                  return (
                    <motion.div key={m.id}
                      initial={{opacity:0, scale:0.96}} animate={{opacity:1, scale:1}} transition={{delay:Math.min(i*0.04, 0.4)}}
                      whileHover={{y:-3}}
                      className="group glass rounded-2xl overflow-hidden hover:shadow-cinema relative"
                    >
                      <div className="aspect-video bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
                        {m.thumbnail ? (
                          <img src={m.thumbnail} alt={m.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Icon className="w-10 h-10 text-gold-500/50" /></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        {m.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-12 h-12 rounded-full bg-gold-gradient flex items-center justify-center shadow-gold-glow opacity-0 group-hover:opacity-100 transition">
                              <Play className="w-5 h-5 text-black ml-0.5" />
                            </div>
                          </div>
                        )}
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] tracking-wider uppercase flex items-center gap-1">
                          <Icon className="w-3 h-3 text-gold-300" /> {m.type}
                        </div>
                        <button onClick={() => archiveMedia(m.id)} className="absolute top-2 right-10 p-1.5 rounded-md bg-black/60 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-gold-500/40 transition" aria-label="Archive">
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={async () => { if (await confirm({ title: `Delete ${m.title}?`, description: 'This file will be moved to trash and can be restored from Settings.', destructive: true })) removeMedia(m.id) }} className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 backdrop-blur opacity-0 group-hover:opacity-100 hover:bg-red-500/60 transition">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-3">
                        <div className="text-xs font-medium truncate">{m.title}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">{formatBytes(m.size_bytes)}</div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )
          )}
          {/* V3.8 — Images / Narrations / Exports tabs. Single unified renderer (LibraryAssetsTab)
              feeds from /api/library/assets via kind filter. Continue & Regenerate jump back into the source project. */}
          {(tab === 'images' || tab === 'narrations' || tab === 'exports') && (
            <LibraryAssetsTab
              kind={tab}
              loading={libLoading}
              assets={libAssets}
              onOpen={(a) => a.project_id && router.push(`/script/${a.project_id}`)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Scripts Tab ───────────────────────────────────────────────────
function ScriptsTab({ scripts, onOpen }: { scripts: any[]; onOpen: (id: string) => void }) {
  if (scripts.length === 0) {
    return <EmptyState icon={FileText} title="No scripts saved yet" description="Generate your first cinematic script from the dashboard — it'll auto-save here." />
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {scripts.map((s, i) => (
        <motion.div
          key={s.id}
          initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.03, 0.3)}}
          className="group glass rounded-2xl border border-gold-soft p-4 hover:border-gold-500/40 transition flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[9px] tracking-[0.3em] uppercase text-gold-400/80 mb-1 inline-flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> {s.platform || 'instagram'}
              </div>
              <h3 className="font-display text-base leading-tight truncate">{s.title || 'Untitled script'}</h3>
            </div>
          </div>
          <p className="text-[12px] text-luxe/70 leading-snug line-clamp-3 min-h-[3em]">
            {(s.script || s.description || '').slice(0, 220)}
          </p>
          <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-white/[0.05]">
            <span className="text-[10px] text-muted-foreground tracking-wider inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {s.created_at ? formatDistanceToNow(parseISO(s.created_at), { addSuffix: true }) : 'recently'}
            </span>
            <Button onClick={() => onOpen(s.id)} className="h-8 px-3 text-[11px] bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5">
              Continue working <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Ideas Tab ─────────────────────────────────────────────────────
function IdeasTab({ ideas, onDelete, onLaunch }: { ideas: LibraryIdea[]; onDelete: (id: string) => void; onLaunch: (idea: LibraryIdea) => void }) {
  if (ideas.length === 0) {
    return <EmptyState icon={Lightbulb} title="No ideas saved yet" description="Click 'Generate Ideas' on the dashboard — every batch auto-saves here." />
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ideas.map((idea, i) => (
        <motion.div
          key={idea.id}
          initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.03, 0.3)}}
          className="group glass rounded-2xl border border-gold-soft p-4 hover:border-gold-500/40 transition flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-[9px] tracking-[0.3em] uppercase text-gold-400/80 inline-flex items-center gap-1.5">
              <Lightbulb className="w-3 h-3" /> {idea.niche || 'general'}
            </div>
            <button onClick={() => onDelete(idea.id)} className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-500/15 text-muted-foreground hover:text-red-300">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <h3 className="font-display text-base leading-tight">{idea.title}</h3>
          {idea.hook && <p className="text-[12px] text-luxe/80 leading-snug italic">"{idea.hook}"</p>}
          {idea.angle && <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{idea.angle}</p>}
          <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-white/[0.05]">
            <span className="text-[10px] text-muted-foreground tracking-wider inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formatDistanceToNow(parseISO(idea.created_at), { addSuffix: true })}
            </span>
            <Button onClick={() => onLaunch(idea)} className="h-8 px-3 text-[11px] bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 gap-1.5">
              <Sparkles className="w-3 h-3" /> Generate script
            </Button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── Prompts Tab ───────────────────────────────────────────────────
function PromptsTab({ prompts, onDelete }: { prompts: LibraryPrompt[]; onDelete: (id: string) => void }) {
  if (prompts.length === 0) {
    return <EmptyState icon={Wand2} title="No B-roll prompts yet" description="Open a script and click 'Generate' on the Flow / B-roll panel — they'll save here." />
  }
  return (
    <div className="space-y-3">
      {prompts.map((row, i) => (
        <motion.div
          key={row.id}
          initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:Math.min(i*0.03, 0.3)}}
          className="group glass rounded-2xl border border-gold-soft p-4 hover:border-gold-500/40 transition"
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-[9px] tracking-[0.3em] uppercase text-gold-400/80 inline-flex items-center gap-1.5 mb-1">
                <Wand2 className="w-3 h-3" /> {row.prompts.length} cinematic prompts
              </div>
              <h3 className="font-display text-base leading-tight">{row.script_title || 'Untitled prompt set'}</h3>
              <span className="text-[10px] text-muted-foreground tracking-wider inline-flex items-center gap-1 mt-1">
                <Clock className="w-3 h-3" /> {formatDistanceToNow(parseISO(row.created_at), { addSuffix: true })}
              </span>
            </div>
            <button onClick={() => onDelete(row.id)} className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-red-500/15 text-muted-foreground hover:text-red-300">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1">
            {row.prompts.slice(0, 6).map((p, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[9px] tracking-widest uppercase text-gold-400/80 mt-0.5 shrink-0 w-16">{p.type}</span>
                <span className="text-[11px] text-luxe/85 flex-1 leading-snug">{p.prompt}</span>
              </div>
            ))}
            {row.prompts.length > 6 && <div className="text-[10px] text-muted-foreground italic text-center pt-1">+ {row.prompts.length - 6} more</div>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── V3.8 — Cross-project Library Assets Tab (Images / Narrations / Exports) ─
function LibraryAssetsTab({
  kind,
  loading,
  assets,
  onOpen,
}: {
  kind: 'images' | 'narrations' | 'exports'
  loading: boolean
  assets: LibraryAsset[]
  onOpen: (a: LibraryAsset) => void
}) {
  const Icon = kind === 'images' ? ImgIcon : kind === 'narrations' ? Volume2 : Download
  const emptyTitle =
    kind === 'images'     ? 'No generated images yet'
    : kind === 'narrations' ? 'No voiceovers yet'
    : 'No exports yet'
  const emptyDesc =
    kind === 'images'     ? 'Generate cinematic prompts from a script, then click Generate Images.'
    : kind === 'narrations' ? 'Open a script, click Generate Voiceover, and pick a speaker.'
    : 'Export a script as .txt or .doc \u2014 it\'ll show up here.'

  if (loading) {
    return <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">{[0,1,2,3,4,5,6,7].map(i => <Skeleton key={i} className="aspect-square" />)}</div>
  }
  if (assets.length === 0) {
    return <EmptyState icon={Icon} title={emptyTitle} description={emptyDesc} />
  }

  const downloadFull = async (a: LibraryAsset) => {
    if (!a.url) return
    try {
      const res = await fetch(a.url, { mode: 'cors' })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const seq = a.metadata?.sequence_index || ''
      const ext = kind === 'narrations' ? '.mp3' : kind === 'images' ? '.png' : ''
      link.download = `mugtee-${kind}-${seq ? `${String(seq).padStart(2,'0')}-` : ''}${a.id}${ext}`
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      window.open(a.url, '_blank')
    }
  }

  // Phase 3N — Group assets by project so creators see their studio
  // organized as cinematic chapters, not a flat dump. Falls back gracefully
  // when assets have no project_id (legacy rows). Newest project first
  // (assets already arrive newest-first from the API).
  type Group = { project_id: string; label: string; latest: string; items: LibraryAsset[] }
  const groups: Group[] = (() => {
    const map = new Map<string, Group>()
    for (const a of assets) {
      const key = a.project_id || '__legacy__'
      if (!map.has(key)) {
        map.set(key, {
          project_id: key,
          label: a.title || (key === '__legacy__' ? 'Older creations' : 'Untitled project'),
          latest: a.created_at || '',
          items: [],
        })
      }
      map.get(key)!.items.push(a)
    }
    return Array.from(map.values())
  })()

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.project_id} className="space-y-3">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h3 className="font-display text-[15px] sm:text-base text-luxe/90 tracking-tight truncate" title={group.label}>
              {group.label}
            </h3>
            <span className="text-[10px] tracking-[0.18em] uppercase text-luxe/40">
              {group.items.length} {group.items.length === 1 ? 'asset' : 'assets'}
              {group.latest ? ' \u00b7 ' + formatDistanceToNow(parseISO(group.latest), { addSuffix: true }) : ''}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {group.items.map((a, i) => {
        const when = a.created_at ? formatDistanceToNow(parseISO(a.created_at), { addSuffix: true }) : ''
        const title = a.title || a.metadata?.scene_type || a.prompt?.slice(0, 60) || 'Asset'
        const isImage = kind === 'images' && !!a.url
        const isAudio = kind === 'narrations' && !!a.url
        return (
          <motion.div
            key={a.id}
            initial={{opacity:0, scale:0.96}} animate={{opacity:1, scale:1}} transition={{delay:Math.min(i*0.03, 0.3)}}
            className="group glass rounded-2xl overflow-hidden hover:shadow-cinema relative flex flex-col"
          >
            <div className="aspect-square bg-gradient-to-br from-zinc-800 to-zinc-900 relative overflow-hidden">
              {isImage ? (
                <img src={a.url!} alt={title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Icon className="w-10 h-10 text-gold-500/50" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] tracking-wider uppercase text-gold-200 inline-flex items-center gap-1">
                <Icon className="w-3 h-3" /> {a.kind}
              </div>
              {a.metadata?.sequence_index && (
                <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur text-[10px] text-luxe/90">#{String(a.metadata.sequence_index).padStart(2,'0')}</div>
              )}
            </div>
            <div className="p-3 flex-1 flex flex-col gap-1">
              <div className="text-xs font-medium truncate" title={title}>{title}</div>
              <div className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                <Clock className="w-3 h-3" /> {when}
                {a.url ? <span className="ml-auto text-emerald-300/80 text-[9.5px] tracking-wider uppercase">Saved</span> : <span className="ml-auto text-amber-300/80 text-[9.5px] tracking-wider uppercase">Pending</span>}
              </div>
              {isAudio && (
                <audio src={a.url!} controls preload="none" className="w-full mt-1 h-8" style={{ filter: 'invert(0.85)' }} />
              )}
              <div className="mt-auto pt-2 flex items-center gap-1.5">
                {a.project_id && (
                  <button
                    onClick={() => onOpen(a)}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white/[0.04] hover:bg-gold-500/10 border border-white/[0.08] hover:border-gold-500/40 text-luxe/85 hover:text-gold-200 text-[10.5px] tracking-wide transition"
                    title="Continue in workspace"
                  >
                    <ArrowRight className="w-3 h-3" /> Continue
                  </button>
                )}
                <button
                  onClick={() => downloadFull(a)}
                  disabled={!a.url}
                  className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white/[0.04] hover:bg-gold-500/10 border border-white/[0.08] hover:border-gold-500/40 text-luxe/85 hover:text-gold-200 text-[10.5px] tracking-wide transition disabled:opacity-40"
                  title="Download full-quality"
                >
                  <Download className="w-3 h-3" />
                </button>
                {a.project_id && kind === 'images' && (
                  <button
                    onClick={() => onOpen(a)}
                    className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-md bg-white/[0.04] hover:bg-gold-500/10 border border-white/[0.08] hover:border-gold-500/40 text-luxe/85 hover:text-gold-200 text-[10.5px] tracking-wide transition"
                    title="Regenerate in workspace"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )
      })}
          </div>
        </section>
      ))}
    </div>
  )
}

