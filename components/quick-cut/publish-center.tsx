'use client'

import {
  Check,
  Circle,
  Loader2,
  Minus,
  Package,
  Radio,
  RefreshCw,
  Share2,
  Sparkles,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { resolvePublishReadiness } from '@/lib/quick-cut/asset-availability'
import { REEL_EXPORT_DISABLED_USER_MSG } from '@/lib/video/reel-render-errors'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { BufferQueueButton } from '@/components/integrations/buffer-queue-button'
import { useStore } from '@/lib/store'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function ReadinessRow({
  label,
  ready,
  status,
}: {
  label: string
  ready: boolean
  status?: 'ready' | 'missing' | 'unavailable' | 'pending'
}) {
  const resolved = status ?? (ready ? 'ready' : 'missing')
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] text-luxe/75">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase font-semibold',
          resolved === 'ready' && 'text-emerald-300/90',
          resolved === 'missing' && 'text-luxe/35',
          resolved === 'unavailable' && 'text-amber-200/70',
          resolved === 'pending' && 'text-gold-300/75'
        )}
      >
        {resolved === 'ready' ? (
          <>
            <Check className="w-3 h-3" aria-hidden />
            Ready
          </>
        ) : resolved === 'pending' ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
            In progress
          </>
        ) : resolved === 'unavailable' ? (
          <>
            <Minus className="w-3 h-3" aria-hidden />
            Server off
          </>
        ) : (
          <>
            <Circle className="w-2.5 h-2.5" aria-hidden />
            Missing
          </>
        )}
      </span>
    </div>
  )
}

function SectionCard({
  icon,
  title,
  children,
  className,
  embedded,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  className?: string
  embedded?: boolean
}) {
  if (embedded) {
    return <div className={cn('space-y-2', className)}>{children}</div>
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 space-y-2',
        className
      )}
    >
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
        {icon}
        {title}
      </div>
      {children}
    </div>
  )
}

function PlatformBlock({
  name,
  items,
}: {
  name: string
  items: { label: string; ready: boolean }[]
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5 space-y-0.5">
      <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70 mb-1.5">{name}</p>
      {items.map((item) => (
        <ReadinessRow key={item.label} label={item.label} ready={item.ready} />
      ))}
    </div>
  )
}

const EXPORT_LABELS: Record<keyof ReturnType<typeof resolvePublishReadiness>['exports'], string> = {
  txt: 'TXT',
  docx: 'DOCX',
  jpg: 'JPG',
  mp3: 'MP3',
  mp4: 'MP4',
  creatorPack: 'Creator Pack',
}

function usePublishReadinessState() {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)

  const readiness = resolvePublishReadiness({
    title,
    hook,
    script,
    scriptBeats,
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    isGenerating,
    exportExpired,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
  })

  return {
    title,
    hook,
    script,
    videoUrl,
    videoRenderEnabled,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
    readiness,
  }
}

export function ExportSummaryGrid({
  className,
  embedded,
}: {
  className?: string
  embedded?: boolean
}) {
  const { readiness, videoRenderEnabled, exportPackageReady } = usePublishReadinessState()

  const grid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {(Object.entries(readiness.exports) as [keyof typeof readiness.exports, boolean][]).map(
        ([key, ready]) => {
          const mp4Unavailable = key === 'mp4' && !videoRenderEnabled && !ready
          const mp4PackageReady = key === 'mp4' && !videoRenderEnabled && exportPackageReady
          return (
          <div
            key={key}
            className={cn(
              'rounded-lg border px-3 py-2 flex items-center justify-between gap-2',
              ready || mp4PackageReady
                ? 'border-gold-500/25 bg-gold-500/[0.06]'
                : mp4Unavailable
                  ? 'border-amber-500/20 bg-amber-500/[0.04]'
                  : 'border-white/[0.06] bg-black/40'
            )}
          >
            <span className="text-[10px] tracking-[0.14em] uppercase text-luxe/70">
              {EXPORT_LABELS[key]}
            </span>
            {ready ? (
              <Check className="w-3 h-3 text-emerald-300/90 shrink-0" aria-label="Available" />
            ) : mp4Unavailable ? (
              <Minus className="w-3 h-3 text-amber-200/70 shrink-0" aria-label="Server unavailable" />
            ) : mp4PackageReady ? (
              <Package className="w-3 h-3 text-gold-300/80 shrink-0" aria-label="Package export" />
            ) : (
              <Circle className="w-2.5 h-2.5 text-luxe/30 shrink-0" aria-label="Missing" />
            )}
          </div>
        )}
      )}
    </div>
  )

  if (embedded) {
    return (
      <div className={cn('space-y-2', className)} data-recommend-target="export-summary">
        <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">Export summary</p>
        {grid}
      </div>
    )
  }

  return (
    <SectionCard icon={<Package className="w-3 h-3" />} title="Export Summary" className={className}>
      {grid}
    </SectionCard>
  )
}

export function PublishCenterIntro({
  className,
  embedded,
}: {
  className?: string
  embedded?: boolean
}) {
  const { readiness, renderError, videoRenderEnabled, exportPackageReady } =
    usePublishReadinessState()

  const publishHint = (() => {
    if (readiness.projectReadyForPublishing) {
      return "Everything's lined up — export, queue, and ship when you're ready."
    }
    if (!readiness.project.voiceGenerated) {
      return 'Strong draft — add voiceover before exporting.'
    }
    if (!videoRenderEnabled) {
      return exportPackageReady
        ? 'MP4 compile is off on this server — download your storyboard package and preview below.'
        : REEL_EXPORT_DISABLED_USER_MSG
    }
    if (!readiness.project.videoRendered) {
      return renderError || "Strong draft — compile your MP4, then we'll prep platform assets."
    }
    return "I'll walk you through what's missing before you hit publish."
  })()

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          embedded
            ? 'rounded-lg border border-gold-500/15 bg-gold-500/[0.04] px-3 py-2.5 flex items-start gap-3'
            : 'rounded-xl border border-gold-500/15 bg-gold-500/[0.04] px-4 py-3 flex items-start gap-3'
        )}
      >
        <MugteeOrb state="idle" size={28} useLogo className="shrink-0 mt-0.5" />
        <div>
          <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/75 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Mugtee · Publish
          </p>
          <p className="text-xs text-luxe/70 mt-1 leading-relaxed italic">{publishHint}</p>
        </div>
      </div>

      {readiness.projectReadyForPublishing ? (
        <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[0.08] px-4 py-3 flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/20 shrink-0">
            <Check className="w-4 h-4 text-emerald-300" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-medium text-emerald-100">Project Ready For Publishing</p>
            <p className="text-[11px] text-emerald-200/60 mt-0.5">
              All required assets are available for export and platform prep.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function PublishReadinessSection({
  className,
  embedded,
}: {
  className?: string
  embedded?: boolean
}) {
  const {
    readiness,
    videoUrl,
    videoRenderEnabled,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
  } = usePublishReadinessState()
  const retryVideoRender = useQuickCutGenerationStore((s) => s.retryVideoRender)
  const resumeRenderPoll = useQuickCutGenerationStore((s) => s.resumeRenderPoll)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)

  const visualsReady =
    readiness.project.storyboardGenerated && readiness.project.sceneImagesGenerated

  const projectItems: {
    label: string
    ready: boolean
    status?: 'ready' | 'missing' | 'unavailable' | 'pending'
  }[] = [
    { label: 'Title Generated', ready: readiness.project.titleGenerated },
    { label: 'Hook Generated', ready: readiness.project.hookGenerated },
    { label: 'Script Generated', ready: readiness.project.scriptGenerated },
    { label: 'Visuals Ready', ready: visualsReady },
    { label: 'Voice Generated', ready: readiness.project.voiceGenerated },
    {
      label: 'Video Rendered',
      ready: readiness.project.videoRendered || (exportPackageReady && !videoRenderEnabled),
      status: !videoRenderEnabled
        ? exportPackageReady
          ? 'ready'
          : 'unavailable'
        : isRenderingVideo
          ? 'pending'
          : undefined,
    },
    { label: 'Creator Pack Available', ready: readiness.project.creatorPackAvailable },
  ]

  const goToExportTab = () => {
    setActiveStageTab(videoUrl?.trim() ? 'complete' : 'render', true)
  }

  const handleCompileMp4 = () => {
    goToExportTab()
    if (!readiness.project.videoRendered && !isRenderingVideo) {
      void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())
    }
  }

  const content = (
    <Tabs defaultValue="project" className="space-y-3">
      <TabsList className="grid w-full grid-cols-2 h-9 bg-white/[0.03] border border-white/[0.06] p-0.5 gap-0.5">
        <TabsTrigger
          value="project"
          className="text-[10px] tracking-[0.14em] uppercase font-semibold rounded-md data-[state=active]:bg-gold-500/20 data-[state=active]:text-gold-100 text-luxe/55"
        >
          Project
        </TabsTrigger>
        <TabsTrigger
          value="platforms"
          className="text-[10px] tracking-[0.14em] uppercase font-semibold rounded-md data-[state=active]:bg-gold-500/20 data-[state=active]:text-gold-100 text-luxe/55"
        >
          Platforms
        </TabsTrigger>
      </TabsList>

      <TabsContent value="project" className="mt-0 space-y-0">
        <div className="divide-y divide-white/[0.06]">
          {projectItems.map((item) => (
            <div key={item.label}>
              <ReadinessRow label={item.label} ready={item.ready} status={item.status} />
              {item.label === 'Video Rendered' &&
              !item.ready &&
              videoRenderEnabled &&
              item.status !== 'unavailable' ? (
                <div className="pb-2 pl-0 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCompileMp4()}
                    disabled={isRenderingVideo}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg bg-gold-gradient px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-black shadow-gold-glow hover:opacity-90 disabled:opacity-50"
                  >
                    {isRenderingVideo ? (
                      <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                    ) : (
                      <Video className="w-3 h-3" aria-hidden />
                    )}
                    {isRenderingVideo ? 'Compiling…' : 'Compile MP4'}
                  </button>
                  <button
                    type="button"
                    onClick={goToExportTab}
                    className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-gold-500/30 bg-gold-500/[0.06] px-3 py-1.5 text-[10px] font-semibold tracking-[0.12em] uppercase text-gold-200 hover:bg-gold-500/10"
                  >
                    Open export
                  </button>
                  {renderError ? (
                    <button
                      type="button"
                      onClick={() =>
                        void (renderPollUrl ? resumeRenderPoll() : retryVideoRender())
                      }
                      disabled={isRenderingVideo}
                      className="inline-flex items-center gap-1 text-[10px] tracking-[0.14em] uppercase text-gold-300/70 hover:text-gold-200 disabled:opacity-50"
                    >
                      <RefreshCw className="w-3 h-3" aria-hidden />
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </TabsContent>

      <TabsContent value="platforms" className="mt-0 space-y-2">
        <ReadinessRow
          label="MP4 video (all platforms)"
          ready={readiness.project.videoRendered}
        />
        {!readiness.project.videoRendered ? (
          <p className="text-[10px] text-luxe/45 -mt-1">
            One compile unlocks YouTube, Instagram, and TikTok video delivery.
          </p>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-3">
          <PlatformBlock
            name="YouTube"
            items={[
              { label: 'Title Ready', ready: readiness.platforms.youtube.titleReady },
              {
                label: 'Thumbnail Ready',
                ready: readiness.platforms.youtube.thumbnailReady,
              },
            ]}
          />
          <PlatformBlock
            name="Instagram"
            items={[
              {
                label: 'Caption Ready',
                ready: readiness.platforms.instagram.captionReady,
              },
            ]}
          />
          <PlatformBlock
            name="TikTok"
            items={[
              { label: 'Hook Ready', ready: readiness.platforms.tiktok.hookReady },
            ]}
          />
        </div>
      </TabsContent>
    </Tabs>
  )

  if (embedded) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70 flex items-center gap-1">
          <Radio className="w-3 h-3" />
          Publish readiness
        </p>
        {content}
      </div>
    )
  }

  return (
    <SectionCard icon={<Radio className="w-3 h-3" />} title="Publish Readiness" className={className}>
      {content}
    </SectionCard>
  )
}

export function BufferPublishingSection({
  className,
  embedded,
}: {
  className?: string
  embedded?: boolean
}) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)
  const { content } = useStore()
  const { readiness } = usePublishReadinessState()

  const bufferItem =
    savedProjectId != null
      ? content.find((c) => c.id === savedProjectId) ||
        ({
          id: savedProjectId,
          title: title || 'Quick Cut export',
          description: [hook, script].filter(Boolean).join('\n\n') || null,
          platform: 'instagram' as const,
          media_url: videoUrl || null,
          scheduled_at: null,
          status: 'scheduled',
        } as const)
      : null

  if (!bufferItem || !readiness.project.scriptGenerated) return null

  const inner = (
    <>
      <p className="text-[11px] text-luxe/70 leading-relaxed">
        Queue this project&apos;s caption and media to Buffer for cross-platform scheduling.
      </p>
      <BufferQueueButton
        item={{
          id: savedProjectId || bufferItem.id,
          title: title || bufferItem.title,
          description: [hook, script].filter(Boolean).join('\n\n') || bufferItem.description,
          platform: bufferItem.platform || 'instagram',
          media_url: videoUrl || bufferItem.media_url,
          scheduled_at: bufferItem.scheduled_at,
          status: bufferItem.status,
        }}
        variant="button"
      />
    </>
  )

  if (embedded) {
    return (
      <div className={cn('space-y-2', className)}>
        <p className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70 flex items-center gap-1">
          <Share2 className="w-3 h-3" />
          Buffer publishing
        </p>
        {inner}
      </div>
    )
  }

  return (
    <SectionCard icon={<Share2 className="w-3 h-3" />} title="Buffer Publishing" className={className}>
      {inner}
    </SectionCard>
  )
}

/** @deprecated Use ExportTabbedPanel — kept for legacy embeds */
export function PublishCenter({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      <PublishCenterIntro />
      <PublishReadinessSection />
      <ExportSummaryGrid />
      <BufferPublishingSection />
    </div>
  )
}
