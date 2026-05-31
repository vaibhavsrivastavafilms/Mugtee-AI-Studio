'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Film, Loader2, Sparkles } from 'lucide-react'
import { MugteeSidekickAvatar } from '@/components/sidekick/mugtee-sidekick-avatar'
import { cn } from '@/lib/utils'
import {
  buildConversationPrompt,
  CONVERSATION_EXAMPLE_CHIPS,
  createMessage,
  emptyConversationContext,
  mapToneToDirectorMode,
  mapToneToKeywords,
  mapToneToStyle,
  mugteeReplyForStep,
  needsNicheStep,
  nextStepAfterNiche,
  nextStepAfterPlatform,
  nextStepAfterTone,
  nextStepAfterTopic,
  NICHE_QUICK_PICKS,
  PLATFORM_OPTIONS,
  resolveNiche,
  TONE_OPTIONS,
  welcomeMessage,
  type ChatMessage,
  type ConversationContext,
  type ConversationPlatform,
  type ConversationStep,
  type ConversationTone,
} from '@/lib/create/mugtee-conversation-flow'
import { buildStyleFromKeywords } from '@/components/quick-cut/canvas/types'
import type { MoodKeyword } from '@/components/quick-cut/canvas/types'
import type { DirectorMode } from '@/lib/cinematic/director-modes'
import type { ProjectLanguage } from '@/lib/cinematic/language-detection'
import type { CinematicNiche } from '@/lib/cinematic/niches'
import { QUICK_CUT_SIGN_IN } from '@/lib/cinematic/quick-cut/copy'
import { useQuickCutGenerationStore } from '@/stores/quick-cut-generation-store'
import { CreatorLanguageIndicator } from '@/components/i18n/creator-language-indicator'
import {
  detectCreatorLanguage,
  type DetectedCreatorLanguage,
} from '@/lib/i18n/detect-creator-language'
import {
  persistCreatorLanguageFromText,
  loadCreatorLanguageSession,
} from '@/lib/i18n/creator-language-session'
import { saveContentLanguagePreference } from '@/lib/cinematic/content-languages'

export type MugteeConversationLaunchPayload = {
  prompt: string
  style: string
  keywords: MoodKeyword[]
  directorMode: DirectorMode
  language: ProjectLanguage
  niche: CinematicNiche
}

export function MugteeConversationEntry({
  embedded = false,
  language,
  signedIn,
  authReady,
  onLaunch,
  onSwitchClassic,
  showSignIn,
  loginHref,
}: {
  embedded?: boolean
  language: ProjectLanguage
  signedIn: boolean | null
  authReady: boolean
  onLaunch: (payload: MugteeConversationLaunchPayload) => Promise<void>
  onSwitchClassic?: () => void
  showSignIn?: boolean
  loginHref: string
}) {
  const [step, setStep] = useState<ConversationStep>('welcome')
  const [ctx, setCtx] = useState<ConversationContext>(emptyConversationContext())
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createMessage('mugtee', welcomeMessage()),
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [creatorLanguage, setCreatorLanguage] = useState<DetectedCreatorLanguage | null>(null)

  const isGenerating = useQuickCutGenerationStore((s) => s.isGenerating)
  const error = useQuickCutGenerationStore((s) => s.error)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const launchedRef = useRef(false)

  useEffect(() => {
    setCreatorLanguage(loadCreatorLanguageSession())
  }, [])

  useEffect(() => {
    const trimmed = input.trim()
    if (trimmed.length < 3) return
    const detected = detectCreatorLanguage(trimmed)
    setCreatorLanguage(detected)
  }, [input])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const pushMugtee = useCallback(
    async (nextStep: ConversationStep, nextCtx: ConversationContext, delayMs = 680) => {
      setTyping(true)
      await new Promise((r) => setTimeout(r, delayMs))
      setMessages((prev) => [
        ...prev,
        createMessage('mugtee', mugteeReplyForStep(nextStep, nextCtx)),
      ])
      setTyping(false)
      setStep(nextStep)
    },
    []
  )

  const pushUser = useCallback((text: string) => {
    setMessages((prev) => [...prev, createMessage('user', text)])
  }, [])

  const launchGeneration = useCallback(
    async (finalCtx: ConversationContext) => {
      if (launchedRef.current || launching) return
      launchedRef.current = true
      setLaunching(true)
      setStep('launching')

      const tone = finalCtx.tone ?? 'cinematic'
      const keywords = mapToneToKeywords(tone)
      const detected = persistCreatorLanguageFromText(finalCtx.topic)
      setCreatorLanguage(detected)
      const resolvedLanguage = detected.projectLanguage
      saveContentLanguagePreference(resolvedLanguage)
      const payload: MugteeConversationLaunchPayload = {
        prompt: buildConversationPrompt(finalCtx),
        style: buildStyleFromKeywords(keywords, mapToneToStyle(tone)),
        keywords,
        directorMode: mapToneToDirectorMode(tone),
        language: resolvedLanguage,
        niche: resolveNiche(finalCtx),
      }

      useQuickCutGenerationStore.setState({ niche: payload.niche })

      await pushMugtee('launching', finalCtx, 520)
      await onLaunch(payload)
      setLaunching(false)
    },
    [launching, onLaunch, pushMugtee]
  )

  const handleTopicSubmit = useCallback(
    async (raw: string) => {
      const topic = raw.trim()
      if (topic.length < 6 || typing || launching || isGenerating) return

      pushUser(topic)
      setInput('')
      persistCreatorLanguageFromText(topic)
      const nextCtx = { ...ctx, topic }
      setCtx(nextCtx)

      const nextStep = nextStepAfterTopic(nextCtx)
      await pushMugtee(nextStep, nextCtx)
    },
    [ctx, pushMugtee, pushUser, typing, launching, isGenerating]
  )

  const handlePlatformPick = useCallback(
    async (platform: ConversationPlatform) => {
      if (typing || launching) return
      const label = PLATFORM_OPTIONS.find((p) => p.id === platform)?.label ?? platform
      pushUser(label)
      const nextCtx = { ...ctx, platform }
      setCtx(nextCtx)
      await pushMugtee(nextStepAfterPlatform(nextCtx), nextCtx)
    },
    [ctx, pushMugtee, pushUser, typing, launching]
  )

  const handleTonePick = useCallback(
    async (tone: ConversationTone) => {
      if (typing || launching) return
      const label = TONE_OPTIONS.find((t) => t.id === tone)?.label ?? tone
      pushUser(label)
      const nextCtx = { ...ctx, tone }
      setCtx(nextCtx)

      if (needsNicheStep(nextCtx)) {
        await pushMugtee(nextStepAfterTone(nextCtx), nextCtx)
        return
      }

      await pushMugtee('launching', nextCtx, 480)
      void launchGeneration(nextCtx)
    },
    [ctx, launchGeneration, pushMugtee, pushUser, typing, launching]
  )

  const handleNichePick = useCallback(
    async (niche: CinematicNiche) => {
      if (typing || launching) return
      const label = NICHE_QUICK_PICKS.find((n) => n.id === niche)?.label ?? niche
      pushUser(label)
      const nextCtx = { ...ctx, niche }
      setCtx(nextCtx)
      await pushMugtee(nextStepAfterNiche(), nextCtx, 480)
      void launchGeneration(nextCtx)
    },
    [ctx, launchGeneration, pushMugtee, pushUser, typing, launching]
  )

  const handleChipClick = (chip: string) => {
    setInput(chip)
    inputRef.current?.focus()
    if (step === 'welcome') setStep('topic')
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'welcome') setStep('topic')
    void handleTopicSubmit(input)
  }

  const showComposer = step === 'welcome' || step === 'topic'
  const busy = typing || launching || isGenerating

  return (
    <div
      className={cn(
        'relative flex flex-col min-w-0 w-full max-w-2xl mx-auto',
        embedded ? 'min-h-[calc(100dvh-6rem)]' : 'min-h-[calc(100dvh-8rem)]'
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <MugteeSidekickAvatar size="sm" animated={!busy} />
          <div>
            <p className="font-display text-sm tracking-wide text-gold-gradient">Mugtee</p>
            <p className="text-[10px] tracking-[0.2em] uppercase text-luxe/45">Creative sidekick</p>
            <CreatorLanguageIndicator
              detected={creatorLanguage}
              className="mt-1.5"
            />
          </div>
        </div>
        {onSwitchClassic ? (
          <button
            type="button"
            onClick={onSwitchClassic}
            className="text-[10px] tracking-[0.16em] uppercase text-luxe/50 hover:text-gold-200 transition min-h-[44px] px-2"
          >
            Classic form
          </button>
        ) : null}
      </div>

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-luxe rounded-2xl border border-white/[0.08] bg-black/35 backdrop-blur-md p-4 sm:p-5 space-y-3 min-h-[280px] max-h-[min(52vh,480px)]"
      >
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28 }}
              className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-gold-500/15 border border-gold-500/25 text-[#F4E7C1]'
                    : 'bg-white/[0.04] border border-white/[0.07] text-luxe/85'
                )}
              >
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {typing ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-start"
          >
            <div className="inline-flex items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.04] px-3.5 py-2.5">
              <span className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-gold-300/70"
                    animate={{ opacity: [0.35, 1, 0.35], y: [0, -3, 0] }}
                    transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </span>
            </div>
          </motion.div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {step === 'platform' && !typing && !launching ? (
          <OptionGrid
            options={PLATFORM_OPTIONS.map((p) => ({ id: p.id, label: p.label, hint: p.hint }))}
            onPick={(id) => void handlePlatformPick(id as ConversationPlatform)}
          />
        ) : null}

        {step === 'tone' && !typing && !launching ? (
          <OptionGrid
            options={TONE_OPTIONS.map((t) => ({ id: t.id, label: t.label, hint: t.hint }))}
            onPick={(id) => void handleTonePick(id as ConversationTone)}
          />
        ) : null}

        {step === 'niche' && !typing && !launching ? (
          <OptionGrid
            options={NICHE_QUICK_PICKS.map((n) => ({ id: n.id, label: n.label }))}
            onPick={(id) => void handleNichePick(id as CinematicNiche)}
            compact
          />
        ) : null}

        {(step === 'welcome' || step === 'topic') && !busy ? (
          <div className="flex flex-wrap justify-center gap-2">
            {CONVERSATION_EXAMPLE_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="rounded-full border border-white/[0.08] bg-black/30 px-3 py-1.5 text-[11px] text-luxe/55 hover:border-gold-500/30 hover:text-gold-200 transition"
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}

        {showComposer ? (
          <form onSubmit={handleFormSubmit} className="relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your video idea…"
              rows={2}
              disabled={busy}
              className={cn(
                'w-full resize-none rounded-2xl border border-white/[0.1] bg-black/45',
                'px-4 py-3 pr-14 text-sm text-luxe placeholder:text-luxe/35',
                'focus:outline-none focus:border-gold-500/35 focus:ring-1 focus:ring-gold-500/20',
                'disabled:opacity-50'
              )}
            />
            <button
              type="submit"
              disabled={input.trim().length < 6 || busy || !authReady}
              className={cn(
                'absolute right-2 bottom-2 inline-flex h-10 w-10 items-center justify-center rounded-xl',
                'bg-gold-gradient text-black shadow-gold-glow disabled:opacity-40 transition-opacity'
              )}
              aria-label="Send"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </form>
        ) : null}

        {launching || isGenerating ? (
          <p className="text-center text-[11px] tracking-[0.18em] uppercase text-gold-300/70 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            Mugtee is generating your reel…
          </p>
        ) : null}

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

        {!busy && step !== 'launching' ? (
          <p className="text-center text-[10px] text-luxe/35 tracking-wide">
            <Film className="w-3 h-3 inline mr-1 opacity-60" />
            Hook → script → scenes → voice → export
          </p>
        ) : null}
      </div>
    </div>
  )
}

function OptionGrid({
  options,
  onPick,
  compact,
}: {
  options: { id: string; label: string; hint?: string }[]
  onPick: (id: string) => void
  compact?: boolean
}) {
  return (
    <div className={cn('grid gap-2', compact ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-3')}>
      {options.map((opt) => (
        <motion.button
          key={opt.id}
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onPick(opt.id)}
          className={cn(
            'rounded-xl border border-white/[0.08] bg-black/40 backdrop-blur-sm',
            'px-3 py-3 text-left hover:border-gold-500/30 hover:bg-gold-500/[0.06] transition-colors min-h-[44px]'
          )}
        >
          <span className="block text-sm font-medium text-[#F4E7C1]/90">{opt.label}</span>
          {opt.hint ? (
            <span className="block text-[10px] text-luxe/45 mt-0.5">{opt.hint}</span>
          ) : null}
        </motion.button>
      ))}
    </div>
  )
}
