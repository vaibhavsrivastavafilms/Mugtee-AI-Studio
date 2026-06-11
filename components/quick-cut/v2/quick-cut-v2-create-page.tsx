'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Sparkles, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  qcV2GoldButton,
  qcV2Panel,
  QC_V2,
} from '@/lib/quick-cut/quick-cut-v2-design'
import { QuickCreateControls } from '@/components/studio/quick-create-controls'
import {
  PROMPT_MAX_CHARS,
  QUICK_CHIP_SEEDS,
  V4_QUICK_PROMPT_CHIPS,
  type QuickPlatformValue,
} from '@/lib/studio/quick-create-options'
import { loadContentLanguagePreference } from '@/lib/cinematic/content-languages'
import {
  DEFAULT_DIRECTOR_MODE,
  loadDirectorModePreference,
} from '@/lib/cinematic/director-modes'
import { markHasCreatedProject } from '@/lib/onboarding/onboarding-state'
import { quickCutProjectHref, STUDIO } from '@/lib/create/routes'
import { creatorOsPrefillDefaults } from '@/lib/creator/creator-os-profile'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { createQuickCutDraftProject } from '@/lib/quick-cut/create-quick-cut-draft.client'
import { clearGenerationActivityLog } from '@/lib/quick-cut/generation-activity.client'
import { clearQuickCutPending, saveQuickCutPending, type QuickCutPending } from '@/lib/cinematic/quick-cut/preview-session'

const LOGIN_AFTER_QUICK = `${STUDIO.quick}?resume=1`

type QuickCutV2CreatePageProps = {
  initialPrompt?: string
  className?: string
}

export function QuickCutV2CreatePage({ initialPrompt = '', className }: QuickCutV2CreatePageProps) {
  const router = useRouter()
  const { ready: authReady, user } = useAuthHydration()
  const signedIn = authReady ? Boolean(user) : null

  const [prompt, setPrompt] = useState(initialPrompt)
  const [duration, setDuration] = useState(60)
  const [platform, setPlatform] = useState<QuickPlatformValue>('youtube_short')
  const [chipSeed, setChipSeed] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showSignIn, setShowSignIn] = useState(false)

  const style = useQuickCutGenerationStore((s) => s.style)
  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)

  useEffect(() => {
    const defaults = creatorOsPrefillDefaults()
    if (defaults.duration) setDuration(defaults.duration)
    if (defaults.platform) setPlatform(defaults.platform as QuickPlatformValue)
    if (defaults.tone) useQuickCutGenerationStore.setState({ style: defaults.tone })
  }, [])

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt)
  }, [initialPrompt])

  const visibleChips = V4_QUICK_PROMPT_CHIPS.slice(
    chipSeed % V4_QUICK_PROMPT_CHIPS.length,
    (chipSeed % V4_QUICK_PROMPT_CHIPS.length) + 4
  )

  const launch = useCallback(
    async (pending: QuickCutPending) => {
      if (submitting || isGenerating || !authReady) return

      if (signedIn === false) {
        saveQuickCutPending(pending)
        setShowSignIn(true)
        return
      }

      setSubmitting(true)
      markHasCreatedProject()
      clearGenerationActivityLog()

      try {
        const projectId = await createQuickCutDraftProject({
          prompt: pending.prompt,
          style: pending.style,
          duration: pending.duration,
          platform,
          language: pending.language ?? loadContentLanguagePreference(),
        })
        clearQuickCutPending()
        saveQuickCutPending({
          prompt: pending.prompt,
          style: pending.style,
          duration: pending.duration,
          language: pending.language,
          directorMode: pending.directorMode,
        })
        router.push(
          quickCutProjectHref(projectId, {
            autorun: '1',
            platform,
          })
        )
      } catch {
        setSubmitting(false)
      }
    },
    [authReady, isGenerating, platform, router, signedIn, submitting]
  )

  const handleGenerate = (event?: React.FormEvent) => {
    event?.preventDefault()
    const trimmed = prompt.trim()
    if (trimmed.length < 6) return
    void launch({
      prompt: trimmed,
      style: style || 'cinematic_emotional',
      duration,
      language: loadContentLanguagePreference(),
      directorMode: loadDirectorModePreference() ?? DEFAULT_DIRECTOR_MODE,
    })
  }

  const canGenerate = prompt.trim().length >= 6 && !submitting
  const loginHref = `/auth/login?next=${encodeURIComponent(LOGIN_AFTER_QUICK)}`

  return (
    <div
      className={cn('mx-auto w-full max-w-xl px-4 py-6 sm:py-10', className)}
      style={{ color: QC_V2.text }}
    >
      <header className="text-center space-y-2 mb-8">
        <p className="text-[11px] uppercase tracking-[0.24em] text-[#D4AF37]/80">Quick Cut</p>
        <h1 className="text-2xl sm:text-3xl font-semibold font-display">Idea → MP4</h1>
        <p className="text-sm text-white/65">Your AI production team, one tap away.</p>
      </header>

      <form onSubmit={handleGenerate} className={cn(qcV2Panel, 'p-4 sm:p-5 space-y-4')}>
        <div className="relative rounded-xl border border-[rgba(212,175,55,0.15)] bg-[#050505] focus-within:border-[rgba(212,175,55,0.35)] transition">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, PROMPT_MAX_CHARS))}
            rows={5}
            placeholder="What reel should Mugtee produce for you?"
            className="w-full resize-none bg-transparent px-4 pt-4 pb-10 text-sm sm:text-base text-white placeholder:text-white/35 focus:outline-none"
          />
          <Sparkles className="absolute bottom-3 left-3 w-4 h-4 text-[#D4AF37]/70" aria-hidden />
          <span className="absolute bottom-3 right-3 text-[10px] text-white/40 tabular-nums">
            {prompt.length}/{PROMPT_MAX_CHARS}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {visibleChips.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setPrompt(QUICK_CHIP_SEEDS[chip] ?? chip)}
              className="rounded-full border border-[rgba(212,175,55,0.2)] bg-[#050505] px-3 py-1.5 text-[11px] text-white/70 hover:border-[rgba(212,175,55,0.4)] hover:text-[#E6C76A] transition"
            >
              {chip}
            </button>
          ))}
        </div>

        <QuickCreateControls
          duration={duration}
          platform={platform}
          onDurationChange={setDuration}
          onPlatformChange={setPlatform}
          disabled={submitting || isGenerating}
        />

        <button type="submit" disabled={!canGenerate} className={cn(qcV2GoldButton, 'w-full')}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating Project…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate Reel
            </>
          )}
        </button>

        {showSignIn ? (
          <p className="text-center text-sm text-white/55">
            <a href={loginHref} className="text-[#E6C76A] underline-offset-2 hover:underline">
              Sign in
            </a>{' '}
            to generate your reel.
          </p>
        ) : null}
      </form>
    </div>
  )
}
