'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  History,
  Loader2,
  Lock,
  Pencil,
  RefreshCw,
  Sparkles,
  Upload,
} from 'lucide-react'
import { SceneDirectorNotesPanel } from '@/components/quick-cut/scene-director-notes'
import { ScenePromptEditorModal } from '@/components/quick-cut/scene-prompt-editor-modal'
import { SceneVersionStrip } from '@/components/quick-cut/scene-version-strip'
import { SceneVersionCompare } from '@/components/quick-cut/scene-version-compare'
import { SceneQualityScorePanel } from '@/components/quick-cut/scene-quality-score-panel'
import { SceneAiRecommendations } from '@/components/quick-cut/scene-ai-recommendations'
import { ReelContinuityChecker } from '@/components/quick-cut/reel-continuity-checker'
import {
  buildEnhancedScenePrompt,
  resolveSceneCardStatus,
  resolveSceneDirectorNotes,
  resolveSceneScriptText,
  resolveSceneTransition,
} from '@/lib/quick-cut/scene-card-v2-helpers'
import { formatActivityElapsed, getGenerationActivityLog } from '@/lib/quick-cut/generation-activity.client'
import { resolveStoryboardSceneProgress } from '@/lib/quick-cut/generation-hud'
import { directorWorkspaceHref } from '@/lib/create/routes'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { motionPresetLabel } from '@/lib/motion/motion-presets'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'
import { toast } from 'sonner'
import { sceneHasReviewableImage } from '@/lib/quick-cut/scene-regen-guard'
import {
  buildSceneRecommendations,
  computeReelContinuityReport,
  computeSceneQualityScore,
} from '@/lib/quick-cut/scene-review-queue'
import { SceneApprovalSummary } from '@/components/quick-cut/scene-approval-summary'
import {
  approveScene,
  getApprovedSceneIds,
  getLockedSceneIds,
  getSceneReviewStatus,
  lockScene,
  unlockScene,
} from '@/lib/quick-cut/scene-review-state.client'
import { useClientMounted } from '@/lib/hooks/use-client-mounted'

type WorkspaceTab = 'editor' | 'review' | 'history'

const goldBtn =
  'inline-flex items-center justify-center gap-2 rounded-lg border border-gold-500/35 bg-gold-500/15 px-4 py-2.5 min-h-[44px] text-[10px] font-semibold tracking-[0.12em] uppercase text-gold-100 hover:bg-gold-500/25 transition-colors disabled:opacity-45 touch-manipulation'

const outlineBtn =
  'w-full text-left rounded-lg border border-white/[0.08] bg-black/35 px-3 py-2.5 min-h-[44px] text-[10px] text-luxe/70 hover:border-gold-500/25 hover:text-gold-100 transition-colors disabled:opacity-40 touch-manipulation'

/** Scene Review Workspace — hero preview, approval, versions, editor. */
export function SceneWorkspaceV2({ className }: { className?: string }) {
  const mounted = useClientMounted()
  const [activeIndex, setActiveIndex] = useState(0)
  const [tab, setTab] = useState<WorkspaceTab>('review')
  const [promptModalOpen, setPromptModalOpen] = useState(false)
  const [regenDirection, setRegenDirection] = useState('')
  const [pendingCompare, setPendingCompare] = useState<{ currentUrl: string; newUrl: string } | null>(
    null
  )
  const [approvalTick, setApprovalTick] = useState(0)

  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      scenes: s.scenes,
      generationStep: s.generationStep,
      sectionStatus: s.sectionStatus,
      isGenerating: s.isGenerating,
      isComplete: s.isComplete,
      directingSceneLabel: s.directingSceneLabel,
      regeneratingSceneIds: s.regeneratingSceneIds,
      sceneBlueprints: s.sceneBlueprints,
      sceneMotion: s.sceneMotion,
      scriptBeats: s.scriptBeats,
      variationHistory: s.variationHistory,
      savedProjectId: s.savedProjectId,
      generationStartedAt: s.generationStartedAt,
      updateSceneImagePrompt: s.updateSceneImagePrompt,
      regenerateSceneImage: s.regenerateSceneImage,
      generateSceneVariations: s.generateSceneVariations,
      selectStoryboardVersion: s.selectStoryboardVersion,
      restoreSceneImageUrl: s.restoreSceneImageUrl,
      storyBible: s.storyBible,
      style: s.style,
      characterDescription: s.characterDescription,
    }))
  )

  const projectKey = state.savedProjectId || 'quick-draft'

  const storyboardProgress = useMemo(
    () =>
      resolveStoryboardSceneProgress({
        generationStep: state.generationStep,
        sectionStatus: state.sectionStatus,
        scenes: state.scenes,
        directingSceneLabel: state.directingSceneLabel,
      }),
    [state.generationStep, state.sectionStatus, state.scenes, state.directingSceneLabel]
  )

  const batchLoading = state.isGenerating && state.generationStep === 'images'
  const scenes = state.scenes

  useEffect(() => {
    if (!storyboardProgress?.isActive) return
    const idx = Math.max(0, storyboardProgress.currentSceneIndex - 1)
    setActiveIndex(idx)
  }, [storyboardProgress?.isActive, storyboardProgress?.currentSceneIndex])

  const safeIndex = Math.min(Math.max(0, activeIndex), Math.max(0, scenes.length - 1))
  const scene = scenes[safeIndex]
  const sceneReady = scene ? sceneHasReviewableImage(scene) : false
  const sceneBusy = scene ? state.regeneratingSceneIds.includes(scene.id) : false
  const canControlScene = sceneReady && !sceneBusy

  const sceneStatus = scene
    ? resolveSceneCardStatus({
        scene,
        index: safeIndex,
        completedImageCount: storyboardProgress?.completedCount ?? 0,
        currentSceneIndex: storyboardProgress?.currentSceneIndex ?? 1,
        isStoryboardActive: Boolean(storyboardProgress?.isActive || batchLoading),
        isRegenerating: state.regeneratingSceneIds.includes(scene.id),
      })
    : 'pending'

  const previewUrl = scene
    ? scene.imageUrl?.trim() ||
      scene.variationImageUrl?.trim() ||
      (sceneStatus !== 'generating' ? resolveScenePreviewUrl(scene, safeIndex) : null)
    : null

  const directorNotes = useMemo(
    () =>
      scene
        ? resolveSceneDirectorNotes(
            scene,
            safeIndex,
            scenes.length,
            state.sceneBlueprints,
            state.sceneMotion
          )
        : null,
    [scene, safeIndex, scenes.length, state.sceneBlueprints, state.sceneMotion]
  )

  const originalPrompt = scene?.imagePrompt?.trim() || scene?.visualPrompt?.trim() || ''

  const activityStamp = useMemo(() => {
    if (!mounted || !scene || !state.generationStartedAt) return null
    const log = getGenerationActivityLog()
    const hit = log.find((e) => e.id === 'storyboard' || e.label.toLowerCase().includes('storyboard'))
    return hit ? formatActivityElapsed(hit.at, state.generationStartedAt) : null
  }, [mounted, scene, state.generationStartedAt, sceneStatus])

  const blueprint = scene
    ? state.sceneBlueprints.find((b) => b.sceneId === scene.id) ?? null
    : null

  const qualityMetrics = useMemo(() => {
    if (!scene || !sceneReady) return null
    return computeSceneQualityScore({
      scene,
      index: safeIndex,
      scriptBeats: state.scriptBeats,
      blueprint,
    })
  }, [scene, sceneReady, safeIndex, state.scriptBeats, blueprint])

  const recommendations = useMemo(() => {
    if (!scene || !qualityMetrics) return []
    return buildSceneRecommendations({ scene, blueprint, metrics: qualityMetrics })
  }, [scene, qualityMetrics, blueprint])

  const continuityReport = useMemo(
    () =>
      computeReelContinuityReport({
        scenes: state.scenes,
        storyBible: state.storyBible,
        style: state.style,
        characterDescription: state.characterDescription,
      }),
    [state.scenes, state.storyBible, state.style, state.characterDescription]
  )

  const approvedIds = useMemo(() => {
    void approvalTick
    return mounted ? getApprovedSceneIds(projectKey) : new Set<string>()
  }, [mounted, projectKey, approvalTick])

  const lockedIds = useMemo(() => {
    void approvalTick
    return mounted ? getLockedSceneIds(projectKey) : new Set<string>()
  }, [mounted, projectKey, approvalTick])

  const sceneReviewStatus = scene && mounted ? getSceneReviewStatus(projectKey, scene.id) : 'pending'
  const sceneApproved = sceneReviewStatus === 'approved' || sceneReviewStatus === 'locked'
  const sceneLocked = sceneReviewStatus === 'locked'

  const trackCompareAfterRegen = useCallback(
    async (run: () => Promise<void>) => {
      if (!scene) return
      const before = scene.imageUrl?.trim()
      await run()
      const after = useQuickCutGenerationStore
        .getState()
        .scenes.find((s) => s.id === scene.id)
        ?.imageUrl?.trim()
      if (before && after && before !== after) {
        setPendingCompare({ currentUrl: before, newUrl: after })
      }
    },
    [scene]
  )

  const handleRegenWithChanges = useCallback(async () => {
    if (!scene || !canControlScene) return
    const enhanced = buildEnhancedScenePrompt(originalPrompt, regenDirection, [])
    await trackCompareAfterRegen(() => state.updateSceneImagePrompt(scene.id, enhanced))
    setRegenDirection('')
    toast.success(`Scene ${safeIndex + 1} regenerating`)
  }, [
    scene,
    canControlScene,
    originalPrompt,
    regenDirection,
    safeIndex,
    state,
    trackCompareAfterRegen,
  ])

  const handleApprove = useCallback(() => {
    if (!scene || sceneLocked) return
    approveScene(projectKey, scene.id)
    setApprovalTick((t) => t + 1)
    toast.success(`Scene ${safeIndex + 1} approved`)
  }, [scene, sceneLocked, projectKey, safeIndex])

  const handleLock = useCallback(() => {
    if (!scene) return
    if (sceneLocked) {
      unlockScene(projectKey, scene.id)
      toast.message(`Scene ${safeIndex + 1} unlocked`)
    } else {
      lockScene(projectKey, scene.id)
      toast.success(`Scene ${safeIndex + 1} locked`)
    }
    setApprovalTick((t) => t + 1)
  }, [scene, sceneLocked, projectKey, safeIndex])

  const goPrev = useCallback(() => {
    setActiveIndex((i) => Math.max(0, i - 1))
  }, [])

  const goNext = useCallback(() => {
    setActiveIndex((i) => Math.min(scenes.length - 1, i + 1))
  }, [scenes.length])

  if (scenes.length === 0) return null

  const showWorkspace =
    state.generationStep === 'images' ||
    state.generationStep === 'scenes' ||
    state.generationStep === 'motion' ||
    state.generationStep === 'voice' ||
    state.generationStep === 'render' ||
    state.generationStep === 'complete' ||
    scenes.some((s) => s.imageUrl?.trim()) ||
    state.isComplete

  if (!showWorkspace) return null

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/15 bg-gradient-to-b from-black/50 to-black/30 p-3 sm:p-4 space-y-4',
        className
      )}
      aria-label="Scene workspace"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <Clapperboard className="w-3 h-3 shrink-0" aria-hidden />
          <span>Scene Review Workspace</span>
          {storyboardProgress?.isActive ? (
            <span className="text-luxe/45 normal-case tracking-normal">
              · Scene {storyboardProgress.currentSceneIndex} of {storyboardProgress.totalCount}
            </span>
          ) : (
            <span className="text-luxe/45 normal-case tracking-normal">
              · Scene {safeIndex + 1} of {scenes.length}
            </span>
          )}
        </p>
        <SceneApprovalSummary
          projectKey={projectKey}
          scenes={scenes}
          refreshKey={approvalTick}
          className="sm:justify-end"
        />
      </div>

      {scene ? (
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-3 rounded-xl border border-white/[0.08] bg-black/40 p-3">
          <div className="relative aspect-[9/16] max-h-[min(52vh,420px)] mx-auto w-full max-w-[280px] sm:max-w-none sm:aspect-video md:aspect-[16/10] md:max-h-none rounded-lg overflow-hidden bg-black/60 border border-white/[0.06]">
            {sceneStatus === 'generating' && !previewUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 shimmer-cinematic">
                <Loader2 className="w-6 h-6 text-gold-400/60 animate-spin" />
                <p className="text-[11px] text-luxe/50">
                  {state.directingSceneLabel || `Directing Scene ${safeIndex + 1}…`}
                </p>
              </div>
            ) : previewUrl ? (
              <Image src={previewUrl} alt={scene.title} fill sizes="400px" className="object-cover" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-luxe/30 text-[11px] uppercase tracking-wider">
                Pending
              </div>
            )}
            {sceneStatus === 'ready' ? (
              <span
                className={cn(
                  'absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider',
                  sceneLocked && 'bg-gold-500/20 border border-gold-500/35 text-gold-100',
                  !sceneLocked && sceneApproved && 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200',
                  !sceneLocked && !sceneApproved && 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200'
                )}
              >
                {sceneLocked ? (
                  <Lock className="w-3 h-3" aria-hidden />
                ) : sceneApproved ? (
                  <Check className="w-3 h-3" aria-hidden />
                ) : (
                  <Check className="w-3 h-3" aria-hidden />
                )}
                {sceneLocked ? 'Locked' : sceneApproved ? 'Approved' : 'Generated'}
              </span>
            ) : null}
          </div>

          <div className="min-w-0 space-y-2">
            <p className="text-[9px] tracking-[0.18em] uppercase text-luxe/40">
              Scene {String(safeIndex + 1).padStart(2, '0')}
            </p>
            <h3 className="font-display text-base text-luxe leading-snug">
              {scene.title || `Scene ${safeIndex + 1}`}
            </h3>
            <p className="text-[11px] text-luxe/55 leading-relaxed line-clamp-4">
              {resolveSceneScriptText(scene, safeIndex, state.scriptBeats)}
            </p>
            {originalPrompt ? (
              <div className="rounded-lg border border-white/[0.06] bg-black/30 px-2.5 py-2">
                <p className="text-[9px] tracking-[0.16em] uppercase text-gold-300/55 mb-1">Visual Prompt</p>
                <p className="text-[10px] text-luxe/50 leading-relaxed line-clamp-4">{originalPrompt}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2 text-[10px] text-luxe/50">
              <span className="rounded-md border border-white/[0.08] px-2 py-0.5">
                {scene.motionPresetId ? motionPresetLabel(scene.motionPresetId) : 'Motion auto'}
              </span>
              <span className="rounded-md border border-white/[0.08] px-2 py-0.5 tabular-nums">
                {scene.duration ?? 4}s
              </span>
              <span className="rounded-md border border-white/[0.08] px-2 py-0.5 truncate max-w-full">
                {resolveSceneTransition(scene.id, safeIndex + 1, scenes.length, state.sceneMotion)}
              </span>
            </div>
            {sceneStatus === 'ready' ? (
              <p className="text-[10px] text-emerald-300/80 flex items-center gap-1">
                <Check className="w-3 h-3" aria-hidden />
                Image generated successfully
                {activityStamp ? <span className="text-luxe/40 tabular-nums">· {activityStamp}</span> : null}
              </p>
            ) : sceneStatus === 'generating' ? (
              <p className="text-[10px] text-gold-200/80 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                Generating…
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex gap-2 overflow-x-auto scrollbar-luxe pb-1 -mx-1 px-1">
        {scenes.map((s, i) => {
          const thumb =
            s.imageUrl?.trim() ||
            s.variationImageUrl?.trim() ||
            resolveScenePreviewUrl(s, i)
          const st = resolveSceneCardStatus({
            scene: s,
            index: i,
            completedImageCount: storyboardProgress?.completedCount ?? 0,
            currentSceneIndex: storyboardProgress?.currentSceneIndex ?? 1,
            isStoryboardActive: Boolean(storyboardProgress?.isActive || batchLoading),
            isRegenerating: state.regeneratingSceneIds.includes(s.id),
          })
          const selected = i === safeIndex

          return (
            <button
              key={s.id || i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={cn(
                'relative shrink-0 w-[72px] aspect-[9/16] rounded-lg overflow-hidden border transition-all',
                selected
                  ? 'border-gold-400/60 ring-1 ring-gold-400/30'
                  : 'border-white/10 opacity-75 hover:opacity-100'
              )}
              aria-label={`Scene ${i + 1}`}
            >
              {thumb ? (
                <Image src={thumb} alt="" fill sizes="72px" className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-[#1a1208] to-black" />
              )}
              <span className="absolute top-1 left-1 text-[8px] tabular-nums text-gold-200/90 bg-black/70 px-1 rounded">
                {i + 1}
              </span>
              {mounted && lockedIds.has(s.id) ? (
                <span className="absolute top-1 right-1 rounded-full bg-gold-500/80 p-0.5">
                  <Lock className="w-2.5 h-2.5 text-black" aria-hidden />
                </span>
              ) : mounted && approvedIds.has(s.id) ? (
                <span className="absolute top-1 right-1 rounded-full bg-emerald-500/80 p-0.5">
                  <Check className="w-2.5 h-2.5 text-black" aria-hidden />
                </span>
              ) : null}
              <span
                className={cn(
                  'absolute bottom-1 inset-x-1 text-center text-[7px] uppercase tracking-wider py-0.5 rounded',
                  st === 'ready' && 'bg-emerald-500/25 text-emerald-200',
                  st === 'generating' && 'bg-gold-500/25 text-gold-100',
                  st === 'pending' && 'bg-black/60 text-luxe/45'
                )}
              >
                {st === 'ready' ? 'Generated' : st === 'generating' ? '…' : 'Pending'}
              </span>
            </button>
          )
        })}
      </div>

      {pendingCompare && scene ? (
        <SceneVersionCompare
          currentUrl={pendingCompare.currentUrl}
          newUrl={pendingCompare.newUrl}
          sceneLabel={`Scene ${safeIndex + 1}`}
          onKeepCurrent={() => {
            state.restoreSceneImageUrl(scene.id, pendingCompare.currentUrl)
            setPendingCompare(null)
            toast.message('Kept current version')
          }}
          onAcceptNew={() => {
            setPendingCompare(null)
            toast.success('Accepted new version')
          }}
        />
      ) : null}

      <div className="flex gap-1 border-b border-white/[0.06] overflow-x-auto scrollbar-luxe -mx-1 px-1">
        {(['review', 'editor', 'history'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'shrink-0 px-3 py-2 min-h-[40px] text-[9px] uppercase tracking-[0.16em] border-b-2 -mb-px transition touch-manipulation',
              tab === t
                ? 'border-gold-400 text-gold-200'
                : 'border-transparent text-luxe/45 hover:text-luxe/70'
            )}
          >
            {t === 'review' ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Review
              </span>
            ) : t === 'editor' ? (
              <span className="inline-flex items-center gap-1">
                <Pencil className="w-3 h-3" /> Scene Editor
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <History className="w-3 h-3" /> Scene History
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'review' && scene && sceneReady ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={safeIndex < 1}
              className={outlineBtn}
              onClick={goPrev}
              aria-label="Previous scene"
            >
              <ChevronLeft className="w-3 h-3 inline mr-1" />
              Previous
            </button>
            <button
              type="button"
              disabled={safeIndex >= scenes.length - 1}
              className={outlineBtn}
              onClick={goNext}
              aria-label="Next scene"
            >
              Next
              <ChevronRight className="w-3 h-3 inline ml-1" />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <button
              type="button"
              disabled={!canControlScene || sceneApproved || sceneLocked}
              className={cn(goldBtn, 'col-span-2 sm:col-span-1', sceneApproved && 'opacity-60')}
              onClick={handleApprove}
            >
              <Check className="w-3.5 h-3.5" />
              {sceneApproved ? 'Approved' : 'Approve Scene'}
            </button>
            <button
              type="button"
              disabled={!sceneReady}
              className={outlineBtn}
              onClick={handleLock}
            >
              <Lock className="w-3 h-3 inline mr-1.5" />
              {sceneLocked ? 'Unlock Scene' : 'Lock Scene'}
            </button>
            <button
              type="button"
              disabled={!canControlScene || sceneLocked}
              className={outlineBtn}
              onClick={() => setPromptModalOpen(true)}
            >
              <Pencil className="w-3 h-3 inline mr-1.5" />
              Edit Prompt
            </button>
            <button
              type="button"
              disabled={!canControlScene || sceneLocked}
              className={outlineBtn}
              onClick={() =>
                void trackCompareAfterRegen(() => state.regenerateSceneImage(scene.id))
              }
            >
              <RefreshCw className="w-3 h-3 inline mr-1.5" />
              Regenerate Scene
            </button>
            <button
              type="button"
              disabled={!canControlScene || sceneLocked}
              className={outlineBtn}
              onClick={() =>
                void trackCompareAfterRegen(() => state.generateSceneVariations(scene.id))
              }
            >
              <Sparkles className="w-3 h-3 inline mr-1.5" />
              Improve Scene
            </button>
          </div>
          {qualityMetrics ? <SceneQualityScorePanel metrics={qualityMetrics} /> : null}
          <SceneAiRecommendations recommendations={recommendations} />
        </div>
      ) : null}

      {tab === 'editor' && scene ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45">Edit Prompt</p>
            <textarea
              readOnly={!canControlScene}
              value={originalPrompt}
              rows={5}
              aria-label="Scene visual prompt"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-luxe/75 resize-none"
            />
            {canControlScene ? (
              <button type="button" className={outlineBtn} onClick={() => setPromptModalOpen(true)}>
                Open prompt editor…
              </button>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45">Quick Actions</p>
            <button
              type="button"
              disabled={!canControlScene}
              className={outlineBtn}
              onClick={() =>
                void trackCompareAfterRegen(() => state.regenerateSceneImage(scene.id))
              }
            >
              <RefreshCw className="w-3 h-3 inline mr-1.5" />
              Regenerate Image
            </button>
            <button
              type="button"
              disabled={!canControlScene}
              className={outlineBtn}
              onClick={() =>
                void trackCompareAfterRegen(() => state.generateSceneVariations(scene.id))
              }
            >
              <Sparkles className="w-3 h-3 inline mr-1.5" />
              Enhance Visual
            </button>
            <button
              type="button"
              disabled={!canControlScene}
              className={outlineBtn}
              onClick={() =>
                toast.message('Upload replacement', {
                  description: 'Use Director Mode to upload a custom still.',
                })
              }
            >
              <Upload className="w-3 h-3 inline mr-1.5" />
              Upload Replacement
            </button>
            {state.savedProjectId ? (
              <Link href={directorWorkspaceHref(state.savedProjectId, { tab: 'visuals' })} className={outlineBtn}>
                <Clapperboard className="w-3 h-3 inline mr-1.5" />
                Open in Director Mode
              </Link>
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45">Regenerate with Changes</p>
            <textarea
              value={regenDirection}
              onChange={(e) => setRegenDirection(e.target.value)}
              disabled={!canControlScene}
              rows={4}
              placeholder="e.g. make it rainy, golden hour, more cinematic…"
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] text-luxe/75 resize-none placeholder:text-luxe/35 disabled:opacity-50"
            />
            <button
              type="button"
              disabled={!canControlScene}
              className={cn(goldBtn, 'w-full')}
              onClick={() => void handleRegenWithChanges()}
            >
              Regenerate Scene {safeIndex + 1}
            </button>
          </div>
        </div>
      ) : null}

      {tab === 'history' && scene ? (
        <div className="space-y-3">
          <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45">Version History</p>
          <SceneVersionStrip
            sceneId={scene.id}
            versions={state.variationHistory.storyboards}
            selectedVersionId={state.variationHistory.selectedStoryboardByScene[scene.id]}
            onSelect={(id) => {
              state.selectStoryboardVersion(id)
              toast.success('Restored previous version')
            }}
          />
          {state.variationHistory.storyboards.filter((v) => v.sceneId === scene.id).length === 0 ? (
            <p className="text-[11px] text-luxe/45 italic">No prior versions yet — regenerate to create V2, V3…</p>
          ) : (
            <p className="text-[10px] text-luxe/40">Tap a version to restore previous image.</p>
          )}
        </div>
      ) : null}

      {directorNotes && sceneStatus === 'ready' ? (
        <SceneDirectorNotesPanel notes={directorNotes} />
      ) : null}

      {scenes.filter((s) => s.imageUrl?.trim()).length > 0 ? (
        <ReelContinuityChecker report={continuityReport} />
      ) : null}

      {scene && canControlScene ? (
        <ScenePromptEditorModal
          open={promptModalOpen}
          onOpenChange={setPromptModalOpen}
          sceneTitle={scene.title || `Scene ${safeIndex + 1}`}
          sceneNumber={safeIndex + 1}
          originalPrompt={originalPrompt}
          onSave={(prompt) => state.updateSceneImagePrompt(scene.id, prompt)}
        />
      ) : null}
    </section>
  )
}
