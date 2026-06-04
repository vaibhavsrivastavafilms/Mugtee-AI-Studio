'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'
import { useQuickCutFreshCreateEntry } from '@/hooks/use-quick-cut-fresh-create-entry'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { CinematicPromptInput } from '@/components/quick-cut/canvas/cinematic-prompt-input'
import { CinematicCanvasBackground } from '@/components/quick-cut/canvas/cinematic-canvas-background'
import { CreativeSystemCompactField } from '@/components/studio/creative-system-compact-field'
import { QuickCreateControls } from '@/components/studio/quick-create-controls'
import { QuickModeOutputActions } from '@/components/studio/quick-mode-output-actions'
import {
  QUICK_CHIP_SEEDS,
  V4_QUICK_PROMPT_CHIPS,
  type QuickPlatformValue,
} from '@/lib/studio/quick-create-options'
import { studioGlassPanel } from '@/lib/studio/studio-design-tokens'
import { AgentWorkflowStrip } from '@/components/agent/agent-workflow-strip'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { resetQuickCutForFreshCreate } from '@/lib/cinematic/quick-cut/fresh-create'
import {
  clearQuickCutPending,
  saveQuickCutPending,
  type QuickCutPending,
} from '@/lib/cinematic/quick-cut/preview-session'
import { loadContentLanguagePreference } from '@/lib/cinematic/content-languages'
import {
  DEFAULT_DIRECTOR_MODE,
  loadDirectorModePreference,
} from '@/lib/cinematic/director-modes'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'
import { STUDIO } from '@/lib/create/routes'
import { Button } from '@/components/ui/button'

const CinematicAssemblyScreen = dynamic(
  () =>
    import('@/components/quick-cut/cinematic-assembly/cinematic-assembly-screen').then(
      (m) => m.CinematicAssemblyScreen
    ),
  { ssr: false }
)

const PreviewExportTabbedPanel = dynamic(
  () =>
    import('@/components/quick-cut/preview-export-tabbed-panel').then(
      (m) => m.PreviewExportTabbedPanel
    ),
  { ssr: false }
)

const LOGIN_AFTER_QUICK = `${STUDIO.quick}?resume=1`

function QuickModePipelineView({
  projectId,
  onRegenerate,
}: {
  projectId?: string
  onRegenerate: () => void
}) {
  const router = useRouter()
  const voiceAudioRef = useRef<HTMLAudioElement>(null)

  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const generationState = useQuickCutGenerationStore((s) => s.generationState)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const setActiveStageTab = useQuickCutGenerationStore((s) => s.setActiveStageTab)

  const showRecovery = generationStep === 'error' || generationStatus === 'failed'
  const showCinematicAssembly =
    generationState === 'assembling' ||
    generationState === 'revealing' ||
    generationState === 'preview'

  if (showRecovery) {
    return (
      <GenerationRecoveryPanel
        lastCompletedStep={lastCompletedStep}
        failedAtStep={failedAtStep}
        isResuming={isGenerating}
        onContinue={() => void resumeGeneration()}
        onReturnToWorkspace={() => {
          resetQuickCutForFreshCreate()
          router.push(STUDIO.quick)
        }}
        workspaceHref={STUDIO.quick}
      />
    )
  }

  return (
    <div className="relative w-full min-h-[calc(100dvh-6rem)] overflow-hidden">
      <CinematicCanvasBackground />
      <div className="relative z-10 px-4 sm:px-6 py-6 sm:py-8 max-w-2xl mx-auto w-full space-y-5">
        {!isComplete && generationStep !== 'idle' && generationStep !== 'complete' ? (
          <div className="flex justify-center">
            <AgentWorkflowStrip generationStep={generationStep} />
          </div>
        ) : null}

        {showCinematicAssembly ? (
          <CinematicAssemblyScreen
            audioRef={voiceAudioRef}
            onSkipToExport={() => setActiveStageTab('complete', true)}
            className="w-full"
          />
        ) : (
          <PreviewExportTabbedPanel
            audioRef={voiceAudioRef}
            projectId={projectId}
            isLive={!isComplete}
            generationStep={generationStep}
            className="w-full"
          />
        )}

        {isComplete ? (
          <QuickModeOutputActions projectId={projectId} className="pt-2" />
        ) : null}
      </div>
    </div>
  )
}

function QuickModeWorkspaceInner() {
  const searchParams = useSearchParams()
  const projectId = searchParams?.get('project') ?? undefined
  const topicParam = searchParams?.get('topic') ?? searchParams?.get('prompt') ?? ''

  useQuickCutFreshCreateEntry()
  useQuickCutProjectHydration(projectId)

  const { ready: authReady, user } = useAuthHydration()
  const signedIn = authReady ? Boolean(user) : null

  const [prompt, setPrompt] = useState(topicParam)
  const [promptFocused, setPromptFocused] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)
  const [duration, setDuration] = useState(60)
  const [platform, setPlatform] = useState<QuickPlatformValue>('youtube_short')

  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const style = useQuickCutGenerationStore((s) => s.style)
  const syncVideoRenderConfig = useQuickCutGenerationStore((s) => s.syncVideoRenderConfig)

  const active =
    isGenerating ||
    isComplete ||
    generationStep === 'error' ||
    (generationStep !== 'idle' && generationStep !== 'complete')

  useEffect(() => {
    void syncVideoRenderConfig()
  }, [syncVideoRenderConfig])

  useEffect(() => {
    if (topicParam) setPrompt(topicParam)
  }, [topicParam])

  const launchPipeline = useCallback(
    async (pending: QuickCutPending) => {
      if (isGenerating || useQuickCutGenerationStore.getState().generationInFlight || !authReady) {
        return
      }

      if (signedIn === false) {
        saveQuickCutPending(pending)
        setShowSignIn(true)
        return
      }

      markHasCreatedProject()

      const savedProjectId = useQuickCutGenerationStore.getState().savedProjectId
      useQuickCutGenerationStore.setState({ duration: pending.duration })
      await runPipeline({
        prompt: pending.prompt,
        style: pending.style,
        duration: pending.duration,
        platform,
        language: pending.language,
        directorMode: pending.directorMode,
        reuseProject: Boolean(savedProjectId),
        skipResearch: true,
      })
      clearQuickCutPending()
    },
    [authReady, isGenerating, platform, runPipeline, signedIn]
  )

  const handleGenerate = useCallback(
    (event?: React.FormEvent) => {
      event?.preventDefault()
      const trimmed = prompt.trim()
      if (trimmed.length < 6) return

      void launchPipeline({
        prompt: trimmed,
        style: style || 'cinematic_emotional',
        duration,
        language: loadContentLanguagePreference(),
        directorMode: loadDirectorModePreference() ?? DEFAULT_DIRECTOR_MODE,
      })
    },
    [duration, launchPipeline, prompt, style]
  )

  const handleRegenerate = useCallback(() => {
    resetQuickCutForFreshCreate()
  }, [])

  if (active) {
    return <QuickModePipelineView projectId={projectId} onRegenerate={handleRegenerate} />
  }

  const canGenerate = prompt.trim().length >= 6
  const loginHref = `/auth/login?next=${encodeURIComponent(LOGIN_AFTER_QUICK)}`

  return (
    <div className="relative flex-1 flex flex-col min-h-[calc(100dvh-5rem)]">
      <CinematicCanvasBackground />

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className={cn(studioGlassPanel, 'w-full max-w-xl space-y-5 p-5 sm:p-6')}
        >
          <div className="text-center space-y-2 mb-2">
            <p className="text-[10px] tracking-[0.28em] uppercase text-violet-300/70">Quick Mode</p>
            <h1 className="font-display text-2xl sm:text-3xl text-luxe">
              What do you want to create today?
            </h1>
            <p className="text-sm text-muted-foreground">
              CapCut-speed creation — reel ready in under five minutes.
            </p>
          </div>

          <form onSubmit={handleGenerate} className="space-y-4">
            <CinematicPromptInput
              value={prompt}
              onChange={setPrompt}
              focused={promptFocused}
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
            />

            <div className="flex flex-wrap gap-2">
              {V4_QUICK_PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setPrompt(QUICK_CHIP_SEEDS[chip] ?? chip)}
                  className="rounded-full border border-white/[0.1] bg-black/40 px-3 py-1.5 text-[11px] text-luxe/70 hover:border-violet-400/35 hover:text-violet-100 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            <CreativeSystemCompactField />
            <QuickCreateControls
              duration={duration}
              platform={platform}
              onDurationChange={setDuration}
              onPlatformChange={setPlatform}
              disabled={isGenerating}
            />

            <Button
              type="submit"
              disabled={!canGenerate || isGenerating}
              className={cn(
                'w-full h-12 rounded-xl font-medium text-base gap-2',
                'bg-[#8b5cf6] text-white hover:bg-[#7c3aed] shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)]',
                'disabled:opacity-40 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate
                </>
              )}
            </Button>
          </form>

          {showSignIn ? (
            <p className="text-center text-sm text-muted-foreground">
              <a href={loginHref} className="text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline">
                Sign in
              </a>{' '}
              to generate your reel.
            </p>
          ) : null}
        </motion.div>
      </div>
    </div>
  )
}

export function QuickModeWorkspace() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center text-sm text-muted-foreground italic">
          Loading Quick Mode…
        </div>
      }
    >
      <QuickModeWorkspaceInner />
    </Suspense>
  )
}
