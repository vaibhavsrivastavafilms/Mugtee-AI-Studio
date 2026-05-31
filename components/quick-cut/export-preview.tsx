'use client'

import Link from 'next/link'
import { Clapperboard, FolderOpen, Loader2, Lock, RefreshCw, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { isDirectorCutLocked } from '@/lib/features/director-cut-lock'
import { directorWorkspaceHref, projectContinuityHref } from '@/lib/create/routes'
import {
  LockedDirectorCutTrigger,
  lockedDirectorCutTriggerClassName,
} from '@/components/mugtee-portal/locked-director-cut-trigger'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { relSavedLabel } from '@/stores/cinematic-project'
import { QuickCutSaveProjectButton } from '@/components/quick-cut/quick-cut-save-project-button'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { StoryboardGenerator } from '@/components/quick-cut/storyboard-generator'
import { formatMissingKeysHint } from '@/lib/cinematic/quick-cut/pipeline-status'
import { quickCutCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'
import { QuickCutDownloadPanel } from '@/components/quick-cut/download-panel'

export function ExportPreview({
  onRegenerate,
  actionsOnly = false,
  className,
}: {
  onRegenerate?: () => void
  /** Export actions only — player and stage panel live elsewhere */
  actionsOnly?: boolean
  className?: string
}) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const renderStatusLabel = useQuickCutGenerationStore((s) => s.renderStatusLabel)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const mock = useQuickCutGenerationStore((s) => s.mock)
  const missingKeys = useQuickCutGenerationStore((s) => s.missingKeys)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const regenerateHook = useQuickCutGenerationStore((s) => s.regenerateHook)
  const isRegeneratingHook = useQuickCutGenerationStore((s) => s.isRegeneratingHook)
  const previousHooks = useQuickCutGenerationStore((s) => s.previousHooks)

  const mp4Compiling =
    isRenderingVideo ||
    (videoRenderEnabled && Boolean(renderPollUrl) && !videoUrl && !renderError)
  const canCompileMp4 = quickCutCanCompileMp4(scenes, voiceUrl, videoRenderEnabled)
  const hasStoryboardStills = !isGenerating && scenes.length > 0
  const hasNarration = Boolean(voiceUrl?.trim())
  const canPlayReelPreview =
    hasStoryboardStills && (hasNarration || scenes.some((s) => s.imageUrl?.trim()))
  const storyboardPackageOnly =
    !videoRenderEnabled && exportPackageReady && !isGenerating && !canPlayReelPreview

  const keysHint = formatMissingKeysHint(missingKeys)

  return (
    <div className={cn('space-y-6', className)}>
      <div className="text-center space-y-2">
        <p className="text-[10px] tracking-[0.28em] uppercase text-gold-300/80">Production complete</p>
        <h3 className="font-display text-2xl text-luxe">
          {videoUrl
            ? 'Your MP4 is ready'
            : storyboardPackageOnly
              ? 'Storyboard export ready'
              : canPlayReelPreview
                ? 'Preview ready to play'
                : 'Preview assembled'}
        </h3>
        {isGenerating ? null : mock && keysHint ? (
          <p className="text-xs text-luxe/45">{keysHint}</p>
        ) : videoUrl ? (
          <p className="text-xs text-gold-300/60">Download script, images, narration, and MP4 below.</p>
        ) : storyboardPackageOnly ? (
          <p className="text-xs text-gold-300/60">Download your storyboard assets below.</p>
        ) : canPlayReelPreview && hasNarration && !videoUrl ? (
          <p className="text-xs text-gold-300/60">
            {canCompileMp4
              ? 'Press play for synced narration — compile MP4 in Download when ready.'
              : 'Press play for synced narration with scene crossfades.'}
          </p>
        ) : canPlayReelPreview && !videoUrl ? (
          <p className="text-xs text-gold-300/60">
            Press play to preview scene crossfades{canCompileMp4 ? ' — compile MP4 in Download.' : '.'}
          </p>
        ) : hasStoryboardStills && !videoUrl ? (
          <p className="text-xs text-gold-300/60">
            Download scene stills as JPG — MP4 may still be compiling.
          </p>
        ) : renderError ? (
          <div className="space-y-1" role="alert">
            <p className="text-xs text-amber-200/80">{renderError}</p>
          </div>
        ) : mp4Compiling ? (
          <p className="text-xs text-luxe/50">
            {renderStatusLabel
              ? `${renderStatusLabel} — compiling all slides into one MP4.`
              : 'Compiling your synced MP4 — scene preview above until ready.'}
          </p>
        ) : canCompileMp4 && !videoUrl ? (
          <p className="text-xs text-gold-300/60">
            All storyboard slides are ready — compile them into one synced MP4 in Download.
          </p>
        ) : null}
      </div>

      {!actionsOnly ? (
        <>
          <ReelAssemblyPlayer
            scenes={scenes}
            title={title}
            hook={hook}
            script={script}
            videoUrl={videoUrl}
            voiceUrl={voiceUrl}
            mp4Compiling={mp4Compiling}
            generationStep="complete"
            autoPlayPreview={canPlayReelPreview && !videoUrl && !mp4Compiling}
          />

          {scenes.length > 0 && !isGenerating ? (
            <StoryboardGenerator scenes={scenes} interactive exportTitle={title} allowDownload />
          ) : null}

          {hook && !isGenerating ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => void regenerateHook()}
                disabled={isRegeneratingHook}
                className="inline-flex min-h-[36px] items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-luxe/65 text-[11px] tracking-[0.14em] uppercase hover:text-luxe hover:border-white/20 transition-colors disabled:opacity-50"
              >
                {isRegeneratingHook ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Regenerate hook
                {previousHooks.length > 0 ? (
                  <span className="text-luxe/35 normal-case tracking-normal">
                    · {previousHooks.length} prior
                  </span>
                ) : null}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      <QuickCutDownloadPanel />

      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-3">
        <QuickCutSaveProjectButton variant="prominent" showViewLink={false} />

        {videoUrl ? (
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                void navigator.share({ title, url: videoUrl })
              } else {
                void navigator.clipboard.writeText(videoUrl)
              }
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 text-[12px] tracking-[0.12em] uppercase hover:bg-gold-500/10 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Publish
          </button>
        ) : null}

        {isDirectorCutLocked ? (
          <LockedDirectorCutTrigger className={lockedDirectorCutTriggerClassName()}>
            <Lock className="w-4 h-4" />
            <Clapperboard className="w-4 h-4" /> Open Director Mode
          </LockedDirectorCutTrigger>
        ) : (
          <Link
            href={directorWorkspaceHref()}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-gold-500/30 bg-gold-500/[0.06] text-gold-200 text-[12px] tracking-[0.12em] uppercase hover:bg-gold-500/10 transition-colors"
          >
            <Clapperboard className="w-4 h-4" /> Open Director Mode
          </Link>
        )}

        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-luxe/70 text-[12px] tracking-[0.12em] uppercase hover:text-luxe transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Regenerate
          </button>
        ) : null}
      </div>

      <QuickCutSaveProjectLinks />
    </div>
  )
}

function QuickCutSaveProjectLinks() {
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const lastSavedAt = useQuickCutGenerationStore((s) => s.lastSavedAt)
  const saveState = useQuickCutGenerationStore((s) => s.saveState)

  if (!savedProjectId) return null

  return (
    <div className="flex flex-col items-center gap-2 pt-1">
      {lastSavedAt && saveState === 'idle' ? (
        <p className="text-[10px] tracking-[0.14em] uppercase text-gold-300/55">
          {relSavedLabel(lastSavedAt)}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] tracking-[0.12em] uppercase">
        <Link
          href={projectContinuityHref(savedProjectId)}
          className="inline-flex items-center gap-1.5 text-gold-200/80 hover:text-gold-100 transition-colors"
        >
          <FolderOpen className="w-3.5 h-3.5" aria-hidden />
          View project
        </Link>
        <span className="text-luxe/25" aria-hidden>
          ·
        </span>
        <Link
          href="/projects"
          className="text-gold-200/65 hover:text-gold-100 transition-colors"
        >
          All projects
        </Link>
      </div>
    </div>
  )
}
