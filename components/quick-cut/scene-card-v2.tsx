'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import { Check, Clock, History, Loader2, Pencil, RefreshCw } from 'lucide-react'
import { ScenePromptEditorModal } from '@/components/quick-cut/scene-prompt-editor-modal'
import { SceneDirectorNotesPanel } from '@/components/quick-cut/scene-director-notes'
import { SceneVersionStrip } from '@/components/quick-cut/scene-version-strip'
import { MotionPresetBadge } from '@/components/quick-cut/motion-preset-control'
import {
  formatTransitionLabel,
  resolveSceneCardStatus,
  resolveSceneDirectorNotes,
  resolveSceneScriptText,
  resolveSceneTransition,
  type SceneCardStatus,
} from '@/lib/quick-cut/scene-card-v2-helpers'
import { motionPresetLabel } from '@/lib/motion/motion-presets'
import { resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import { sceneScrollTargetId } from '@/lib/cinematic/storyboard-scroll'
import type { GeneratedScene } from '@/lib/cinematic/generation'
import type { SceneBlueprint } from '@/lib/cinematic/scene-blueprint'
import type { SceneMotionMap } from '@/lib/motion/scene-motion-types'
import type { MugteeScriptBeat } from '@/lib/cinematic/script-sop'
import type { StoryboardVersion } from '@/lib/cinematic/variation-history'
import { cn } from '@/lib/utils'

const actionBtn =
  'inline-flex items-center gap-1 text-[10px] tracking-wide uppercase text-luxe/55 hover:text-gold-200 disabled:opacity-40 transition-colors'

type SceneCardV2Props = {
  scene: GeneratedScene
  index: number
  totalScenes: number
  status?: SceneCardStatus
  loadingLabel?: string
  interactive?: boolean
  compact?: boolean
  sceneBlueprints?: SceneBlueprint[]
  sceneMotion?: SceneMotionMap
  scriptBeats?: MugteeScriptBeat[]
  storyboardVersions?: StoryboardVersion[]
  selectedVersionId?: string | null
  onEditPrompt?: (enhancedPrompt: string) => void | Promise<void>
  onRegenerate?: () => void | Promise<void>
  onSelectVersion?: (versionId: string) => void
}

function StatusBadge({ status }: { status: SceneCardStatus }) {
  if (status === 'ready') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-emerald-300/90">
        <Check className="w-3 h-3" aria-hidden />
        Image Preview
      </span>
    )
  }
  if (status === 'generating') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-gold-200/90">
        <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
        Generating…
      </span>
    )
  }
  return (
    <span className="text-[9px] uppercase tracking-wider text-luxe/35">Pending</span>
  )
}

export function SceneCardV2({
  scene,
  index,
  totalScenes,
  status: statusProp,
  loadingLabel,
  interactive = false,
  compact = false,
  sceneBlueprints = [],
  sceneMotion = {},
  scriptBeats,
  storyboardVersions = [],
  selectedVersionId,
  onEditPrompt,
  onRegenerate,
  onSelectVersion,
}: SceneCardV2Props) {
  const [promptOpen, setPromptOpen] = useState(false)
  const [versionsOpen, setVersionsOpen] = useState(false)

  const status =
    statusProp ??
    resolveSceneCardStatus({
      scene,
      index,
      completedImageCount: 0,
      currentSceneIndex: 0,
      isStoryboardActive: false,
      isRegenerating: false,
    })

  const previewUrl =
    scene.imageUrl?.trim() ||
    scene.variationImageUrl?.trim() ||
    (status !== 'generating' ? resolveScenePreviewUrl(scene, index) : null)

  const scriptText = resolveSceneScriptText(scene, index, scriptBeats)
  const transition = resolveSceneTransition(scene.id, index + 1, totalScenes, sceneMotion)
  const motionLabel = scene.motionPresetId
    ? motionPresetLabel(scene.motionPresetId)
    : scene.movementStyle || 'Auto'
  const duration = scene.duration ?? 4

  const directorNotes = useMemo(
    () => resolveSceneDirectorNotes(scene, index, totalScenes, sceneBlueprints, sceneMotion),
    [scene, index, totalScenes, sceneBlueprints, sceneMotion]
  )

  const sceneVersions = storyboardVersions.filter((v) => v.sceneId === scene.id)
  const originalPrompt = scene.imagePrompt?.trim() || scene.visualPrompt?.trim() || ''

  return (
    <>
      <article
        id={scene.id ? sceneScrollTargetId(scene.id) : undefined}
        className={cn(
          'rounded-xl border border-white/[0.08] bg-black/40 overflow-hidden scroll-mt-20',
          status === 'generating' && 'border-gold-500/25 shadow-[0_0_16px_rgba(212,175,55,0.08)]',
          status === 'ready' && 'border-gold-500/20',
          status === 'pending' && 'opacity-80'
        )}
      >
        <div className={cn('relative w-full', compact ? 'max-h-[160px]' : 'max-h-[220px]')}>
          <div className={cn('relative aspect-[9/16] w-full bg-black/50', compact && 'max-h-[160px]')}>
            {status === 'generating' && !previewUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 shimmer-cinematic">
                <Loader2 className="w-5 h-5 text-gold-400/60 animate-spin" />
                <p className="text-[10px] text-luxe/50 text-center px-3">
                  {loadingLabel || 'Generating storyboard…'}
                </p>
              </div>
            ) : previewUrl ? (
              <Image
                src={previewUrl}
                alt={scene.title || `Scene ${index + 1}`}
                fill
                sizes="220px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1208] via-[#0d0a06] to-black">
                <span className="text-[10px] tracking-[0.2em] uppercase text-luxe/30">Scene {index + 1}</span>
              </div>
            )}
            <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/70 border border-gold-500/25">
              <span className="text-[9px] tracking-[0.18em] uppercase text-gold-200/90 tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
            </div>
            <div className="absolute top-2 right-2">
              <StatusBadge status={status} />
            </div>
          </div>
        </div>

        <div className="px-3 py-2.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-luxe/90 leading-snug line-clamp-1">
                {scene.title || `Scene ${index + 1}`}
              </h3>
              {scriptText ? (
                <p className="text-[11px] text-luxe/55 leading-relaxed line-clamp-3 mt-1">{scriptText}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] text-luxe/50">
            <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-black/30 px-2 py-0.5">
              {scene.motionPresetId ? (
                <MotionPresetBadge presetId={scene.motionPresetId} />
              ) : (
                <span>{motionLabel}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-white/[0.08] bg-black/30 px-2 py-0.5 tabular-nums">
              <Clock className="w-3 h-3 text-gold-300/50" aria-hidden />
              {duration}s
            </span>
            <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-black/30 px-2 py-0.5 truncate max-w-full">
              {formatTransitionLabel(transition)}
            </span>
          </div>

          {interactive ? (
            <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 border-t border-white/[0.06]">
              {onEditPrompt ? (
                <button
                  type="button"
                  className={actionBtn}
                  onClick={() => setPromptOpen(true)}
                >
                  <Pencil className="w-3 h-3" />
                  Edit Prompt
                </button>
              ) : null}
              {onRegenerate ? (
                <button type="button" className={actionBtn} onClick={() => void onRegenerate()}>
                  <RefreshCw className="w-3 h-3" />
                  Regenerate Scene
                </button>
              ) : null}
              {sceneVersions.length > 0 && onSelectVersion ? (
                <button
                  type="button"
                  className={actionBtn}
                  onClick={() => setVersionsOpen((v) => !v)}
                >
                  <History className="w-3 h-3" />
                  View Versions
                </button>
              ) : null}
            </div>
          ) : null}

          {versionsOpen && sceneVersions.length > 0 && onSelectVersion ? (
            <SceneVersionStrip
              sceneId={scene.id}
              versions={storyboardVersions}
              selectedVersionId={selectedVersionId}
              onSelect={onSelectVersion}
            />
          ) : null}

          {(status === 'ready' || sceneBlueprints.length > 0) && !compact ? (
            <SceneDirectorNotesPanel notes={directorNotes} />
          ) : null}
        </div>
      </article>

      {onEditPrompt ? (
        <ScenePromptEditorModal
          open={promptOpen}
          onOpenChange={setPromptOpen}
          sceneTitle={scene.title || `Scene ${index + 1}`}
          sceneNumber={index + 1}
          originalPrompt={originalPrompt}
          onSave={onEditPrompt}
        />
      ) : null}
    </>
  )
}
