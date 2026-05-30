'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  compileProjectMp4,
  isCompileProjectMp4Busy,
  quickCutCanCompileMp4,
} from '@/lib/quick-cut/compile-project-mp4.client'
import { resolveMp4Download } from '@/lib/quick-cut/resolve-mp4-download.client'
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
          await resolveMp4Download({
            projectId,
            videoUrl: resolvedUrl,
            filename: downloadName,
          })
        } catch (err) {
          const message = err instanceof Error ? err.message : 'MP4 download failed'
          setError(message)
          toast.error(message)
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
        await resolveMp4Download({
          projectId,
          videoUrl: url,
          filename: downloadName,
        })
        toast.success('MP4 download started')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'MP4 compile failed'
        if (message.includes('not enabled') || message.includes('FFmpeg')) {
          router.push(exportHref)
          return
        }
        setError(message)
        toast.error(message)
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
  projectId: projectIdOverride,
  videoUrl: videoUrlOverride,
  title: titleOverride,
  canCompileMp4: canCompileMp4Override,
  onVideoUrl,
}: {
  className?: string
  triggerClassName?: string
  /** Director export / project workspace — bypass Quick Cut session store */
  projectId?: string
  videoUrl?: string | null
  title?: string
  canCompileMp4?: boolean
  onVideoUrl?: (url: string) => void
}) {
  const storeTitle = useQuickCutGenerationStore((s) => s.title)
  const storeVideoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const saveProject = useQuickCutGenerationStore((s) => s.saveProject)
  const syncVideoRenderConfig = useQuickCutGenerationStore((s) => s.syncVideoRenderConfig)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)

  const title = titleOverride ?? storeTitle
  const videoUrl = videoUrlOverride !== undefined ? videoUrlOverride : storeVideoUrl
  const projectId = projectIdOverride ?? savedProjectId

  const [busy, setBusy] = useState(false)
  const [localVideoUrl, setLocalVideoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const resolvedUrl = localVideoUrl ?? videoUrl
  const canCompileMp4 =
    canCompileMp4Override ??
    quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled)
  const compileBusy =
    busy ||
    isRenderingVideo ||
    (projectId ? isCompileProjectMp4Busy(projectId) : false)
  const enabled = Boolean(resolvedUrl) || canCompileMp4
  const downloadName = `${(title || 'mugtee-reel').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'mugtee-reel'}.mp4`
  const displayError = error ?? renderError

  useEffect(() => {
    void syncVideoRenderConfig()
  }, [syncVideoRenderConfig])

  const handleClick = useCallback(async () => {
    if (!enabled || compileBusy) return

    setError(null)

    if (resolvedUrl) {
      setBusy(true)
      try {
        await resolveMp4Download({
          projectId,
          videoUrl: resolvedUrl,
          filename: downloadName,
        })
        toast.success('MP4 download started')
      } catch (err) {
        const message = err instanceof Error ? err.message : 'MP4 download failed'
        setError(message)
        toast.error(message)
      } finally {
        setBusy(false)
      }
      return
    }

    setBusy(true)
    try {
      let activeProjectId = projectId
      if (!activeProjectId) {
        activeProjectId = await saveProject()
      }

      let url: string | null = null
      if (activeProjectId) {
        url = await compileProjectMp4(activeProjectId, {
          onProgress: (label) => {
            toast.message(label, { id: 'mp4-compile-progress' })
          },
        })
        setLocalVideoUrl(url)
        onVideoUrl?.(url)
        if (!projectIdOverride) {
          useQuickCutGenerationStore.setState({
            videoUrl: url,
            renderPollUrl: null,
            renderError: null,
          })
        }
      } else {
        await retryVideoRender()
        url = useQuickCutGenerationStore.getState().videoUrl
        const storeError = useQuickCutGenerationStore.getState().renderError
        if (!url) {
          throw new Error(storeError || 'Video compile failed — try again from Export.')
        }
        if (url) onVideoUrl?.(url)
      }

      await resolveMp4Download({
        projectId: activeProjectId,
        videoUrl: url,
        filename: downloadName,
      })
      toast.success('MP4 download started')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'MP4 compile failed'
      if (message.includes('Not signed in') || message.includes('Sign in')) {
        toast.error('Sign in to compile and download MP4.')
      } else if (message.includes('not enabled')) {
        toast.error('MP4 export is not enabled on this server yet.')
      } else {
        toast.error(message)
      }
      setError(message)
      if (!projectIdOverride) {
        useQuickCutGenerationStore.setState({ renderError: message })
      }
    } finally {
      setBusy(false)
      toast.dismiss('mp4-compile-progress')
    }
  }, [
    enabled,
    compileBusy,
    resolvedUrl,
    projectId,
    projectIdOverride,
    downloadName,
    onVideoUrl,
    retryVideoRender,
    saveProject,
  ])

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
        displayError ??
        (compileBusy
          ? 'Compiling MP4…'
          : resolvedUrl
            ? 'Download MP4 (1080p vertical)'
            : 'Compile and download MP4 (1080p vertical)')
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
