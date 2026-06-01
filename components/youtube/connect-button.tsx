'use client'
// Phase P4 — YouTube Connect / Disconnect cinematic widget.
// Drop on the settings page or anywhere a creator manages integrations.

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { Youtube, Check, Loader2, Link2, Unlink, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export function YouTubeConnect() {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [channel, setChannel] = useState<{ title?: string; thumb?: string | null } | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/youtube/status', { cache: 'no-store' })
      const d = await r.json()
      setConnected(!!d.connected)
      setChannel(d.connected ? { title: d.channel_title, thumb: d.channel_thumb } : null)
    } catch { setConnected(false); setChannel(null) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    refresh()
    // Surface OAuth callback toasts from URL query (?yt_connected=1 or ?yt_error=...)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.get('yt_connected') === '1') {
        toast.success('YouTube connected')
        url.searchParams.delete('yt_connected')
        window.history.replaceState(null, '', url.toString())
      }
      const err = url.searchParams.get('yt_error')
      if (err) {
        toast.error(`YouTube connect failed: ${err}`)
        url.searchParams.delete('yt_error')
        window.history.replaceState(null, '', url.toString())
      }
    }
  }, [])

  const connect = () => {
    setBusy(true)
    window.location.href = `/api/youtube/auth?redirectTo=${encodeURIComponent(window.location.pathname)}`
  }

  const disconnect = async () => {
    setBusy(true)
    try {
      const r = await fetch('/api/youtube/disconnect', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || 'disconnect_failed')
      toast.success('YouTube disconnected')
      await refresh()
    } catch (e: any) {
      toast.error(e?.message || 'Could not disconnect')
    } finally { setBusy(false) }
  }

  return (
    <div className="glass rounded-2xl p-5 sm:p-6 border border-white/[0.06]">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
            <Youtube className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80">Integration</div>
            <h3 className="font-display text-xl text-luxe">YouTube Publishing</h3>
            <p className="text-[11px] text-muted-foreground leading-snug">Upload directly to your channel from any content piece.</p>
          </div>
        </div>
        {connected && channel?.thumb && (
          <Image
            src={channel.thumb}
            alt={channel.title || 'Channel'}
            width={40}
            height={40}
            className="w-10 h-10 rounded-full ring-1 ring-gold-500/30 shrink-0 object-cover"
          />
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Loading…</div>
        ) : connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-emerald-300">
              <Check className="w-4 h-4" /> Connected as <span className="font-medium text-luxe">{channel?.title || 'channel'}</span>
            </div>
            <button
              onClick={disconnect} disabled={busy}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-rose-500/40 text-xs text-luxe transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />} Disconnect channel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-[11px] text-amber-200/85 p-2 rounded-md bg-amber-500/[0.06] border border-amber-500/20">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0 text-amber-300" />
              You’ll grant <span className="text-amber-100 font-medium">upload + read</span> scopes only — no comment access, no DM access.
            </div>
            <button
              onClick={connect} disabled={busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-gold-gradient text-black text-sm font-semibold tracking-wide shadow-gold-glow hover:opacity-90 transition disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Connect YouTube
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
