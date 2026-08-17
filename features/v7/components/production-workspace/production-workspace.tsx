'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, Download, Loader2, Pause, RotateCcw, WifiOff, X } from 'lucide-react'

import { V7ProductionDownloadButton } from '@/features/v7/components/production-download-button'
import { V7ProductionProgressPanel } from '@/features/v7/components/production-progress-panel'
import { V7ProductionView } from '@/features/v7/components/production-view'
import { WorkspaceConfirmDialog } from '@/features/v7/components/production-workspace/workspace-confirm-dialog'
import { WorkspaceFailedSummary } from '@/features/v7/components/production-workspace/workspace-failed-summary'
import { WorkspaceFinalVideoPanel } from '@/features/v7/components/production-workspace/workspace-final-video-panel'
import { WorkspaceStageNavButton } from '@/features/v7/components/production-workspace/workspace-stage-nav-item'
import { WorkspaceStageReviewHeader } from '@/features/v7/components/production-workspace/workspace-stage-review-header'
import {
  assetDownloadHref,
  useProductionWorkspace,
} from '@/features/v7/hooks/use-production-workspace'
import { useProductionProgress } from '@/features/v7/hooks/use-production-progress'
import { V7_STAGE_LABELS } from '@/types/v7/production'
import type { WorkspacePayload, WorkspaceStageNavItem } from '@/lib/v7/workspace/workspace-view.core'
import type { ScriptReviewScene } from '@/lib/v7/workspace/workspace-script.core'
import type { V7ProductionSnapshot } from '@/types/v7/production'
import { v7HasDeliverableMedia } from '@/lib/v7/deliverable-media.core'

type V7ProductionWorkspaceProps = {
  productionId: string
  snapshot: V7ProductionSnapshot
  onRetry?: () => void
  retrying?: boolean
  onConceptSelected?: () => Promise<void>
  onSnapshotUpdate?: (snapshot: V7ProductionSnapshot) => void
  reconnecting?: boolean
}

function WorkspaceStaleBanner({
  workspace,
  busy,
  onRegenerate,
  onKeep,
}: {
  workspace: WorkspacePayload
  busy: boolean
  onRegenerate: () => void
  onKeep: () => void
}) {
  if (workspace.staleStages.length === 0 && workspace.affectedLabels.length === 0) return null

  return (
    <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-amber-100">Downstream outputs may be stale</p>
          <p className="mt-1 text-sm text-amber-100/80">
            Affected: {workspace.affectedLabels.join(', ') || workspace.staleStages.map((s) => s.label).join(', ')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onRegenerate}
              className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Regenerate affected stages
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onKeep}
              className="rounded-lg border border-amber-300/30 px-4 py-2 text-sm font-semibold text-amber-100 disabled:opacity-50"
            >
              Keep existing outputs
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ContinueSceneDialog({
  open,
  sceneLabel,
  previewNarration,
  previewVisual,
  onClose,
  onSubmit,
  busy,
}: {
  open: boolean
  sceneLabel: string
  previewNarration: string
  previewVisual: string
  onClose: () => void
  onSubmit: (idea: string, durationSec: number, generateMedia: boolean) => void
  busy: boolean
}) {
  const [idea, setIdea] = useState('')
  const [durationSec, setDurationSec] = useState(10)

  useEffect(() => {
    if (open) {
      setIdea('')
      setDurationSec(10)
    }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Continue {sceneLabel}</h3>
          <button type="button" onClick={onClose} className="text-white/50 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-4 space-y-2 rounded-xl bg-white/5 p-3 text-sm text-white/70">
          <p><span className="text-white/45">Previous narration:</span> {previewNarration}</p>
          <p><span className="text-white/45">Previous visual:</span> {previewVisual}</p>
        </div>
        <label className="block text-sm text-white/70">
          What happens next?
          <textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
            placeholder="Describe the continuation with narrative and visual continuity..."
          />
        </label>
        <label className="mt-4 block text-sm text-white/70">
          Duration
          <select
            value={durationSec}
            onChange={(e) => setDurationSec(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white"
          >
            <option value={5}>5 sec</option>
            <option value={10}>10 sec</option>
            <option value={15}>15 sec</option>
          </select>
        </label>
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !idea.trim()}
            onClick={() => onSubmit(idea.trim(), durationSec, false)}
            className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
          >
            Save continuation
          </button>
          <button
            type="button"
            disabled={busy || !idea.trim()}
            onClick={() => onSubmit(idea.trim(), durationSec, true)}
            className="rounded-lg border border-[#D4AF37]/40 px-4 py-2 text-sm font-semibold text-[#E6C76A] disabled:opacity-50"
          >
            Generate continuation
          </button>
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-white/60">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ScriptEditor({
  scenes,
  onSave,
  onCancel,
  busy,
}: {
  scenes: ScriptReviewScene[]
  onSave: (edits: Array<{ number: number; narration: string; action: string; duration: number; camera: string; lighting: string }>) => void
  onCancel: () => void
  busy: boolean
}) {
  const [drafts, setDrafts] = useState(scenes)

  useEffect(() => setDrafts(scenes), [scenes])

  return (
    <div className="space-y-4">
      {drafts.map((scene) => (
        <div key={scene.number} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="mb-3 font-semibold text-white">
            Scene {String(scene.number).padStart(2, '0')} — {scene.title}
          </h4>
          <label className="block text-sm text-white/60">
            Narration
            <textarea
              value={scene.narration}
              onChange={(e) =>
                setDrafts((prev) =>
                  prev.map((row) => (row.number === scene.number ? { ...row, narration: e.target.value } : row))
                )
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <label className="mt-3 block text-sm text-white/60">
            Visual
            <textarea
              value={scene.action}
              onChange={(e) =>
                setDrafts((prev) =>
                  prev.map((row) => (row.number === scene.number ? { ...row, action: e.target.value } : row))
                )
              }
              rows={3}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block text-sm text-white/60">
              Duration (s)
              <input
                type="number"
                min={1}
                value={scene.duration}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((row) =>
                      row.number === scene.number ? { ...row, duration: Number(e.target.value) } : row
                    )
                  )
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-white/60">
              Camera
              <input
                value={scene.camera}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((row) => (row.number === scene.number ? { ...row, camera: e.target.value } : row))
                  )
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm text-white/60">
              Lighting
              <input
                value={scene.lighting}
                onChange={(e) =>
                  setDrafts((prev) =>
                    prev.map((row) => (row.number === scene.number ? { ...row, lighting: e.target.value } : row))
                  )
                }
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            onSave(
              drafts.map((scene) => ({
                number: scene.number,
                narration: scene.narration,
                action: scene.action,
                duration: scene.duration,
                camera: scene.camera,
                lighting: scene.lighting,
              }))
            )
          }
          className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Save changes
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-4 py-2 text-sm text-white/60">
          Cancel
        </button>
      </div>
    </div>
  )
}

function VoiceReviewPanel({
  productionId,
  workspace,
  onSaveVoice,
  busy,
}: {
  productionId: string
  workspace: WorkspacePayload
  onSaveVoice: (segments: Array<{ sceneNumber: number; text: string }>) => Promise<void>
  busy: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [segments, setSegments] = useState(
    workspace.scenes.map((scene) => ({ sceneNumber: scene.sceneNumber, text: scene.narration }))
  )

  useEffect(() => {
    setSegments(workspace.scenes.map((scene) => ({ sceneNumber: scene.sceneNumber, text: scene.narration })))
  }, [workspace.scenes])

  return (
    <div className="space-y-4">
      {workspace.voiceUrl ? <audio controls src={workspace.voiceUrl} className="w-full" /> : null}
      {workspace.voiceStale ? <p className="text-sm text-amber-300">Voice may be stale after recent edits.</p> : null}
      {editing ? (
        <div className="space-y-3">
          {segments.map((segment) => (
            <label key={segment.sceneNumber} className="block text-sm text-white/60">
              Scene {String(segment.sceneNumber).padStart(2, '0')} narration
              <textarea
                value={segment.text}
                onChange={(e) =>
                  setSegments((prev) =>
                    prev.map((row) =>
                      row.sceneNumber === segment.sceneNumber ? { ...row, text: e.target.value } : row
                    )
                  )
                }
                rows={2}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-white"
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                void onSaveVoice(segments).then(() => setEditing(false))
              }}
              className="rounded-lg bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
            >
              Save narration changes
            </button>
            <button type="button" onClick={() => setEditing(false)} className="rounded-lg px-4 py-2 text-sm text-white/60">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white"
        >
          Edit voice narration
        </button>
      )}
      <a
        href={assetDownloadHref(productionId, 'voice')}
        className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90"
      >
        <Download className="h-4 w-4" /> Download voice
      </a>
    </div>
  )
}

function StageReviewPanel({
  activeStage,
  workspace,
  productionId,
  stageNavItem,
  onContinueScene,
  onRegenerateScene,
  onSaveVoice,
  editingScript,
  setEditingScript,
  onSaveScript,
  scriptBusy,
}: {
  activeStage: WorkspaceStageNavItem['stageId']
  workspace: WorkspacePayload
  productionId: string
  stageNavItem: WorkspaceStageNavItem | undefined
  onContinueScene: (sceneId: string) => void
  onRegenerateScene: (sceneId: string) => void
  onSaveVoice: (segments: Array<{ sceneNumber: number; text: string }>) => Promise<void>
  editingScript: boolean
  setEditingScript: (value: boolean) => void
  onSaveScript: (edits: Array<{ number: number; narration: string; action: string; duration: number; camera: string; lighting: string }>) => void
  scriptBusy: boolean
}) {
  const sceneCount = workspace.scenes.length
  const imageCount = workspace.scenes.filter((scene) => scene.imageUrl).length
  const clipCount = workspace.scenes.filter((scene) => scene.videoUrl).length

  const summary =
    activeStage === 'image'
      ? imageCount > 0
        ? `${imageCount} scene${imageCount === 1 ? '' : 's'}`
        : null
      : activeStage === 'animation'
        ? clipCount > 0
          ? `${clipCount} clip${clipCount === 1 ? '' : 's'}`
          : null
        : activeStage === 'sound'
          ? sceneCount > 0
            ? `${sceneCount} clip${sceneCount === 1 ? '' : 's'}`
            : null
          : null

  if (activeStage === 'final') {
    return <WorkspaceFinalVideoPanel productionId={productionId} workspace={workspace} />
  }

  if (activeStage === 'script') {
    if (editingScript) {
      return (
        <ScriptEditor
          scenes={workspace.script.scenes}
          onSave={onSaveScript}
          onCancel={() => setEditingScript(false)}
          busy={scriptBusy}
        />
      )
    }

    return (
      <div className="space-y-4">
        <WorkspaceStageReviewHeader stage={stageNavItem} summary={`${workspace.script.scenes.length} scenes`} />
        {workspace.script.hook ? (
          <p className="rounded-xl bg-white/5 p-3 text-sm text-white/80">
            <span className="font-semibold text-white">Hook:</span> {workspace.script.hook}
          </p>
        ) : null}
        {workspace.script.scenes.map((scene) => (
          <article key={scene.number} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h4 className="font-semibold text-white">
              Scene {String(scene.number).padStart(2, '0')} — {scene.title}
            </h4>
            <p className="mt-2 text-sm text-white/45">{scene.duration}s · {scene.location}</p>
            <p className="mt-3 text-sm text-white/80"><span className="text-white/45">Narration:</span> {scene.narration}</p>
            <p className="mt-2 text-sm text-white/80"><span className="text-white/45">Visual:</span> {scene.action}</p>
          </article>
        ))}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditingScript(true)}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white"
          >
            Edit script
          </button>
          <a
            href={assetDownloadHref(productionId, 'script')}
            className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90"
          >
            <Download className="h-4 w-4" /> Download script
          </a>
        </div>
      </div>
    )
  }

  if (activeStage === 'voice') {
    return (
      <div className="space-y-4">
        <WorkspaceStageReviewHeader stage={stageNavItem} />
        <VoiceReviewPanel
          productionId={productionId}
          workspace={workspace}
          onSaveVoice={onSaveVoice}
          busy={scriptBusy}
        />
      </div>
    )
  }

  if (activeStage === 'image' || activeStage === 'animation') {
    return (
      <div className="space-y-4">
        <WorkspaceStageReviewHeader stage={stageNavItem} summary={summary} />
        <div className="flex flex-wrap gap-2">
          {activeStage === 'image' && imageCount > 0 ? (
            <details className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85">
              <summary className="cursor-pointer font-semibold">Download all images</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {workspace.scenes
                  .filter((scene) => scene.imageUrl)
                  .map((scene) => (
                    <a
                      key={scene.sceneId}
                      href={assetDownloadHref(productionId, 'image', scene.sceneId)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs"
                    >
                      Scene {scene.displayNumber}
                    </a>
                  ))}
              </div>
            </details>
          ) : null}
          {activeStage === 'animation' && clipCount > 0 ? (
            <details className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/85">
              <summary className="cursor-pointer font-semibold">Download all clips</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {workspace.scenes
                  .filter((scene) => scene.videoUrl)
                  .map((scene) => (
                    <a
                      key={scene.sceneId}
                      href={assetDownloadHref(productionId, 'video', scene.sceneId)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs"
                    >
                      Scene {scene.displayNumber}
                    </a>
                  ))}
              </div>
            </details>
          ) : null}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {workspace.scenes.map((scene) => (
          <div key={scene.sceneId} className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-sm font-semibold text-white">Scene {scene.displayNumber}</p>
            {activeStage === 'image' && scene.imageUrl ? (
              <img src={scene.imageUrl} alt="" className="aspect-[9/16] w-full rounded-lg object-cover" />
            ) : null}
            {activeStage === 'animation' && scene.videoUrl ? (
              <video src={scene.videoUrl} controls playsInline className="aspect-[9/16] w-full rounded-lg bg-black object-contain" />
            ) : null}
            <p className="mt-2 line-clamp-3 text-xs text-white/55">{scene.visual}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {scene.imageUrl ? (
                <a
                  href={assetDownloadHref(productionId, 'image', scene.sceneId)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/85"
                >
                  Download image
                </a>
              ) : null}
              {scene.videoUrl ? (
                <a
                  href={assetDownloadHref(productionId, 'video', scene.sceneId)}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/85"
                >
                  Download video
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => onContinueScene(scene.sceneId)}
                className="rounded-lg bg-[#D4AF37]/15 px-3 py-1.5 text-xs font-semibold text-[#E6C76A]"
              >
                Continue scene
              </button>
              <button
                type="button"
                onClick={() => onRegenerateScene(scene.sceneId)}
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/85"
              >
                <RotateCcw className="h-3 w-3" /> Regenerate
              </button>
            </div>
          </div>
        ))}
        </div>
      </div>
    )
  }

  if (activeStage === 'music') {
    return (
      <div className="space-y-4">
        <WorkspaceStageReviewHeader stage={stageNavItem} />
        {workspace.musicUrl ? <audio controls src={workspace.musicUrl} className="w-full" /> : null}
        {workspace.musicStale ? <p className="text-sm text-amber-300">Music may be stale after recent edits.</p> : null}
        <a
          href={assetDownloadHref(productionId, 'music')}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90"
        >
          <Download className="h-4 w-4" /> Download music
        </a>
      </div>
    )
  }

  if (activeStage === 'sound') {
    return (
      <div className="space-y-4">
        <WorkspaceStageReviewHeader stage={stageNavItem} summary={summary} />
        <div className="space-y-3">
          {workspace.scenes.map((scene) => (
            <div key={scene.sceneId} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-sm font-semibold text-white">Scene {scene.displayNumber}</p>
              <p className="text-xs text-white/55">{scene.mood || 'Scene-derived sound effects'}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (activeStage === 'edit') {
    return (
      <div className="space-y-4">
        <WorkspaceStageReviewHeader stage={stageNavItem} />
        <p className="text-sm text-white/70">Caption and timeline outputs from the completed edit stage.</p>
        <a
          href={assetDownloadHref(productionId, 'captions')}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/90"
        >
          <Download className="h-4 w-4" /> Download captions
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <WorkspaceStageReviewHeader stage={stageNavItem} />
      <p className="text-sm text-white/50">Select a completed stage to review its output.</p>
    </div>
  )
}

export function V7ProductionWorkspace({
  productionId,
  snapshot,
  onRetry,
  retrying,
  onConceptSelected,
  onSnapshotUpdate,
  reconnecting = false,
}: V7ProductionWorkspaceProps) {
  const {
    workspace,
    loading,
    error,
    loadWorkspace,
    runAction,
    saveScript,
    saveVoice,
    continueScene,
    regenerate,
  } = useProductionWorkspace(productionId)

  const progress = useProductionProgress(snapshot)
  const [activeStage, setActiveStage] = useState<WorkspaceStageNavItem['stageId']>('final')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [editingScript, setEditingScript] = useState(false)
  const [continueSceneId, setContinueSceneId] = useState<string | null>(null)
  const [pendingAction, setPendingAction] = useState<'cancel' | 'close' | null>(null)

  const showWorkspaceChrome = v7HasDeliverableMedia(snapshot.production) || snapshot.production.status === 'completed'
  const isProducing =
    !workspace?.cancelled &&
    snapshot.production.status !== 'completed' &&
    snapshot.production.status !== 'failed'
  const currentStageLabel =
    progress?.currentStageLabel ??
    (snapshot.production.current_stage ? V7_STAGE_LABELS[snapshot.production.current_stage]?.label : null)

  useEffect(() => {
    if (showWorkspaceChrome) {
      void loadWorkspace()
    }
  }, [loadWorkspace, showWorkspaceChrome])

  const continueSceneRow = useMemo(
    () => workspace?.scenes.find((scene) => scene.sceneId === continueSceneId) ?? null,
    [continueSceneId, workspace]
  )

  const activeStageNavItem = useMemo(
    () => workspace?.stageNav.find((stage) => stage.stageId === activeStage),
    [activeStage, workspace]
  )

  const syncSnapshotFromAction = (data: {
    production: V7ProductionSnapshot['production']
    stages: V7ProductionSnapshot['stages']
    scenes: V7ProductionSnapshot['scenes']
    timeline: V7ProductionSnapshot['timeline']
  }) => {
    onSnapshotUpdate?.({
      production: data.production,
      stages: data.stages,
      scenes: data.scenes,
      timeline: data.timeline,
      pipeline_blocked: snapshot.pipeline_blocked,
      block_reason: snapshot.block_reason,
    })
  }

  const handleAction = async (action: 'cancel' | 'close' | 'reopen') => {
    setBusy(true)
    setActionError(null)
    try {
      const data = await runAction(action)
      if (data) syncSnapshotFromAction(data)
      setPendingAction(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const handleSaveVoice = async (segments: Array<{ sceneNumber: number; text: string }>) => {
    setBusy(true)
    setActionError(null)
    try {
      await saveVoice(segments)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Voice save failed')
      throw err
    } finally {
      setBusy(false)
    }
  }

  const handleSaveScript = async (
    edits: Array<{ number: number; narration: string; action: string; duration: number; camera: string; lighting: string }>
  ) => {
    setBusy(true)
    setActionError(null)
    try {
      await saveScript(edits)
      setEditingScript(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Script save failed')
    } finally {
      setBusy(false)
    }
  }

  const handleContinueScene = async (idea: string, durationSec: number, generateMedia: boolean) => {
    if (!continueSceneId) return
    setBusy(true)
    setActionError(null)
    try {
      await continueScene({
        afterSceneId: continueSceneId,
        continuationIdea: idea,
        durationSec,
        generateMedia,
      })
      setContinueSceneId(null)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Continue scene failed')
    } finally {
      setBusy(false)
    }
  }

  if (!showWorkspaceChrome) {
    return (
      <V7ProductionView
        snapshot={snapshot}
        onRetry={onRetry}
        retrying={retrying}
        onConceptSelected={onConceptSelected}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]/80">Production workspace</p>
          <h1 className="mt-2 font-display text-2xl font-semibold text-white sm:text-3xl">
            {snapshot.production.title}
          </h1>
          <p className="mt-2 line-clamp-2 text-sm text-white/50">{snapshot.production.prompt}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/45">
            {workspace ? (
              <span className="rounded-full border border-white/10 px-2 py-1">
                Status: {workspace.lifecycleLabel}
              </span>
            ) : null}
            <span>Created: {format(parseISO(snapshot.production.created_at), 'd MMM yyyy')}</span>
            {workspace?.brief?.duration ? <span>Duration: {workspace.brief.duration}s</span> : null}
            {workspace?.brief?.aspectRatio ? <span>{workspace.brief.aspectRatio}</span> : null}
            {currentStageLabel && isProducing ? (
              <span className="text-[#E6C76A]/80">Current stage: {currentStageLabel}</span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/projects" className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80">
            Project library
          </Link>
          {isProducing ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setPendingAction('cancel')}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400/60"
            >
              <Pause className="h-4 w-4" aria-hidden /> Cancel production
            </button>
          ) : null}
          {!workspace?.closed && (snapshot.production.status === 'completed' || snapshot.production.status === 'failed' || workspace?.cancelled) ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setPendingAction('close')}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]/60"
            >
              Close project
            </button>
          ) : workspace?.closed ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAction('reopen')}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white"
            >
              Reopen project
            </button>
          ) : null}
          <V7ProductionDownloadButton productionId={productionId} title={snapshot.production.title} compact />
        </div>
      </header>

      {reconnecting ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/60">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          Reconnecting…
        </p>
      ) : null}

      {isProducing && progress ? (
        <V7ProductionProgressPanel progress={progress} className="mb-6" onRetry={onRetry} retrying={retrying} />
      ) : null}

      {(error || actionError) && !reconnecting ? (
        <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error || actionError}
        </p>
      ) : null}

      {loading && !workspace ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" />
        </div>
      ) : null}

      {workspace ? (
        <>
          {(snapshot.production.status === 'failed' || workspace.stageNav.some((stage) => stage.status === 'failed')) &&
          !isProducing ? (
            <WorkspaceFailedSummary
              snapshot={snapshot}
              workspace={workspace}
              onRetry={onRetry}
              onClose={() => setPendingAction('close')}
              retrying={retrying}
            />
          ) : null}

          <WorkspaceStaleBanner
            workspace={workspace}
            busy={busy}
            onRegenerate={() => void regenerate('affected')}
            onKeep={() => void regenerate('keep')}
          />

          <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="space-y-2">
              <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/35">Stages</p>
              {workspace.stageNav.map((stage) => (
                <WorkspaceStageNavButton
                  key={stage.stageId}
                  stage={stage}
                  active={activeStage === stage.stageId}
                  onClick={() => setActiveStage(stage.stageId)}
                />
              ))}
            </aside>

            <section className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-6">
              <StageReviewPanel
                activeStage={activeStage}
                workspace={workspace}
                productionId={productionId}
                stageNavItem={activeStageNavItem}
                onContinueScene={setContinueSceneId}
                onRegenerateScene={(sceneId) => void regenerate('scene', sceneId)}
                editingScript={editingScript}
                setEditingScript={setEditingScript}
                onSaveScript={handleSaveScript}
                onSaveVoice={handleSaveVoice}
                scriptBusy={busy}
              />
            </section>
          </div>
        </>
      ) : null}

      {!workspace?.cancelled && snapshot.production.status !== 'completed' ? (
        <div className="mt-8 border-t border-white/10 pt-8">
          <V7ProductionView
            snapshot={snapshot}
            onRetry={onRetry}
            retrying={retrying}
            onConceptSelected={onConceptSelected}
            className="max-w-none px-0 py-0"
            hideProgressChrome
          />
        </div>
      ) : null}

      <ContinueSceneDialog
        open={Boolean(continueSceneId && continueSceneRow)}
        sceneLabel={continueSceneRow ? `Scene ${continueSceneRow.displayNumber}` : 'Scene'}
        previewNarration={continueSceneRow?.narration ?? ''}
        previewVisual={continueSceneRow?.visual ?? ''}
        onClose={() => setContinueSceneId(null)}
        onSubmit={handleContinueScene}
        busy={busy}
      />

      <WorkspaceConfirmDialog
        open={pendingAction === 'cancel'}
        title="Cancel this production?"
        description="Completed work will be preserved."
        detail={currentStageLabel ? `Current stage: ${currentStageLabel}` : null}
        confirmLabel="Cancel production"
        cancelLabel="Keep running"
        confirmTone="danger"
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void handleAction('cancel')}
      />

      <WorkspaceConfirmDialog
        open={pendingAction === 'close'}
        title="Close this project?"
        description="The production will move out of the active workspace. Your generated assets will remain available."
        confirmLabel="Close project"
        busy={busy}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void handleAction('close')}
      />
    </div>
  )
}
