'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import {
  clearQuickCutPending,
  loadQuickCutPending,
  type QuickCutPending,
} from '@/lib/cinematic/quick-cut/preview-session'
import { FullscreenQuickCutCanvas } from '@/components/quick-cut/canvas/fullscreen-quick-cut-canvas'
import { LiveGenerationCanvas } from '@/components/quick-cut/canvas/live-generation-canvas'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'

function QuickCutHomeInner({ embedded = false }: { embedded?: boolean }) {
  const searchParams = useSearchParams()
  const [initialPrompt, setInitialPrompt] = useState('')

  const { ready: authReady, user } = useAuthHydration()
  const signedIn = authReady ? Boolean(user) : null

  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)

  const resumedRef = useRef(false)

  useEffect(() => {
    const topic = searchParams?.get('topic') ?? searchParams?.get('prompt')
    if (topic) setInitialPrompt(topic)
  }, [searchParams])

  const runOrchestration = useCallback(
    async (payload: QuickCutPending) => {
      const savedProjectId = useQuickCutGenerationStore.getState().savedProjectId
      await runPipeline({
        prompt: payload.prompt.trim(),
        style: payload.style,
        duration: payload.duration,
        imageNote: payload.imageNote,
        voiceNote: payload.voiceNote,
        keywords: payload.keywords,
        language: payload.language,
        reuseProject: Boolean(savedProjectId),
      })
      clearQuickCutPending()
    },
    [runPipeline]
  )

  const tryResumePending = useCallback(() => {
    if (!authReady || !signedIn || resumedRef.current || isGenerating) return
    const wantsResume = searchParams?.get('resume') === '1'
    const pending = loadQuickCutPending()
    if (!wantsResume) return
    if (!pending?.prompt || pending.prompt.trim().length < 6) return

    resumedRef.current = true
    setInitialPrompt(pending.prompt)

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.delete('resume')
      window.history.replaceState({}, '', url.pathname + url.search)
    }

    void runOrchestration(pending)
  }, [authReady, signedIn, isGenerating, searchParams, runOrchestration])

  useEffect(() => {
    tryResumePending()
  }, [tryResumePending])

  const handleRegenerate = useCallback(() => {
    resetQuickCutForFreshCreate()
  }, [])

  if (isComplete) {
    return <LiveGenerationCanvas onRegenerate={handleRegenerate} embedded={embedded} complete />
  }

  if (isGenerating || generationStep === 'error') {
    return <LiveGenerationCanvas onRegenerate={handleRegenerate} embedded={embedded} />
  }

  return <FullscreenQuickCutCanvas embedded={embedded} initialPrompt={initialPrompt} />
}

export function QuickCutHome({ embedded = false }: { embedded?: boolean }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] bg-background flex items-center justify-center text-luxe/50 text-sm italic">
          Opening your world…
        </div>
      }
    >
      <QuickCutHomeInner embedded={embedded} />
    </Suspense>
  )
}

