'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Circle, Loader2, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  CharacterProfile,
  CinematicStyle,
  LocationProfile,
  ProductionPlan,
  ScriptScene,
  V3CharacterRow,
  V3LocationRow,
  V3ScenePromptRow,
  V3SceneImageRow,
  V3SceneVideoRow,
  V3SceneRow,
  V3JobRow,
  V3TimelineStage,
} from '@/types/v3/production'
import { ScenePromptViewer } from '@/features/v3/components/scene-prompt-viewer'
import { SceneImageGallery } from '@/features/v3/components/scene-image-gallery'
import { SceneVideoGallery } from '@/features/v3/components/scene-video-gallery'
import { V3ExportPanel } from '@/features/v3/components/export-panel'

type V3ProductionTimelineProps = {
  projectId: string
  timeline: V3TimelineStage[]
  jobs?: V3JobRow[]
  plan: ProductionPlan | null
  prompt: string
  scenes?: V3SceneRow[]
  characters?: V3CharacterRow[]
  locations?: V3LocationRow[]
  scenePrompts?: V3ScenePromptRow[]
  sceneImages?: V3SceneImageRow[]
  sceneVideos?: V3SceneVideoRow[]
  cinematicStyle?: CinematicStyle | null
  onImagesUpdated?: () => void
  onVideosUpdated?: () => void
  onRetryFailed?: () => void | Promise<void>
  reelUrl?: string | null
  exportStatus?: string
  className?: string
}

function StageIcon({ status }: { status: V3TimelineStage['status'] }) {
  if (status === 'completed') {
    return <Check className="h-4 w-4 text-emerald-400" strokeWidth={2.5} />
  }
  if (status === 'running') {
    return <Loader2 className="h-4 w-4 animate-spin text-[#E6C76A]" />
  }
  if (status === 'failed') {
    return <X className="h-4 w-4 text-red-400" />
  }
  return <Circle className="h-4 w-4 text-white/20" />
}

export function V3ProductionTimeline({
  projectId,
  timeline,
  jobs = [],
  plan,
  prompt,
  scenes = [],
  characters = [],
  locations = [],
  scenePrompts = [],
  sceneImages = [],
  sceneVideos = [],
  cinematicStyle = null,
  onImagesUpdated,
  onVideosUpdated,
  onRetryFailed,
  reelUrl = null,
  exportStatus = 'pending',
  className,
}: V3ProductionTimelineProps) {
  const [retrying, setRetrying] = useState(false)
  const failedJob = jobs.find((job) => job.status === 'failed')

  async function retryFailedStage() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/v3/projects/${projectId}/retry`, { method: 'POST' })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Retry failed')
      await onRetryFailed?.()
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className={cn('grid gap-8 lg:grid-cols-[1fr_380px]', className)}>
      <div className="space-y-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#D4AF37]/75">
            Live production
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {plan?.title ?? 'Production in progress'}
          </h1>
          <p className="mt-3 text-sm text-white/55 line-clamp-3">{prompt}</p>
        </div>

        <ul className="space-y-1 rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-4 sm:p-5">
          {timeline.map((stage, index) => (
            <motion.li
              key={stage.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm',
                stage.status === 'running' && 'bg-[#D4AF37]/[0.08]',
                stage.status === 'failed' && 'bg-red-500/[0.08]'
              )}
            >
              <StageIcon status={stage.status} />
              <span
                className={cn(
                  stage.status === 'completed' && 'text-white/85',
                  stage.status === 'running' && 'font-medium text-[#F4E7A8]',
                  stage.status === 'pending' && 'text-white/35',
                  stage.status === 'failed' && 'text-red-200'
                )}
              >
                {stage.label}
              </span>
              {stage.status === 'running' ? (
                <span className="ml-auto text-xs text-white/45">In progress…</span>
              ) : null}
              {stage.status === 'pending' && stage.id !== 'understanding' ? (
                <span className="ml-auto text-xs text-white/30">Waiting…</span>
              ) : null}
            </motion.li>
          ))}
        </ul>

        {failedJob ? (
          <div className="rounded-2xl border border-red-500/25 bg-red-500/[0.06] p-4">
            <p className="text-sm font-medium text-red-200">
              {failedJob.agent} failed
            </p>
            {failedJob.error ? (
              <p className="mt-1 text-sm text-red-200/75">{failedJob.error}</p>
            ) : null}
            <button
              type="button"
              disabled={retrying}
              onClick={() => void retryFailedStage()}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-400/30 px-3 py-1.5 text-xs text-red-100 hover:bg-red-500/10 disabled:opacity-50"
            >
              {retrying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              Retry failed stage
            </button>
          </div>
        ) : null}

        {scenes.length > 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Screenplay & storyboard</p>
            <ul className="mt-4 space-y-4">
              {scenes.map((scene) => {
                const script = scene.script as ScriptScene
                const shotCount =
                  scene.storyboard &&
                  typeof scene.storyboard === 'object' &&
                  'shots' in scene.storyboard &&
                  Array.isArray((scene.storyboard as { shots?: unknown[] }).shots)
                    ? (scene.storyboard as { shots: unknown[] }).shots.length
                    : 0

                return (
                  <li
                    key={scene.id}
                    className="rounded-xl border border-white/[0.06] bg-black/30 p-4"
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="font-medium text-white/90">
                        Scene {scene.number}
                        {script?.title ? `: ${script.title}` : ''}
                      </h3>
                      <span className="text-xs text-white/40">
                        {scene.duration ?? script?.duration ?? 0}s
                        {shotCount > 0 ? ` · ${shotCount} shots` : ''}
                      </span>
                    </div>
                    {script?.narration ? (
                      <p className="mt-2 text-sm leading-relaxed text-white/65">{script.narration}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {characters.length > 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Characters</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {characters.map((row) => {
                const profile = row.appearance_json as CharacterProfile
                return (
                  <li key={row.id} className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
                    {row.reference_image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.reference_image}
                        alt={row.name}
                        className="mb-3 aspect-[3/4] w-full rounded-lg object-cover"
                      />
                    ) : null}
                    <h3 className="font-medium text-white/90">{row.name}</h3>
                    <p className="mt-1 text-xs text-white/45">{profile?.role}</p>
                    <p className="mt-2 line-clamp-3 text-sm text-white/60">{profile?.appearance}</p>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        {locations.length > 0 ? (
          <section className="rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Locations</p>
            <ul className="mt-4 space-y-3">
              {locations.map((row) => {
                const profile = row.profile as LocationProfile
                return (
                  <li key={row.id} className="rounded-xl border border-white/[0.06] bg-black/30 p-4">
                    <h3 className="font-medium text-white/90">{row.name}</h3>
                    <p className="mt-2 text-sm text-white/60">{profile?.environment}</p>
                    <p className="mt-1 text-xs text-white/40">
                      {profile?.lighting} · {profile?.weather}
                    </p>
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}

        <ScenePromptViewer scenes={scenes} scenePrompts={scenePrompts} />

        <SceneImageGallery
          projectId={projectId}
          scenes={scenes}
          sceneImages={sceneImages}
          onRegenerated={onImagesUpdated}
        />

        <SceneVideoGallery
          projectId={projectId}
          scenes={scenes}
          sceneVideos={sceneVideos}
          onRegenerated={onVideosUpdated ?? onImagesUpdated}
        />

        <V3ExportPanel
          projectId={projectId}
          reelUrl={reelUrl}
          exportStatus={exportStatus}
          title={plan?.title ?? 'Production'}
        />
      </div>

      {plan ? (
        <aside className="rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[#111111] p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Production plan</p>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              ['Duration', `${plan.duration}s`],
              ['Platform', plan.platform],
              ['Language', plan.language],
              ['Aspect', plan.aspectRatio],
              ['Style', plan.style],
              ['Scenes', String(plan.sceneCount)],
              ['Voice', plan.voice],
              ['Music', plan.music],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 border-b border-white/[0.06] pb-2">
                <dt className="text-white/45">{label}</dt>
                <dd className="text-right font-medium text-white/90">{value}</dd>
              </div>
            ))}
          </dl>
          <pre className="mt-5 max-h-64 overflow-auto rounded-xl bg-black/40 p-3 text-[10px] leading-relaxed text-[#E6C76A]/90">
            {JSON.stringify(plan, null, 2)}
          </pre>
          {cinematicStyle ? (
            <>
              <p className="mt-6 text-[10px] uppercase tracking-[0.22em] text-white/45">Cinematic style</p>
              <dl className="mt-3 space-y-2 text-xs">
                {[
                  ['Camera', cinematicStyle.cameraSystem],
                  ['Lens', cinematicStyle.lens],
                  ['Lighting', cinematicStyle.lightingStyle],
                  ['Grade', cinematicStyle.colorGrading],
                  ['Motion', cinematicStyle.motionStyle],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-white/[0.06] pb-1.5">
                    <dt className="text-white/40">{label}</dt>
                    <dd className="text-right text-white/80">{value}</dd>
                  </div>
                ))}
              </dl>
            </>
          ) : null}
        </aside>
      ) : null}
    </div>
  )
}
