'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { voiceStyleLabel } from '@/lib/cinematic/generation'
import {
  buildCinematicPrevisualization,
  previewAnticipationSubtitle,
} from '@/lib/cinematic/preview'
import { immersiveLoadingCopy } from '@/lib/cinematic/execution/cinematic-performance-engine'
import { useCinematicRoute } from '@/hooks/use-cinematic-route'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { CreatorFeedbackPrompt } from '@/components/cinematic/creator-feedback-prompt'
import { CreatorGuidance } from '@/components/cinematic/creator-guidance'
import { CinematicSeparator } from '@/components/cinematic/cinematic-separator'
import { FirstSuccessMoment } from '@/components/cinematic/first-success-moment'
import { CinematicBalanceChip } from '@/components/cinematic/cinematic-balance-chip'
import { DirectingGuidanceWhisper } from '@/components/cinematic/directing-guidance-whisper'
import { HookPresenceCard } from '@/components/cinematic/hook-presence-card'
import { HookTensionMarker } from '@/components/cinematic/hook-tension-marker'
import { PacingBalanceIndicator } from '@/components/cinematic/pacing-balance-indicator'
import { CinematicNoiseReducer } from '@/components/cinematic/cinematic-noise-reducer'
import { DirectingFocusAnchor } from '@/components/cinematic/directing-focus-anchor'
import { EmotionalFlowMarker } from '@/components/cinematic/emotional-flow-marker'
import { PacingFlowStrip } from '@/components/cinematic/pacing-flow-strip'
import { PacingIntelligenceStrip } from '@/components/cinematic/pacing-intelligence-strip'
import { ProjectToneStrip } from '@/components/cinematic/project-tone-strip'
import { WorkflowMemoryCard } from '@/components/cinematic/workflow-memory-card'
import { OutputConfidenceStrip } from '@/components/cinematic/output-confidence-strip'
import { ScriptPresenceLayer } from '@/components/cinematic/script-presence-layer'
import { EmotionalSequenceReader } from '@/components/cinematic/emotional-sequence-reader'
import { MomentumStrip } from '@/components/create/momentum-strip'
import { CinematicViewingRoutePresence } from '@/components/cinematic/cinematic-delivery/delivery-presence-components'
import { CinematicShowcaseRoutePresence } from '@/components/cinematic/cinematic-showcase/showcase-presence-components'
import { StoryEvolutionRoutePresence } from '@/components/cinematic/story-evolution/story-evolution-presence-components'
import { LiveCinematicRoutePresence } from '@/components/cinematic/live-cinematic/live-cinematic-presence-components'
import {
  CinematicStepNav,
  CinematicWorkflowShell,
} from '@/components/cinematic/workflow-shell'

export function CinematicPreviewScreen() {
  const router = useRouter()
  const projectId = useCinematicProjectStore((s) => s.persistedId || s.id)
  const {
    title,
    hook,
    summary,
    script,
    style,
    duration,
    suggestedVoiceStyle,
    niche,
    prompt,
    scenes,
    updateStatus,
  } = useCinematicRoute('preview')

  const previs = useMemo(
    () =>
      buildCinematicPrevisualization(
        {
          hook,
          summary,
          script,
          scenes: scenes.map((s) => ({
            id: String(s.index),
            title: s.title || `Beat ${s.index}`,
            description: s.visualPrompt || s.title || '',
            duration: s.duration ?? duration / Math.max(scenes.length, 1),
            visualPrompt: s.visualPrompt || '',
            imagePrompt: s.imagePrompt || s.visualPrompt || '',
            cameraAngle: s.cameraAngle || '',
            lightingMood: s.lightingMood || '',
            environment: s.environment || '',
            colorPalette: s.colorPalette || '',
            movementStyle: s.movementStyle || '',
          })),
        },
        { script, hook, duration, style }
      ),
    [hook, summary, script, scenes, duration, style]
  )

  useEffect(() => {
    if (!script.trim() && !prompt.trim()) {
      router.replace('/cinematic/create')
    }
  }, [prompt, router, script])

  return (
    <CinematicWorkflowShell
      title="Feel your story before the lens"
      subtitle={previewAnticipationSubtitle(previs)}
    >
      <section className="rounded-[28px] border border-white/[0.06] bg-white/[0.02] px-5 py-4 mb-5 max-w-2xl mx-auto text-center">
        <p className="text-[10px] tracking-[0.28em] uppercase text-[#C8A24E]/70 mb-2">
          {previs.buildupPhase === 'opening'
            ? 'Opening anticipation'
            : previs.buildupPhase === 'peak'
              ? 'Emotional crest'
              : previs.buildupPhase === 'settling'
                ? 'Held aftertaste'
                : 'Rhythm rising'}
        </p>
        <p className="text-white/70 text-sm leading-relaxed italic">
          {previs.presenceLine}
        </p>
        {previs.visualContinuityHint ? (
          <p className="text-white/35 text-[11px] mt-3 tracking-wide">
            {previs.visualContinuityHint}
          </p>
        ) : null}
        <p className="text-white/25 text-[10px] tracking-[0.2em] uppercase mt-4">
          {immersiveLoadingCopy('preview', script.length % 3)}
        </p>
      </section>
      <FirstSuccessMoment projectId={projectId} />
      <CinematicViewingRoutePresence stage="preview" style={style} niche={niche} seed={script.length % 3} className="mb-2" />
      <CinematicShowcaseRoutePresence stage="preview" style={style} niche={niche} seed={script.length % 3} className="mb-3 hidden sm:block" />
      <StoryEvolutionRoutePresence stage="preview" style={style} niche={niche} seed={script.length % 3} className="mb-4 hidden md:block" />
      <LiveCinematicRoutePresence stage="preview" style={style} niche={niche} seed={script.length % 3} className="mb-4 hidden lg:block" />
      <MomentumStrip stage="preview" style={style} />
      <EmotionalSequenceReader stage="preview" seed={script.length % 3} className="mb-3" />
      <ProjectToneStrip style={style} niche={niche} />
      <WorkflowMemoryCard style={style} niche={niche} className="mb-5 max-w-md mx-auto" />
      <PacingFlowStrip seed={script.length % 4} />
      <div className="flex justify-center mb-4">
        <EmotionalFlowMarker seed={style.length % 3} />
      </div>
      <DirectingFocusAnchor seed={hook.length % 3} className="mb-4" />
      <PacingIntelligenceStrip style={style} niche={niche} seed={script.length % 3} />
      <DirectingGuidanceWhisper context="preview" style={style} niche={niche} className="mb-4" />
      <OutputConfidenceStrip
        niche={niche}
        style={style}
        platform="instagram_reel"
        rewriteMode={style}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mb-6 min-h-[72px]">
        <MetaCard label="Title" value={title || 'Untitled story world'} />
        <MetaCard label="Duration" value={`${duration}s`} />
        <MetaCard label="Style" value={style} />
        <MetaCard label="Voice" value={voiceStyleLabel(suggestedVoiceStyle)} />
      </div>

      {summary ? (
        <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6 mb-5 max-w-2xl mx-auto">
          <p className="text-[#C8A24E] uppercase tracking-[0.3em] text-[10px] mb-3">
            Story arc
          </p>
          <p className="text-white/75 leading-[1.88] whitespace-pre-wrap text-[15px]">
            {summary}
          </p>
        </section>
      ) : null}

      <CinematicSeparator className="mb-6 max-w-2xl mx-auto" />

      <CinematicNoiseReducer focused className="max-w-2xl mx-auto">
      <div className="space-y-6">
        {hook ? (
          <div className="space-y-2">
            <div className="flex justify-center">
              <HookTensionMarker hook={hook} />
            </div>
            <HookPresenceCard hook={hook} />
          </div>
        ) : null}
        <ScriptPresenceLayer script={script} />
        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
          <PacingBalanceIndicator style={style} niche={niche} />
          <CinematicBalanceChip style={style} niche={niche} />
        </div>
      </div>
      </CinematicNoiseReducer>

      <CreatorGuidance step="preview" />

      <CreatorFeedbackPrompt
        context="preview"
        question="Did this feel cinematic?"
        secondaryQuestion="Did the pacing feel natural?"
      />

      <CinematicStepNav
        backHref="/cinematic/create"
        nextHref="/cinematic/director"
        onNext={() => updateStatus('director')}
      />
    </CinematicWorkflowShell>
  )
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-black/25 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="text-[9px] sm:text-[10px] tracking-[0.22em] uppercase text-white/38 mb-1">
        {label}
      </div>
      <div className="text-[#F4E7C1] font-medium text-xs sm:text-sm truncate" title={value}>
        {value}
      </div>
    </div>
  )
}
