'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Copy,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react'
import type { V3ProjectRow } from '@/types/v3/production'

const PAGE_SIZE = 8

type V3ProjectLibraryProps = {
  projects: V3ProjectRow[]
  onChanged?: () => void
}

export function V3ProjectLibrary({ projects, onChanged }: V3ProjectLibraryProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = q
      ? projects.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.prompt.toLowerCase().includes(q) ||
            p.status.toLowerCase().includes(q)
        )
      : projects
    return rows.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  }, [projects, query])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  async function deleteProject(id: string) {
    if (!confirm('Delete this production?')) return
    setBusyId(id)
    try {
      await fetch(`/api/projects/${id}`, { method: 'DELETE' })
      onChanged?.()
    } finally {
      setBusyId(null)
    }
  }

  async function duplicateProject(id: string) {
    setBusyId(id)
    try {
      const res = await fetch(`/api/v3/projects/${id}/duplicate`, { method: 'POST' })
      const data = (await res.json()) as { projectId?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Duplicate failed')
      onChanged?.()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setPage(0)
          }}
          placeholder="Search projects…"
          className="w-full rounded-xl border border-white/[0.08] bg-black/40 py-2.5 pl-10 pr-4 text-sm text-white/85 outline-none focus:border-[rgba(212,175,55,0.35)]"
        />
      </div>

      <ul className="space-y-3">
        {pageItems.map((project) => (
          <li
            key={project.id}
            className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 px-5 py-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Link href={`/v3/${project.id}`} className="font-medium text-white/90 hover:text-[#F4E7A8]">
                  {project.title}
                </Link>
                <p className="mt-1 line-clamp-2 text-sm text-white/45">{project.prompt}</p>
                <p className="mt-2 text-xs text-white/30">
                  {new Date(project.created_at).toLocaleString()} · {project.current_stage ?? project.status}
                  {project.export_status ? ` · export ${project.export_status}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {project.reel_url ? (
                  <a
                    href={project.reel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-[rgba(212,175,55,0.35)] px-3 py-1.5 text-xs text-[#F4E7A8]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    MP4
                  </a>
                ) : null}
                <button
                  type="button"
                  disabled={busyId === project.id}
                  onClick={() => void duplicateProject(project.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5 disabled:opacity-50"
                >
                  {busyId === project.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  Duplicate
                </button>
                <Link
                  href={`/v3/${project.id}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:bg-white/5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Open
                </Link>
                <button
                  type="button"
                  disabled={busyId === project.id}
                  onClick={() => void deleteProject(project.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/45">No projects match your search.</p>
      ) : null}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-xs text-white/45">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="rounded-lg border border-white/10 px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
