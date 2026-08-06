'use client'



import { useMemo, useState } from 'react'

import { ChevronDown, ChevronRight, Loader2, Maximize2, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'

import { pickLatestSceneVideos } from '@/lib/v3/scene-videos.client'

import type { V3SceneRow, V3SceneVideoMetadata, V3SceneVideoRow } from '@/types/v3/production'



type SceneVideoGalleryProps = {

  projectId: string

  scenes: V3SceneRow[]

  sceneVideos: V3SceneVideoRow[]

  className?: string

  onRegenerated?: () => void

}



export function SceneVideoGallery({

  projectId,

  scenes,

  sceneVideos,

  className,

  onRegenerated,

}: SceneVideoGalleryProps) {

  const [openScenes, setOpenScenes] = useState<Record<string, boolean>>({})

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [regenerating, setRegenerating] = useState<string | null>(null)

  const [error, setError] = useState<string | null>(null)



  const latestByScene = useMemo(() => {

    const latest = pickLatestSceneVideos(sceneVideos)

    return new Map(latest.map((video) => [video.scene_id, video]))

  }, [sceneVideos])



  const sceneById = useMemo(() => new Map(scenes.map((scene) => [scene.id, scene])), [scenes])



  if (latestByScene.size === 0) return null



  async function regenerateScene(sceneId: string) {

    setRegenerating(sceneId)

    setError(null)

    try {

      const res = await fetch(`/api/v3/projects/${projectId}/videos/regenerate`, {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({ sceneId }),

      })

      const data = (await res.json()) as { error?: string }

      if (!res.ok) throw new Error(data.error ?? 'Regeneration failed')

      onRegenerated?.()

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Regeneration failed')

    } finally {

      setRegenerating(null)

    }

  }



  return (

    <>

      <section className={cn('rounded-2xl border border-white/[0.08] bg-[#0a0a0a]/80 p-4 sm:p-5', className)}>

        <p className="text-[10px] uppercase tracking-[0.22em] text-white/45">Scene videos</p>

        {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}

        <ul className="mt-4 space-y-3">

          {Array.from(latestByScene.entries()).map(([sceneId, video]) => {

            const scene = sceneById.get(sceneId)

            const metadata = video.metadata as V3SceneVideoMetadata

            const isOpen = openScenes[sceneId] ?? false

            const historyCount = sceneVideos.filter(

              (row) => row.scene_id === sceneId && row.status === 'completed'

            ).length



            return (

              <li key={video.id} className="rounded-xl border border-white/[0.06] bg-black/30">

                <button

                  type="button"

                  className="flex w-full items-center gap-3 px-4 py-3 text-left"

                  onClick={() => setOpenScenes((prev) => ({ ...prev, [sceneId]: !prev[sceneId] }))}

                >

                  {isOpen ? (

                    <ChevronDown className="h-4 w-4 shrink-0 text-[#D4AF37]" />

                  ) : (

                    <ChevronRight className="h-4 w-4 shrink-0 text-white/40" />

                  )}

                  <span className="font-medium text-white/90">

                    Scene {scene?.number ?? '?'} cinematic clip

                  </span>

                  <span className="ml-auto text-xs text-white/35">{video.provider}</span>

                </button>



                {isOpen ? (

                  <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">

                    {video.video_url ? (

                      <div className="relative overflow-hidden rounded-lg">

                        <video

                          src={video.video_url}

                          poster={video.thumbnail_url ?? undefined}

                          controls

                          playsInline

                          className="aspect-video w-full bg-black object-cover"

                        />

                        <button

                          type="button"

                          className="absolute right-2 top-2 rounded-lg bg-black/60 p-2 text-white/80 hover:bg-black/80"

                          onClick={() => setPreviewUrl(video.video_url)}

                          aria-label="Full screen playback"

                        >

                          <Maximize2 className="h-4 w-4" />

                        </button>

                      </div>

                    ) : null}



                    <dl className="grid gap-2 text-xs sm:grid-cols-2">

                      {[

                        ['Provider', video.provider],

                        [

                          'Duration',

                          video.duration_seconds != null ? `${video.duration_seconds}s` : '—',

                        ],

                        [

                          'Generation time',

                          video.generation_time_ms ? `${video.generation_time_ms}ms` : '—',

                        ],

                        ['Camera movement', metadata.cameraMovement ?? '—'],

                        ['Resolution', video.resolution ?? '—'],

                        ['History', `${historyCount} version${historyCount === 1 ? '' : 's'}`],

                      ].map(([label, value]) => (

                        <div

                          key={label}

                          className="flex justify-between gap-3 border-b border-white/[0.06] pb-1.5"

                        >

                          <dt className="text-white/40">{label}</dt>

                          <dd className="text-white/75">{value}</dd>

                        </div>

                      ))}

                    </dl>



                    <button

                      type="button"

                      disabled={regenerating === sceneId}

                      onClick={() => void regenerateScene(sceneId)}

                      className="inline-flex items-center gap-2 rounded-lg border border-[rgba(212,175,55,0.35)] px-3 py-2 text-xs font-medium text-[#F4E7A8] hover:bg-[#D4AF37]/10 disabled:opacity-50"

                    >

                      {regenerating === sceneId ? (

                        <Loader2 className="h-3.5 w-3.5 animate-spin" />

                      ) : (

                        <RefreshCw className="h-3.5 w-3.5" />

                      )}

                      Regenerate scene

                    </button>

                  </div>

                ) : null}

              </li>

            )

          })}

        </ul>

      </section>



      {previewUrl ? (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"

          onClick={() => setPreviewUrl(null)}

          role="dialog"

          aria-modal="true"

        >

          <video

            src={previewUrl}

            controls

            autoPlay

            playsInline

            className="max-h-[90vh] max-w-full rounded-lg"

            onClick={(event) => event.stopPropagation()}

          />

        </div>

      ) : null}

    </>

  )

}


