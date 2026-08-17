'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

function safeDownloadName(title: string): string {
  const slug = title
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return `${slug || 'mugtee-reel'}.mp4`
}

export function V7ProductionDownloadButton({
  productionId,
  title,
  className,
  label = 'Download MP4',
  compact = false,
}: {
  productionId: string
  title: string
  className?: string
  label?: string
  compact?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function downloadMp4() {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/v7/productions/${productionId}/download/file`, {
        cache: 'no-store',
      })

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error ?? `Download failed (${res.status})`)
      }

      const blob = await res.blob()
      if (blob.size <= 0) {
        throw new Error('Downloaded file is empty.')
      }

      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = safeDownloadName(title)
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={cn(compact ? 'contents' : 'flex flex-col items-center gap-2')}>
      <button
        type="button"
        onClick={() => void downloadMp4()}
        disabled={loading}
        className={cn(
          compact
            ? 'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/90 transition hover:bg-white/[0.08] disabled:opacity-70'
            : 'inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#D4AF37] px-5 py-2.5 text-sm font-semibold text-[#0B0B0B] touch-manipulation disabled:opacity-70',
          className
        )}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {loading ? 'Downloading…' : label}
      </button>
      {error && !compact ? (
        <p className="max-w-sm text-center text-xs text-red-300/90" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
