'use client'

import { useEffect, useState } from 'react'
import { formatDistanceToNow, parseISO } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { commandCenterWorkspaceHref, STUDIO } from '@/lib/create/routes'

type HistoryRow = {
  id: string
  projectId?: string | null
  title?: string
  hook?: string
  theme?: string
  format?: string
  at: string
}

type ProjectMemoryTimelineProps = {
  className?: string
  brandSlug?: string
  limit?: number
}

export function ProjectMemoryTimeline({
  className,
  brandSlug,
  limit = 10,
}: ProjectMemoryTimelineProps) {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const qs = brandSlug ? `?brand=${encodeURIComponent(brandSlug)}` : ''
        const res = await fetch(`/api/memory/history${qs}`, { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { history?: HistoryRow[] }
        if (alive && data.history) setRows(data.history.slice(0, limit))
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [brandSlug, limit])

  return (
    <div className={cn('rounded-xl border border-white/[0.06] bg-white/[0.02] p-4', className)}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[10px] tracking-wider uppercase text-luxe/45">Project timeline</p>
        <Link
          href={STUDIO.memory}
          className="text-[10px] text-gold-400/80 hover:text-gold-300"
        >
          Manage memory →
        </Link>
      </div>
      {loading ? (
        <p className="text-xs text-luxe/45 py-3">Loading projects…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-luxe/45 py-3">
          Completed reels and campaigns appear here as Mugtee learns your style.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-0.5 border-b border-white/[0.04] pb-2 last:border-0"
            >
              <div className="flex items-center justify-between gap-2">
                {row.projectId ? (
                  <Link
                    href={commandCenterWorkspaceHref(row.projectId)}
                    className="text-sm text-luxe/85 hover:text-gold-200 truncate"
                  >
                    {row.title || 'Untitled project'}
                  </Link>
                ) : (
                  <span className="text-sm text-luxe/85 truncate">
                    {row.title || row.theme || 'Content'}
                  </span>
                )}
                <time className="text-[10px] text-luxe/35 shrink-0">
                  {formatDistanceToNow(parseISO(row.at), { addSuffix: true })}
                </time>
              </div>
              {row.hook ? (
                <p className="text-xs text-luxe/50 line-clamp-1">{row.hook}</p>
              ) : null}
              {row.format ? (
                <span className="text-[9px] uppercase tracking-wide text-gold-400/60">
                  {row.format}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
