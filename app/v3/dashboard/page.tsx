'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import type { V3ProjectRow } from '@/types/v3/production'
import { V3ProjectLibrary } from '@/features/v3/components/project-library'
import { V3CreditsBanner } from '@/features/v3/components/credits-banner'

export default function V3DashboardPage() {
  const [projects, setProjects] = useState<V3ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProjects = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/v3/projects', { cache: 'no-store' })
      const data = (await res.json()) as { projects?: V3ProjectRow[]; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Failed to load projects')
      setProjects(data.projects ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadProjects()
  }, [loadProjects])

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37]/75">Dashboard</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Your productions</h1>
        </div>
        <Link
          href="/v3"
          className="rounded-xl border border-[rgba(212,175,55,0.35)] px-4 py-2 text-sm font-medium text-[#F4E7A8] hover:bg-[#D4AF37]/10"
        >
          New production
        </Link>
      </div>

      <div className="mt-6">
        <V3CreditsBanner />
      </div>

      {loading ? (
        <div className="mt-16 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" aria-label="Loading" />
        </div>
      ) : null}

      {error ? <p className="mt-8 text-red-300">{error}</p> : null}

      {!loading && !error && projects.length === 0 ? (
        <p className="mt-12 text-center text-white/50">No productions yet. Start with a prompt.</p>
      ) : null}

      {!loading && !error && projects.length > 0 ? (
        <div className="mt-8">
          <V3ProjectLibrary projects={projects} onChanged={() => void loadProjects()} />
        </div>
      ) : null}
    </main>
  )
}
