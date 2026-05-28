'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useCinematicRoute } from '@/hooks/use-cinematic-route'
import {
  applyGenerationToStore,
  useCinematicProjectStore,
} from '@/stores/cinematic-project'
import {
  CinematicErrorState,
  CinematicShimmer,
} from '@/components/cinematic/cinematic-states'
import {
  CinematicWorkflowShell,
  withProjectQuery,
} from '@/components/cinematic/workflow-shell'
import { pickGenerationLine } from '@/lib/cinematic/generation-progress'
import { immersiveLoadingCopy } from '@/lib/cinematic/execution/cinematic-performance-engine'
import { syncCreatorMemoryFromGeneration } from '@/lib/cinematic/execution/cinematic-creator-memory'
import { writePacingMemory } from '@/lib/cinematic/execution/screenplay-pacing-memory'
import { trackCreatorMilestone } from '@/lib/creator/session-insights'
import { TRUST_COPY } from '@/lib/creator/trust-copy'
import { PacingIntelligenceStrip } from '@/components/cinematic/pacing-intelligence-strip'
import { MomentumStrip } from '@/components/create/momentum-strip'
import { WorkflowEmotionalState } from '@/components/cinematic/workflow-emotional-state'

export function CinematicGeneratingScreen() {
  const router = useRouter()
  const startedRef = useRef(false)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const [lineIndex, setLineIndex] = useState(0)
  const { prompt, style, duration, script, updateStatus } =
    useCinematicRoute('generating')

  useEffect(() => {
    if (error) return
    const timer = setInterval(() => {
      setLineIndex((i) => i + 1)
    }, 2800)
    return () => clearInterval(timer)
  }, [error])

  useEffect(() => {
    if (script.trim()) {
      updateStatus('preview')
      router.replace('/cinematic/preview')
      return
    }

    if (!prompt.trim() || startedRef.current) return
    startedRef.current = true

    ;(async () => {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 90_000)

        const res = await fetch('/api/generate-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: prompt.trim(),
            platform: 'instagram_reel',
            tone: style,
            duration,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Story shaping paused')

        if (!data.output) {
          throw new Error('Your story did not fully arrive. Try again.')
        }

        applyGenerationToStore(data.output)
        trackCreatorMilestone('generation_completed')
        syncCreatorMemoryFromGeneration({
          niche: data.output.niche,
          lastTitle: data.output.summary || prompt.trim(),
          voiceStyle: data.output.suggestedVoiceStyle,
          duration,
          sceneCount: data.output.scenes?.length ?? 4,
          style,
        })
        writePacingMemory({
          duration,
          sceneCount: data.output.scenes?.length ?? 4,
          beatSpacing: duration <= 30 ? 'tight' : duration <= 60 ? 'balanced' : 'breathing',
        })

        await useCinematicProjectStore.getState().persistProject()

        const savedId =
          useCinematicProjectStore.getState().persistedId ||
          useCinematicProjectStore.getState().id
        router.replace(withProjectQuery('/cinematic/preview', savedId))
      } catch (e: unknown) {
        const message =
          e instanceof Error
            ? e.name === 'AbortError'
              ? 'This beat took too long. Your prompt is saved — try again.'
              : e.message
            : 'Something went wrong'
        setError(message)
        toast.error(message)
        updateStatus('create')
      }
    })()
  }, [duration, prompt, router, script, style, updateStatus, retryKey])

  return (
    <CinematicWorkflowShell
      title="Your story is taking form"
      subtitle="Script, beats, and captions unfold from your premise."
    >
      <MomentumStrip stage="generating" seed={lineIndex} />
      <PacingIntelligenceStrip style={style} seed={lineIndex} />
      <WorkflowEmotionalState phase="generating" visible={!error} seed={lineIndex} />
      <div className="min-h-[320px] flex items-center justify-center cinematic-stage-transition">
        {error ? (
          <CinematicErrorState
            title="Story paused"
            message={`${error} ${TRUST_COPY.generationPaused}`}
            onRetry={() => {
              startedRef.current = false
              setError(null)
              setRetryKey((k) => k + 1)
            }}
            retryLabel="Try again"
            backHref="/cinematic/create"
            backLabel="Edit prompt"
          />
        ) : (
          <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-white/[0.03] p-10 sm:p-12 text-center">
            <CinematicShimmer className="w-16 h-16 rounded-full mx-auto mb-6" />
            <p
              key={lineIndex}
              className="text-[#F4E7C1] text-lg italic animate-in fade-in duration-500"
            >
              {pickGenerationLine(lineIndex)}
            </p>
            <p className="text-white/45 text-sm max-w-md mx-auto mt-4 leading-relaxed line-clamp-3">
              {prompt.trim() || 'Waiting for your cinematic idea.'}
            </p>
            <p className="mt-6 text-[10px] tracking-[0.25em] uppercase text-white/30">
              {immersiveLoadingCopy('generating', lineIndex)}
            </p>
          </div>
        )}
      </div>
    </CinematicWorkflowShell>
  )
}
