'use client'

import { useCallback, useMemo, useState } from 'react'
import { Check, Circle, Download, Loader2, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUsage } from '@/lib/usage'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import {
  buildPlatformPackZip,
  triggerPlatformPackDownload,
} from '@/lib/quick-cut/platform-pack-export.client'
import {
  PLATFORM_EXPORT_IDS,
  PLATFORM_PROFILES,
  platformHasAnyExportableAsset,
  resolvePlatformAssetStatuses,
  type PlatformExportId,
  type PlatformExportInput,
} from '@/lib/quick-cut/platform-export-profiles'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

const cardButtonClass =
  'inline-flex min-h-[32px] w-full items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-[0.12em] uppercase transition-opacity disabled:opacity-50 disabled:cursor-not-allowed bg-gold-gradient text-black shadow-gold-glow hover:opacity-90'

function AssetRow({ label, available }: { label: string; available: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[10px] text-luxe/70">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[9px] tracking-[0.1em] uppercase font-semibold',
          available ? 'text-emerald-300/90' : 'text-luxe/30'
        )}
      >
        {available ? (
          <>
            <Check className="w-2.5 h-2.5" aria-hidden />
            Ready
          </>
        ) : (
          <>
            <Circle className="w-2 h-2" aria-hidden />
            Missing
          </>
        )}
      </span>
    </div>
  )
}

function PlatformExportCard({
  profileId,
  input,
  onError,
}: {
  profileId: PlatformExportId
  input: PlatformExportInput
  onError: (message: string | null) => void
}) {
  const profile = PLATFORM_PROFILES[profileId]
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const assetStatuses = useMemo(
    () => resolvePlatformAssetStatuses(profileId, input),
    [profileId, input]
  )
  const hasAnyAsset = assetStatuses.some((asset) => asset.available)

  type ExportState = 'idle' | 'preparing' | 'error'
  const [exportState, setExportState] = useState<ExportState>('idle')
  const [progress, setProgress] = useState(0)

  const handleExport = useCallback(async () => {
    if (!hasAnyAsset || exportState === 'preparing') return
    setExportState('preparing')
    setProgress(0)
    onError(null)

    trackEvent(AnalyticsEvents.EXPORT_STARTED, {
      projectId: savedProjectId,
      metadata: { asset: `platform_${profileId}` },
    })

    try {
      const result = await buildPlatformPackZip(profileId, input, ({ progress: pct }) =>
        setProgress(pct)
      )
      triggerPlatformPackDownload(result.blob, result.filename)
      setExportState('idle')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : `Unable to create ${profile.name} package.`
      onError(message)
      setExportState('error')
    }
  }, [hasAnyAsset, exportState, profileId, profile.name, input, onError, savedProjectId])

  return (
    <article className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-3 space-y-2.5 flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[10px] tracking-[0.18em] uppercase text-gold-300/85">{profile.name}</h3>
        <Share2 className="w-3 h-3 text-luxe/25 shrink-0" aria-hidden />
      </div>

      <div className="divide-y divide-white/[0.04] flex-1">
        {assetStatuses.map((asset) => (
          <AssetRow key={asset.filename} label={asset.label} available={asset.available} />
        ))}
      </div>

      {exportState === 'preparing' ? (
        <button type="button" disabled className={cn(cardButtonClass, 'opacity-60')}>
          <Loader2 className="w-3 h-3 animate-spin" />
          Preparing… {progress > 0 ? `${progress}%` : ''}
        </button>
      ) : exportState === 'error' ? (
        <button type="button" onClick={() => void handleExport()} className={cardButtonClass}>
          Retry Export
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={!hasAnyAsset}
          className={cn(cardButtonClass, !hasAnyAsset && 'opacity-40 cursor-not-allowed')}
        >
          <Download className="w-3 h-3" />
          Export ZIP
        </button>
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

  const [assetError, setAssetError] = useState<string | null>(null)

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
          Platform-ready ZIP bundles — no direct publishing.
        </p>
      </div>

      {assetError ? (
        <p className="text-[11px] text-amber-200/80" role="alert">
          {assetError}
        </p>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        {PLATFORM_EXPORT_IDS.map((profileId) => (
          <PlatformExportCard
            key={profileId}
            profileId={profileId}
            input={exportInput}
            onError={setAssetError}
          />
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
