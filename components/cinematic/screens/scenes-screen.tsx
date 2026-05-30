'use client'

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  enhanceVisualDirection,
  regenerateScene,
} from '@/lib/cinematic/refinement-client'
import {
  applyStoryboardToScene,
  sceneNeedsStoryboard,
  selectStoryboardVariant,
} from '@/lib/cinematic/storyboard-utils'
import {
  enhanceStoryboard,
  generateSceneStoryboard,
} from '@/lib/cinematic/storyboard-client'
import { applyVisualToScene } from '@/lib/cinematic/visual-direction'
import { AnalyticsEvents } from '@/lib/analytics/events'
import { trackEvent } from '@/lib/analytics/track-event'
import { REFINEMENT_PACING_LINE } from '@/lib/creator/output-confidence'
import { SOFT_ERROR_COPY, softenCinematicError } from '@/lib/creator/soft-error-copy'
import {
  hasCreatorMilestone,
  trackCreatorMilestone,
} from '@/lib/creator/session-insights'
import { useCinematicRoute } from '@/hooks/use-cinematic-route'
import {
  getStoryboardFocus,
  saveStoryboardFocus,
} from '@/lib/creator/workflow-continuity'
import { useCinematicProjectStore } from '@/stores/cinematic-project'
import { CinematicRefineAction } from '@/components/cinematic/refine-action'
import { CreatorGuidance } from '@/components/cinematic/creator-guidance'
import { ContinuityMemoryLine } from '@/components/cinematic/continuity-memory-line'
import { AtmosphericSceneShell } from '@/components/cinematic/atmospheric-scene-shell'
import { CinematicRhythmMap } from '@/components/cinematic/cinematic-rhythm-map'
import { CinematicTransitionGuide } from '@/components/cinematic/cinematic-transition-guide'
import { EmotionalEscalationMeter } from '@/components/cinematic/emotional-escalation-meter'
import { NarrativeFlowMarker } from '@/components/cinematic/narrative-flow-marker'
import { PacingIntelligenceStrip } from '@/components/cinematic/pacing-intelligence-strip'
import { CinematicRefinementEnvironment } from '@/components/cinematic/cinematic-refinement-environment'
import { PacingFlowStrip } from '@/components/cinematic/pacing-flow-strip'
import { CinematicAttentionGuide } from '@/components/cinematic/cinematic-attention-guide'
import { SceneEmotionalBridge } from '@/components/cinematic/scene-emotional-bridge'
import { VisualContinuityThread } from '@/components/cinematic/visual-continuity-thread'
import { VisualWeightIndicator } from '@/components/cinematic/visual-weight-indicator'
import { CreatorMemoryStrip } from '@/components/cinematic/creator-memory-strip'
import { ScenesStoryWorldShell } from '@/components/cinematic/story-world/scenes-story-world-layer'
import { CinematicSequencePresence } from '@/components/cinematic/story-world/story-flow'
import { getEscalationContinuityLine } from '@/lib/creator/scene-world-continuity'
import { PreviousSceneEcho } from '@/components/cinematic/previous-scene-echo'
import { SceneContinuityLink } from '@/components/cinematic/scene-continuity-link'
import { StoryboardRhythmStrip } from '@/components/cinematic/storyboard-rhythm-strip'
import { WorkflowEmotionalState } from '@/components/cinematic/workflow-emotional-state'
import { DirectingMomentumTrack } from '@/components/cinematic/directing-momentum-track'
import { CinematicVisualProductionShell } from '@/components/cinematic/cinematic-visual-production-shell'
import { CinematicStoryboardWorld } from '@/components/cinematic/cinematic-storyboard-world'
import { VisualDirectionComposer } from '@/components/cinematic/visual-direction-composer'
import { CinematicSceneProduction } from '@/components/cinematic/cinematic-scene-production'
import { MomentumStrip } from '@/components/create/momentum-strip'
import { CinematicEmptyState } from '@/components/cinematic/cinematic-states'
import { SceneStoryboardPanel } from '@/components/cinematic/scene-storyboard-panel'
import { SceneVisualChips } from '@/components/cinematic/scene-visual-chips'
import { ImmersiveSceneScroll } from '@/components/mobile/immersive-scene-scroll'
import {
  CinematicStepNav,
  CinematicWorkflowShell,
} from '@/components/cinematic/workflow-shell'
import type { CinematicScene } from '@/stores/cinematic-project'

export function CinematicScenesScreen() {
  const router = useRouter()
  const { scenes, script, style, niche, duration, updateStatus } = useCinematicRoute('scenes')
  const generatingRef = useRef<Set<number>>(new Set())
  const attemptedRef = useRef<Set<number>>(new Set())
  const [storyboardFailed, setStoryboardFailed] = useState<Set<number>>(() => new Set())

  const storyboardSignature = useMemo(
    () =>
      scenes
        .map((s) => `${s.index}:${s.storyboardImages?.length ?? 0}`)
        .join('|'),
    [scenes]
  )

  useEffect(() => {
    if (!script.trim()) router.replace('/cinematic/create')
  }, [router, script])

  useEffect(() => {
    if (scenes.length > 0 && !hasCreatorMilestone('storyboard_viewed')) {
      trackCreatorMilestone('storyboard_viewed')
    }
  }, [scenes.length])

  useEffect(() => {
    const projectId = useCinematicProjectStore.getState().persistedId ||
      useCinematicProjectStore.getState().id
    if (!projectId || scenes.length === 0) return
    const focus = getStoryboardFocus(projectId)
    if (focus == null) return
    requestAnimationFrame(() => {
      document
        .getElementById(`scene-card-${focus}`)
        ?.scrollIntoView({ behavior: 'instant', block: 'nearest' })
    })
  }, [scenes.length])

  useEffect(() => {
    if (scenes.length === 0) return

    let cancelled = false

    ;(async () => {
      const state = useCinematicProjectStore.getState()
      let projectId = state.persistedId || state.id
      if (!projectId) {
        projectId = (await state.persistProject({ silent: true })) ?? null
      }
      if (!projectId || cancelled) return

      const latestScenes = useCinematicProjectStore.getState().scenes
      const pending = latestScenes.filter(
        (scene) =>
          sceneNeedsStoryboard(scene) &&
          !generatingRef.current.has(scene.index) &&
          !attemptedRef.current.has(scene.index)
      )
      if (pending.length === 0) return

      for (const scene of pending) {
        if (cancelled) break
        generatingRef.current.add(scene.index)
        attemptedRef.current.add(scene.index)

        try {
          const latest = useCinematicProjectStore.getState()
          const data = await generateSceneStoryboard(
            {
              prompt: latest.prompt,
              style: latest.style,
              duration: latest.duration,
              niche: latest.niche,
              hook: latest.hook,
              summary: latest.summary,
              script: latest.script,
              scenes: latest.scenes,
              captionLines: latest.captionLines,
              suggestedVoiceStyle: latest.suggestedVoiceStyle,
            },
            scene.index,
            projectId
          )

          if (cancelled) return

          const current = useCinematicProjectStore.getState()
          const nextScenes = current.scenes.map((s) =>
            s.index === scene.index
              ? applyStoryboardToScene(
                  s,
                  data.storyboardImages,
                  data.activeStoryboardId
                )
              : s
          )
          useCinematicProjectStore.getState().updateScenes(nextScenes)
          await useCinematicProjectStore.getState().persistProject({ silent: true })
          setStoryboardFailed((prev) => {
            const next = new Set(prev)
            next.delete(scene.index)
            return next
          })
        } catch {
          setStoryboardFailed((prev) => new Set(prev).add(scene.index))
        } finally {
          generatingRef.current.delete(scene.index)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [storyboardSignature, scenes.length])

  return (
    <CinematicWorkflowShell
      title="Scene beats"
      subtitle="Walk the visual sequence — story-world rhythm held in cinematic flow."
    >
      <CinematicVisualProductionShell>
      <MomentumStrip stage="scenes" style={style} />
      {scenes.length > 0 ? (
        <CinematicStoryboardWorld
          sceneCount={scenes.length}
          scenes={scenes.map((s) => ({ index: s.index, title: s.title }))}
          style={style}
          niche={niche}
          activeIndex={
            scenes.findLastIndex((s) => (s.storyboardImages?.length ?? 0) > 0) >= 0
              ? scenes[scenes.findLastIndex((s) => (s.storyboardImages?.length ?? 0) > 0)]?.index
              : scenes[0]?.index
          }
        />
      ) : null}
      <DirectingMomentumTrack
        sceneCount={scenes.length}
        seed={scenes.length % 3}
        className="text-center mb-2 hidden sm:block"
      />
      <CreatorMemoryStrip style={style} niche={niche} seed={scenes.length % 3} />
      <ScenesStoryWorldShell sceneCount={scenes.length} style={style} niche={niche}>
      <PacingIntelligenceStrip style={style} niche={niche} seed={scenes.length} />
      <VisualContinuityThread style={style} niche={niche} className="mb-3" />
      <PacingFlowStrip seed={scenes.length} />
      <CinematicAttentionGuide seed={scenes.length % 3} className="mb-3" />
      {scenes.length > 0 ? (
        <>
        <StoryboardRhythmStrip
          className="mb-4 rounded-xl border border-white/[0.04] bg-black/20"
          scenes={scenes.map((scene, i) => {
            const lastWithFrames = scenes.findLastIndex(
              (s) => (s.storyboardImages?.length ?? 0) > 0
            )
            const activeAt = lastWithFrames >= 0 ? lastWithFrames : 0
            return {
              index: scene.index,
              active: i === activeAt,
              intensity: Math.min(5, 2 + (i % 3)),
            }
          })}
        />
        <CinematicRhythmMap
          scenes={scenes}
          style={style}
          niche={niche}
          activeIndex={scenes.findLastIndex((s) => (s.storyboardImages?.length ?? 0) > 0) >= 0
            ? scenes[scenes.findLastIndex((s) => (s.storyboardImages?.length ?? 0) > 0)]?.index
            : scenes[0]?.index}
          className="mb-4 rounded-xl border border-white/[0.04] bg-black/15 px-2 hidden sm:flex"
        />
        </>
      ) : null}
      {scenes.length === 0 ? (
        <CinematicEmptyState
          title="Your beats await the lens"
          message="Return to Create — your premise will unfold into scene rhythm."
          actionHref="/cinematic/create"
          actionLabel="Back to your premise"
        />
      ) : (
        <>
        <div className="hidden sm:block space-y-6 cinematic-touch-flow scroll-mt-24">
          {scenes.map((scene, i) => (
            <div
              key={scene.id}
              className="scene-card-enter"
              style={{ animationDelay: `${Math.min(i * 0.06, 0.24)}s` }}
            >
            <SceneCard
              scene={scene}
              totalScenes={scenes.length}
              allScenes={scenes}
              style={style}
              niche={niche}
              storyboardFailed={storyboardFailed.has(scene.index)}
              onStoryboardFailed={(failed) =>
                setStoryboardFailed((prev) => {
                  const next = new Set(prev)
                  if (failed) next.add(scene.index)
                  else next.delete(scene.index)
                  return next
                })
              }
            />
            </div>
          ))}
        </div>
        <ImmersiveSceneScroll
          className="sm:hidden -mx-1"
          scenes={scenes.map((s) => ({ id: s.id, title: s.title }))}
          durationSec={duration}
          renderScene={(sceneMeta, _i) => {
            const scene = scenes.find((s) => s.id === sceneMeta.id)
            if (!scene) return null
            return (
              <SceneCard
                scene={scene}
                totalScenes={scenes.length}
                allScenes={scenes}
                style={style}
                niche={niche}
                storyboardFailed={storyboardFailed.has(scene.index)}
                onStoryboardFailed={(failed) =>
                  setStoryboardFailed((prev) => {
                    const next = new Set(prev)
                    if (failed) next.add(scene.index)
                    else next.delete(scene.index)
                    return next
                  })
                }
              />
            )
          }}
        />
        </>
      )}

      <CreatorGuidance step="scenes" />

      <CinematicStepNav
        backHref="/cinematic/director"
        nextHref="/cinematic/voiceover"
        onNext={() => updateStatus('voiceover')}
      />
      </ScenesStoryWorldShell>
      </CinematicVisualProductionShell>
    </CinematicWorkflowShell>
  )
}

function regenPayload() {
  const state = useCinematicProjectStore.getState()
  return {
    prompt: state.prompt,
    style: state.style,
    duration: state.duration,
    niche: state.niche,
    hook: state.hook,
    summary: state.summary,
    script: state.script,
    scenes: state.scenes,
    captionLines: state.captionLines,
    suggestedVoiceStyle: state.suggestedVoiceStyle,
  }
}

const SceneCard = memo(function SceneCard({
  scene,
  totalScenes,
  allScenes,
  style,
  niche,
  storyboardFailed,
  onStoryboardFailed,
}: {
  scene: CinematicScene
  totalScenes: number
  allScenes: CinematicScene[]
  style?: string | null
  niche?: string | null
  storyboardFailed: boolean
  onStoryboardFailed: (failed: boolean) => void
}) {
  const [busy, setBusy] = useState<'scene' | 'visual' | 'storyboard' | null>(null)
  const [storyboardLoading, setStoryboardLoading] = useState(
    () => sceneNeedsStoryboard(scene) && !storyboardFailed
  )

  useEffect(() => {
    if (scene.storyboardImages && scene.storyboardImages.length > 0) {
      setStoryboardLoading(false)
      onStoryboardFailed(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to loaded frames
  }, [scene.storyboardImages])

  useEffect(() => {
    if (storyboardFailed) setStoryboardLoading(false)
  }, [storyboardFailed])

  const projectId = useCinematicProjectStore((s) => s.persistedId || s.id)

  const onSelectVariant = useCallback(
    (imageId: string) => {
      const state = useCinematicProjectStore.getState()
      const projectId = state.persistedId || state.id
      if (projectId) saveStoryboardFocus(projectId, scene.index)
      const nextScenes = state.scenes.map((s) =>
        s.index === scene.index ? selectStoryboardVariant(s, imageId) : s
      )
      useCinematicProjectStore.getState().updateScenes(nextScenes)
      void useCinematicProjectStore.getState().persistProject({ silent: true })
    },
    [scene.index]
  )

  const onRegenerateScene = useCallback(async () => {
    if (busy) return
    setBusy('scene')
    try {
      const data = await regenerateScene(regenPayload(), scene.index)
      const state = useCinematicProjectStore.getState()
      const nextScenes = state.scenes.map((s) =>
        s.index === scene.index
          ? applyVisualToScene(
              {
                ...s,
                title: data.title,
                narration: data.description,
                duration: data.duration,
              },
              {
                visualPrompt: data.visualPrompt,
                cameraAngle: data.cameraAngle,
                lightingMood: data.lightingMood,
                environment: data.environment,
                colorPalette: data.colorPalette,
                movementStyle: data.movementStyle,
              }
            )
          : s
      )
      useCinematicProjectStore.getState().updateScenes(nextScenes)
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      trackEvent(AnalyticsEvents.REGENERATE_SCENE, {
        metadata: { workflow: 'cinematic', scene_index: scene.index },
      })
      toast.success(`Scene ${scene.index} reshaped`, { description: REFINEMENT_PACING_LINE })
    } catch (e: unknown) {
      toast.error(softenCinematicError(e, SOFT_ERROR_COPY.scenePaused))
    } finally {
      setBusy(null)
    }
  }, [busy, scene.index])

  const onEnhanceVisual = useCallback(async () => {
    if (busy) return
    setBusy('visual')
    try {
      const data = await enhanceVisualDirection(regenPayload(), scene.index)
      const state = useCinematicProjectStore.getState()
      const nextScenes = state.scenes.map((s) =>
        s.index === scene.index ? applyVisualToScene(s, data.visual) : s
      )
      useCinematicProjectStore.getState().updateScenes(nextScenes)
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      trackEvent(AnalyticsEvents.REGENERATE_VISUAL_DIRECTION, {
        metadata: { workflow: 'cinematic', scene_index: scene.index },
      })
      toast.success(`Visual mood deepened — Scene ${scene.index}`, {
        description: REFINEMENT_PACING_LINE,
      })
    } catch (e: unknown) {
      toast.error(softenCinematicError(e, SOFT_ERROR_COPY.visualPaused))
    } finally {
      setBusy(null)
    }
  }, [busy, scene.index])

  const onEnhanceStoryboard = useCallback(async () => {
    if (busy) return
    setBusy('storyboard')
    setStoryboardLoading(true)
    onStoryboardFailed(false)
    try {
      let id = projectId
      if (!id) {
        id = (await useCinematicProjectStore.getState().persistProject({ silent: true })) ?? null
      }
      if (!id) throw new Error(SOFT_ERROR_COPY.stageFirst)

      const data = await enhanceStoryboard(regenPayload(), scene.index, id)
      const state = useCinematicProjectStore.getState()
      const nextScenes = state.scenes.map((s) =>
        s.index === scene.index
          ? applyStoryboardToScene(
              s,
              data.storyboardImages,
              data.activeStoryboardId
            )
          : s
      )
      useCinematicProjectStore.getState().updateScenes(nextScenes)
      await useCinematicProjectStore.getState().persistProject({ silent: true })
      toast.success(`Storyboard refined — Scene ${scene.index}`, {
        description: REFINEMENT_PACING_LINE,
      })
    } catch (e: unknown) {
      onStoryboardFailed(true)
      toast.error(softenCinematicError(e, SOFT_ERROR_COPY.storyboardPaused))
    } finally {
      setStoryboardLoading(false)
      setBusy(null)
    }
  }, [busy, onStoryboardFailed, projectId, scene.index])

  const escalationLine = useMemo(
    () => getEscalationContinuityLine(allScenes, scene.index, scene.index % 3),
    [allScenes, scene.index]
  )

  return (
    <AtmosphericSceneShell
      active={!!busy || storyboardLoading}
      intensity={Math.min(5, 2 + (scene.index % 3))}
      className="bg-white/[0.03]"
    >
    <article id={`scene-card-${scene.index}`}>
      <CinematicSequencePresence
        sceneIndex={scene.index}
        totalScenes={totalScenes}
        className="px-4 pt-2"
      />
      <CinematicSceneProduction
        sceneIndex={scene.index}
        totalScenes={totalScenes}
        style={style}
        niche={niche}
        scene={scene}
      >
      <SceneStoryboardPanel
        scene={scene}
        loading={storyboardLoading}
        failed={storyboardFailed}
        onSelectVariant={onSelectVariant}
      />
      <VisualDirectionComposer scene={scene} style={style} seed={scene.index} />
      </CinematicSceneProduction>

      <PreviousSceneEcho sceneIndex={scene.index} style={style} niche={niche} />
      <SceneEmotionalBridge
        sceneIndex={scene.index}
        totalScenes={totalScenes}
        style={style}
        niche={niche}
      />

      <CinematicRefinementEnvironment visible={!!busy} seed={scene.index} />
      <WorkflowEmotionalState
        phase={busy === 'storyboard' ? 'refining' : 'regenerating'}
        visible={!!busy}
        seed={scene.index}
      />

      <div className="px-4 sm:px-5 pt-1">
        <ContinuityMemoryLine style={style} niche={niche} seed={scene.index} />
        <p className="text-[8px] tracking-[0.18em] uppercase text-white/28 text-center mt-1 emotional-sequence-atmosphere">
          {escalationLine}
        </p>
      </div>

      <div className="px-4 sm:px-5 pt-3">
        <SceneContinuityLink
          sceneIndex={scene.index}
          totalScenes={totalScenes}
          active={!!busy}
        />
      </div>

      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#C8A24E]">
              Scene {scene.index}
            </span>
            <NarrativeFlowMarker sceneIndex={scene.index} totalScenes={totalScenes} />
            <CinematicTransitionGuide
              sceneIndex={scene.index}
              totalScenes={totalScenes}
              style={style}
            />
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2">
            <EmotionalEscalationMeter
              sceneIndex={scene.index}
              totalScenes={totalScenes}
              style={style}
              niche={niche}
            />
            <VisualWeightIndicator scene={scene} totalScenes={totalScenes} />
          </div>
          {scene.emotion ? (
            <span className="self-start rounded-full border border-white/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-300">
              {scene.emotion}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:justify-end sm:items-center pt-1 border-t border-white/[0.04]">
            <CinematicRefineAction
              label="Refine storyboard frame"
              busy={busy === 'storyboard'}
              disabled={!!busy && busy !== 'storyboard'}
              showContinuity
              onClick={onEnhanceStoryboard}
            />
            <CinematicRefineAction
              label="Deepen visual mood"
              busy={busy === 'visual'}
              disabled={!!busy && busy !== 'visual'}
              showContinuity
              onClick={onEnhanceVisual}
            />
            <CinematicRefineAction
              label="Reshape scene beat"
              busy={busy === 'scene'}
              disabled={!!busy && busy !== 'scene'}
              showContinuity
              onClick={onRegenerateScene}
            />
        </div>

        <SceneVisualChips scene={scene} />

        {scene.title ? (
          <p className="text-[#F4E7C1] text-lg leading-snug">{scene.title}</p>
        ) : null}

        {scene.narration ? (
          <p className="text-white/65 text-sm leading-7 whitespace-pre-wrap">
            {scene.narration}
          </p>
        ) : null}

        {!scene.narration && (scene.metadata as { description?: string })?.description ? (
          <p className="text-white/65 text-sm leading-7 whitespace-pre-wrap">
            {(scene.metadata as { description?: string }).description}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-4 text-xs text-white/45">
          {scene.duration ? <span>{scene.duration}s</span> : null}
          {scene.camera ? <span>{scene.camera}</span> : null}
          {scene.lighting ? <span>{scene.lighting}</span> : null}
        </div>
      </div>
    </article>
    </AtmosphericSceneShell>
  )
})
