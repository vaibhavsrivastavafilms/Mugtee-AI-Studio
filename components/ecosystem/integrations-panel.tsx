'use client'

import { useCallback, useEffect, useState } from 'react'
import { Link2, Unlink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CatalogItem = { provider: string; name: string; category: string }
type Connected = { provider: string; status: string }

export function IntegrationsPanel() {
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [connected, setConnected] = useState<Connected[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('all')

  const load = useCallback(async () => {
    const res = await fetch('/api/integrations', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { catalog?: CatalogItem[]; connected?: Connected[] }
      setCatalog(data.catalog ?? [])
      setConnected(data.connected ?? [])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const isConnected = (provider: string) =>
    connected.some((c) => c.provider === provider && c.status === 'connected')

  const connect = async (provider: string) => {
    setBusy(provider)
    try {
      const res = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      if (!res.ok) throw new Error('Connect failed')
      toast.success(`Connected ${provider} (stub OAuth)`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(null)
    }
  }

  const disconnect = async (provider: string) => {
    setBusy(provider)
    try {
      await fetch('/api/integrations/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })
      toast.success(`Disconnected ${provider}`)
      await load()
    } finally {
      setBusy(null)
    }
  }

  const categories = ['all', ...new Set(catalog.map((c) => c.category))]
  const shown =
    filter === 'all' ? catalog : catalog.filter((c) => c.category === filter)

  return (
    <div className="space-y-4">
      <p className="text-sm text-luxe/55">
        Connect providers for publish, ingest, and automation. OAuth is stubbed until credentials are configured.
      </p>
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilter(cat)}
            className={cn(
              'text-xs px-2.5 py-1 rounded-full border',
              filter === cat
                ? 'border-cyan-400/50 text-cyan-300 bg-cyan-500/10'
                : 'border-white/10 text-luxe/50'
            )}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((item) => {
          const on = isConnected(item.provider)
          return (
            <div
              key={item.provider}
              className="flex items-center justify-between rounded-lg border border-white/10 px-3 py-2.5 bg-white/[0.02]"
            >
              <div>
                <p className="text-sm text-luxe capitalize">{item.name}</p>
                <p className="text-[10px] text-luxe/40">{item.category}</p>
              </div>
              {on ? (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy === item.provider}
                  onClick={() => void disconnect(item.provider)}
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy === item.provider}
                  onClick={() => void connect(item.provider)}
                >
                  <Link2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
