'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useShallow } from 'zustand/react/shallow'
import { useUsage } from '@/lib/usage'
import { exportScriptAsDoc } from '@/lib/export-docx'
import { downloadMp3File } from '@/lib/quick-cut/download-audio'
import { resolveMp4Download } from '@/lib/quick-cut/resolve-mp4-download.client'
import {
  downloadAllStoryboardImages,
  SCENE_IMAGE_EXPORT_DIMENSIONS,
  slugifyExportBase,
  type SceneImageExportSize,
} from '@/lib/quick-cut/download-scene-image'
import { downloadScriptDoc, downloadScriptTxt } from '@/lib/quick-cut/download-script'
import {
  buildCreatorPackZip,
  triggerCreatorPackDownload,
  type CreatorPackExportResult,
} from '@/lib/quick-cut/creator-pack-export.client'
import {
  buildPlatformPackZip,
  triggerPlatformPackDownload,
} from '@/lib/quick-cut/platform-pack-export.client'
import {
  ASSET_UNAVAILABLE_MSG,
  EXPORT_EXPIRED_MSG,
  resolveQuickCutExportAssets,
} from '@/lib/quick-cut/asset-availability'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import { resolveMp4ExportUiState } from '@/lib/quick-cut/mp4-export-readiness.client'
import { isClientVideoRenderEnabled } from '@/lib/cinematic/quick-cut/video-render-enabled.client'
import { evaluateCreatorPackReadiness } from '@/lib/export/creator-pack-readiness.client'
import { exportDiagnostics } from '@/lib/export/export-diagnostics.client'
import {
  PLATFORM_EXPORT_IDS,
  PLATFORM_PROFILES,
  platformProfileCanExport,
  resolvePlatformAssetStatuses,
  type PlatformExportId,
  type PlatformExportInput,
} from '@/lib/quick-cut/platform-export-profiles'
import {
  buildOutputExportText,
  copyTextToClipboard,
  deriveCaptionLines,
  deriveThumbnailConcept,
  downloadClientBlob,
  exportBaseName,
} from '@/lib/workspace/output-workspace-utils'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { Mp4ExportEvents, trackMp4ExportClient } from '@/lib/analytics/mp4-export-events'
import { trackEvent } from '@/lib/analytics/track-event'
import { requestExitFeedback } from '@/lib/creator/exit-feedback'
import { isDevExportUnlocked } from '@/lib/export/export-entitlement'
import { blockMp4CompileIfNeeded } from '@/lib/export/mp4-compile-guard.client'
import { trackClientUsage } from '@/lib/usage/plan-limit-toast.client'
import { useReelDownloadReadiness } from '@/lib/export/reel-download-readiness.client'
import { useReelExportAutoResume } from '@/lib/export/use-reel-export-auto-resume.client'
import { resolveActiveThumbnailUrl } from '@/lib/cinematic/thumbnail-cover'
import { computeRenderTotalSec } from '@/lib/cinematic/scene-duration'
import { buildSubtitleSegmentsFromScenes, segmentsToSrt } from '@/lib/video/subtitles'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export type UnifiedExportMenuOptions = {
  /** Hide video/narration/script — primary actions may live in GenerationResultsSection */
  supplementaryOnly?: boolean
  /** Include Copy All, Export TXT, Export DOCX */
  includeTextExports?: boolean
  onExportComplete?: () => void
}

export type PlatformZipMenuItem = {
  id: PlatformExportId
  name: string
  enabled: boolean
  subtitle: string
  partialExport: boolean
}

function platformZipDisabledReason(profileId: PlatformExportId, input: PlatformExportInput): string {
  if (platformProfileCanExport(profileId, input)) return ''

  const statuses = resolvePlatformAssetStatuses(profileId, input)
  const videoAsset = statuses.find((asset) =>
    ['video.mp4', 'reel-video.mp4'].includes(asset.filename)
  )

  if (statuses.every((asset) => asset.state === 'missing')) {
    return 'Generate title, script, or video first'
  }
  if (videoAsset?.state === 'preparing') return 'Video preparing…'
  if (videoAsset?.state === 'missing') return 'Video not ready'
  return 'No exportable assets yet'
}

export function useUnifiedExportActions(options: UnifiedExportMenuOptions = {}) {
  const { supplementaryOnly = false, includeTextExports = true, onExportComplete } = options
  const { isUnlimited, trial } = useUsage()

  const store = useQuickCutGenerationStore(
    useShallow((s) => ({
      title: s.title,
      hook: s.hook,
      script: s.script,
      scriptBeats: s.scriptBeats,
      payoff: s.payoff,
      cta: s.cta,
      prompt: s.prompt,
      niche: s.niche,
      scenes: s.scenes,
      voiceUrl: s.voiceUrl,
      videoUrl: s.videoUrl,
      renderPollUrl: s.renderPollUrl,
      renderError: s.renderError,
      renderStatusLabel: s.renderStatusLabel,
      isRenderingVideo: s.isRenderingVideo,
      videoRenderEnabled: s.videoRenderEnabled,
      isGenerating: s.isGenerating,
      resumeRenderPoll: s.resumeRenderPoll,
      retryVideoRender: s.retryVideoRender,
      exportPackageReady: s.exportPackageReady,
      savedProjectId: s.savedProjectId,
      exportExpired: s.exportExpired,
      researchReport: s.researchReport,
      reelTimeline: s.reelTimeline,
      syncVideoRenderConfig: s.syncVideoRenderConfig,
      visualStyle: s.visualStyle,
      thumbnailImageUrl: s.thumbnailImageUrl,
    }))
  )

  const {
    title,
    hook,
    script,
    scriptBeats,
    payoff,
    cta,
    prompt,
    niche,
    scenes,
    voiceUrl,
    videoUrl,
    renderPollUrl,
    renderError,
    renderStatusLabel,
    isRenderingVideo,
    videoRenderEnabled,
    isGenerating,
    retryVideoRender,
    exportPackageReady,
    savedProjectId,
    exportExpired,
    researchReport,
    reelTimeline,
    syncVideoRenderConfig,
    visualStyle,
    thumbnailImageUrl,
  } = store

  const [downloadingMp4, setDownloadingMp4] = useState(false)
  const [downloadingMp3, setDownloadingMp3] = useState(false)
  const [downloadingThumbnail, setDownloadingThumbnail] = useState(false)
  const [downloadingCaptions, setDownloadingCaptions] = useState(false)
  const [downloadingImagesFormat, setDownloadingImagesFormat] =
    useState<SceneImageExportSize | null>(null)
  const [textBusy, setTextBusy] = useState<'copy' | 'txt' | 'doc' | null>(null)
  const [assetError, setAssetError] = useState<string | null>(null)
  const exportTrackedRef = useRef(false)
  type CreatorPackState = 'idle' | 'preparing' | 'ready' | 'error'
  const [creatorPackState, setCreatorPackState] = useState<CreatorPackState>('idle')
  const [creatorPackProgress, setCreatorPackProgress] = useState(0)
  const [creatorPackResult, setCreatorPackResult] = useState<CreatorPackExportResult | null>(null)
  const [creatorPackModalOpen, setCreatorPackModalOpen] = useState(false)
  const [platformExportState, setPlatformExportState] = useState<{
    id: PlatformExportId | null
    progress: number
  }>({ id: null, progress: 0 })

  const exportBase = slugifyExportBase(title || 'mugtee-reel', 'mugtee-reel')
  const mp4Name = `${exportBase}.mp4`
  const mp3Name = `${exportBase}-narration.mp3`

  const mp4RenderEnabled = useMemo(
    () => isClientVideoRenderEnabled(videoRenderEnabled),
    [videoRenderEnabled]
  )

  const exportAssets = resolveQuickCutExportAssets({
    title,
    hook,
    script,
    scriptBeats,
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    isGenerating,
  })
  const hasScript = exportAssets.script
  const hasImages = exportAssets.images
  const hasNarration = exportAssets.narration

  const reelReadiness = useReelDownloadReadiness({
    projectId: savedProjectId,
    videoUrl,
    isRendering: isRenderingVideo,
    renderPollUrl,
    exportExpired,
  })

  const canCompileMp4 = useMemo(
    () => quickCutCanCompileMp4(scenes, voiceUrl, mp4RenderEnabled),
    [scenes, voiceUrl, mp4RenderEnabled]
  )

  const mp4Export = resolveMp4ExportUiState({
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled: mp4RenderEnabled,
    exportExpired,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
    downloadValidated: videoUrl?.trim()
      ? reelReadiness.ready || !savedProjectId
      : undefined,
    reelValidating: reelReadiness.validating,
    downloadingMp4,
  })

  const {
    mp4DownloadReady,
    mp4Compiling,
    hasMp4Action: hasMp4,
    mp4ButtonEnabled,
  } = mp4Export

  const thumbnailConcept = useMemo(
    () =>
      deriveThumbnailConcept({
        hook,
        title,
        scenes,
        visualStyleLabel: visualStyle?.label ?? null,
      }),
    [hook, title, scenes, visualStyle?.label]
  )

  const platformExportInput = useMemo<PlatformExportInput>(
    () => ({
      title,
      hook,
      script,
      scriptBeats,
      payoff,
      cta,
      prompt,
      niche,
      scenes,
      voiceUrl,
      videoUrl,
      videoRenderEnabled,
      exportExpired,
      isRenderingVideo,
      renderPollUrl,
      renderError,
      researchReport,
      savedProjectId,
      isGenerating,
      isUnlimited,
      downloadValidated: mp4DownloadReady,
      videoValidating: reelReadiness.validating,
      mp4CanCompile: canCompileMp4,
      thumbnailConcept,
      thumbnailImageUrl,
    }),
    [
      title,
      hook,
      script,
      scriptBeats,
      payoff,
      cta,
      prompt,
      niche,
      scenes,
      voiceUrl,
      videoUrl,
      videoRenderEnabled,
      exportExpired,
      isRenderingVideo,
      renderPollUrl,
      renderError,
      researchReport,
      savedProjectId,
      isGenerating,
      isUnlimited,
      mp4DownloadReady,
      reelReadiness.validating,
      canCompileMp4,
      thumbnailConcept,
      thumbnailImageUrl,
    ]
  )

  const platformZipItems = useMemo<PlatformZipMenuItem[]>(
    () =>
      PLATFORM_EXPORT_IDS.map((profileId) => {
        const profile = PLATFORM_PROFILES[profileId]
        const statuses = resolvePlatformAssetStatuses(profileId, platformExportInput)
        const enabled = platformProfileCanExport(profileId, platformExportInput)
        const readyCount = statuses.filter((asset) => asset.state === 'ready').length
        const partialExport = enabled && readyCount < statuses.length

        let subtitle = platformZipDisabledReason(profileId, platformExportInput)
        if (enabled) {
          subtitle = partialExport
            ? `Partial — ${readyCount} of ${statuses.length} assets ready`
            : `${readyCount} assets ready`
        }

        return {
          id: profileId,
          name: profile.name,
          enabled,
          subtitle,
          partialExport,
        }
      }),
    [platformExportInput]
  )

  const exportPayload = useMemo(
    () => ({
      title,
      hook,
      script,
      scriptBeats,
      payoff,
      cta,
      captions: deriveCaptionLines({ hook, script, cta, payoff }),
      thumbnailConcept: deriveThumbnailConcept({
        hook,
        title,
        scenes,
        visualStyleLabel: visualStyle?.label ?? null,
      }),
    }),
    [title, hook, script, scriptBeats, payoff, cta, scenes, visualStyle?.label]
  )

  const exportText = useMemo(() => buildOutputExportText(exportPayload), [exportPayload])
  const hasTextContent = Boolean(exportText.trim())
  const textBaseName = exportBaseName(title)

  const creatorPackReadiness = useMemo(
    () =>
      evaluateCreatorPackReadiness({
        title,
        hook,
        script,
        scriptBeats,
        scenes,
        voiceUrl,
        isGenerating,
      }),
    [title, hook, script, scriptBeats, scenes, voiceUrl, isGenerating]
  )

  const hasAnyCreatorPackAsset = creatorPackReadiness.canExport

  const showAdvancedMp4Export =
    mp4RenderEnabled && (canCompileMp4 || Boolean(videoUrl?.trim()))

  useReelExportAutoResume({ canCompileMp4: showAdvancedMp4Export && canCompileMp4 })

  useEffect(() => {
    void syncVideoRenderConfig()
  }, [syncVideoRenderConfig])

  const trackExportStarted = useCallback(
    (asset: string, source?: string) => {
      if (asset === 'video_mp4') {
        trackMp4ExportClient(Mp4ExportEvents.EXPORT_CLICKED, {
          projectId: savedProjectId,
          metadata: { asset, source: source ?? 'unified_export_menu' },
        })
      }
      if (exportTrackedRef.current) return
      exportTrackedRef.current = true
      trackEvent(AnalyticsEvents.EXPORT_STARTED, {
        projectId: savedProjectId,
        metadata: { asset, source },
      })
    },
    [savedProjectId]
  )

  const guardExport = useCallback(async () => {
    if (isDevExportUnlocked()) return true
    return trackClientUsage('exports')
  }, [])

  const notifyExportComplete = useCallback(() => {
    onExportComplete?.()
  }, [onExportComplete])

  const recordTextExport = useCallback(
    (format: 'copy' | 'txt' | 'doc') => {
      if (!savedProjectId) return
      fetch('/api/workspace/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: savedProjectId, format }),
      }).catch(() => {})
    },
    [savedProjectId]
  )

  const scriptInput = useMemo(
    () => ({ title, hook, script, scriptBeats, payoff, cta, isUnlimited }),
    [title, hook, script, scriptBeats, payoff, cta, isUnlimited]
  )

  const handleDownloadMp4 = useCallback(async () => {
    if (downloadingMp4) return
    if (
      blockMp4CompileIfNeeded(trial.planType, {
        trialActive: trial.active,
        isUnlimited,
        logContext: { source: 'handleDownloadMp4' },
      })
    ) {
      return
    }
    if (!videoUrl?.trim() && !canCompileMp4 && !savedProjectId) return
    if (!(await guardExport())) return
    trackExportStarted('video_mp4')
    setAssetError(null)
    setDownloadingMp4(true)
    if (mp4Compiling || reelReadiness.validating) {
      toast.message('Preparing your video…')
    }
    try {
      if (videoUrl?.trim() || savedProjectId) {
        await resolveMp4Download({
          projectId: savedProjectId,
          videoUrl,
          filename: mp4Name,
          compileIfNeeded: canCompileMp4 && !videoUrl,
          onProgress: (label) => toast.message(label, { id: 'mp4-export-progress' }),
        })
        toast.success('Video ready for download.', { id: 'mp4-export-progress' })
        notifyExportComplete()
      } else {
        const compileFn = retryVideoRender
        if (typeof compileFn !== 'function') {
          console.error('[EXPORT] compile function unavailable', {
            planType: trial.planType,
            source: 'handleDownloadMp4.retryVideoRender',
          })
          return
        }
        await compileFn()
        const url = useQuickCutGenerationStore.getState().videoUrl
        const err = useQuickCutGenerationStore.getState().renderError
        if (!url) throw new Error(err || 'Video compile failed')
        await resolveMp4Download({
          projectId: savedProjectId,
          videoUrl: url,
          filename: mp4Name,
        })
        toast.success('Video ready for download.')
        notifyExportComplete()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      const expired = message === EXPORT_EXPIRED_MSG || message.includes('Export job expired')
      useQuickCutGenerationStore.setState({
        renderError: message,
        ...(expired ? { exportExpired: true, videoUrl: null } : {}),
      })
      setAssetError(message)
      toast.error('MP4 export failed — Creator Pack is available below.', {
        id: 'mp4-export-progress',
      })
      setCreatorPackState('idle')
    } finally {
      setDownloadingMp4(false)
    }
  }, [
    videoUrl,
    mp4Name,
    downloadingMp4,
    trackExportStarted,
    savedProjectId,
    canCompileMp4,
    retryVideoRender,
    guardExport,
    mp4Compiling,
    reelReadiness.validating,
    notifyExportComplete,
    trial.planType,
    trial.active,
    isUnlimited,
  ])

  const handleDownloadImages = useCallback(
    async (exportSize: SceneImageExportSize) => {
      if (downloadingImagesFormat || !hasImages) return
      if (!(await guardExport())) return
      trackExportStarted(`images_${exportSize}`)
      setAssetError(null)
      setDownloadingImagesFormat(exportSize)
      try {
        const count = await downloadAllStoryboardImages(
          scenes,
          title || 'mugtee-storyboard',
          exportSize
        )
        if (count < 1) throw new Error(ASSET_UNAVAILABLE_MSG)
        notifyExportComplete()
      } catch (err) {
        const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
        setAssetError(message)
      } finally {
        setDownloadingImagesFormat(null)
      }
    },
    [
      downloadingImagesFormat,
      scenes,
      title,
      trackExportStarted,
      hasImages,
      guardExport,
      notifyExportComplete,
    ]
  )

  const handleDownloadMp3 = useCallback(async () => {
    if (!hasNarration || downloadingMp3) return
    if (!(await guardExport())) return
    trackExportStarted('narration_mp3')
    setAssetError(null)
    setDownloadingMp3(true)
    try {
      await downloadMp3File(voiceUrl!, mp3Name)
      notifyExportComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      setAssetError(message)
    } finally {
      setDownloadingMp3(false)
    }
  }, [voiceUrl, mp3Name, downloadingMp3, trackExportStarted, hasNarration, guardExport, notifyExportComplete])

  const handleDownloadTxt = useCallback(async () => {
    if (!(await guardExport())) return
    trackExportStarted('script_txt')
    downloadScriptTxt(scriptInput)
    notifyExportComplete()
  }, [scriptInput, trackExportStarted, guardExport, notifyExportComplete])

  const handleDownloadDoc = useCallback(() => {
    downloadScriptDoc(scriptInput)
    notifyExportComplete()
  }, [scriptInput, notifyExportComplete])

  const thumbnailUrl = useMemo(
    () => resolveActiveThumbnailUrl(thumbnailImageUrl, scenes),
    [thumbnailImageUrl, scenes]
  )
  const hasThumbnail = Boolean(thumbnailUrl?.trim())
  const hasCaptions = scenes.some((s) => s.description?.trim())

  const handleDownloadThumbnail = useCallback(async () => {
    if (!hasThumbnail || downloadingThumbnail) return
    if (!(await guardExport())) return
    trackExportStarted('thumbnail_jpg')
    setAssetError(null)
    setDownloadingThumbnail(true)
    try {
      const res = await fetch(thumbnailUrl!)
      if (!res.ok) throw new Error(ASSET_UNAVAILABLE_MSG)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${textBaseName}-thumbnail.jpg`
      anchor.rel = 'noopener'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
      notifyExportComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      setAssetError(message)
      toast.error(message)
    } finally {
      setDownloadingThumbnail(false)
    }
  }, [
    hasThumbnail,
    downloadingThumbnail,
    thumbnailUrl,
    textBaseName,
    trackExportStarted,
    guardExport,
    notifyExportComplete,
  ])

  const handleDownloadCaptions = useCallback(async () => {
    if (!hasCaptions || downloadingCaptions) return
    if (!(await guardExport())) return
    trackExportStarted('captions_srt')
    setAssetError(null)
    setDownloadingCaptions(true)
    try {
      const total = computeRenderTotalSec(scenes)
      const segments = buildSubtitleSegmentsFromScenes(scenes, total)
      const srt = segmentsToSrt(segments)
      const ok = downloadClientBlob(srt, `${textBaseName}-captions.srt`, 'text/plain')
      if (!ok) throw new Error('Caption download failed')
      notifyExportComplete()
    } catch (err) {
      const message = err instanceof Error ? err.message : ASSET_UNAVAILABLE_MSG
      setAssetError(message)
      toast.error(message)
    } finally {
      setDownloadingCaptions(false)
    }
  }, [
    hasCaptions,
    downloadingCaptions,
    scenes,
    textBaseName,
    trackExportStarted,
    guardExport,
    notifyExportComplete,
  ])

  const handleCopyAll = useCallback(async () => {
    if (!hasTextContent || textBusy !== null) return
    setTextBusy('copy')
    const ok = await copyTextToClipboard(exportText)
    if (ok) toast.success('All content copied')
    else toast.error('Copy failed')
    if (ok) recordTextExport('copy')
    setTextBusy(null)
  }, [exportText, hasTextContent, textBusy, recordTextExport])

  const handleExportHubTxt = useCallback(() => {
    if (!hasTextContent || textBusy !== null) return
    setTextBusy('txt')
    const ok = downloadClientBlob(exportText, `${textBaseName}.txt`, 'text/plain')
    if (ok) toast.success('TXT downloaded')
    else toast.error('Download failed')
    if (ok) recordTextExport('txt')
    setTextBusy(null)
  }, [exportText, hasTextContent, textBusy, recordTextExport, textBaseName])

  const handleExportHubDoc = useCallback(() => {
    if (!hasTextContent || textBusy !== null) return
    setTextBusy('doc')
    try {
      exportScriptAsDoc({
        title: title.trim() || 'Mugtee Project',
        body: exportText,
        isUnlimited: true,
      })
      toast.success('DOC downloaded')
      recordTextExport('doc')
    } catch {
      toast.error('DOC export failed')
    }
    setTextBusy(null)
  }, [exportText, hasTextContent, textBusy, recordTextExport, title])

  const handleExportCreatorPack = useCallback(async () => {
    if (creatorPackState === 'preparing') return

    if (creatorPackState === 'ready' && creatorPackResult) {
      triggerCreatorPackDownload(creatorPackResult.blob, creatorPackResult.filename)
      notifyExportComplete()
      window.setTimeout(() => requestExitFeedback('export_inactive'), 800)
      return
    }

    exportDiagnostics({
      projectId: savedProjectId,
      scenes,
      voiceUrl,
      title,
      hook,
      script,
      scriptBeats,
      isGenerating,
      videoRenderEnabled,
    })

    if (!creatorPackReadiness.canExport) {
      const message =
        creatorPackReadiness.missingRequired.length > 0
          ? `Missing: ${creatorPackReadiness.missingRequired.join(', ')}`
          : 'Complete storyboard, script, and voice before exporting.'
      setAssetError(message)
      toast.error(message)
      return
    }

    setCreatorPackState('preparing')
    setCreatorPackProgress(0)
    setCreatorPackResult(null)
    setCreatorPackModalOpen(true)
    setAssetError(null)
    if (!(await guardExport())) {
      setCreatorPackState('idle')
      setCreatorPackModalOpen(false)
      return
    }
    trackExportStarted('creator_pack')

    try {
      const result = await buildCreatorPackZip(
        {
          title,
          hook,
          script,
          scriptBeats,
          payoff,
          cta,
          scenes,
          voiceUrl,
          videoUrl,
          videoRenderEnabled,
          researchReport,
          savedProjectId,
          isUnlimited,
          isGenerating,
          reelTimeline,
        },
        ({ progress }) => setCreatorPackProgress(progress)
      )
      setCreatorPackResult(result)
      setCreatorPackState('ready')
      useQuickCutGenerationStore.setState((s) => ({
        exportPackageReady: true,
        renderError: null,
        sectionStatus: { ...s.sectionStatus, export: 'completed' as const },
      }))
      triggerCreatorPackDownload(result.blob, result.filename)
      notifyExportComplete()
      window.setTimeout(() => requestExitFeedback('export_inactive'), 800)
      void fetch('/api/analytics/feature-usage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feature: 'export',
          project_id: savedProjectId ?? undefined,
        }),
        keepalive: true,
      }).catch(() => {})
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create Creator Pack.'
      setAssetError(message)
      setCreatorPackState('error')
      toast.error(message)
    }
  }, [
    title,
    hook,
    script,
    scriptBeats,
    payoff,
    cta,
    scenes,
    voiceUrl,
    researchReport,
    savedProjectId,
    isUnlimited,
    isGenerating,
    videoUrl,
    videoRenderEnabled,
    trackExportStarted,
    guardExport,
    reelTimeline,
    creatorPackState,
    creatorPackResult,
    creatorPackReadiness,
    notifyExportComplete,
  ])

  const handlePlatformZip = useCallback(
    async (profileId: PlatformExportId) => {
      const item = platformZipItems.find((entry) => entry.id === profileId)
      if (!item?.enabled || platformExportState.id) return
      setPlatformExportState({ id: profileId, progress: 0 })
      setAssetError(null)
      trackExportStarted(`platform_${profileId}`)

      try {
        const result = await buildPlatformPackZip(
          profileId,
          platformExportInput,
          ({ progress: pct }) => setPlatformExportState({ id: profileId, progress: pct })
        )
        triggerPlatformPackDownload(result.blob, result.filename)
        notifyExportComplete()
      } catch (err) {
        const profile = PLATFORM_PROFILES[profileId]
        const message =
          err instanceof Error ? err.message : `Unable to create ${profile.name} package.`
        setAssetError(message)
      } finally {
        setPlatformExportState({ id: null, progress: 0 })
      }
    },
    [
      platformZipItems,
      platformExportState.id,
      platformExportInput,
      trackExportStarted,
      notifyExportComplete,
    ]
  )

  const mp4Subtitle = useMemo(() => {
    if (exportExpired) return EXPORT_EXPIRED_MSG
    if (mp4DownloadReady) return reelReadiness.label
    if (mp4Compiling || reelReadiness.validating) {
      return renderStatusLabel || 'Preparing your video…'
    }
    if (reelReadiness.validationError) return reelReadiness.validationError
    if (renderError) return renderError
    if (canCompileMp4) return 'Ken Burns motion · captions · voiceover'
    if (hasMp4) return 'Available after render completes'
    return ASSET_UNAVAILABLE_MSG
  }, [
    exportExpired,
    mp4DownloadReady,
    reelReadiness.label,
    reelReadiness.validationError,
    mp4Compiling,
    reelReadiness.validating,
    renderStatusLabel,
    renderError,
    canCompileMp4,
    hasMp4,
  ])

  const creatorPackSubtitle = useMemo(() => {
    if (creatorPackState === 'preparing') {
      return creatorPackProgress > 0
        ? `Preparing… ${creatorPackProgress}%`
        : 'Preparing Creator Pack…'
    }
    if (creatorPackState === 'error') return 'Unable to create Creator Pack — tap to retry'
    if (creatorPackState === 'ready') return 'Creator Pack ready — tap to download again'
    if (hasAnyCreatorPackAsset) {
      return 'script.txt · script.docx · captions.txt · voice.mp3 · storyboard.zip · project.json'
    }
    if (creatorPackReadiness.missingRequired.length) {
      return `Missing: ${creatorPackReadiness.missingRequired.join(', ')}`
    }
    return ASSET_UNAVAILABLE_MSG
  }, [
    creatorPackState,
    creatorPackProgress,
    hasAnyCreatorPackAsset,
    creatorPackReadiness.missingRequired,
  ])

  const sceneImagesSubtitle = hasImages
    ? 'All storyboard stills as JPG'
    : ASSET_UNAVAILABLE_MSG

  const narrationSubtitle = hasNarration ? 'Synced voiceover audio track' : ASSET_UNAVAILABLE_MSG

  const scriptSubtitle = hasScript ? 'Full title, hook, and narration script' : ASSET_UNAVAILABLE_MSG

  const textExportSubtitle = hasTextContent
    ? 'Hook, script, captions — client-side only'
    : 'Generate content to export text'

  return {
    assetError,
    setAssetError,
    supplementaryOnly,
    includeTextExports,
    // Video
    showVideoGroup: !supplementaryOnly && showAdvancedMp4Export,
    showAdvancedMp4Export,
    mp4Enabled: showAdvancedMp4Export && mp4ButtonEnabled,
    mp4DownloadReady,
    mp4Compiling,
    downloadingMp4,
    reelReadinessValidating: reelReadiness.validating,
    mp4Subtitle,
    mp4Label: downloadingMp4
      ? 'Downloading…'
      : mp4Compiling || reelReadiness.validating
        ? 'Preparing…'
        : mp4DownloadReady
          ? 'Download MP4'
          : 'Compile MP4',
    handleDownloadMp4,
    // Scene images
    hasImages,
    downloadingImagesFormat,
    sceneImagesSubtitle,
    handleDownloadImages,
    sceneImageDimensions: SCENE_IMAGE_EXPORT_DIMENSIONS,
    // Creator pack
    hasAnyCreatorPackAsset,
    creatorPackReadiness,
    creatorPackState,
    creatorPackProgress,
    creatorPackSubtitle,
    creatorPackModalOpen,
    setCreatorPackModalOpen,
    handleExportCreatorPack,
    // Platform ZIPs
    platformZipItems,
    platformExportState,
    handlePlatformZip,
    // Script / narration (full mode)
    hasScript,
    hasNarration,
    scriptSubtitle,
    narrationSubtitle,
    downloadingMp3,
    handleDownloadTxt,
    handleDownloadDoc,
    handleDownloadMp3,
    hasThumbnail,
    hasCaptions,
    downloadingThumbnail,
    downloadingCaptions,
    handleDownloadThumbnail,
    handleDownloadCaptions,
    // Text exports (export hub)
    hasTextContent,
    textExportSubtitle,
    textBusy,
    handleCopyAll,
    handleExportHubTxt,
    handleExportHubDoc,
  }
}
