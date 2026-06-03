'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'
import {
  ArrowRight,
  Filter,
  GitBranch,
  Layers,
  Loader2,
  Search,
  Sparkles,
  History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ASSET_TYPES, type Asset, type AssetRelationEdge } from '@/lib/assets/types'
import { projectWorkspaceHref } from '@/lib/create/routes'

type ViewMode = 'grid' | 'timeline' | 'graph'

export function AssetDashboard() {
  const searchParams = useSearchParams()
  const initialQ = searchParams?.get('q') ?? ''
  const [q, setQ] = useState(initialQ)
  const [brand, setBrand] = useState('')
  const [type, setType] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [graph, setGraph] = useState<AssetRelationEdge[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [nlLoading, setNlLoading] = useState(false)
  const [view, setView] = useState<ViewMode>('grid')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (opts?: { natural?: boolean; reindex?: boolean; semantic?: boolean }) => {
    setLoading(true)
    setError(null)
    try {
      if (opts?.natural && q.trim()) {
        setNlLoading(true)
        const res = await fetch('/api/assets/search/natural', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: q.trim(), brand: brand || undefined, reindex: opts.reindex }),
        })
        const data = await res.json()
        setAssets(data.assets ?? [])
        setNlLoading(false)
        return
      }

      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (brand.trim()) params.set('brand', brand.trim())
      if (type) params.set('type', type)
      if (opts?.reindex) params.set('reindex', '1')
      if (opts?.semantic !== false) params.set('semantic', '1')
      params.set('limit', '60')

      const res = await fetch(`/api/assets/search?${params}`)
      const data = await res.json()
      setAssets(data.assets ?? [])
    } catch {
      setError('Failed to load assets')
    } finally {
      setLoading(false)
      setNlLoading(false)
    }
  }, [q, brand, type])

  useEffect(() => {
    if (initialQ) setQ(initialQ)
  }, [initialQ])

  useEffect(() => {
    void load({ reindex: true, natural: !!initialQ })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only index
  }, [])

  const selectAsset = useCallback(async (id: string) => {
    setSelectedId(id)
    try {
      const res = await fetch(`/api/assets/${id}`)
      const data = await res.json()
      setGraph(data.graph ?? [])
    } catch {
      setGraph([])
    }
  }, [])

  const timeline = useMemo(
    () => [...assets].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [assets]
  )

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <header className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-400/80">MugteeOS Phase 4</p>
        <h1 className="font-display text-2xl sm:text-3xl text-luxe tracking-wide">
          Creative Asset Library
        </h1>
        <p className="text-sm text-luxe/55 max-w-xl">
          Search scripts, storyboards, voiceovers, and exports across brands and projects. Use
          natural language or filters — wired to Mugtee Cmd+K search.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-luxe/40" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void load({ natural: true })}
            placeholder='Find all Table Tales campaigns…'
            className="w-full rounded-xl border border-white/10 bg-white/[0.04] pl-10 pr-3 py-2.5 text-sm text-luxe focus:outline-none focus:border-cyan-400/40"
          />
        </div>
        <input
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          placeholder="Brand slug"
          className="sm:w-36 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-luxe"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="sm:w-40 rounded-xl border border-white/10 bg-[#0a0f12] px-3 py-2.5 text-sm text-luxe"
        >
          <option value="">All types</option>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void load({ semantic: true })}
          className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-luxe hover:border-cyan-400/40"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => void load({ natural: true })}
          disabled={nlLoading}
          className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-200 flex items-center gap-2"
        >
          {nlLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          NL
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-luxe/40" />
        {(['grid', 'timeline', 'graph'] as ViewMode[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              'rounded-lg px-3 py-1 text-xs capitalize',
              view === v ? 'bg-cyan-500/20 text-cyan-200' : 'text-luxe/50 hover:text-luxe'
            )}
          >
            {v === 'graph' ? (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="h-3 w-3" /> graph
              </span>
            ) : v === 'timeline' ? (
              <span className="inline-flex items-center gap-1">
                <History className="h-3 w-3" /> timeline
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Layers className="h-3 w-3" /> grid
              </span>
            )}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-red-400/90">{error}</p> : null}
      {loading && !assets.length ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400/60" />
        </div>
      ) : null}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className={cn('lg:col-span-2', view === 'graph' && selectedId && 'lg:col-span-1')}>
          {view === 'timeline' ? (
            <ul className="space-y-3 border-l border-white/10 ml-3 pl-6">
              {timeline.map((a) => (
                <li key={a.id} className="relative">
                  <span className="absolute -left-[1.65rem] top-2 h-2.5 w-2.5 rounded-full bg-cyan-400/80" />
                  <AssetCard asset={a} onSelect={() => void selectAsset(a.id)} active={selectedId === a.id} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {assets.map((a) => (
                <AssetCard
                  key={a.id}
                  asset={a}
                  onSelect={() => void selectAsset(a.id)}
                  active={selectedId === a.id}
                />
              ))}
            </div>
          )}
          {!loading && !assets.length ? (
            <p className="text-sm text-luxe/45 py-8 text-center">No assets yet — create a project to index.</p>
          ) : null}
        </div>

        <aside className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-4 min-h-[200px]">
          <h2 className="text-xs uppercase tracking-wider text-luxe/50">Relationships</h2>
          {view === 'graph' && graph.length ? (
            <div className="space-y-2 text-sm">
              {graph.map((e) => (
                <div key={e.id} className="rounded-lg bg-white/[0.03] px-3 py-2 border border-white/5">
                  <p className="text-luxe/80 truncate">{e.parentTitle ?? e.parentId.slice(0, 8)}</p>
                  <p className="text-[10px] text-cyan-400/70">{e.relationType.replace(/_/g, ' ')}</p>
                  <p className="text-luxe/80 truncate">{e.childTitle ?? e.childId.slice(0, 8)}</p>
                </div>
              ))}
            </div>
          ) : selectedId ? (
            <p className="text-sm text-luxe/45">Select an asset with linked pipeline nodes.</p>
          ) : (
            <p className="text-sm text-luxe/45">Click an asset to view its graph edges.</p>
          )}
        </aside>
      </div>
    </div>
  )
}

function AssetCard({
  asset,
  onSelect,
  active,
}: {
  asset: Asset
  onSelect: () => void
  active: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'text-left rounded-xl border p-4 transition-colors w-full',
        active ? 'border-cyan-400/50 bg-cyan-500/5' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-cyan-400/70">{asset.type}</span>
        <span className="text-[10px] text-luxe/40">
          {formatDistanceToNow(parseISO(asset.updatedAt), { addSuffix: true })}
        </span>
      </div>
      <p className="mt-1 font-medium text-luxe truncate">{asset.title}</p>
      {asset.description ? (
        <p className="mt-1 text-xs text-luxe/50 line-clamp-2">{asset.description}</p>
      ) : null}
      {asset.tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {asset.tags.slice(0, 4).map((t) => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-luxe/55">
              {t}
            </span>
          ))}
        </div>
      ) : null}
      {asset.project ? (
        <Link
          href={projectWorkspaceHref(asset.project)}
          onClick={(e) => e.stopPropagation()}
          className="mt-3 inline-flex items-center gap-1 text-xs text-cyan-300/80 hover:text-cyan-200"
        >
          Open project <ArrowRight className="h-3 w-3" />
        </Link>
      ) : null}
    </button>
  )
}
