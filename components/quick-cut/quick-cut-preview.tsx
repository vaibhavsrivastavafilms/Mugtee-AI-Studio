'use client'



import { useEffect } from 'react'

import { QuickCutHome } from '@/components/quick-cut/quick-cut-home'

import { LiveGenerationCanvas } from '@/components/quick-cut/canvas/live-generation-canvas'

import {
  clearQuickCutPreview,
  loadQuickCutPreview,
} from '@/lib/cinematic/quick-cut/preview-session'
import { loadHookSession } from '@/lib/cinematic/quick-cut/hook-session'

import { applyGenerationToStore } from '@/stores/cinematic-project'

import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'

import { ensureScenesHavePreviewUrls, resolveScenePreviewUrl } from '@/lib/cinematic/scene-preview-url'
import {
  ensureScenesHaveImagePrompts,
  type GeneratedScene,
} from '@/lib/cinematic/generation'
import type { VirloMetadata } from '@/lib/virlo-engine/types'



/** Hydrate generation store from a saved preview session. */

function hydrateFromSession(session: NonNullable<ReturnType<typeof loadQuickCutPreview>>) {

  const { project, output, virlo, mock, previewFrames, renderPollUrl, renderError } = session

  const scenes: GeneratedScene[] = ensureScenesHavePreviewUrls(
    ensureScenesHaveImagePrompts(
    (output.scenes ?? project.scenes ?? []).map((s, i) => ({
      id: s.id || `scene-${i}`,
      title: s.title || `Scene ${i + 1}`,
      description:
        s.description ??
        ('narration' in s && typeof s.narration === 'string' ? s.narration : ''),
      duration: s.duration ?? 4,
      visualPrompt: s.visualPrompt || '',
      imagePrompt:
        ('imagePrompt' in s && typeof s.imagePrompt === 'string' ? s.imagePrompt : '') ||
        '',
      cameraAngle: s.cameraAngle || 'Cinematic medium',
      lightingMood: s.lightingMood || 'Moody contrast',
      environment: s.environment || 'Abstract cinematic',
      colorPalette: s.colorPalette || 'Deep shadow, gold highlight',
      movementStyle: s.movementStyle || 'Slow push-in',
      imageUrl: s.imageUrl ?? previewFrames[i] ?? resolveScenePreviewUrl(
        {
          id: s.id || `scene-${i}`,
          title: s.title || `Scene ${i + 1}`,
          description: '',
          duration: 4,
          visualPrompt: s.visualPrompt || '',
          imagePrompt: '',
          cameraAngle: '',
          lightingMood: '',
          environment: '',
          colorPalette: '',
          movementStyle: '',
        },
        i
      ),
    }))
    )
  )

  const hookSession = loadHookSession()

  useQuickCutGenerationStore.setState({
    generationStep: 'complete',
    activeStageTab: 'complete',
    stageTabPinned: false,
    prompt: project.prompt,
    title: project.title,
    hook: project.hook,
    previousHooks: hookSession?.previousHooks ?? [],
    hookVariantNumber: hookSession?.hookVariantNumber ?? 1,
    script: project.script,
    scenes,
    storyboard: scenes,
    voiceUrl: session.voiceUrl ?? project.voice?.audioUrl ?? null,
    waveform: [],
    progress: 100,
    eta: 0,
    videoUrl: session.videoUrl ?? null,
    renderPollUrl: renderPollUrl ?? null,
    renderError: renderError ?? null,
    virlo: (virlo as VirloMetadata | undefined) ?? null,
    mock: mock ?? false,
    missingKeys: session.pipeline?.missingKeys ?? [],
    pipeline: session.pipeline ?? null,
    error: null,
    isGenerating: false,
    isComplete: true,
  })

  void useQuickCutGenerationStore.getState().syncVideoRenderConfig()

  applyGenerationToStore(output)

}



export function QuickCutPreview({ embedded = true }: { embedded?: boolean }) {

  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)

  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const studioReviewMode = useQuickCutGenerationStore((s) => s.studioReviewMode)

  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)

  const reset = useQuickCutGenerationStore((s) => s.reset)



  useEffect(() => {

    if (isGenerating || isComplete || generationStep !== 'idle' || studioReviewMode) return

    const session = loadQuickCutPreview()

    if (session) {

      hydrateFromSession(session)

    }

  }, [isGenerating, isComplete, generationStep, studioReviewMode])



  const handleRegenerate = () => {

    clearQuickCutPreview()

    reset()

  }



  if (isComplete && !studioReviewMode) {

    return <LiveGenerationCanvas onRegenerate={handleRegenerate} embedded={embedded} complete />

  }



  if (isGenerating || generationStep === 'error' || studioReviewMode) {

    return <LiveGenerationCanvas onRegenerate={handleRegenerate} embedded={embedded} />

  }



  return <QuickCutHome embedded={embedded} />

}


