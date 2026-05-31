'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Film, Sparkles } from 'lucide-react'
import { MugteeOrb } from '@/components/mugtee/mugtee-orb'
import { cn } from '@/lib/utils'
import { useAuthHydration } from '@/lib/auth/use-auth-hydration'
import { useSpeechRecognition } from '@/lib/use-voice'
import {
  QUICK_CUT_PROMPTS,
  QUICK_CUT_SIGN_IN,
  ASK_MUGTEE_PROMPT_CHIPS,
} from '@/lib/cinematic/quick-cut/copy'
import {
  clearQuickCutPending,
  saveQuickCutPending,
  type QuickCutPending,
} from '@/lib/cinematic/quick-cut/preview-session'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { CinematicCanvasBackground } from '@/components/quick-cut/canvas/cinematic-canvas-background'
import { CinematicPromptInput } from '@/components/quick-cut/canvas/cinematic-prompt-input'
import { FloatingMicButton } from '@/components/quick-cut/canvas/floating-mic-button'
import { VoiceTranscriptPanel } from '@/components/quick-cut/canvas/voice-transcript-panel'
import {
  ImageReferenceUploader,
  type ImageReference,
} from '@/components/quick-cut/canvas/image-reference-uploader'
import { KeywordMoodSelector } from '@/components/quick-cut/canvas/keyword-mood-selector'
import { ContentLanguageSelector } from '@/components/quick-cut/canvas/content-language-selector'
import {
  buildStyleFromKeywords,
  detectInputMode,
  type MoodKeyword,
} from '@/components/quick-cut/canvas/types'
import {
  loadContentLanguagePreference,
  saveContentLanguagePreference,
} from '@/lib/cinematic/content-languages'
import {
  loadCreatorLanguageSession,
  persistCreatorLanguageFromText,
} from '@/lib/i18n/creator-language-session'
import { CreatorLanguageIndicator } from '@/components/i18n/creator-language-indicator'
import type { DetectedCreatorLanguage } from '@/lib/i18n/detect-creator-language'
import {
  DEFAULT_DIRECTOR_MODE,
  loadDirectorModePreference,
  saveDirectorModePreference,
  type DirectorMode,
} from '@/lib/cinematic/director-modes'
import {
  DEFAULT_CREATOR_EXPERIENCE,
  isDirectorExperience,
  loadCreatorExperiencePreference,
  saveCreatorExperiencePreference,
  type CreatorExperienceLevel,
} from '@/lib/cinematic/creator-experience-level'
import { DirectorModeSelector } from '@/components/quick-cut/canvas/director-mode-selector'
import { CreatorExperienceSelector } from '@/components/create/creator-experience-selector'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import { RecentGenerationsStrip } from '@/components/quick-cut/recent-generations-strip'
import { CreatorInspiration } from '@/components/creator-inspiration'
import { EmptyStateExamples } from '@/components/proof/empty-state-examples'
import { CreatorBlueprintSection } from '@/components/create/creator-blueprint-section'
import { KnowledgeSuggestions } from '@/components/create/knowledge-suggestions'
import {
  MugteeConversationEntry,
  type MugteeConversationLaunchPayload,
} from '@/components/create/mugtee-conversation-entry'
import type { CreatorBlueprint } from '@/lib/cinematic/creator-blueprints'
import { GuidedCreationPrompt } from '@/components/onboarding/guided-creation-prompt'
import { SuggestionChips } from '@/components/onboarding/suggestion-chips'
import { WhatMugteeGenerates } from '@/components/onboarding/what-mugtee-generates'
import { EmptyStateExamples } from '@/components/proof/empty-state-examples'
import {
  isFirstTimeUser,
  markHasCreatedProject,
} from '@/lib/onboarding/onboarding-state'

const LOGIN_AFTER_QUICK_CUT = '/create?mode=quick&resume=1'
const CONVERSATION_ENTRY_KEY = 'mugtee:conversation-entry:v1'

function loadConversationEntryPreference(directorUi: boolean): boolean {
  if (directorUi) return false
  if (typeof window === 'undefined') return true
  try {
    const raw = localStorage.getItem(CONVERSATION_ENTRY_KEY)
    if (raw === 'classic') return false
    if (raw === 'conversation') return true
  } catch {
    /* ignore */
  }
  return true
}

function saveConversationEntryPreference(mode: 'conversation' | 'classic'): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(CONVERSATION_ENTRY_KEY, mode)
  } catch {
    /* ignore */
  }
}

export function FullscreenQuickCutCanvas({
  embedded = false,
  initialPrompt = '',
  initialExperience,
}: {
  embedded?: boolean
  initialPrompt?: string
  initialExperience?: CreatorExperienceLevel
}) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [keywords, setKeywords] = useState<MoodKeyword[]>([])
  const [imageRef, setImageRef] = useState<ImageReference | null>(null)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceNote, setVoiceNote] = useState('')
  const [deepResearchEnabled, setDeepResearchEnabled] = useState(true)
  const [contentLanguage, setContentLanguage] = useState<ProjectLanguage>('en')
  const [directorMode, setDirectorMode] = useState<DirectorMode>(DEFAULT_DIRECTOR_MODE)
  const [experienceLevel, setExperienceLevel] = useState<CreatorExperienceLevel>(
    initialExperience ?? DEFAULT_CREATOR_EXPERIENCE
  )
  const [promptFocused, setPromptFocused] = useState(false)
  const [promptIndex, setPromptIndex] = useState(0)
  const [showSignIn, setShowSignIn] = useState(false)
  const [mobileImageOpen, setMobileImageOpen] = useState(false)
  const [useConversationEntry, setUseConversationEntry] = useState(true)
  const [creatorLanguage, setCreatorLanguage] = useState<DetectedCreatorLanguage | null>(null)

  const { ready: authReady, user } = useAuthHydration()
  const signedIn = authReady ? Boolean(user) : null

  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const error = useQuickCutGenerationStore((s) => s.error)
  const runPipeline = useQuickCutGenerationStore((s) => s.runPipeline)
  const blueprintId = useQuickCutGenerationStore((s) => s.blueprintId)
  const setCreatorBlueprint = useQuickCutGenerationStore((s) => s.setCreatorBlueprint)

  const voiceAppendRef = useRef('')
  const promptFormRef = useRef<HTMLFormElement>(null)

  const stt = useSpeechRecognition({
    onResult: (text, isFinal) => {
      if (isFinal) {
        const next = voiceAppendRef.current
          ? `${voiceAppendRef.current} ${text}`.trim()
          : text.trim()
        voiceAppendRef.current = next
        setVoiceTranscript(next)
        setVoiceNote(`Spoken direction: ${next}`)
        if (!prompt.trim()) setPrompt(next)
        else setPrompt((p) => (p.includes(text) ? p : `${p} ${text}`.trim()))
      } else {
        setVoiceTranscript(
          voiceAppendRef.current ? `${voiceAppendRef.current} ${text}`.trim() : text
        )
      }
    },
  })

  const question = useMemo(
    () => QUICK_CUT_PROMPTS[promptIndex % QUICK_CUT_PROMPTS.length],
    [promptIndex]
  )

  const imageNote = imageRef?.note

  const directorUi = isDirectorExperience(experienceLevel)

  useEffect(() => {
    const session = loadCreatorLanguageSession()
    if (session) {
      setContentLanguage(session.projectLanguage)
      setCreatorLanguage(session)
    } else {
      setContentLanguage(loadContentLanguagePreference())
    }
    setDirectorMode(loadDirectorModePreference())
    const level = initialExperience ?? loadCreatorExperiencePreference()
    setExperienceLevel(level)
    setUseConversationEntry(loadConversationEntryPreference(isDirectorExperience(level)))
  }, [initialExperience])

  useEffect(() => {
    const combined = [prompt, voiceTranscript].filter(Boolean).join(' ').trim()
    if (combined.length < 6) return
    const detected = persistCreatorLanguageFromText(combined)
    setCreatorLanguage(detected)
    setContentLanguage(detected.projectLanguage)
    saveContentLanguagePreference(detected.projectLanguage)
  }, [prompt, voiceTranscript])

  useEffect(() => {
    if (directorUi) {
      setUseConversationEntry(false)
      return
    }
    setUseConversationEntry(loadConversationEntryPreference(false))
  }, [directorUi])

  useEffect(() => {
    const timer = setInterval(() => setPromptIndex((i) => i + 1), 5200)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt)
  }, [initialPrompt])

  const inputMode = detectInputMode({
    prompt,
    imageNote,
    voiceNote,
    hasImage: Boolean(imageRef),
  })

  const canGenerate =
    prompt.trim().length >= 6 ||
    Boolean(imageNote?.trim()) ||
    Boolean(voiceNote?.trim())

  const readiness =
    prompt.trim().length >= 6 ? 1 : Math.min(0.85, (prompt.trim().length / 6) * 0.85 + (imageRef ? 0.15 : 0) + (voiceNote ? 0.15 : 0))

  const loginHref = `/login?next=${encodeURIComponent(LOGIN_AFTER_QUICK_CUT)}`

  const toggleKeyword = useCallback((keyword: MoodKeyword) => {
    setKeywords((prev) =>
      prev.includes(keyword) ? prev.filter((k) => k !== keyword) : [...prev, keyword]
    )
  }, [])

  const handleInspirationSelect = useCallback((topic: string) => {
    setPrompt(topic)
    setPromptFocused(true)
    promptFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const handleBlueprintSelect = useCallback(
    (blueprint: CreatorBlueprint) => {
      setPrompt(blueprint.prefillPrompt)
      setPromptFocused(true)
      setCreatorBlueprint(blueprint.id)
      if (blueprint.suggestedDirectorMode) {
        setDirectorMode(blueprint.suggestedDirectorMode)
        saveDirectorModePreference(blueprint.suggestedDirectorMode)
      }
    },
    [setCreatorBlueprint]
  )

  const handleLanguageChange = useCallback((language: ProjectLanguage) => {
    setContentLanguage(language)
    saveContentLanguagePreference(language)
  }, [])

  const handleDirectorModeChange = useCallback((mode: DirectorMode) => {
    setDirectorMode(mode)
    saveDirectorModePreference(mode)
  }, [])

  const handleExperienceChange = useCallback((level: CreatorExperienceLevel) => {
    setExperienceLevel(level)
    saveCreatorExperiencePreference(level)
    if (!isDirectorExperience(level)) {
      setKeywords([])
      setImageRef(null)
      setVoiceTranscript('')
      setVoiceNote('')
      setDeepResearchEnabled(false)
      setMobileImageOpen(false)
    }
  }, [])

  const buildPending = useCallback((): QuickCutPending => {
    const style = buildStyleFromKeywords(keywords)
    return {
      prompt: prompt.trim() || voiceTranscript.trim() || 'Cinematic visual story',
      style,
      duration: 60,
      imageNote: imageNote?.trim() || undefined,
      voiceNote: voiceNote.trim() || undefined,
      keywords: keywords.length ? [...keywords] : undefined,
      language: contentLanguage,
      directorMode,
      blueprintId: blueprintId ?? undefined,
    }
  }, [prompt, keywords, imageNote, voiceNote, voiceTranscript, contentLanguage, directorMode, blueprintId])

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

      const savedProjectId = useQuickCutGenerationStore.getState().savedProjectId
      await runPipeline({
        prompt: pending.prompt,
        style: pending.style,
        duration: pending.duration,
        imageNote: pending.imageNote,
        voiceNote: pending.voiceNote,
        keywords: pending.keywords,
        language: pending.language,
        directorMode: pending.directorMode,
        blueprintId: pending.blueprintId,
        reuseProject: Boolean(savedProjectId),
        skipResearch: directorUi ? !deepResearchEnabled : true,
      })
      clearQuickCutPending()
    },
    [authReady, deepResearchEnabled, directorUi, isGenerating, runPipeline, signedIn]
  )

  const handleConversationLaunch = useCallback(
    async (payload: MugteeConversationLaunchPayload) => {
      setPrompt(payload.prompt)
      setKeywords(payload.keywords)
      setDirectorMode(payload.directorMode)
      saveDirectorModePreference(payload.directorMode)
      setContentLanguage(payload.language)

      const pending: QuickCutPending = {
        prompt: payload.prompt,
        style: payload.style,
        duration: 60,
        keywords: payload.keywords.length ? [...payload.keywords] : undefined,
        language: payload.language,
        directorMode: payload.directorMode,
      }

      if (signedIn === false) {
        saveQuickCutPending(pending)
        setShowSignIn(true)
        return
      }

      await launchPipeline(pending)
    },
    [launchPipeline, signedIn]
  )

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!canGenerate || isGenerating || !authReady) return
    await launchPipeline(buildPending())
  }

  const showConversation = !directorUi && useConversationEntry

  return (
    <div
      className={cn(
        'relative text-luxe overflow-hidden',
        embedded ? 'min-h-[calc(100dvh-4rem)]' : 'min-h-[100dvh]'
      )}
    >
      <CinematicCanvasBackground />

      {!embedded ? (
        <header className="relative z-20 flex items-center justify-between px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <Link
            href="/create?mode=quick"
            className="flex items-center gap-2 min-h-[44px] transition-opacity hover:opacity-90"
          >
            <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shadow-gold-glow">
              <span className="font-display text-sm font-bold text-black">M</span>
            </div>
            <span className="font-display text-sm tracking-wide text-gold-gradient">Mugtee</span>
          </Link>
          <div className="flex items-center gap-3">
            <CreatorExperienceSelector
              value={experienceLevel}
              onChange={handleExperienceChange}
              compact
              className="hidden sm:block"
            />
            {signedIn === false ? (
              <Link
                href={loginHref}
                className="text-[11px] tracking-[0.2em] uppercase text-luxe/60 hover:text-gold-300 transition min-h-[44px] inline-flex items-center px-2"
              >
                Sign in
              </Link>
            ) : null}
          </div>
        </header>
      ) : null}

      <main className="relative z-10 flex flex-col gap-6 px-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(5rem,env(safe-area-inset-bottom))] pt-4 lg:pt-6 min-h-[calc(100dvh-5rem)]">
        <div className="flex-1 flex flex-col justify-center min-w-0 max-w-3xl mx-auto lg:mx-0 lg:max-w-none w-full">
          {showConversation ? (
            <MugteeConversationEntry
              embedded={embedded}
              language={contentLanguage}
              signedIn={signedIn}
              authReady={authReady}
              onLaunch={handleConversationLaunch}
              requireDiscovery={experienceLevel === 'noob'}
              onSwitchClassic={() => {
                saveConversationEntryPreference('classic')
                setUseConversationEntry(false)
              }}
              showSignIn={showSignIn}
              loginHref={loginHref}
            />
          ) : (
            <>
          <motion.p
            key={promptIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-[10px] tracking-[0.28em] uppercase text-gold-300/70 mb-2"
          >
            Ask Mugtee
          </motion.p>
          <motion.p
            key={`q-${promptIndex}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center font-display text-lg sm:text-xl md:text-2xl text-[#F4E7C1]/90 leading-snug italic mb-6 sm:mb-8 px-2"
          >
            {question}
          </motion.p>

          {!directorUi ? (
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={() => {
                  saveConversationEntryPreference('conversation')
                  setUseConversationEntry(true)
                }}
                className="text-[10px] tracking-[0.16em] uppercase text-gold-300/65 hover:text-gold-200 transition min-h-[44px] px-3"
              >
                Switch to Mugtee chat
              </button>
            </div>
          ) : null}

          <form ref={promptFormRef} onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            <CreatorExperienceSelector
              value={experienceLevel}
              onChange={handleExperienceChange}
              className="sm:hidden mx-auto"
            />

            {directorUi ? (
              <CreatorBlueprintSection
                selectedBlueprintId={blueprintId}
                onSelectBlueprint={handleBlueprintSelect}
              />
            ) : null}

            {directorUi ? (
              <DirectorModeSelector
                value={directorMode}
                onChange={handleDirectorModeChange}
              />
            ) : null}

            <div className="relative">
              <MugteeOrb
                state={promptFocused || prompt.trim() ? 'thinking' : 'idle'}
                size={32}
                useLogo
                className="absolute -left-1 sm:left-0 top-4 z-10 hidden sm:block"
              />
              <CinematicPromptInput
                value={prompt}
                onChange={setPrompt}
                focused={promptFocused}
                onFocus={() => setPromptFocused(true)}
                onBlur={() => setPromptFocused(false)}
                className="sm:pl-10"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {ASK_MUGTEE_PROMPT_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setPrompt(chip)
                    setPromptFocused(true)
                  }}
                  className="rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 text-[11px] text-luxe/55 hover:border-gold-500/30 hover:text-gold-200 transition"
                >
                  {chip}
                </button>
              ))}
            </div>

            {directorUi && signedIn ? (
              <KnowledgeSuggestions
                prompt={prompt}
                onSelectTopic={(topic) => {
                  setPrompt(topic)
                  setPromptFocused(true)
                }}
              />
            ) : null}

            <div
              className={cn(
                'grid gap-3',
                directorUi ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              )}
            >
              <ContentLanguageSelector
                value={contentLanguage}
                onChange={handleLanguageChange}
                autoDetected={creatorLanguage?.projectLanguage === contentLanguage}
              />
              {directorUi ? (
                <KeywordMoodSelector selected={keywords} onToggle={toggleKeyword} />
              ) : null}
            </div>

            {directorUi ? (
              <>
                <div className="flex items-start gap-3">
                  <FloatingMicButton
                    listening={stt.listening}
                    supported={stt.supported}
                    onToggle={stt.toggle}
                    className="shrink-0 mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <VoiceTranscriptPanel
                      transcript={voiceTranscript}
                      interim={stt.interim}
                      listening={stt.listening}
                      supported={stt.supported}
                    />
                  </div>
                </div>

                <div className="hidden sm:block">
                  <ImageReferenceUploader reference={imageRef} onChange={setImageRef} />
                </div>

                <div className="sm:hidden">
                  <button
                    type="button"
                    onClick={() => setMobileImageOpen((v) => !v)}
                    className="w-full min-h-[44px] rounded-xl border border-white/[0.08] bg-black/30 text-[11px] tracking-[0.16em] uppercase text-luxe/70"
                  >
                    {mobileImageOpen ? 'Hide reference frame' : 'Add reference frame'}
                  </button>
                  {mobileImageOpen ? (
                    <div className="mt-3">
                      <ImageReferenceUploader reference={imageRef} onChange={setImageRef} />
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="text-center text-[11px] text-luxe/45 leading-relaxed px-2">
                Noob mode uses guided defaults. Switch to Director for blueprints, mood, voice, and
                deep research.
              </p>
            )}

            {error ? (
              <p className="text-center text-sm text-amber-200/90" role="alert">
                {error}
              </p>
            ) : null}

            {showSignIn && signedIn === false ? (
              <div className="rounded-2xl border border-gold-500/25 bg-gold-500/[0.06] p-4 text-center space-y-3">
                <p className="font-display text-lg text-[#F4E7C1]">{QUICK_CUT_SIGN_IN.title}</p>
                <p className="text-sm text-luxe/65">{QUICK_CUT_SIGN_IN.body}</p>
                <Link
                  href={loginHref}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gold-gradient text-black text-sm font-medium shadow-gold-glow"
                >
                  {QUICK_CUT_SIGN_IN.cta}
                </Link>
              </div>
            ) : null}

            {directorUi ? (
              <label className="flex items-center justify-center gap-2 text-[11px] text-luxe/55 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={deepResearchEnabled}
                  onChange={(e) => setDeepResearchEnabled(e.target.checked)}
                  className="rounded border-gold-500/40 bg-black/40 text-gold-500 focus:ring-gold-500/30"
                />
                Deep Research before script (slower, richer facts)
              </label>
            ) : null}

            <motion.button
              type="submit"
              disabled={!canGenerate || isGenerating || !authReady}
              whileHover={canGenerate ? { scale: 1.01 } : undefined}
              whileTap={canGenerate ? { scale: 0.99 } : undefined}
              animate={
                canGenerate
                  ? {
                      boxShadow: [
                        '0 0 24px -6px rgba(212,175,55,0.35)',
                        '0 0 40px -4px rgba(212,175,55,0.55)',
                        '0 0 24px -6px rgba(212,175,55,0.35)',
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 2.5, repeat: canGenerate ? Infinity : 0 }}
              className={cn(
                'w-full min-h-[52px] inline-flex items-center justify-center gap-2.5 rounded-2xl',
                'bg-gold-gradient text-black text-sm font-semibold tracking-[0.08em] uppercase',
                'shadow-gold-glow disabled:opacity-40 disabled:pointer-events-none hover:opacity-95 transition-opacity'
              )}
            >
              <Sparkles className="w-4 h-4" />
              Ask Mugtee
              {inputMode !== 'idle' && inputMode !== 'text' ? (
                <span className="text-[10px] opacity-70 normal-case tracking-normal">
                  · {inputMode}
                </span>
              ) : null}
            </motion.button>

            {canGenerate ? (
              <p className="text-center text-[10px] tracking-[0.18em] uppercase text-luxe/35">
                <Film className="w-3 h-3 inline mr-1 opacity-60" />
                Readiness {Math.round(readiness * 100)}%
              </p>
            ) : null}
          </form>

          {directorUi && !isGenerating ? <RecentGenerationsStrip limit={8} /> : null}

          {directorUi && !isGenerating && !prompt.trim() ? (
            <EmptyStateExamples className="mt-6" />
          ) : null}

          {directorUi && !isGenerating ? (
            <CreatorInspiration onSelectTopic={handleInspirationSelect} />
          ) : null}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
