'use client'

import { useMemo } from 'react'
import { Clapperboard, Sparkles, Wand2 } from 'lucide-react'
import {
  analyzeSceneQuality,
  buildContinuityAutoFixes,
  buildDirectorRecommendationsV2,
  buildRetentionHints,
  computeReelDirectorScore,
  resolveAiDirectorCommentary,
} from '@/lib/quick-cut/ai-director'
import { computeReelContinuityReport } from '@/lib/quick-cut/scene-review-queue'
import { cn } from '@/lib/utils'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useShallow } from 'zustand/react/shallow'

type AiDirectorPanelProps = {
  className?: string
  compact?: boolean
}

function ScorePill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-black/35 px-2.5 py-1.5">
      <p className="text-[8px] uppercase tracking-wider text-luxe/40">{label}</p>
      <p className="text-sm font-display tabular-nums text-gold-200/95">{value}</p>
    </div>
  )
}

/** Phase 5 — unified reel score, continuity auto-fix, retention, commentary. */
export function AiDirectorPanel({ className, compact = false }: AiDirectorPanelProps) {
  const state = useQuickCutGenerationStore(
    useShallow((s) => ({
      scenes: s.scenes,
      scriptBeats: s.scriptBeats,
      sceneBlueprints: s.sceneBlueprints,
      storyBible: s.storyBible,
      style: s.style,
      characterDescription: s.characterDescription,
      sectionStatus: s.sectionStatus,
      sceneMotion: s.sceneMotion,
      duration: s.duration,
      generationStep: s.generationStep,
      isGenerating: s.isGenerating,
      isRenderingVideo: s.isRenderingVideo,
      directingSceneLabel: s.directingSceneLabel,
      hookProgressLabel: s.hookProgressLabel,
      renderStatusLabel: s.renderStatusLabel,
    }))
  )

  const reelScore = useMemo(
    () =>
      computeReelDirectorScore({
        scenes: state.scenes,
        scriptBeats: state.scriptBeats,
        sceneBlueprints: state.sceneBlueprints,
        storyBible: state.storyBible,
        style: state.style,
        characterDescription: state.characterDescription,
        sectionStatus: state.sectionStatus,
      }),
    [state]
  )

  const continuity = useMemo(
    () =>
      computeReelContinuityReport({
        scenes: state.scenes,
        storyBible: state.storyBible,
        style: state.style,
        characterDescription: state.characterDescription,
      }),
    [state.scenes, state.storyBible, state.style, state.characterDescription]
  )

  const autoFixes = useMemo(
    () =>
      buildContinuityAutoFixes({
        scenes: state.scenes,
        continuity,
        characterDescription: state.characterDescription,
        storyBible: state.storyBible,
      }),
    [state.scenes, continuity, state.characterDescription, state.storyBible]
  )

  const retentionHints = useMemo(
    () =>
      buildRetentionHints({
        scenes: state.scenes,
        sectionStatus: state.sectionStatus,
        targetDurationSec: state.duration,
      }),
    [state.scenes, state.sectionStatus, state.duration]
  )

  const sceneAnalysis = useMemo(
    () =>
      analyzeSceneQuality({
        scenes: state.scenes,
        scriptBeats: state.scriptBeats,
        sceneBlueprints: state.sceneBlueprints,
      }),
    [state.scenes, state.scriptBeats, state.sceneBlueprints]
  )

  const commentary = useMemo(
    () =>
      resolveAiDirectorCommentary(
        {
          generationStep: state.generationStep,
          sectionStatus: state.sectionStatus,
          directingSceneLabel: state.directingSceneLabel,
          hookProgressLabel: state.hookProgressLabel,
          isRenderingVideo: state.isRenderingVideo,
          renderStatusLabel: state.renderStatusLabel,
          scenesCount: state.scenes.length,
          scenesWithImages: state.scenes.filter((s) => s.imageUrl?.trim()).length,
        },
        reelScore
      ),
    [state, reelScore]
  )

  const hasContent = state.scenes.length > 0 || state.isGenerating
  if (!hasContent) return null

  const directorRecs = useMemo(
    () =>
      buildDirectorRecommendationsV2({
        scenes: state.scenes,
        scriptBeats: state.scriptBeats,
        sceneBlueprints: state.sceneBlueprints,
        sceneMotion: state.sceneMotion,
        sectionStatus: state.sectionStatus,
      }),
    [state]
  )

  const weakScenes = sceneAnalysis.filter((s) => s.metrics.overall < 68).slice(0, 3)

  return (
    <section
      className={cn(
        'rounded-xl border border-gold-500/15 bg-gradient-to-b from-black/50 to-black/30 p-3 space-y-3',
        className
      )}
      aria-label="AI Director"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] tracking-[0.22em] uppercase text-gold-300/85 flex items-center gap-1.5">
          <Clapperboard className="w-3 h-3" aria-hidden />
          AI Director
        </p>
        <p className="text-xl font-display tabular-nums text-gold-200/95">{reelScore.overall}</p>
      </div>

      {commentary ? (
        <p className="text-[11px] text-luxe/60 italic border-l-2 border-gold-500/30 pl-2.5">
          {commentary}
        </p>
      ) : null}

      <div className={cn('grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-5')}>
        <ScorePill label="Reel Score" value={reelScore.overall} />
        <ScorePill label="Continuity" value={reelScore.continuity} />
        <ScorePill label="Retention" value={reelScore.retention} />
        <ScorePill label="Story" value={reelScore.storyReadiness} />
        <ScorePill label="Visual" value={reelScore.visualScore} />
      </div>

      <div className="space-y-1.5">
        <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45">Recommendations</p>
        <ul className="space-y-1">
          {directorRecs.map((rec) => (
            <li key={rec.id} className="text-[10px] text-luxe/55">
              <span className="text-gold-200/85">{rec.label}</span> — {rec.detail}
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-1.5">
        <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45 flex items-center gap-1">
          <Wand2 className="w-3 h-3" aria-hidden />
          Continuity Auto-Fix
        </p>
        <ul className="space-y-1">
          {autoFixes.map((fix) => (
            <li key={fix.id} className="text-[10px] text-luxe/55">
              <span className="text-gold-200/85">{fix.label}</span> — {fix.detail}
            </li>
          ))}
        </ul>
      </div>

      {!compact ? (
        <div className="space-y-1.5">
          <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45 flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden />
            Retention Optimization
          </p>
          <ul className="space-y-1">
            {retentionHints.map((hint) => (
              <li key={hint.id} className="text-[10px] text-luxe/55">
                <span className="text-gold-200/85">{hint.label}</span> — {hint.detail}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {weakScenes.length > 0 && !compact ? (
        <div className="space-y-1">
          <p className="text-[9px] tracking-[0.16em] uppercase text-luxe/45">Scene Quality Analysis</p>
          {weakScenes.map((row) => (
            <p key={row.sceneId} className="text-[10px] text-luxe/50">
              Scene {row.index + 1} · score {row.metrics.overall}
              {row.recommendations > 0 ? ` · ${row.recommendations} recommendations` : ''}
            </p>
          ))}
        </div>
      ) : null}
    </section>
  )
}
