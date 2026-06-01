'use client'



import { Suspense, useEffect, useMemo, useState } from 'react'

import Link from 'next/link'

import { useParams } from 'next/navigation'

import { Film } from 'lucide-react'

import { useShallow } from 'zustand/react/shallow'

import { UnifiedCreatorShell } from '@/components/create/unified-creator-shell'

import dynamic from 'next/dynamic'
import { ReelAssemblyPlayer } from '@/components/quick-cut/reel-assembly-player'

const CinematicRenderExperience = dynamic(
  () =>
    import('@/components/cinematic/render').then((m) => m.CinematicRenderExperience),
  { ssr: false }
)

import { useCreateProjectHydration } from '@/hooks/use-create-project-hydration'

import { useCinematicProjectStore } from '@/stores/cinematic-project'

import { createProjectHref } from '@/lib/create/routes'

import { loadProject } from '@/lib/cinematic-projects'

import { storeScenesToGenerated } from '@/lib/cinematic/generation'

import { projectCanCompileMp4 } from '@/lib/quick-cut/compile-project-mp4.client'

import { ProjectMp4Button } from '@/components/quick-cut/project-mp4-button'
import { PageLoadingSkeleton } from '@/components/ui/page-loading-skeleton'
import { PublishingAssistantPanel } from '@/components/agent/publishing-assistant-panel'



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

  const canCompileMp4 = projectCanCompileMp4(scenes, voice)



  return (

    <UnifiedCreatorShell projectId={projectId} mode="director" title="Render Reel">

      <div className="space-y-6">

        {canCompileMp4 || videoUrl ? (

          <div className="flex justify-end">

            <ProjectMp4Button

              projectId={projectId}

              title={title || 'Untitled reel'}

              videoUrl={videoUrl}

              canCompileMp4={canCompileMp4}

              exportHref={createProjectHref(projectId, 'export')}

              onVideoUrl={setVideoUrl}

              className="min-h-[36px] px-4 py-2 text-[10px]"

            />

          </div>

        ) : null}

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

          <PageLoadingSkeleton variant="export" className="bg-[#050505]/80 film-grain" />

        ) : videoUrl ? (

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

            autoStart={false}

          />

        ) : previewScenes.length > 0 ? (

          <ReelAssemblyPlayer

            scenes={previewScenes}

            title={title || 'Untitled reel'}

            hook={hook}

            script={script}

            videoUrl={null}

            voiceUrl={voice?.audioUrl ?? null}

            generationStep="complete"

            autoPlayPreview={false}

            projectId={projectId}

            canCompileMp4={canCompileMp4}

            onVideoUrl={setVideoUrl}

          />

        ) : null}

        {(script.trim() || hook.trim() || title.trim()) ? (
          <PublishingAssistantPanel
            title={title}
            hook={hook}
            description={caption}
            hasThumbnail={previewFrames.length > 0}
          />
        ) : null}

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

