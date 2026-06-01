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
import { trackEvent } from '@/lib/analytics/track-event'
import { requestExitFeedback } from '@/lib/creator/exit-feedback'
import { trackClientUsage } from '@/lib/usage/plan-limit-toast.client'
import { useReelDownloadReadiness } from '@/lib/export/reel-download-readiness.client'
import { useReelExportAutoResume } from '@/lib/export/use-reel-export-auto-resume.client'
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
  const { isUnlimited } = useUsage()

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
  const [downloadingImagesFormat, setDownloadingImagesFormat] =
    useState<SceneImageExportSize | null>(null)
  const [textBusy, setTextBusy] = useState<'copy' | 'txt' | 'doc' | null>(null)
  const [assetError, setAssetError] = useState<string | null>(null)
  const exportTrackedRef = useRef(false)
  type CreatorPackState = 'idle' | 'preparing' | 'ready' | 'error'
  const [creatorPackState, setCreatorPackState] = useState<CreatorPackState>('idle')
  const [creatorPackProgress, setCreatorPackProgress] = useState(0)
  const [creatorPackResult, setCreatorPackResult] = useState<CreatorPackExportResult | null>(null)
  const [platformExportState, setPlatformExportState] = useState<{
    id: PlatformExportId | null
    progress: number
  }>({ id: null, progress: 0 })

  const exportBase = slugifyExportBase(title || 'mugtee-reel', 'mugtee-reel')
  const mp4Name = `${exportBase}.mp4`
  const mp3Name = `${exportBase}-narration.mp3`

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
    () => quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled),
    [scenes, voiceUrl, videoRenderEnabled]
  )

  const mp4Export = resolveMp4ExportUiState({
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
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

  const hasAnyCreatorPackAsset =
    exportAssets.script || exportAssets.images || exportAssets.narration

  useReelExportAutoResume({ canCompileMp4 })

  useEffect(() => {
    void syncVideoRenderConfig()
  }, [syncVideoRenderConfig])

  const trackExportStarted = useCallback(
    (asset: string) => {
      if (exportTrackedRef.current) return
      exportTrackedRef.current = true
      trackEvent(AnalyticsEvents.EXPORT_STARTED, {
        projectId: savedProjectId,
        metadata: { asset },
      })
    },
    [savedProjectId]
  )

  const guardExport = useCallback(async () => trackClientUsage('exports'), [])

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
        await retryVideoRender()
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

  const handleCopyAll = useCallback(async () => {
    if (!hasTextContent || textBusy !== null) return
    setTextBusy('copy')
    const ok = await copyTextToClipboard(exportText)
    toast[ok ? 'success' : 'error'](ok ? 'All content copied' : 'Copy failed')
    if (ok) recordTextExport('copy')
    setTextBusy(null)
  }, [exportText, hasTextContent, textBusy, recordTextExport])

  const handleExportHubTxt = useCallback(() => {
    if (!hasTextContent || textBusy !== null) return
    setTextBusy('txt')
    const ok = downloadClientBlob(exportText, `${textBaseName}.txt`, 'text/plain')
    toast[ok ? 'success' : 'error'](ok ? 'TXT downloaded' : 'Download failed')
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

    setCreatorPackState('preparing')
    setCreatorPackProgress(0)
    setCreatorPackResult(null)
    setAssetError(null)
    if (!(await guardExport())) {
      setCreatorPackState('idle')
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
    trackExportStarted,
    guardExport,
    reelTimeline,
    creatorPackState,
    creatorPackResult,
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
    if (hasAnyCreatorPackAsset) {
      return 'ZIP bundle — script, storyboard, images, narration & metadata'
    }
    return ASSET_UNAVAILABLE_MSG
  }, [creatorPackState, creatorPackProgress, hasAnyCreatorPackAsset])

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
    showVideoGroup: !supplementaryOnly,
    mp4Enabled: mp4ButtonEnabled,
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
    creatorPackState,
    creatorPackSubtitle,
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
    // Text exports (export hub)
    hasTextContent,
    textExportSubtitle,
    textBusy,
    handleCopyAll,
    handleExportHubTxt,
    handleExportHubDoc,
  }
}
