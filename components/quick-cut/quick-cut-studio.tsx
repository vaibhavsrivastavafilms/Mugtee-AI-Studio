'use client'

import { useEffect, useRef } from 'react'
import {
  GENERATION_FOOTER_CLEARANCE,
  QuickCutGenerationFooter,
} from '@/components/quick-cut/generation-footer'
import { GenerationStagePanel } from '@/components/quick-cut/generation-stage-panel'
import { QuickCutSaveProjectButton } from '@/components/quick-cut/quick-cut-save-project-button'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'
import { VirloMetadataPanel } from '@/components/quick-cut/virlo-metadata-panel'
import { generationStepToTab } from '@/lib/cinematic/quick-cut/stage-tabs'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

export function QuickCutStudio({ onRegenerate }: { onRegenerate?: () => void }) {
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const activeStageTab = useQuickCutGenerationStore((s) => s.activeStageTab)
  const stageTabPinned = useQuickCutGenerationStore((s) => s.stageTabPinned)
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const voiceAudioRef = useRef<HTMLAudioElement>(null)
  const waveform = useQuickCutGenerationStore((s) => s.waveform)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const virlo = useQuickCutGenerationStore((s) => s.virlo)
  const hookVariantNumber = useQuickCutGenerationStore((s) => s.hookVariantNumber)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const error = useQuickCutGenerationStore((s) => s.error)

  useEffect(() => {
    if (stageTabPinned) return
    const tab = generationStepToTab(generationStep)
    if (tab) {
      useQuickCutGenerationStore.setState({ activeStageTab: tab })
    }
  }, [generationStep, stageTabPinned])

  if (error) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-6 text-center space-y-3">
        <p className="text-amber-200/90 text-sm" role="alert">
          {error}
        </p>
        {onRegenerate ? (
          <button
            type="button"
            onClick={onRegenerate}
            className="text-[11px] tracking-[0.14em] uppercase text-luxe/60 hover:text-gold-200 transition-colors"
          >
            Try again
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <>
      <div
        className={cn(
          'space-y-6 lg:space-y-0 lg:grid lg:grid-cols-[minmax(0,1fr)_min(260px,28%)] lg:gap-6',
          GENERATION_FOOTER_CLEARANCE
        )}
      >
        <div className="space-y-5 min-w-0">
          <div className="flex flex-col items-center">
            <ReelAssemblyPlayer
              scenes={scenes}
              title={title}
              hook={hook}
              script={script}
              videoUrl={videoUrl}
              voiceUrl={voiceUrl}
              audioRef={voiceAudioRef}
              waveform={waveform}
              isLive={!isComplete}
              generationStep={isComplete ? 'complete' : generationStep}
              mp4Compiling={generationStep === 'render' && !videoUrl}
              autoPlayPreview={isComplete && Boolean(voiceUrl) && !videoUrl}
              className="mx-auto"
            />
          </div>

          <GenerationStagePanel tab={activeStageTab} audioRef={voiceAudioRef} onRegenerate={onRegenerate} />

          {scenes.length > 0 ? (
            <div className="flex justify-center pt-1">
              <QuickCutSaveProjectButton variant="compact" showViewLink={false} />
            </div>
          ) : null}
        </div>

        <aside className={cn('min-w-0', 'lg:sticky lg:top-24 lg:self-start')}>
          <VirloMetadataPanel virlo={virlo} hook={hook} hookVariantNumber={hookVariantNumber} />
        </aside>
      </div>

      <QuickCutGenerationFooter />
    </>
  )
}
