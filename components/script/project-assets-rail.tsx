'use client'
// MUGTEE V2.1 — Project Assets Rail.
//
// Cinematic tabbed asset view inside the script workspace. Tabs:
//   Images · Voiceovers · Music · Videos · Prompts · Exports
//
// Reads from /api/projects/[id]/assets. Music + Videos tabs are placeholder-only
// (clearly labelled "Coming soon") so the project workflow is future-ready.
//
// Lazy-loaded Next.js Image, no gallery libraries.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Image as ImageIcon, Mic2, Music, Film, Wand2, Download, Trash2, Copy, Check, Sparkles, RefreshCw, Play, Pause, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useSpeechSynthesis } from '@/lib/use-voice'

export type ProjectAsset = {
  id: string
  kind: 'image' | 'voiceover' | 'video' | 'music' | 'export' | 'prompt'
  url: string | null
  mime_type: string | null
  title: string | null
  prompt: string | null
  metadata: any
  created_at: string
  storage_path?: string | null
}

type TabId = 'image' | 'voiceover' | 'music' | 'video' | 'prompt' | 'export'
const TABS: { id: TabId; label: string; icon: any; comingSoon?: boolean }[] = [
  { id: 'image',     label: 'Images',     icon: ImageIcon },
  { id: 'voiceover', label: 'Voiceovers', icon: Mic2 },
  { id: 'music',     label: 'Music',      icon: Music, comingSoon: true },
  { id: 'video',     label: 'Videos',     icon: Film,  comingSoon: true },
  { id: 'prompt',    label: 'Prompts',    icon: Wand2 },
  { id: 'export',    label: 'Exports',    icon: Download },
]

export function ProjectAssetsRail({ projectId, refreshKey = 0 }: { projectId: string; refreshKey?: number }) {
  const [tab, setTab] = useState<TabId>('image')
  const [assets, setAssets] = useState<ProjectAsset[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/projects/${projectId}/assets`)
      const d = await r.json()
      setAssets(Array.isArray(d?.assets) ? d.assets : [])
    } catch { setAssets([]) }
    finally { setLoading(false) }
  }, [projectId])

  useEffect(() => { load() }, [load, refreshKey])

  const counts = useMemo(() => {
    const c: Record<TabId, number> = { image: 0, voiceover: 0, music: 0, video: 0, prompt: 0, export: 0 }
    for (const a of assets) c[a.kind as TabId] = (c[a.kind as TabId] || 0) + 1
    return c
  }, [assets])

  const filtered = useMemo(() => assets.filter(a => a.kind === tab), [assets, tab])

  const removeAsset = async (id: string) => {
    if (!confirm('Delete this asset?')) return
    try {
      const r = await fetch(`/api/projects/${projectId}/assets?asset_id=${id}`, { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok || d?.error) { toast.error(d?.error || 'Delete failed'); return }
      setAssets(prev => prev.filter(a => a.id !== id))
      toast.success('Asset removed')
    } catch (e: any) { toast.error(e?.message || 'Network error') }
  }

  return (
    <div className="rounded-3xl glass border border-gold-soft p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold-300 inline-flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Project assets</div>
        <button onClick={load} className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 inline-flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-white/[0.04] min-h-[32px]">
          <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto scrollbar-luxe -mx-1 px-1 pb-3 border-b border-white/[0.04]">
        {TABS.map(t => {
          const Icon = t.icon
          const active = tab === t.id
          const c = counts[t.id] || 0
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] tracking-wide transition shrink-0 min-h-[36px]',
                active
                  ? 'bg-gold-500/15 border border-gold-500/40 text-gold-100'
                  : 'bg-white/[0.02] border border-white/[0.04] text-luxe/70 hover:bg-white/[0.05] hover:text-luxe',
              )}
            >
              <Icon className={cn('w-3.5 h-3.5', active ? 'text-gold-300' : 'text-muted-foreground')} />
              <span>{t.label}</span>
              {c > 0 && <span className={cn('text-[9px] tabular-nums px-1.5 py-0.5 rounded-md', active ? 'bg-gold-500/20 text-gold-200' : 'bg-white/[0.04] text-muted-foreground')}>{c}</span>}
            </button>
          )
        })}
      </div>

      {/* Body */}
      <div className="mt-3 min-h-[120px]">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{opacity:0,y:3}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-3}} transition={{duration:0.15}}>
            {tab === 'image'     && <ImagesGrid assets={filtered} loading={loading} onRemove={removeAsset} />}
            {tab === 'voiceover' && <VoiceoverList assets={filtered} loading={loading} onRemove={removeAsset} />}
            {tab === 'music'     && <ComingSoon icon={Music} title="Music generation coming soon" description="Cinematic background tracks generated to match your script's emotional arc. Stay tuned." />}
            {tab === 'video'     && <ComingSoon icon={Film}  title="Video generation coming soon" description="Runway / Veo / Kling integration is on the roadmap. For now, upload finished cuts via your editor." />}
            {tab === 'prompt'    && <PromptsList assets={filtered} loading={loading} onRemove={removeAsset} />}
            {tab === 'export'    && <ComingSoon icon={Download} title="Exports archive coming soon" description="Every .docx / .txt / .mp3 you export will land here automatically." />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
function ImagesGrid({ assets, loading, onRemove }: { assets: ProjectAsset[]; loading: boolean; onRemove: (id: string) => void }) {
  const [copied, setCopied] = useState<string | null>(null)
  if (loading) return <div className="text-[12px] text-muted-foreground italic py-6 text-center">Loading images…</div>
  if (assets.length === 0) return <div className="text-[12px] text-muted-foreground italic py-6 text-center">No images yet — hit <span className="text-gold-300">Generate Images</span> in the Flow / B-roll panel above.</div>
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
      {assets.map(a => (
        <div key={a.id} className="group relative rounded-xl overflow-hidden border border-gold-soft hover:border-gold-500/40 transition bg-black">
          <div className="relative aspect-[9/16] bg-zinc-900">
            {a.url && (
              <Image
                src={a.url}
                alt={a.prompt || 'asset'}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover"
              />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/95 via-black/55 to-transparent opacity-0 group-hover:opacity-100 transition">
            <div className="flex items-center justify-between gap-1">
              <button onClick={() => { navigator.clipboard.writeText(a.prompt || '').then(() => { setCopied(a.id); setTimeout(() => setCopied(null), 1200) }) }}
                className="text-[10px] tracking-wider uppercase text-luxe/80 hover:text-gold-300 inline-flex items-center gap-1 px-1.5 py-1 rounded">
                {copied === a.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Prompt
              </button>
              {a.url && <a href={a.url} download target="_blank" rel="noopener noreferrer" className="text-[10px] tracking-wider uppercase text-luxe/80 hover:text-gold-300 inline-flex items-center gap-1 px-1.5 py-1 rounded"><Download className="w-3 h-3" /></a>}
              <button onClick={() => onRemove(a.id)} className="text-[10px] text-rose-300/80 hover:text-rose-300 inline-flex items-center gap-1 px-1.5 py-1 rounded"><Trash2 className="w-3 h-3" /></button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function VoiceoverList({ assets, loading, onRemove }: { assets: ProjectAsset[]; loading: boolean; onRemove: (id: string) => void }) {
  const tts = useSpeechSynthesis()
  if (loading) return <div className="text-[12px] text-muted-foreground italic py-6 text-center">Loading voiceovers…</div>
  if (assets.length === 0) return <div className="text-[12px] text-muted-foreground italic py-6 text-center">No voiceovers yet — hit <span className="text-gold-300">Generate Voiceover</span> above.</div>
  return (
    <div className="space-y-2">
      {assets.map(a => {
        const isBrowser = a?.metadata?.fallback === 'browser' || !a.url
        return (
          <div key={a.id} className="rounded-xl glass border border-gold-soft p-3 flex items-start gap-3">
            <div className="w-9 h-9 shrink-0 rounded-lg bg-gold-500/10 border border-gold-500/25 inline-flex items-center justify-center">
              <Mic2 className="w-4 h-4 text-gold-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] tracking-[0.25em] uppercase text-gold-400/80">{isBrowser ? 'Browser TTS' : 'ElevenLabs MP3'}</span>
                <span className="text-[9px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              <p className="text-[12px] text-luxe/85 leading-snug line-clamp-2">{a.prompt || ''}</p>
              <div className="mt-2 flex items-center gap-1.5">
                {isBrowser ? (
                  <button onClick={() => tts.speaking ? tts.stop() : tts.speak(a.prompt || '')} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] bg-gold-500/15 border border-gold-500/30 text-gold-200 hover:bg-gold-500/25 min-h-[32px]">
                    {tts.speaking ? <><Pause className="w-3 h-3" /> Stop</> : <><Play className="w-3 h-3" /> Play</>}
                  </button>
                ) : (
                  <>
                    <audio controls src={a.url || undefined} className="h-8 max-w-full" preload="none" />
                    {a.url && <a href={a.url} download className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 px-2 py-1.5 rounded inline-flex items-center gap-1 min-h-[32px]"><Download className="w-3 h-3" /></a>}
                  </>
                )}
                <button onClick={() => onRemove(a.id)} className="ml-auto text-[10px] text-rose-300/70 hover:text-rose-300 px-2 py-1.5 rounded inline-flex items-center gap-1 min-h-[32px]"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PromptsList({ assets, loading, onRemove }: { assets: ProjectAsset[]; loading: boolean; onRemove: (id: string) => void }) {
  if (loading) return <div className="text-[12px] text-muted-foreground italic py-6 text-center">Loading prompts…</div>
  if (assets.length === 0) return <div className="text-[12px] text-muted-foreground italic py-6 text-center">No saved prompts yet for this project. Generate B-roll prompts to populate this tab.</div>
  return (
    <div className="space-y-1.5">
      {assets.map(a => (
        <div key={a.id} className="rounded-lg glass border border-gold-soft p-3 flex items-start gap-2.5">
          <Wand2 className="w-3.5 h-3.5 text-gold-300 mt-0.5 shrink-0" />
          <p className="flex-1 text-[12px] text-luxe/85 leading-snug">{a.prompt}</p>
          <button onClick={() => onRemove(a.id)} className="text-[10px] text-rose-300/60 hover:text-rose-300"><Trash2 className="w-3 h-3" /></button>
        </div>
      ))}
    </div>
  )
}

function ComingSoon({ icon: Icon, title, description }: { icon: any; title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gold-500/25 bg-gold-500/[0.03] p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-gold-500/10 border border-gold-500/25 inline-flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-gold-300" />
      </div>
      <h3 className="font-display text-lg mb-1">{title}</h3>
      <p className="text-[12px] text-luxe/65 leading-relaxed max-w-md mx-auto">{description}</p>
    </div>
  )
}
