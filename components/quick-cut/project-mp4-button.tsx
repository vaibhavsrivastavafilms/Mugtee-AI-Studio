'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  compileProjectMp4,
  isCompileProjectMp4Busy,
  quickCutCanCompileMp4,
} from '@/lib/quick-cut/compile-project-mp4.client'
import { downloadMp4File } from '@/lib/quick-cut/download-mp4'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

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

const playerDownloadClass =
  'inline-flex items-center justify-center gap-1.5 rounded-full border min-h-[28px] px-3 py-1 text-[10px] tracking-[0.14em] uppercase shrink-0 transition-colors disabled:opacity-50 disabled:cursor-wait'

/** Compact MP4 download for reel player controls (1080×1920 vertical render). */
export function QuickCutPlayerMp4Download({
  className,
  triggerClassName,
}: {
  className?: string
  triggerClassName?: string
}) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)

  const [busy, setBusy] = useState(false)
  const canCompileMp4 = quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled)
  const compileBusy =
    busy ||
    isRenderingVideo ||
    (savedProjectId ? isCompileProjectMp4Busy(savedProjectId) : false)
  const enabled = Boolean(videoUrl) || canCompileMp4
  const downloadName = `${(title || 'mugtee-reel').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'mugtee-reel'}.mp4`

  const handleClick = useCallback(async () => {
    if (!enabled || compileBusy) return

    if (videoUrl) {
      setBusy(true)
      try {
        await downloadMp4File(videoUrl, downloadName)
      } finally {
        setBusy(false)
      }
      return
    }

    setBusy(true)
    try {
      let url: string | null = null
      if (savedProjectId) {
        url = await compileProjectMp4(savedProjectId)
        useQuickCutGenerationStore.setState({ videoUrl: url, renderPollUrl: null, renderError: null })
      } else {
        await retryVideoRender()
        url = useQuickCutGenerationStore.getState().videoUrl
      }
      if (url) await downloadMp4File(url, downloadName)
    } finally {
      setBusy(false)
    }
  }, [enabled, compileBusy, videoUrl, savedProjectId, downloadName, retryVideoRender])

  if (!enabled) return null

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={compileBusy}
      className={cn(
        playerDownloadClass,
        'border-gold-500/30 bg-black/45 text-gold-100/90 hover:bg-black/60',
        triggerClassName,
        className
      )}
      title={
        compileBusy
          ? 'Compiling MP4…'
          : videoUrl
            ? 'Download MP4 (1080p vertical)'
            : 'Compile and download MP4 (1080p vertical)'
      }
    >
      {compileBusy ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
      ) : (
        <Download className="w-3.5 h-3.5" aria-hidden />
      )}
      {compileBusy ? 'Compiling…' : 'Download MP4 · 1080p'}
    </button>
  )
}
