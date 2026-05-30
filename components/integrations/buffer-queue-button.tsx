'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ContentPiece } from '@/lib/types'
import { cn } from '@/lib/utils'

type BufferProfile = {
  id: string
  service: string
  username?: string
}

export function BufferQueueButton({
  item,
  variant = 'icon',
  className,
}: {
  item: ContentPiece
  variant?: 'icon' | 'button'
  className?: string
}) {
  const [busy, setBusy] = useState(false)
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [profiles, setProfiles] = useState<BufferProfile[]>([])

  useEffect(() => {
    let cancelled = false
    fetch('/api/buffer/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return
        setConfigured(!!d.configured && !!d.connected)
        setProfiles(d.profiles || [])
      })
      .catch(() => {
        if (!cancelled) {
          setConfigured(false)
          setProfiles([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const queue = async () => {
    if (busy) return
    setBusy(true)
    const t = toast.loading('Queueing to Buffer…', { description: item.title.slice(0, 64) })
    try {
      const profile =
        profiles.find((p) => p.service === item.platform) || profiles[0]
      const payload: Record<string, string | null | undefined> = {
        content_id: item.id,
        profile_id: profile?.id,
        scheduled_at: item.scheduled_at,
        title: item.title,
        description: item.description,
        platform: item.platform,
        media_url: item.media_url,
      }
      const r = await fetch('/api/buffer/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.error === 'not_configured') {
          toast.error('Buffer not configured', {
            id: t,
            description: 'Add BUFFER_ACCESS_TOKEN in server env (.env.local).',
          })
        } else {
          toast.error(d.error || 'Queue failed', { id: t })
        }
        return
      }
      toast.success('Queued to Buffer', {
        id: t,
        description: profile?.username
          ? `@${profile.username.replace(/^@/, '')}`
          : 'Check your Buffer dashboard',
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Queue failed', { id: t })
    } finally {
      setBusy(false)
    }
  }

  if (configured === false) return null

  if (variant === 'button') {
    return (
      <button
        type="button"
        onClick={queue}
        disabled={busy || configured !== true}
        className={cn(
          'inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-sky-500/40 text-xs text-luxe transition disabled:opacity-50',
          className
        )}
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
        Queue to Buffer
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        queue()
      }}
      onPointerDown={(e) => e.stopPropagation()}
      disabled={busy || configured !== true}
      className={cn(
        'p-1.5 rounded-md bg-black/40 backdrop-blur hover:bg-sky-500/30 ring-1 ring-sky-500/30 transition disabled:opacity-40',
        className
      )}
      aria-label="Queue to Buffer"
      title="Queue to Buffer"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
    </button>
  )
}

export function BufferConnect() {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [user, setUser] = useState<string | null>(null)
  const [profiles, setProfiles] = useState<BufferProfile[]>([])

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/buffer/status', { cache: 'no-store' })
      const d = await r.json()
      setConfigured(!!d.configured)
      setConnected(!!d.connected)
      setUser(d.user || null)
      setProfiles(d.profiles || [])
    } catch {
      setConfigured(false)
      setConnected(false)
      setUser(null)
      setProfiles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-start gap-4 flex-wrap">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/30 via-blue-500/30 to-indigo-500/30 ring-1 ring-white/[0.08] flex items-center justify-center shrink-0">
        <Share2 className="w-6 h-6 text-sky-200" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium">Buffer</div>
          {loading ? null : !configured ? (
            <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-300">
              not configured
            </span>
          ) : connected ? (
            <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
              connected
            </span>
          ) : (
            <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
              invalid token
            </span>
          )}
        </div>
        {connected && user ? (
          <div className="text-xs text-muted-foreground mt-1 leading-snug">
            {user} · {profiles.length} channel{profiles.length === 1 ? '' : 's'}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1 leading-snug">
            Queue posts from Pipeline or Publish Center using your Buffer access token.
          </div>
        )}
        {connected && profiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profiles.slice(0, 6).map((p) => (
              <span
                key={p.id}
                className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-luxe/70"
              >
                {p.service}
                {p.username ? ` · ${p.username}` : ''}
              </span>
            ))}
          </div>
        )}
      </div>
      {connected && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-300 shrink-0">
          <Check className="w-4 h-4" /> Ready to queue
        </div>
      )}
    </div>
  )
}

export function NotionConnect() {
  const [loading, setLoading] = useState(true)
  const [configured, setConfigured] = useState(false)
  const [connected, setConnected] = useState(false)
  const [meta, setMeta] = useState<{ workspace?: string; databaseTitle?: string }>({})

  useEffect(() => {
    fetch('/api/notion/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setConfigured(!!d.configured)
        setConnected(!!d.connected)
        setMeta({ workspace: d.workspace, databaseTitle: d.databaseTitle })
      })
      .catch(() => {
        setConfigured(false)
        setConnected(false)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 flex items-start gap-4 flex-wrap">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-zinc-500/30 via-neutral-400/20 to-white/10 ring-1 ring-white/[0.08] flex items-center justify-center shrink-0">
        <CalendarDaysIcon />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium">Notion Calendar</div>
          {loading ? null : !configured ? (
            <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-zinc-500/15 text-zinc-300">
              not configured
            </span>
          ) : connected ? (
            <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300">
              connected
            </span>
          ) : (
            <span className="text-[10px] tracking-widest uppercase px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300">
              check credentials
            </span>
          )}
        </div>
        {connected ? (
          <div className="text-xs text-muted-foreground mt-1 leading-snug">
            {meta.databaseTitle || 'Calendar database'}
            {meta.workspace ? ` · ${meta.workspace}` : ''}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground mt-1 leading-snug">
            Sync scheduled posts from <span className="text-gold-300">/calendar</span> to a Notion database.
          </div>
        )}
      </div>
      {connected && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-300 shrink-0">
          <Check className="w-4 h-4" /> Ready to sync
        </div>
      )}
    </div>
  )
}

function CalendarDaysIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-6 h-6 text-luxe/90" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18M8 2v4M16 2v4" />
    </svg>
  )
}
