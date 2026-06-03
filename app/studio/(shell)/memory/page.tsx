'use client'

import { useCallback, useEffect, useState } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MemoryDashboardPanel } from '@/components/memory/memory-dashboard-panel'
import { ProjectMemoryTimeline } from '@/components/memory/project-memory-timeline'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { BrandProfile } from '@/lib/memory/types'

export default function StudioMemoryPage() {
  const [brands, setBrands] = useState<BrandProfile[]>([])
  const [newBrandSlug, setNewBrandSlug] = useState('table-tales')
  const [newBrandName, setNewBrandName] = useState('Table Tales')
  const [busy, setBusy] = useState(false)

  const loadBrands = useCallback(async () => {
    const res = await fetch('/api/memory/brands', { cache: 'no-store' })
    if (res.ok) {
      const data = (await res.json()) as { brands?: BrandProfile[] }
      if (data.brands) setBrands(data.brands)
    }
  }, [])

  useEffect(() => {
    void loadBrands()
  }, [loadBrands])

  const exportMemory = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/memory/export')
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data.export, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mugtee-memory-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Memory exported')
    } catch {
      toast.error('Could not export memory')
    } finally {
      setBusy(false)
    }
  }

  const deleteMemory = async () => {
    if (!confirm('Delete all learned memory? Creator profile DNA will reset.')) return
    setBusy(true)
    try {
      const res = await fetch('/api/memory/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: 'all' }),
      })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Memory cleared')
      await loadBrands()
      window.location.reload()
    } catch {
      toast.error('Could not delete memory')
    } finally {
      setBusy(false)
    }
  }

  const addBrand = async () => {
    setBusy(true)
    try {
      const res = await fetch('/api/memory/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: newBrandSlug,
          displayName: newBrandName,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Brand "${newBrandName}" saved`)
      setNewBrandSlug('')
      setNewBrandName('')
      await loadBrands()
    } catch {
      toast.error('Could not save brand')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <header>
        <p className="text-[10px] tracking-[0.3em] uppercase text-gold-400/80 mb-1">
          MugteeOS Phase 3
        </p>
        <h1 className="font-display text-2xl sm:text-3xl text-[#F4E7C1]">Creator Memory</h1>
        <p className="text-sm text-luxe/55 mt-2 max-w-xl">
          View and manage what Mugtee knows — brands, patterns, projects, and preferences.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void exportMemory()}
            className="gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void deleteMemory()}
            className="gap-2 text-red-300/90 border-red-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete all memory
          </Button>
        </div>
      </header>

      <MemoryDashboardPanel />

      <section className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
        <h2 className="text-sm font-medium text-luxe/80">Multi-brand spaces</h2>
        {brands.length > 0 ? (
          <ul className="space-y-2">
            {brands.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between text-sm text-luxe/70 border-b border-white/[0.04] pb-2"
              >
                <span>
                  {b.displayName}{' '}
                  <span className="text-luxe/40 text-xs">({b.slug})</span>
                </span>
                {b.isDefault ? (
                  <span className="text-[9px] uppercase text-gold-400/70">default</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-luxe/45">
            No brands yet — add Table Tales or other series for isolated memory.
          </p>
        )}
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-[10px] text-luxe/40 uppercase">Slug</label>
            <Input
              value={newBrandSlug}
              onChange={(e) => setNewBrandSlug(e.target.value)}
              placeholder="table-tales"
              className="mt-1 w-36"
            />
          </div>
          <div>
            <label className="text-[10px] text-luxe/40 uppercase">Name</label>
            <Input
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              placeholder="Table Tales"
              className="mt-1 w-44"
            />
          </div>
          <Button type="button" size="sm" disabled={busy || !newBrandSlug.trim()} onClick={() => void addBrand()}>
            Add brand
          </Button>
        </div>
      </section>

      <ProjectMemoryTimeline limit={15} brandSlug="table-tales" />
    </div>
  )
}
