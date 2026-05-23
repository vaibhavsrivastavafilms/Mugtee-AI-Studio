'use client'
// Phase P4 — Per-card YouTube publish action: tiny icon → dropdown w/ privacy → upload.
import { useState, useRef, useEffect } from 'react'
import { Youtube, Loader2, Check, X, Globe2, Lock, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { ContentPiece } from '@/lib/types'
import { track } from '@/lib/posthog'

type Privacy = 'private' | 'unlisted' | 'public'
const OPTIONS: { value: Privacy; label: string; icon: any; desc: string }[] = [
  { value: 'unlisted', label: 'Unlisted', icon: EyeOff,  desc: 'Anyone with the link' },
  { value: 'public',   label: 'Public',   icon: Globe2,  desc: 'Anyone can find & view' },
  { value: 'private',  label: 'Private',  icon: Lock,    desc: 'Only you' },
]

export function YoutubePublishButton({ item }: { item: ContentPiece }) {
  const [open, setOpen]   = useState(false)
  const [busy, setBusy]   = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const publish = async (privacy: Privacy) => {
    if (busy) return
    setBusy(true)
    setOpen(false)
    const t = toast.loading('Uploading to YouTube…', { description: item.title.slice(0, 64) })
    try {
      const r = await fetch('/api/youtube/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentPieceId: item.id, privacyStatus: privacy }),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.error === 'not_connected' || d.error === 'invalid_grant') {
          toast.error('Connect YouTube first', { id: t, description: 'Settings → Integrations', action: { label: 'Open Settings', onClick: () => { window.location.href = '/settings' } } })
        } else if (d.error === 'no_video_url') {
          toast.error('No video attached', { id: t, description: 'Attach a video to this piece first.' })
        } else {
          toast.error(d.error || 'Upload failed', { id: t })
        }
        return
      }
      toast.success('Published to YouTube', { id: t, description: d.watchUrl, action: { label: 'Open', onClick: () => window.open(d.watchUrl, '_blank') } })
      // V4.1 — Funnel: published event for the analytics dashboard.
      track('published', { platform: 'youtube', privacy, project_id: item.id, project_title: item.title })
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed', { id: t })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o) }}
        disabled={busy}
        className={cn(
          'p-1.5 rounded-md bg-black/40 backdrop-blur ring-1 transition disabled:opacity-50',
          item.youtube_status === 'published' ? 'ring-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20' : 'ring-red-500/30 text-red-300 hover:bg-red-500/30'
        )}
        aria-label="Publish to YouTube"
        title={item.youtube_status === 'published' ? 'Published to YouTube' : 'Publish to YouTube'}
      >
        {busy || item.youtube_status === 'uploading'
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Youtube className="w-3 h-3" />}
      </button>

      {open && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1.5 z-30 w-56 rounded-xl glass-strong border border-gold-500/20 shadow-cinema p-2"
        >
          <div className="px-2 py-1.5 text-[10px] tracking-[0.2em] uppercase text-gold-300/80 flex items-center justify-between">
            <span>Publish to YouTube</span>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-luxe transition"><X className="w-3 h-3" /></button>
          </div>
          {OPTIONS.map(({ value, label, icon: Icon, desc }) => (
            <button
              key={value}
              onClick={(e) => { e.stopPropagation(); publish(value) }}
              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.04] text-left transition group"
            >
              <Icon className="w-3.5 h-3.5 mt-0.5 text-gold-300/80 group-hover:text-gold-200" />
              <div className="min-w-0 flex-1">
                <div className="text-xs text-luxe">{label}</div>
                <div className="text-[10px] text-muted-foreground leading-snug">{desc}</div>
              </div>
            </button>
          ))}
          {item.youtube_status === 'failed' && item.youtube_error && (
            <div className="mt-1 mx-2 px-2 py-1.5 rounded-md bg-rose-500/[0.08] border border-rose-500/25 text-[10px] text-rose-200 leading-snug">
              Last error: {item.youtube_error.slice(0, 80)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Small badge for the bottom of the kanban card.
export function YoutubeStatusBadge({ item }: { item: ContentPiece }) {
  if (!item.youtube_status) return null
  if (item.youtube_status === 'uploading') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tracking-[0.15em] uppercase bg-red-500/15 text-red-300 border border-red-500/30">
        <Loader2 className="w-2.5 h-2.5 animate-spin" /> Uploading
      </span>
    )
  }
  if (item.youtube_status === 'published') {
    const url = item.youtube_video_id ? `https://youtu.be/${item.youtube_video_id}` : undefined
    const Inner = (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tracking-[0.15em] uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        <Check className="w-2.5 h-2.5" /> On YouTube
      </span>
    )
    return url
      ? <a href={url} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>{Inner}</a>
      : Inner
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] tracking-[0.15em] uppercase bg-amber-500/[0.08] text-amber-200/75 border border-amber-500/20" title={item.youtube_error || ''}>
      <X className="w-2 h-2 opacity-70" /> Generation issue
    </span>
  )
}
