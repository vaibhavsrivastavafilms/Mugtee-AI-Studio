'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  compileProjectMp4,
  isCompileProjectMp4Busy,
} from '@/lib/quick-cut/compile-project-mp4.client'
import { downloadMp4File } from '@/lib/quick-cut/download-mp4'

const actionClass =
  'inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/70 backdrop-blur border border-white/10 text-[9px] tracking-wider uppercase text-luxe/90 hover:border-gold-500/40 hover:text-gold-200 transition disabled:opacity-50 disabled:cursor-wait'

type ProjectMp4ButtonProps = {
  projectId: string
  title: string
  videoUrl: string | null
  canCompileMp4: boolean
  /** Open export/preview when server-side render is unavailable */
  exportHref: string
  className?: string
  onVideoUrl?: (url: string) => void
}

export function ProjectMp4Button({
  projectId,
  title,
  videoUrl,
  canCompileMp4,
  exportHref,
  className,
  onVideoUrl,
}: ProjectMp4ButtonProps) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const resolvedUrl = localVideoUrl ?? videoUrl
  const compileBusy = busy || isCompileProjectMp4Busy(projectId)
  const enabled = Boolean(resolvedUrl) || canCompileMp4
  const downloadName = `${(title || 'mugtee-reel').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'mugtee-reel'}.mp4`

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!enabled || compileBusy) return

      if (resolvedUrl) {
        setBusy(true)
        try {
          await downloadMp4File(resolvedUrl, downloadName)
        } finally {
          setBusy(false)
        }
        return
      }

      setBusy(true)
      setError(null)
      try {
        const url = await compileProjectMp4(projectId)
        setLocalVideoUrl(url)
        onVideoUrl?.(url)
        await downloadMp4File(url, downloadName)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'MP4 compile failed'
        if (message.includes('not enabled') || message.includes('FFmpeg')) {
          router.push(exportHref)
          return
        }
        setError(message)
      } finally {
        setBusy(false)
      }
    },
    [
      enabled,
      compileBusy,
      resolvedUrl,
      projectId,
      downloadName,
      onVideoUrl,
      exportHref,
      router,
    ]
  )

  if (!enabled) {
    return (
      <span
        className={cn(actionClass, 'opacity-40 cursor-not-allowed', className)}
        title="Add storyboard images and voice to compile MP4"
      >
        <Download className="w-3 h-3" /> MP4
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => void handleClick(e)}
      disabled={compileBusy}
      className={cn(actionClass, className)}
      title={
        error ??
        (compileBusy
          ? 'Compiling MP4…'
          : resolvedUrl
            ? 'Download MP4'
            : 'Compile all slides into one MP4')
      }
    >
      {compileBusy ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <Download className="w-3 h-3" />
      )}
      {compileBusy ? 'Compiling…' : 'MP4'}
    </button>
  )
}
