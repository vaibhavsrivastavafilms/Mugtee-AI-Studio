'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useDirectorStudioStore } from '@/stores/director-studio-store'
import { useDirectorSceneVideoStore } from '@/stores/director-scene-video-store'
import { DirectorPanelShell } from '@/components/studio/director/director-panel-shell'
import { directorBtnOutline, directorBtnPrimary } from '@/lib/studio/director-mode-tokens'
import { resolveSceneImageUrl } from '@/lib/director/resolve-scene-image'
import type { MotionPlan, MotionPlanScene } from '@/lib/director/types'
import type { SceneVideoStatus } from '@/lib/video/providers/video-provider'

const DEFAULT_MOTION: MotionPlan = {
  globalPacing: 'Rhythmic cuts aligned to VO beats',
  scenes: [{ sceneIndex: 1, motionStyle: 'Subtle Ken Burns', durationSec: 4, transition: 'Cut' }],
}

const STATUS_LABELS: Record<SceneVideoStatus, string> = {
  queued: 'Queued',
  generating: 'Generating',
  completed: 'Completed',
  failed: 'Failed',
}

const STATUS_STYLES: Record<SceneVideoStatus, string> = {
  queued: 'bg-white/10 text-white/60 border-white/15',
  generating: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  completed: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/30',
  failed: 'bg-red-500/15 text-red-200 border-red-500/30',
}

function StatusBadge({ status }: { status: SceneVideoStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}

function SceneMotionCard({
  scene,
  motion,
  imageUrl,
  videoState,
  isGenerating,
  onGenerate,
}: {
  scene: { sceneIndex: number; visualPrompt?: string }
  motion?: MotionPlanScene
  imageUrl: string | null
  videoState?: { status: SceneVideoStatus; videoUrl?: string | null; errorMessage?: string | null }
  isGenerating: boolean
  onGenerate: () => void
}) {
  const sceneId = String(scene.sceneIndex)
  const status = videoState?.status ?? 'queued'

  return (
    <li className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-3 p-3">
        <div className="shrink-0 w-full sm:w-28 aspect-[9/16] rounded-lg overflow-hidden border border-white/[0.06] bg-black/40">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={`Scene ${scene.sceneIndex} storyboard`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-[10px] text-white/35 px-2 text-center">
              Generate storyboard image first
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-gold-200/90">Scene {scene.sceneIndex}</p>
            {videoState ? <StatusBadge status={status} /> : null}
          </div>

          {scene.visualPrompt ? (
            <p className="text-[11px] text-white/55 line-clamp-2">{scene.visualPrompt}</p>
          ) : null}

          {motion ? (
            <p className="text-[10px] text-white/40">
              {motion.motionStyle} · {motion.durationSec}s · {motion.transition}
            </p>
          ) : null}

          {videoState?.errorMessage ? (
            <p className="text-[10px] text-red-300/80">{videoState.errorMessage}</p>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className={directorBtnPrimary}
              disabled={!imageUrl || isGenerating}
              onClick={onGenerate}
            >
              {isGenerating ? 'Generating…' : 'Generate Scene Video'}
            </button>
          </div>

          {videoState?.videoUrl && status === 'completed' ? (
            <video
              src={videoState.videoUrl}
              controls
              playsInline
              className="mt-2 w-full max-w-xs rounded-lg border border-white/[0.08] bg-black"
            />
          ) : null}
        </div>
      </div>
    </li>
  )
}

export function MotionDirectorPanel() {
  const projectId = useDirectorStudioStore((s) => s.projectId)
  const plan = useDirectorStudioStore((s) => s.motionPlan)
  const storyboardPlan = useDirectorStudioStore((s) => s.storyboardPlan)
  const setPlan = useDirectorStudioStore((s) => s.setMotionPlan)
  const persist = useDirectorStudioStore((s) => s.persistPatch)

  const loadSceneVideos = useDirectorSceneVideoStore((s) => s.loadSceneVideos)
  const generateSceneVideo = useDirectorSceneVideoStore((s) => s.generateSceneVideo)
  const sceneVideoStatus = useDirectorSceneVideoStore((s) => s.sceneVideoStatus)
  const projectScenes = useDirectorSceneVideoStore((s) => s.projectScenes)
  const generatingSceneId = useDirectorSceneVideoStore((s) => s.generatingSceneId)
  const videoError = useDirectorSceneVideoStore((s) => s.error)

  const motionPlan = plan ?? DEFAULT_MOTION

  useEffect(() => {
    if (projectId) void loadSceneVideos(projectId)
  }, [projectId, loadSceneVideos])

  const storyboardScenes =
    storyboardPlan?.scenes?.length
      ? storyboardPlan.scenes
      : motionPlan.scenes.map((s) => ({
          sceneIndex: s.sceneIndex,
          visualPrompt: s.motionStyle,
          cameraSetup: '',
          composition: '',
          mood: '',
          transition: s.transition,
        }))

  return (
    <DirectorPanelShell
      title="Motion Direction"
      subtitle="Per-scene motion style and image-to-video before timeline assembly."
      actions={
        <button
          type="button"
          className={directorBtnOutline}
          onClick={() => {
            setPlan(motionPlan)
            persist({ motionPlan })
          }}
        >
          Save plan
        </button>
      }
    >
      <p className="text-xs text-white/55">{motionPlan.globalPacing}</p>

      {videoError ? (
        <p className="text-xs text-red-300/80">{videoError}</p>
      ) : null}

      <ul className="space-y-3">
        {storyboardScenes.map((scene) => {
          const sceneId = String(scene.sceneIndex)
          const motion = motionPlan.scenes.find((s) => s.sceneIndex === scene.sceneIndex)
          const imageUrl =
            sceneVideoStatus[sceneId]?.sourceImageUrl ??
            resolveSceneImageUrl(projectScenes, sceneId)

          return (
            <SceneMotionCard
              key={scene.sceneIndex}
              scene={scene}
              motion={motion}
              imageUrl={imageUrl}
              videoState={sceneVideoStatus[sceneId]}
              isGenerating={generatingSceneId === sceneId}
              onGenerate={() => void generateSceneVideo(sceneId, motionPlan)}
            />
          )
        })}
      </ul>
    </DirectorPanelShell>
  )
}
