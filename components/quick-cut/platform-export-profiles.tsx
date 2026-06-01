'use client'

import { useMemo } from 'react'
import { Check, Circle, Loader2, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsage } from '@/lib/usage'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import { isQuickCutMp4DownloadReady } from '@/lib/quick-cut/asset-availability'
import { useReelDownloadReadiness } from '@/lib/export/reel-download-readiness.client'
import {
  PLATFORM_EXPORT_IDS,
  PLATFORM_PROFILES,
  platformHasAnyExportableAsset,
  platformProfileCanExport,
  resolvePlatformAssetStatuses,
  type PlatformAssetState,
  type PlatformExportInput,
} from '@/lib/quick-cut/platform-export-profiles'
import { deriveThumbnailConcept } from '@/lib/workspace/output-workspace-utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

function assetStateLabel(state: PlatformAssetState): string {
  switch (state) {
    case 'ready':
      return 'Ready'
    case 'preparing':
      return 'Preparing…'
    default:
      return 'Missing'
  }
}

function AssetRow({ label, state }: { label: string; state: PlatformAssetState }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[10px] text-luxe/70">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase font-semibold shrink-0',
          state === 'ready' && 'text-emerald-300/90',
          state === 'preparing' && 'text-amber-200/85',
          state === 'missing' && 'text-luxe/30'
        )}
      >
        {state === 'ready' ? (
          <>
            <Check className="w-2.5 h-2.5" aria-hidden />
            {assetStateLabel(state)}
          </>
        ) : state === 'preparing' ? (
          <>
            <Loader2 className="w-2.5 h-2.5 animate-spin" aria-hidden />
            {assetStateLabel(state)}
          </>
        ) : (
          <>
            <Circle className="w-2 h-2" aria-hidden />
            {assetStateLabel(state)}
          </>
        )}
      </span>
    </div>
  )
}

function PlatformExportCard({
  profileId,
  input,
}: {
  profileId: (typeof PLATFORM_EXPORT_IDS)[number]
  input: PlatformExportInput
}) {
  const profile = PLATFORM_PROFILES[profileId]
  const assetStatuses = useMemo(
    () => resolvePlatformAssetStatuses(profileId, input),
    [profileId, input]
  )
  const canExportZip = useMemo(
    () => platformProfileCanExport(profileId, input),
    [profileId, input]
  )
  const readyCount = assetStatuses.filter((asset) => asset.state === 'ready').length
  const partialExport = canExportZip && readyCount < assetStatuses.length

  return (
    <article className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-3 space-y-2.5 flex flex-col min-w-0">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] tracking-[0.18em] uppercase text-gold-300/85">{profile.name}</h3>
        <Share2 className="w-3 h-3 text-luxe/25 shrink-0" aria-hidden />
      </div>

      <div className="divide-y divide-white/[0.04] flex-1">
        {assetStatuses.map((asset) => (
          <AssetRow key={asset.filename} label={asset.label} state={asset.state} />
        ))}
      </div>

      {partialExport ? (
        <p className="text-[10px] text-luxe/40 leading-snug">
          Partial ZIP — includes {readyCount} of {assetStatuses.length} ready assets.
        </p>
      ) : canExportZip ? (
        <p className="text-[10px] text-emerald-300/70 leading-snug">
          Ready — download from menu above.
        </p>
      ) : (
        <p className="text-[10px] text-luxe/35 leading-snug italic">
          Waiting on assets — check status above.
        </p>
      )}
    </article>
  )
}

export function QuickCutPlatformExportProfiles({ className }: { className?: string }) {
  const { isUnlimited } = useUsage()

  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const payoff = useQuickCutGenerationStore((s) => s.payoff)
  const cta = useQuickCutGenerationStore((s) => s.cta)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const niche = useQuickCutGenerationStore((s) => s.niche)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const researchReport = useQuickCutGenerationStore((s) => s.researchReport)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const visualStyle = useQuickCutGenerationStore((s) => s.visualStyle)
  const thumbnailImageUrl = useQuickCutGenerationStore((s) => s.thumbnailImageUrl)

  const canCompileMp4 = useMemo(
    () => quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled),
    [scenes, voiceUrl, videoRenderEnabled]
  )

  const reelReadiness = useReelDownloadReadiness({
    projectId: savedProjectId,
    videoUrl,
    isRendering: isRenderingVideo,
    renderPollUrl,
    exportExpired,
  })

  const mp4DownloadReady = isQuickCutMp4DownloadReady({
    videoUrl,
    videoRenderEnabled,
    exportExpired,
    isRenderingVideo,
    renderPollUrl,
    renderError,
    downloadValidated: videoUrl?.trim()
      ? reelReadiness.ready || !savedProjectId
      : undefined,
  })

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

  const exportInput = useMemo<PlatformExportInput>(
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

  const hasAnyExport = platformHasAnyExportableAsset(exportInput)

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-3',
        className
      )}
    >
      <div>
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
          <Share2 className="w-3 h-3" />
          Export Profiles
        </div>
        <p className="text-[11px] text-luxe/45 mt-1">
          Platform readiness — download ZIPs from the menu above.
        </p>
      </div>

      <div className="grid grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 gap-2">
        {PLATFORM_EXPORT_IDS.map((profileId) => (
          <PlatformExportCard key={profileId} profileId={profileId} input={exportInput} />
        ))}
      </div>

      {!hasAnyExport ? (
        <p className="text-[11px] text-luxe/40 italic">
          Generate title, script, or video to unlock platform exports.
        </p>
      ) : null}
    </div>
  )
}
