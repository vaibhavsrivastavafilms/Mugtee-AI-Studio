'use client'

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
  QUICK_CHIP_SEEDS,
  V4_QUICK_PROMPT_CHIPS,
  PROMPT_MAX_CHARS,
  type QuickPlatformValue,
} from '@/lib/studio/quick-create-options'
import { GenerationEnginePanel } from '@/components/quick-cut/generation-engine-panel'
import { GenerationSidebar } from '@/components/quick-cut/generation-sidebar'
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
import { v4GoldButton, v4PanelClass } from '@/lib/studio/v4-design-tokens'
import { creatorOsPrefillDefaults } from '@/lib/creator/creator-os-profile'
import { CreatorMemoryPanel } from '@/components/studio/creator-memory-panel'
import { GenerationActivityFeed } from '@/components/quick-cut/generation-activity-feed'
import { clearGenerationActivityLog } from '@/lib/quick-cut/generation-activity.client'
import { QUICK_PLATFORM_OPTIONS } from '@/lib/studio/quick-create-options'

const LOGIN_AFTER_QUICK = `${STUDIO.quick}?resume=1`

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
    const defaults = creatorOsPrefillDefaults()
    if (defaults.duration) setDuration(defaults.duration)
    if (defaults.platform) {
      const match = QUICK_PLATFORM_OPTIONS.find((o) => o.value === defaults.platform)
      if (match) setPlatform(match.value)
    }
    if (defaults.tone) {
      useQuickCutGenerationStore.setState({ style: defaults.tone })
    }
    if (defaults.voiceId && defaults.voiceName) {
      useQuickCutGenerationStore.getState().setSelectedElevenLabsVoice(
        defaults.voiceId,
        defaults.voiceName
      )
    }
  }, [])

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
      clearGenerationActivityLog()

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
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[420px_minmax(0,1fr)_minmax(240px,280px)] min-h-0 auto-rows-max xl:auto-rows-auto gap-3 sm:gap-4 p-3 sm:p-4 pb-6">
      <section
        className={cn(
          v4PanelClass,
          'w-full xl:w-[420px] shrink-0 flex flex-col min-h-0 max-h-none xl:max-h-full overflow-hidden md:col-span-2 xl:col-span-1 order-1'
        )}
      >
        <div className="shrink-0 px-4 sm:px-5 pt-4 pb-2">
          <p className="text-[10px] tracking-[0.28em] uppercase text-[#7C4DFF]/80">Quick Mode</p>
          <h1 className="text-xl sm:text-2xl font-semibold text-luxe mt-1 font-display">
            The Creator Operating System
          </h1>
          <p className="text-xs text-luxe/45 mt-1">
            Turn one idea into a complete cinematic reel.
          </p>
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

          <GenerationActivityFeed maxItems={6} />

          <CreatorMemoryPanel />

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canGenerate || isGenerating}
              className={cn(v4GoldButton, 'flex-1 h-11 text-sm normal-case tracking-normal font-medium')}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Start Generating
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

      <section className="min-w-0 min-h-[min(72vh,640px)] md:min-h-[400px] xl:min-h-0 flex flex-col md:col-span-1 order-2 xl:order-2">
        <GenerationEnginePanel projectId={projectId} audioRef={voiceAudioRef} className="h-full min-h-[min(72vh,640px)] xl:min-h-0" />
      </section>

      <section className="min-w-0 min-h-[280px] xl:min-h-0 flex flex-col md:col-span-2 xl:col-span-1 order-3">
        <GenerationSidebar projectId={projectId} className="h-full min-h-[280px] xl:min-h-0" />
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
