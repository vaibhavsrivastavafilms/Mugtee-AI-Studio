'use client'



import { Suspense, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { useParams } from 'next/navigation'

import { Film } from 'lucide-react'

import { useShallow } from 'zustand/react/shallow'

import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'

import { CinematicRenderExperience } from '@/components/cinematic/render'

import { useCreateProjectHydration } from '@/hooks/use-create-project-hydration'

import { useCinematicProjectStore } from '@/stores/cinematic-project'

import { createProjectHref } from '@/lib/create/routes'

import { loadProject } from '@/lib/cinematic-projects'

import { storeScenesToGenerated } from '@/lib/cinematic/generation'



function ExportInner() {

  const params = useParams()

  const projectId = params?.projectId as string

  useCreateProjectHydration(projectId, 'compile')



  const { hook, title, style, duration, niche, scenes, script, voice, captionLines } =

    useCinematicProjectStore(

      useShallow((s) => ({

        hook: s.hook,

        title: s.title,

        style: s.style,

        duration: s.duration,

        niche: s.niche,

        scenes: s.scenes,

        script: s.script,

        voice: s.voice,

        captionLines: s.captionLines,

      }))

    )



  const [videoUrl, setVideoUrl] = useState<string | null>(null)

  const [loadingUrl, setLoadingUrl] = useState(true)



  useEffect(() => {

    let alive = true

    ;(async () => {

      try {

        const row = await loadProject(projectId)

        if (!alive) return

        setVideoUrl((row as { video_url?: string | null }).video_url ?? null)

      } catch {

        if (alive) setVideoUrl(null)

      } finally {

        if (alive) setLoadingUrl(false)

      }

    })()

    return () => {

      alive = false

    }

  }, [projectId])



  const previewFrames = scenes

    .map((scene) => scene.imageUrl || scene.storyboardImages?.[0]?.url)

    .filter(Boolean) as string[]



  const previewScenes = useMemo(() => storeScenesToGenerated(scenes), [scenes])

  const caption = captionLines[0] || hook

  const displayStyle = style || niche || 'Cinematic documentary reel'



  return (

    <UnifiedCreatorShell projectId={projectId} mode="director" title="Render Reel">

      <div className="space-y-6">

        {!script.trim() && previewFrames.length === 0 ? (

          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-8 text-center space-y-4">

            <Film className="w-8 h-8 text-gold-300/40 mx-auto" />

            <p className="text-sm text-muted-foreground">
              Nothing to render yet — generate or direct your project first.
            </p>

            <Link

              href={createProjectHref(projectId, 'director')}

              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gold-gradient text-black text-sm font-medium"

            >

              Continue directing

            </Link>

          </div>

        ) : loadingUrl ? (

          <div className="rounded-[28px] border border-white/[0.06] bg-[#050505]/80 p-12 text-center film-grain">

            <p className="text-sm text-white/40 italic">Opening the render studio…</p>

          </div>

        ) : (

          <CinematicRenderExperience

            title={title || 'Untitled reel'}

            hook={hook}

            duration={duration}

            style={displayStyle}

            script={script}

            voiceUrl={voice?.audioUrl ?? null}

            projectId={projectId}

            scenes={previewScenes}

            previewFrames={previewFrames}

            videoUrl={videoUrl}

            caption={caption}

            directorHref={createProjectHref(projectId, 'director')}

            autoStart={!videoUrl}

          />

        )}

      </div>

    </UnifiedCreatorShell>

  )

}



export function ExportCreatorPage() {

  return (

    <Suspense fallback={<div className="text-sm text-muted-foreground italic p-8">Loading…</div>}>

      <ExportInner />

    </Suspense>

  )

}

