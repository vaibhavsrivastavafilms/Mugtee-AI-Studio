'use client'

import dynamic from 'next/dynamic'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Settings2,
  Sparkles,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { useQuickCutProjectHydration } from '@/hooks/use-quick-cut-project-hydration'
import { useQuickCutFreshCreateEntry } from '@/hooks/use-quick-cut-fresh-create-entry'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { useCompanionStore } from '@/stores/companion-store'
import { QuickCreateControls } from '@/components/studio/quick-create-controls'
import {
  QuickModeFeatureFooter,
  QuickModeOutputActions,
} from '@/components/studio/quick-mode-output-actions'
import { QuickModeAssetCards } from '@/components/studio/quick-mode-asset-cards'
import {
  QUICK_CHIP_SEEDS,
  V4_QUICK_PROMPT_CHIPS,
  PROMPT_MAX_CHARS,
  type QuickPlatformValue,
} from '@/lib/studio/quick-create-options'
import {
  quickModePanelClass,
  studioGradientPrimary,
} from '@/lib/studio/studio-design-tokens'
import { AgentWorkflowStrip } from '@/components/agent/agent-workflow-strip'
import { GenerationRecoveryPanel } from '@/components/quick-cut/generation-recovery-panel'
import { OutputWindow } from '@/components/quick-cut/output-window'
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
import { resolveMp4ExportUiState } from '@/lib/quick-cut/mp4-export-readiness.client'

const LOGIN_AFTER_QUICK = `${STUDIO.quick}?resume=1`

function QuickModeResultsPanel({
  projectId,
  audioRef,
}: {
  projectId?: string
  audioRef: React.RefObject<HTMLAudioElement | null>
}) {
  const title = useQuickCutGenerationStore((s) => s.title)
  const hook = useQuickCutGenerationStore((s) => s.hook)
  const script = useQuickCutGenerationStore((s) => s.script)
  const scenes = useQuickCutGenerationStore((s) => s.scenes)
  const voiceUrl = useQuickCutGenerationStore((s) => s.voiceUrl)
  const videoUrl = useQuickCutGenerationStore((s) => s.videoUrl)
  const reelTimeline = useQuickCutGenerationStore((s) => s.reelTimeline)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const isComplete = useQuickCutGenerationStore((s) => s.isComplete)
  const generationStep = useQuickCutGenerationStore((s) => s.generationStep)
  const generationStatus = useQuickCutGenerationStore((s) => s.generationStatus)
  const isRenderingVideo = useQuickCutGenerationStore((s) => s.isRenderingVideo)
  const renderPollUrl = useQuickCutGenerationStore((s) => s.renderPollUrl)
  const renderError = useQuickCutGenerationStore((s) => s.renderError)
  const exportExpired = useQuickCutGenerationStore((s) => s.exportExpired)
  const exportPackageReady = useQuickCutGenerationStore((s) => s.exportPackageReady)
  const videoRenderEnabled = useQuickCutGenerationStore((s) => s.videoRenderEnabled)
  const assemblyPreviewAutoplay = useQuickCutGenerationStore((s) => s.assemblyPreviewAutoplay)
  const lastCompletedStep = useQuickCutGenerationStore((s) => s.lastCompletedStep)
  const failedAtStep = useQuickCutGenerationStore((s) => s.failedAtStep)
  const resumeGeneration = useQuickCutGenerationStore((s) => s.resumeGeneration)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const prompt = useQuickCutGenerationStore((s) => s.prompt)
  const style = useQuickCutGenerationStore((s) => s.style)
  const duration = useQuickCutGenerationStore((s) => s.duration)
  const language = useQuickCutGenerationStore((s) => s.language)
  const directorMode = useQuickCutGenerationStore((s) => s.directorMode)
  const savedProjectId = useQuickCutGenerationStore((s) => s.savedProjectId)

  const showRecovery = generationStep === 'error' || generationStatus === 'failed'
  const hasOutput =
    isComplete ||
    isGenerating ||
    generationStep !== 'idle' ||
    Boolean(videoUrl || scenes.length || script.trim())

  const mp4Export = resolveMp4ExportUiState({
    scenes,
    voiceUrl,
    videoUrl,
    videoRenderEnabled,
    exportExpired,
    exportPackageReady,
    isRenderingVideo,
    renderPollUrl,
    renderError,
  })

  const handleRegenerateAll = useCallback(() => {
    const trimmed = prompt.trim()
    if (trimmed.length < 6) return
    void runPipeline({
      prompt: trimmed,
      style,
      duration,
      language,
      directorMode,
      reuseProject: Boolean(savedProjectId),
      regenFresh: true,
      skipResearch: true,
    })
  }, [
    directorMode,
    duration,
    language,
    prompt,
    runPipeline,
    savedProjectId,
    style,
  ])

  if (showRecovery) {
    return (
      <div className={cn(quickModePanelClass, 'p-4 sm:p-5 h-full min-h-[320px]')}>
        <GenerationRecoveryPanel
          lastCompletedStep={lastCompletedStep}
          failedAtStep={failedAtStep}
          isResuming={isGenerating}
          onContinue={() => void resumeGeneration()}
          onReturnToWorkspace={() => resetQuickCutForFreshCreate()}
          workspaceHref={STUDIO.quick}
        />
      </div>
    )
  }

  if (!hasOutput) {
    return (
      <div
        className={cn(
          quickModePanelClass,
          'flex flex-col items-center justify-center text-center p-8 min-h-[320px] lg:min-h-0 lg:h-full'
        )}
      >
        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7 text-violet-300/70" />
        </div>
        <h2 className="text-lg font-medium text-luxe/90">Your reel appears here</h2>
        <p className="text-sm text-luxe/45 mt-2 max-w-xs">
          Enter a prompt and hit Generate — preview, assets, and exports land in this panel.
        </p>
        <QuickModeFeatureFooter className="mt-8" />
      </div>
    )
  }

  const showReadyHeader = isComplete || generationStep === 'complete'

  return (
    <div className={cn(quickModePanelClass, 'flex flex-col min-h-0 h-full overflow-hidden')}>
      <div className="shrink-0 px-4 sm:px-5 pt-4 pb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-luxe">
            {showReadyHeader ? 'Your Reel is Ready! 🎉' : 'Building your reel…'}
          </h2>
          <p className="text-[11px] sm:text-xs text-luxe/45 mt-0.5">
            {showReadyHeader
              ? 'Everything generated. Preview and export.'
              : 'Assets unlock as each step completes.'}
          </p>
        </div>
        {showReadyHeader ? (
          <button
            type="button"
            onClick={handleRegenerateAll}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-white/[0.1] bg-white/[0.03] text-[11px] text-luxe/75 hover:border-violet-400/30 transition shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate All
          </button>
        ) : null}
      </div>

      {isGenerating && generationStep !== 'idle' && generationStep !== 'complete' ? (
        <div className="px-4 pb-2">
          <AgentWorkflowStrip generationStep={generationStep} />
        </div>
      ) : null}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-4 sm:px-5 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(140px,200px)] gap-4">
          <div className="min-w-0">
            <OutputWindow
              audioRef={audioRef}
              title={title}
              hook={hook}
              script={script}
              scenes={scenes}
              videoUrl={videoUrl}
              voiceUrl={voiceUrl}
              reelTimeline={reelTimeline}
              isLive={!isComplete}
              generationStep={generationStep}
              mp4Compiling={mp4Export.mp4Compiling}
              autoPlayPreview={assemblyPreviewAutoplay}
              showInsightTabs={isComplete}
              playerGenerationStep={isComplete ? 'complete' : generationStep}
              className="border-white/[0.08] bg-black/40 max-w-[280px] mx-auto md:mx-0 md:max-w-none aspect-[9/16]"
            />
          </div>
          <QuickModeAssetCards projectId={projectId} compact />
        </div>

        {showReadyHeader ? (
          <QuickModeOutputActions projectId={projectId} className="mt-4 pt-2 border-t border-white/[0.06]" />
        ) : null}
        <QuickModeFeatureFooter className="mt-4 pb-1" />
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
  const [whyOpen, setWhyOpen] = useState(true)
  const [chipSeed, setChipSeed] = useState(0)
  const [showSignIn, setShowSignIn] = useState(false)
  const [duration, setDuration] = useState(60)
  const [platform, setPlatform] = useState<QuickPlatformValue>('youtube_short')
  const voiceAudioRef = useRef<HTMLAudioElement>(null)

  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const style = useQuickCutGenerationStore((s) => s.style)
  const syncVideoRenderConfig = useQuickCutGenerationStore((s) => s.syncVideoRenderConfig)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const contentBrief = useQuickCutGenerationStore((s) => s.contentBrief)
  const creativeBrief = useCompanionStore((s) => s.creativeBrief)

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

  const canGenerate = prompt.trim().length >= 6
  const loginHref = `/auth/login?next=${encodeURIComponent(LOGIN_AFTER_QUICK)}`
  const charCount = prompt.length

  const whyText =
    contentBrief?.emotionalAngle?.trim() ||
    contentBrief?.coreNarrative?.trim() ||
    contentBrief?.keyInsights?.[0]?.trim() ||
    creativeBrief?.theme?.trim() ||
    "We'll use psychology triggers, proven hooks, and high-retention storytelling."

  const visibleChips = V4_QUICK_PROMPT_CHIPS.slice(
    chipSeed % V4_QUICK_PROMPT_CHIPS.length,
    (chipSeed % V4_QUICK_PROMPT_CHIPS.length) + 4
  )

  const rotateChips = () => setChipSeed((s) => s + 1)

  const openSettings = () => {
    window.dispatchEvent(new CustomEvent('mugtee:open-style-drawer'))
  }

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 gap-3 sm:gap-4 p-3 sm:p-4 overflow-hidden">
      <section
        className={cn(
          quickModePanelClass,
          'w-full lg:w-[45%] lg:max-w-[45%] shrink-0 flex flex-col min-h-0 overflow-hidden'
        )}
      >
        <div className="shrink-0 px-4 sm:px-5 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-violet-300/70">Quick Mode</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-luxe mt-1">Create content in under 5 minutes</h1>
          <p className="text-xs text-luxe/45 mt-1">with AI</p>
        </div>

        <form
          onSubmit={handleGenerate}
          className="flex-1 min-h-0 overflow-y-auto scrollbar-luxe px-4 sm:px-5 pb-4 space-y-4"
        >
          <div className="relative rounded-2xl border border-violet-500/25 bg-black/50 focus-within:border-violet-400/45 transition">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX_CHARS))}
              rows={5}
              placeholder="What do you want to create today?"
              className="w-full resize-none bg-transparent px-4 pt-4 pb-10 text-sm sm:text-base text-luxe placeholder:text-luxe/35 focus:outline-none"
            />
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-violet-300/80">
              <Sparkles className="w-4 h-4" aria-hidden />
            </div>
            <span className="absolute bottom-2 right-3 text-[10px] text-luxe/40 tabular-nums">
              {charCount}/{PROMPT_MAX_CHARS}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] tracking-[0.16em] uppercase text-luxe/45">Try these:</span>
              <button
                type="button"
                onClick={rotateChips}
                className="p-1 rounded-md text-luxe/40 hover:text-violet-200 transition"
                aria-label="More suggestions"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {visibleChips.map((chip) => (
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
          </div>

          <QuickCreateControls
            duration={duration}
            platform={platform}
            onDurationChange={setDuration}
            onPlatformChange={setPlatform}
            disabled={isGenerating}
          />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canGenerate || isGenerating}
              className={cn(
                'flex-1 h-11 rounded-xl font-medium text-sm gap-2 inline-flex items-center justify-center text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.55)] transition disabled:opacity-40',
                studioGradientPrimary
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Generate
                </>
              )}
            </button>
            <button
              type="button"
              onClick={openSettings}
              className="h-11 w-11 shrink-0 rounded-xl border border-white/[0.1] bg-black/40 text-luxe/60 hover:border-violet-400/30 hover:text-violet-200 transition inline-flex items-center justify-center"
              aria-label="Generation settings"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-black/30 overflow-hidden">
            <button
              type="button"
              onClick={() => setWhyOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left text-xs text-luxe/75 hover:bg-white/[0.02] transition"
            >
              <span className="inline-flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-300/70" />
                Why this works?
              </span>
              {whyOpen ? (
                <ChevronUp className="w-3.5 h-3.5 text-luxe/40" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-luxe/40" />
              )}
            </button>
            {whyOpen ? (
              <p className="px-3 pb-3 text-[11px] text-luxe/50 leading-relaxed border-t border-white/[0.04] pt-2">
                {whyText}
              </p>
            ) : null}
          </div>

          {showSignIn ? (
            <p className="text-center text-sm text-muted-foreground">
              <a
                href={loginHref}
                className="text-violet-300 hover:text-violet-200 underline-offset-2 hover:underline"
              >
                Sign in
              </a>{' '}
              to generate your reel.
            </p>
          ) : null}
        </form>
      </section>

      <section className="flex-1 min-w-0 min-h-[280px] lg:min-h-0 flex flex-col">
        <QuickModeResultsPanel projectId={projectId} audioRef={voiceAudioRef} />
      </section>
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
