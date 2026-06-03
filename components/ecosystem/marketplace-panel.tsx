'use client'

import { useCallback, useEffect, useState } from 'react'
import { Star, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type AgentRow = {
  slug: string
  name: string
  description: string | null
  category: string
  pricing_model: string
  price_cents: number
  ratings?: { average: number; count: number }
}

export function MarketplacePanel() {
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch('/api/marketplace/browse', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { agents?: AgentRow[] }
      setAgents(data.agents ?? [])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const install = async (slug: string) => {
    setBusy(slug)
    try {
      const res = await fetch('/api/marketplace/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSlug: slug }),
      })
      if (!res.ok) throw new Error('Install failed')
      toast.success(`Installed ${slug}`)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Install failed')
    } finally {
      setBusy(null)
    }
  }

  const uninstall = async (slug: string) => {
    setBusy(slug)
    try {
      const res = await fetch('/api/marketplace/uninstall', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentSlug: slug }),
      })
      if (!res.ok) throw new Error('Uninstall failed')
      toast.success(`Removed ${slug}`)
    } finally {
      setBusy(null)
    }
  }

  const rate = async (slug: string, rating: number) => {
    await fetch('/api/marketplace/rate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentSlug: slug, rating }),
    })
    toast.success('Thanks for rating!')
    await load()
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-luxe/55">
        Install permission-gated agents into MugteeOS. Paid tiers are stubbed until billing ships.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {agents.map((a) => (
          <div
            key={a.slug}
            className={cn(
              'rounded-xl border border-white/10 bg-white/[0.03] p-4',
              'hover:border-cyan-500/30 transition-colors'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium text-luxe">{a.name}</h3>
                <p className="text-[10px] uppercase tracking-wider text-cyan-400/70 mt-0.5">
                  {a.category} · {a.pricing_model}
                  {a.price_cents > 0 ? ` · $${(a.price_cents / 100).toFixed(2)}` : ''}
                </p>
              </div>
              {a.ratings && a.ratings.count > 0 ? (
                <span className="text-xs text-luxe/50 flex items-center gap-1">
                  <Star className="h-3 w-3 text-amber-400" />
                  {a.ratings.average}
                </span>
              ) : null}
            </div>
            <p className="text-sm text-luxe/55 mt-2 line-clamp-2">{a.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                disabled={busy === a.slug}
                onClick={() => void install(a.slug)}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === a.slug}
                onClick={() => void uninstall(a.slug)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void rate(a.slug, 5)}>
                Rate 5★
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
