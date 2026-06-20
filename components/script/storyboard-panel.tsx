'use client'
// MUGTEE V3.6 — Storyboard Panel.
//
// Horizontal cinematic timeline that reads the project's image assets back from
// /api/projects/[id]/assets and renders them as a directed storyboard sequence.
//
// Each frame carries the per-frame direction we stored in metadata at generation
// time (scene_type, camera_direction, emotional_tone, narration_line, duration,
// sequence_index, style_lock). The component sorts by sequence_index when present,
// else by created_at so legacy images still render gracefully.
//
// Interactions per frame:
//   \u2022 Copy prompt
//   \u2022 Download image (full quality)
//   \u2022 Mark favorite (localStorage)
//
// Reorder + per-frame regenerate are intentionally lightweight (localStorage order
// + visual hint) so we avoid duplicate orchestration systems.
//
// EXTREME LOW CREDIT MODE: zero new deps, reuses ProjectAsset shape + assets API.

import { useEffect, useMemo, useState } from 'react'
import { RemoteImage } from '@/components/ui/remote-image'
import { motion } from 'framer-motion'
import {
  Film, Copy, Check, Download, Heart, Camera, Clock, Music2, Sparkles, FileImage, Wand2, Lock, Loader2, Printer
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export interface StoryboardAsset {
  id: string
  url: string | null
  prompt: string | null
  metadata: any
  created_at: string
}

const TONE_COLOR: Record<string, string> = {
  tense:          'text-rose-300 border-rose-500/30 bg-rose-500/[0.06]',
  melancholic:    'text-indigo-300 border-indigo-500/30 bg-indigo-500/[0.06]',
  hopeful:        'text-amber-300 border-amber-500/30 bg-amber-500/[0.06]',
  urgent:         'text-orange-300 border-orange-500/30 bg-orange-500/[0.06]',
  intimate:       'text-pink-300 border-pink-500/30 bg-pink-500/[0.06]',
  triumphant:     'text-emerald-300 border-emerald-500/30 bg-emerald-500/[0.06]',
  contemplative:  'text-cyan-300 border-cyan-500/30 bg-cyan-500/[0.06]',
  somber:         'text-slate-300 border-slate-500/30 bg-slate-500/[0.06]',
  energetic:      'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/[0.06]',
}

const FAVS_KEY = (projectId: string) => `mugtee:storyboard-favs:v1:${projectId}`

export function StoryboardPanel({ projectId, refreshKey = 0 }: { projectId: string; refreshKey?: number }) {
  const [assets, setAssets]   = useState<StoryboardAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [favs, setFavs]       = useState<Record<string, true>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  // Load favorites (localStorage-only, no extra schema).
  useEffect(() => {
    try { setFavs(JSON.parse(localStorage.getItem(FAVS_KEY(projectId)) || '{}')) } catch {}
  }, [projectId])

  // Fetch assets and filter to images only.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/projects/${projectId}/assets`)
        const d = await r.json()
        const imgs: StoryboardAsset[] = (Array.isArray(d?.assets) ? d.assets : [])
          .filter((a: any) => a.kind === 'image' && a.url)
        if (!cancelled) setAssets(imgs)
      } catch {
        if (!cancelled) setAssets([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [projectId, refreshKey])

  // Sort by sequence_index (preferred), else by created_at ascending so storyboard
  // reads left-to-right in production order.
  const sorted = useMemo(() => {
    return [...assets].sort((a, b) => {
      const ai = a.metadata?.sequence_index
      const bi = b.metadata?.sequence_index
      if (typeof ai === 'number' && typeof bi === 'number') return ai - bi
      if (typeof ai === 'number') return -1
      if (typeof bi === 'number') return 1
      return (a.created_at || '').localeCompare(b.created_at || '')
    })
  }, [assets])

  // Single style_summary lock for the whole sequence (taken from the first frame
  // that carries one — typically all frames in a session share it).
  const styleLock = useMemo(() => {
    for (const a of sorted) if (a.metadata?.style_lock) return String(a.metadata.style_lock)
    return null
  }, [sorted])

  const totalDuration = useMemo(() => {
    return sorted.reduce((acc, a) => acc + (Number(a.metadata?.duration_seconds) || 0), 0)
  }, [sorted])

  const toggleFav = (id: string) => {
    setFavs(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      try { localStorage.setItem(FAVS_KEY(projectId), JSON.stringify(next)) } catch {}
      return next
    })
  }

  const copy = async (id: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopiedId(id); setTimeout(() => setCopiedId(null), 1500) } catch {}
  }

  const downloadFull = async (a: StoryboardAsset) => {
    if (!a.url) return
    setDownloading(a.id)
    try {
      // Fetch the full-quality original (no preview compression) and trigger a download.
      const res = await fetch(a.url, { mode: 'cors' })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const seq = a.metadata?.sequence_index || ''
      link.download = `mugtee-storyboard-${seq ? `frame-${String(seq).padStart(2, '0')}-` : ''}${a.id}.png`
      link.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      // Fallback — open in new tab if direct download is blocked.
      window.open(a.url, '_blank')
    } finally {
      setDownloading(null)
    }
  }

  const handlePrintPdf = () => {
    if (sorted.length === 0) { toast.error('Generate storyboard frames first.'); return }
    // Lightweight PDF export — opens the dedicated print stylesheet and lets the
    // user save as PDF via the browser. No PDF library, no server roundtrip.
    document.body.setAttribute('data-storyboard-print', projectId)
    setTimeout(() => {
      window.print()
      // Cleanup after the print dialog closes (best-effort).
      setTimeout(() => document.body.removeAttribute('data-storyboard-print'), 800)
    }, 60)
  }

  if (loading) {
    return (
      <div className="rounded-2xl glass border border-gold-soft p-5 sm:p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading storyboard\u2026
      </div>
    )
  }

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl glass border border-gold-soft p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-1.5">
            <Film className="w-3 h-3" /> Storyboard
          </span>
        </div>
        <p className="text-[12.5px] text-muted-foreground italic">
          Generate cinematic prompts above, then click <span className="text-gold-300">Generate Images</span> \u2014 your directed storyboard will assemble here.
        </p>
      </div>
    )
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
      className="rounded-2xl glass border border-gold-soft p-5 sm:p-6"
      data-storyboard-root
    >
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          <span className="text-[10px] tracking-[0.25em] uppercase text-gold-300 inline-flex items-center gap-1.5">
            <Film className="w-3 h-3" /> Storyboard
          </span>
          <span className="text-[10px] tracking-wider text-muted-foreground">
            {sorted.length} frame{sorted.length === 1 ? '' : 's'}{totalDuration > 0 ? ` \u00B7 ~${totalDuration}s` : ''}
          </span>
          {styleLock && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold-500/[0.07] border border-gold-500/30 text-gold-300 text-[9.5px] tracking-[0.22em] uppercase" title={`Visual Consistency Lock: ${styleLock}`}>
              <Lock className="w-2.5 h-2.5" /> Visual lock
            </span>
          )}
        </div>
        <button
          onClick={handlePrintPdf}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.08] hover:border-gold-500/40 text-luxe/85 hover:text-gold-200 text-[10.5px] tracking-wide transition"
          title="Print or save as PDF"
        >
          <Printer className="w-3 h-3" /> Storyboard PDF
        </button>
      </div>

      {styleLock && (
        <div className="mb-3 px-3 py-2 rounded-md bg-white/[0.02] border border-white/[0.05] text-[11px] text-luxe/75 italic" data-storyboard-stylelock>
          Style \u00B7 <span className="text-gold-300/90 not-italic">{styleLock}</span>
        </div>
      )}

      {/* Horizontal cinematic timeline. Snap-scroll on touch devices. */}
      <div className="-mx-1 px-1 flex gap-3 overflow-x-auto scrollbar-luxe snap-x snap-mandatory pb-2" data-storyboard-track>
        {sorted.map((a, idx) => {
          const m       = a.metadata || {}
          const seq     = m.sequence_index || idx + 1
          const type    = m.scene_type || 'frame'
          const camera  = m.camera_direction || null
          const dur     = m.duration_seconds || null
          const tone    = m.emotional_tone || null
          const narrn   = m.narration_line || null
          const toneCls = tone ? (TONE_COLOR[String(tone).toLowerCase()] || 'text-luxe/70 border-white/[0.08] bg-white/[0.03]') : ''
          const isFav   = !!favs[a.id]
          return (
            <article
              key={a.id}
              className="snap-start shrink-0 w-[260px] sm:w-[280px] rounded-xl bg-white/[0.025] border border-white/[0.08] hover:border-gold-500/40 transition flex flex-col overflow-hidden"
              data-storyboard-frame
            >
              <div className="relative aspect-[9/16] bg-black/60">
                {a.url ? (
                  <RemoteImage
                    src={a.url}
                    alt={String(narrn || a.prompt || `Frame ${seq}`)}
                    fill
                    sizes="280px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <FileImage className="w-6 h-6" />
                  </div>
                )}
                {/* Sequence chip */}
                <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur text-[9.5px] tracking-[0.22em] uppercase text-gold-200 border border-white/[0.1]">
                  {String(seq).padStart(2, '0')}
                </span>
                {/* Duration chip */}
                {dur && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/65 backdrop-blur text-[9.5px] text-luxe/90 border border-white/[0.1]">
                    <Clock className="w-2.5 h-2.5" /> {dur}s
                  </span>
                )}
                {/* Favorite */}
                <button
                  onClick={() => toggleFav(a.id)}
                  aria-label={isFav ? 'Unfavorite frame' : 'Favorite frame'}
                  className={cn(
                    'absolute bottom-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-md backdrop-blur border transition',
                    isFav
                      ? 'bg-rose-500/25 border-rose-400/50 text-rose-200'
                      : 'bg-black/55 border-white/[0.12] text-luxe/80 hover:text-rose-200 hover:border-rose-400/40'
                  )}
                >
                  <Heart className={cn('w-3.5 h-3.5', isFav && 'fill-current')} />
                </button>
              </div>

              <div className="p-2.5 sm:p-3 flex-1 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-1.5 flex-wrap">
                  <span className="text-[9px] tracking-[0.22em] uppercase text-gold-300/85">{type}</span>
                  {tone && (
                    <span className={cn('px-1.5 py-0.5 rounded-full text-[9px] tracking-wider uppercase border', toneCls)}>{tone}</span>
                  )}
                </div>
                {narrn && (
                  <p className="text-[11.5px] text-luxe/85 italic leading-snug line-clamp-2" title={narrn}>
                    \u201C{narrn}\u201D
                  </p>
                )}
                {camera && (
                  <div className="text-[10.5px] text-muted-foreground inline-flex items-center gap-1">
                    <Camera className="w-3 h-3 text-gold-400/70" /> {camera}
                  </div>
                )}
                {a.prompt && (
                  <p className="text-[10.5px] text-luxe/65 leading-snug line-clamp-2 mt-0.5" title={a.prompt}>{a.prompt}</p>
                )}
                <div className="mt-auto pt-2 flex items-center gap-1.5 print:hidden">
                  <button
                    onClick={() => copy(a.id, a.prompt || '')}
                    disabled={!a.prompt}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-gold-500/10 border border-white/[0.08] hover:border-gold-500/40 text-luxe/80 hover:text-gold-200 text-[10px] tracking-wide transition disabled:opacity-40"
                    title="Copy prompt"
                  >
                    {copiedId === a.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} Copy
                  </button>
                  <button
                    onClick={() => downloadFull(a)}
                    disabled={!a.url || downloading === a.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-gold-500/10 border border-white/[0.08] hover:border-gold-500/40 text-luxe/80 hover:text-gold-200 text-[10px] tracking-wide transition disabled:opacity-40"
                    title="Download full-quality image"
                  >
                    {downloading === a.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} HQ
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      <p className="mt-3 text-[10px] tracking-wider text-muted-foreground inline-flex items-center gap-1.5">
        <Sparkles className="w-3 h-3 text-gold-400/70" /> Frames sort by sequence number. Style-locked for cinematic continuity.
      </p>
    </motion.section>
  )
}

export default StoryboardPanel
