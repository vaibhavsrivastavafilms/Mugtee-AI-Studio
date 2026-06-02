'use client'

import Image from 'next/image'
import { useEffect, useState, type RefObject } from 'react'
import { Film, ImageIcon, Loader2 } from 'lucide-react'
import { StoryboardPanel } from '@/components/quick-cut/storyboard-panel'
import { StoryboardTimeline } from '@/components/cinematic/storyboard-timeline'
import { SceneVisualCard } from '@/components/quick-cut/scene-visual-card'
import { SectionStatusBadge } from '@/components/quick-cut/section-status-badge'
import { CinematicGenerationLoader } from '@/components/v2/cinematic-generation-loader'
import { RewriteProvider } from '@/components/director/rewrite-provider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { sceneScrollTargetId } from '@/lib/cinematic/storyboard-scroll'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import { slugifyExportBase } from '@/lib/quick-cut/download-scene-image'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export type StoryboardScenesSubTab = 'storyboard' | 'breakdown'

function SceneBreakdownList({
  scenes,
  loading,
  showImages,
  exportTitle,
  allowDownload,
  onMotionPresetChange,
}: {
  scenes: GeneratedScene[]
  loading?: boolean
  showImages?: boolean
  exportTitle?: string
  allowDownload?: boolean
  onMotionPresetChange?: (
    sceneId: string,
    presetId: import('@/lib/motion/motion-presets').MotionPresetId
  ) => void
}) {
  const exportBase = slugifyExportBase(exportTitle || 'mugtee-storyboard', 'mugtee-storyboard')
  if (scenes.length === 0 && !loading) {
    return (
      <p className="text-[12px] text-luxe/55 italic text-center py-6">
        Building scene breakdown…
      </p>
    )
  }

  return (
    <ul className="space-y-2 max-h-[min(420px,50vh)] overflow-y-auto scrollbar-luxe">
      {scenes.map((scene, i) =>
        showImages ? (
          <li key={scene.id || i}>
            <SceneVisualCard
              scene={scene}
              index={i}
              compact
              exportBaseName={exportBase}
              allowDownload={allowDownload}
              onMotionPresetChange={
                onMotionPresetChange
                  ? (presetId) => onMotionPresetChange(scene.id, presetId)
                  : undefined
              }
            />
          </li>
        ) : (
          <li
            key={scene.id || i}
            id={scene.id ? sceneScrollTargetId(scene.id) : undefined}
            className="rounded-lg border border-white/[0.06] bg-black/40 px-3 py-2.5 scroll-mt-24"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] tracking-[0.18em] uppercase text-gold-300/70">
                SCENE {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-[10px] text-luxe/40">{scene.duration ?? 4}s</span>
            </div>
            <p className="text-sm text-luxe/90 font-medium leading-snug">
              {scene.title || `Beat ${i + 1}`}
            </p>
            {scene.description ? (
              <p
                data-rewrite-type="scene"
                className="select-text text-[11px] text-luxe/55 leading-relaxed mt-0.5 line-clamp-3"
              >
                {scene.description}
              </p>
            ) : null}
            {scene.cameraAngle ? (
              <p className="text-[10px] text-luxe/40 mt-1 tracking-wide">
                {scene.cameraAngle} · {scene.lightingMood}
              </p>
            ) : null}
            {scene.imagePrompt ? (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <p className="text-[9px] tracking-[0.2em] uppercase text-gold-300/60 mb-0.5">
                  Image prompt
                </p>
                <p
                  data-rewrite-type="visual_direction"
                  className="select-text text-[11px] text-luxe/65 leading-relaxed line-clamp-4"
                >
                  {scene.imagePrompt}
                </p>
              </div>
            ) : null}
          </li>
        )
      )}
      {loading && scenes.length === 0 ? (
        <li>
          <CinematicGenerationLoader step="scenes" message="Structuring beats…" />
        </li>
      ) : null}
    </ul>
  )
}

type StoryboardScenesTabbedPanelProps = {
  className?: string
  preferredSubTab?: StoryboardScenesSubTab
  scenesPanelRef: RefObject<HTMLDivElement | null>
  directorEditEnabled: boolean
}

export function StoryboardScenesTabbedPanel({
  className,
  preferredSubTab,
  scenesPanelRef,
  directorEditEnabled,
}: StoryboardScenesTabbedPanelProps) {
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const title = useQuickCutGenerationStore((s) => s.title)
  const script = useQuickCutGenerationStore((s) => s.script)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const storyboardScenes = useQuickCutGenerationStore((s) => s.storyboardScenes)
  const visualTimeline = useQuickCutGenerationStore((s) => s.visualTimeline)
  const sceneCount = useQuickCutGenerationStore((s) => s.sceneCount)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const directingSceneLabel = useQuickCutGenerationStore((s) => s.directingSceneLabel)
  const storyBible = useQuickCutGenerationStore((s) => s.storyBible)
  const setSceneMotionPreset = useQuickCutGenerationStore((s) => s.setSceneMotionPreset)
  const sectionStatus = useQuickCutGenerationStore((s) => s.sectionStatus)

  const breakdownLoading = generationStep === 'scenes'
  const imagesLoading = generationStep === 'images'
  const panelLoading = breakdownLoading || imagesLoading

  const defaultSubTab: StoryboardScenesSubTab =
    preferredSubTab ??
    (generationStep === 'scenes' || generationStep === 'script' ? 'breakdown' : 'storyboard')

  const [subTab, setSubTab] = useState<StoryboardScenesSubTab>(defaultSubTab)

  useEffect(() => {
    if (preferredSubTab) setSubTab(preferredSubTab)
  }, [preferredSubTab])

  const firstScene = scenes[0]
  const firstGeneratedUrl = firstScene?.imageUrl?.trim()
  const thumb =
    firstGeneratedUrl ||
    (!imagesLoading && firstScene ? resolveScenePreviewUrl(firstScene, 0) : null)

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.08] bg-black/30 p-4 min-h-[120px] space-y-3',
        panelLoading && 'shimmer-cinematic',
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85">
          <Film className="w-3 h-3" />
          Scenes &amp; storyboard
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SectionStatusBadge section="visualDirection" status={sectionStatus.visualDirection} />
          <SectionStatusBadge section="storyboard" status={sectionStatus.storyboard} />
          <SectionStatusBadge section="thumbnail" status={sectionStatus.thumbnail} />
        </div>
      </div>

      {storyBible ? (
        <p
          className="text-[10px] tracking-[0.18em] uppercase text-emerald-400/75"
          title={`${storyBible.visualStyle} · ${storyBible.colorPalette}`}
        >
          {imagesLoading ? 'Visual continuity locked' : 'Cinematic continuity active'}
        </p>
      ) : null}

      {imagesLoading && !firstGeneratedUrl ? (
        <div className="rounded-xl border border-gold-500/20 bg-black/30 p-3 flex items-center gap-3 shimmer-cinematic">
          <div className="w-14 aspect-[9/16] rounded-md border border-white/10 shrink-0 bg-white/[0.03] flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-gold-400/70" />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Thumbnail frame
            </p>
            <p className="text-[11px] text-luxe/50 mt-0.5">
              {directingSceneLabel || 'Generating cinematic stills…'}
            </p>
          </div>
        </div>
      ) : thumb ? (
        <div className="rounded-xl border border-gold-500/20 bg-black/30 p-3 flex items-center gap-3">
          <div className="relative w-14 aspect-[9/16] rounded-md overflow-hidden border border-white/10 shrink-0">
            <Image
              src={thumb}
              alt=""
              fill
              sizes="56px"
              className="object-cover"
              unoptimized
              loading="lazy"
            />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-gold-300/80 flex items-center gap-1">
              <ImageIcon className="w-3 h-3" /> Thumbnail frame
            </p>
            <p className="text-[11px] text-luxe/50 mt-0.5">First cinematic still for export</p>
          </div>
        </div>
      ) : null}

      <StoryboardTimeline
        scenes={scenes}
        loading={breakdownLoading}
        className="mb-1"
      />

      <Tabs
        value={subTab}
        onValueChange={(v) => setSubTab(v as StoryboardScenesSubTab)}
        className="space-y-3"
      >
        <TabsList
          className={cn(
            'grid w-full grid-cols-2 h-9 p-1',
            'bg-white/[0.03] border border-white/[0.06] rounded-lg',
            'overflow-x-auto scrollbar-luxe'
          )}
        >
          <TabsTrigger
            value="storyboard"
            className="text-[11px] font-medium tracking-[0.02em] data-[state=active]:bg-gold-500/15 data-[state=active]:text-gold-100"
          >
            Storyboard
          </TabsTrigger>
          <TabsTrigger
            value="breakdown"
            className="text-[11px] font-medium tracking-[0.02em] data-[state=active]:bg-gold-500/15 data-[state=active]:text-gold-100"
          >
            Scene Breakdown
          </TabsTrigger>
        </TabsList>

        <TabsContent value="storyboard" className="mt-0 focus-visible:outline-none">
          <StoryboardPanel
            scenes={scenes}
            storyboardScenes={storyboardScenes}
            visualTimeline={visualTimeline}
            sceneCount={sceneCount}
            loading={imagesLoading}
            interactive={isComplete}
            exportTitle={title}
            script={script}
            hook={hook}
            voiceUrl={voiceUrl}
            showTimeline={false}
          />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-0 focus-visible:outline-none">
          <RewriteProvider
            containerRef={scenesPanelRef}
            enabled={directorEditEnabled}
            defaultContentType="scene"
            className="relative"
          >
            <SceneBreakdownList
              scenes={scenes}
              loading={breakdownLoading}
              showImages={scenes.some((s) => s.imageUrl?.trim())}
              exportTitle={title}
              allowDownload={isComplete}
              onMotionPresetChange={setSceneMotionPreset}
            />
          </RewriteProvider>
        </TabsContent>
      </Tabs>
    </div>
  )
}
