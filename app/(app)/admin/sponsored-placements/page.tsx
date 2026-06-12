'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  PLACEMENT_TYPE_LABELS,
  type SponsoredPlacement,
  type SponsoredPlacementType,
} from '@/lib/monetization/sponsored-placement-types'
import { clearSponsoredPlacementsCache } from '@/hooks/use-sponsored-placements'

type AnalyticsRow = {
  id: string
  title: string
  placementType: SponsoredPlacementType
  active: boolean
  impressions: number
  clicks: number
  ctr: number
}

const PLACEMENT_TYPES: SponsoredPlacementType[] = [
  'dashboard',
  'generation_result',
  'empty_state',
  'resources',
]

const emptyForm = {
  title: '',
  description: '',
  imageUrl: '',
  destinationUrl: '',
  cta: 'Learn more',
  placementType: 'dashboard' as SponsoredPlacementType,
  active: true,
  sortOrder: 0,
}

export default function AdminSponsoredPlacementsPage() {
  const [items, setItems] = useState<SponsoredPlacement[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [listRes, analyticsRes] = await Promise.all([
        fetch('/api/admin/sponsored-placements', { cache: 'no-store' }),
        fetch('/api/admin/sponsored-placements?analytics=1', { cache: 'no-store' }),
      ])
      if (!listRes.ok) {
        const body = await listRes.json().catch(() => ({}))
        setError(
          listRes.status === 403
            ? 'Admin access required (set ADMIN_EMAILS or ADMIN_USER_IDS).'
            : String((body as { error?: string }).error || listRes.statusText)
        )
        return
      }
      const listData = await listRes.json()
      setItems(Array.isArray(listData.items) ? listData.items : [])
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json()
        setAnalytics(Array.isArray(analyticsData.analytics) ? analyticsData.analytics : [])
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
  }

  const startEdit = (item: SponsoredPlacement) => {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description,
      imageUrl: item.imageUrl ?? '',
      destinationUrl: item.destinationUrl,
      cta: item.cta,
      placementType: item.placementType,
      active: item.active,
      sortOrder: item.sortOrder,
    })
  }

  const save = async () => {
    if (!form.title.trim() || !form.destinationUrl.trim()) return
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description,
        imageUrl: form.imageUrl.trim() || null,
        destinationUrl: form.destinationUrl,
        cta: form.cta,
        placementType: form.placementType,
        active: form.active,
        sortOrder: form.sortOrder,
      }
      const res = await fetch(
        editingId
          ? `/api/admin/sponsored-placements/${encodeURIComponent(editingId)}`
          : '/api/admin/sponsored-placements',
        {
          method: editingId ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(String((body as { error?: string }).error || 'Save failed'))
      }
      clearSponsoredPlacementsCache()
      resetForm()
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this sponsored placement?')) return
    const res = await fetch(`/api/admin/sponsored-placements/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      setError('Delete failed')
      return
    }
    clearSponsoredPlacementsCache()
    if (editingId === id) resetForm()
    await load()
  }

  const toggleActive = async (item: SponsoredPlacement) => {
    await fetch(`/api/admin/sponsored-placements/${encodeURIComponent(item.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    })
    clearSponsoredPlacementsCache()
    await load()
  }

  return (
    <div className="max-w-5xl mx-auto w-full pb-12">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-luxe/60 hover:text-luxe transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Admin
        </Link>
      </div>

      <h1 className="font-display text-2xl sm:text-3xl text-luxe mb-1">Sponsored Placements</h1>
      <p className="text-sm text-luxe/55 mb-6">
        Manage native sponsor cards for FREE users. PRO users never see these placements.
      </p>

      {error ? (
        <p className="text-sm text-red-300/90 mb-4 py-2 px-3 rounded-lg border border-red-500/20 bg-red-500/5">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 sm:p-5 mb-8">
        <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-4">
          {editingId ? 'Edit campaign' : 'Add sponsor'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-luxe/45">Title</span>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe"
              placeholder="Canva for Creators"
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-[10px] uppercase tracking-wider text-luxe/45">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe resize-none"
              placeholder="Create thumbnails faster"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-luxe/45">Image URL</span>
            <input
              value={form.imageUrl}
              onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe"
              placeholder="https://…"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-luxe/45">Destination URL</span>
            <input
              value={form.destinationUrl}
              onChange={(e) => setForm((f) => ({ ...f, destinationUrl: e.target.value }))}
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe"
              placeholder="https://partner.com/?ref=mugtee"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-luxe/45">CTA label</span>
            <input
              value={form.cta}
              onChange={(e) => setForm((f) => ({ ...f, cta: e.target.value }))}
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-luxe/45">Placement</span>
            <select
              value={form.placementType}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  placementType: e.target.value as SponsoredPlacementType,
                }))
              }
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe"
            >
              {PLACEMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PLACEMENT_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-luxe/45">Sort order</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((f) => ({ ...f, sortOrder: Number(e.target.value) || 0 }))
              }
              className="w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 py-2 text-sm text-luxe"
            />
          </label>
          <label className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="rounded border-white/20"
            />
            <span className="text-sm text-luxe/70">Active</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-gradient px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {editingId ? 'Save changes' : 'Add sponsor'}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-white/[0.1] px-4 py-2 text-sm text-luxe/70 hover:text-luxe"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </section>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-luxe/50 py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
              Performance
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Campaign</th>
                    <th className="px-4 py-3 font-medium">Placement</th>
                    <th className="px-4 py-3 font-medium text-right">Impressions</th>
                    <th className="px-4 py-3 font-medium text-right">Clicks</th>
                    <th className="px-4 py-3 font-medium text-right">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-luxe/45">
                        No analytics yet
                      </td>
                    </tr>
                  ) : (
                    analytics.map((row) => (
                      <tr key={row.id} className="border-b border-white/[0.05]">
                        <td className="px-4 py-3 text-luxe/90">{row.title}</td>
                        <td className="px-4 py-3 text-luxe/60 text-xs">
                          {PLACEMENT_TYPE_LABELS[row.placementType]}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.impressions}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{row.clicks}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-gold-300/90">
                          {row.ctr}%
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-[10px] tracking-wider uppercase text-muted-foreground mb-3">
              All campaigns ({items.length})
            </h2>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-black/25 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-luxe truncate">{item.title}</p>
                    <p className="text-[11px] text-luxe/50">
                      {PLACEMENT_TYPE_LABELS[item.placementType]} · {item.impressions} views ·{' '}
                      {item.clicks} clicks
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleActive(item)}
                    className={cn(
                      'text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-full border',
                      item.active
                        ? 'border-emerald-500/30 text-emerald-200/90'
                        : 'border-white/10 text-luxe/40'
                    )}
                  >
                    {item.active ? 'Active' : 'Paused'}
                  </button>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="text-xs text-gold-300/80 hover:text-gold-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(item.id)}
                    className="text-luxe/40 hover:text-red-300/90"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
