'use client'

import { useEffect, useState } from 'react'
import { CalendarDays, Check, Loader2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function NotionCalendarSync({ className }: { className?: string }) {
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [meta, setMeta] = useState<{ workspace?: string; databaseTitle?: string }>({})
  const [syncing, setSyncing] = useState(false)

  const refresh = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/notion/status', { cache: 'no-store' })
      const d = await r.json()
      setConfigured(!!d.configured)
      setConnected(!!d.connected)
      setMeta({ workspace: d.workspace, databaseTitle: d.databaseTitle })
    } catch {
      setConfigured(false)
      setConnected(false)
      setMeta({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const sync = async (opts?: { all?: boolean }) => {
    setSyncing(true)
    const t = toast.loading('Syncing calendar to Notion…')
    try {
      const r = await fetch('/api/notion/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts?.all ? { all: true } : {}),
      })
      const d = await r.json()
      if (!r.ok) {
        if (d.error === 'not_configured') {
          toast.error('Notion not configured', {
            id: t,
            description: 'Add NOTION_API_KEY and NOTION_CALENDAR_DATABASE_ID in Settings env.',
          })
        } else {
          toast.error(d.message || d.error || 'Sync failed', { id: t })
        }
        return
      }
      const errNote =
        d.errors?.length > 0 ? ` · ${d.errors.length} error${d.errors.length > 1 ? 's' : ''}` : ''
      toast.success(`Synced ${d.synced} item${d.synced === 1 ? '' : 's'} to Notion`, {
        id: t,
        description: `${d.created} created · ${d.updated} updated${errNote}`,
      })
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sync failed', { id: t })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3 flex flex-wrap items-center gap-3',
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
          <CalendarDays className="w-4 h-4 text-luxe/80" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] tracking-[0.22em] uppercase text-gold-300/80">Notion Calendar</div>
          {loading ? (
            <p className="text-[11px] text-muted-foreground">Checking connection…</p>
          ) : !configured ? (
            <p className="text-[11px] text-muted-foreground">
              Add NOTION_API_KEY + NOTION_CALENDAR_DATABASE_ID to enable sync.
            </p>
          ) : connected ? (
            <p className="text-[11px] text-emerald-200/80 truncate">
              <Check className="w-3 h-3 inline mr-1" />
              {meta.databaseTitle || 'Calendar'}
              {meta.workspace ? ` · ${meta.workspace}` : ''}
            </p>
          ) : (
            <p className="text-[11px] text-amber-200/80">Configured — connection check failed.</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => refresh()}
          disabled={loading || syncing}
          className="h-8 px-2 text-muted-foreground hover:text-gold-200"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!configured || syncing}
          onClick={() => sync()}
          className="h-8 bg-gold-gradient text-black gap-1.5"
        >
          {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Sync scheduled
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!configured || syncing}
          onClick={() => sync({ all: true })}
          className="h-8 border-gold-500/30 text-gold-200 hover:bg-gold-500/10"
        >
          Sync all
        </Button>
      </div>
    </div>
  )
}
