'use client'

import { Check, Circle, Package, Radio, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { resolvePublishReadiness } from '@/lib/quick-cut/asset-availability'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

function ReadinessRow({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-[11px] text-luxe/75">{label}</span>
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] tracking-[0.12em] uppercase font-semibold',
          ready ? 'text-emerald-300/90' : 'text-luxe/35'
        )}
      >
        {ready ? (
          <>
            <Check className="w-3 h-3" aria-hidden />
            Ready
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
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
  className?: string
}) {
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

export function PublishCenter({ className }: { className?: string }) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scriptBeats = useQuickCutGenerationStore((s) => s.scriptBeats)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
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
    isRenderingVideo,
    renderPollUrl,
    renderError,
  })

  const projectItems: { label: string; ready: boolean }[] = [
    { label: 'Title Generated', ready: readiness.project.titleGenerated },
    { label: 'Hook Generated', ready: readiness.project.hookGenerated },
    { label: 'Script Generated', ready: readiness.project.scriptGenerated },
    { label: 'Storyboard Generated', ready: readiness.project.storyboardGenerated },
    { label: 'Scene Images Generated', ready: readiness.project.sceneImagesGenerated },
    { label: 'Voice Generated', ready: readiness.project.voiceGenerated },
    { label: 'Video Rendered', ready: readiness.project.videoRendered },
    { label: 'Creator Pack Available', ready: readiness.project.creatorPackAvailable },
  ]

  return (
    <div className={cn('space-y-3', className)}>
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

      <SectionCard icon={<Radio className="w-3 h-3" />} title="Project Readiness">
        <div className="divide-y divide-white/[0.06]">
          {projectItems.map((item) => (
            <ReadinessRow key={item.label} label={item.label} ready={item.ready} />
          ))}
        </div>
      </SectionCard>

      <SectionCard icon={<Share2 className="w-3 h-3" />} title="Platform Readiness">
        <div className="grid gap-2 sm:grid-cols-3">
          <PlatformBlock
            name="YouTube"
            items={[
              { label: 'Title Ready', ready: readiness.platforms.youtube.titleReady },
              { label: 'Thumbnail Ready', ready: readiness.platforms.youtube.thumbnailReady },
              { label: 'Video Ready', ready: readiness.platforms.youtube.videoReady },
            ]}
          />
          <PlatformBlock
            name="Instagram"
            items={[
              { label: 'Caption Ready', ready: readiness.platforms.instagram.captionReady },
              {
                label: 'Vertical Video Ready',
                ready: readiness.platforms.instagram.verticalVideoReady,
              },
            ]}
          />
          <PlatformBlock
            name="TikTok"
            items={[
              { label: 'Hook Ready', ready: readiness.platforms.tiktok.hookReady },
              {
                label: 'Vertical Video Ready',
                ready: readiness.platforms.tiktok.verticalVideoReady,
              },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard icon={<Package className="w-3 h-3" />} title="Export Summary">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.entries(readiness.exports) as [keyof typeof readiness.exports, boolean][]).map(
            ([key, ready]) => (
              <div
                key={key}
                className={cn(
                  'rounded-lg border px-3 py-2 flex items-center justify-between gap-2',
                  ready
                    ? 'border-gold-500/25 bg-gold-500/[0.06]'
                    : 'border-white/[0.06] bg-black/40'
                )}
              >
                <span className="text-[10px] tracking-[0.14em] uppercase text-luxe/70">
                  {EXPORT_LABELS[key]}
                </span>
                {ready ? (
                  <Check className="w-3 h-3 text-emerald-300/90 shrink-0" aria-label="Available" />
                ) : (
                  <Circle className="w-2.5 h-2.5 text-luxe/30 shrink-0" aria-label="Missing" />
                )}
              </div>
            )
          )}
        </div>
      </SectionCard>
    </div>
  )
}
