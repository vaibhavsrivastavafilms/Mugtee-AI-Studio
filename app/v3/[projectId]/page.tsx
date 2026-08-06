'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { V3ProductionTimeline } from '@/features/v3/components/production-timeline'
import { useV3Project } from '@/hooks/use-v3-project'

type V3ProjectPageProps = {
  params: { projectId: string }
}

export default function V3ProjectPage({ params }: V3ProjectPageProps) {
  const { snapshot, error, loading, reload } = useV3Project(params.projectId)

  if (loading && !snapshot) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#D4AF37]" aria-label="Loading" />
      </main>
    )
  }

  if (error || !snapshot) {
    return (
      <main className="mx-auto max-w-lg px-4 py-24 text-center">
        <p className="text-red-300">{error ?? 'Project not found'}</p>
        <Link href="/v3" className="mt-6 inline-block text-[#E6C76A] underline-offset-4 hover:underline">
          Back to studio
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      <V3ProductionTimeline
        projectId={params.projectId}
        timeline={snapshot.timeline}
        jobs={snapshot.jobs}
        plan={snapshot.project.production_plan}
        prompt={snapshot.project.prompt}
        scenes={snapshot.scenes}
        characters={snapshot.characters}
        locations={snapshot.locations}
        scenePrompts={snapshot.scenePrompts}
        sceneImages={snapshot.sceneImages}
        sceneVideos={snapshot.sceneVideos}
        cinematicStyle={snapshot.project.cinematic_style}
        onImagesUpdated={() => void reload()}
        onVideosUpdated={() => void reload()}
        onRetryFailed={() => void reload()}
        reelUrl={snapshot.project.reel_url}
        exportStatus={snapshot.project.export_status}
      />
    </main>
  )
}
