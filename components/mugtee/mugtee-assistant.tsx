'use client'
// Mugtee Creative Director — floating in-app chat.
// POST /api/mugtee with last 10 messages. History in localStorage.
// Voice: Web Speech STT + speechSynthesis TTS.

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Crown,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  ChevronDown,
} from 'lucide-react'
import { MugteeOrb, type OrbState } from '@/components/mugtee/mugtee-orb'
import { cn } from '@/lib/utils'
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/use-voice'
import {
  MUGTEE_FAQ_CATEGORIES,
  MUGTEE_FAQ_POPULAR,
  MUGTEE_GREETING,
  MUGTEE_INPUT_EXAMPLE,
  MUGTEE_INPUT_PLACEHOLDER,
  MUGTEE_QUICK_ACTIONS,
  MUGTEE_TAGLINE,
  type MugteeFaqItem,
  type MugteeQuickAction,
} from '@/lib/mugtee/assistant-config'
import { CreatorLanguageIndicator } from '@/components/i18n/creator-language-indicator'
import {
  persistCreatorLanguageFromText,
  loadCreatorLanguageSession,
} from '@/lib/i18n/creator-language-session'
import type { DetectedCreatorLanguage } from '@/lib/i18n/detect-creator-language'

type Msg = { role: 'user' | 'assistant'; content: string }

const LS_HISTORY = 'mugtee:history:v1'
const LS_SEEN = 'mugtee:seen:v1'
const LS_VOICE = 'mugtee:voice:v1'
const MAX_HISTORY = 10

const GREETING: Msg = { role: 'assistant', content: MUGTEE_GREETING }

function buildHref(href: string, prompt?: string): string {
  if (!prompt) return href
  const sep = href.includes('?') ? '&' : '?'
  return `${href}${sep}topic=${encodeURIComponent(prompt.slice(0, 200))}`
}

export function MugteeAssistant() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [pulse, setPulse] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)
  const [expandedFaq, setExpandedFaq] = useState<string | null>('popular')
  const [creatorLanguage, setCreatorLanguage] = useState<DetectedCreatorLanguage | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const createMode = searchParams?.get('mode')
  const lastSpokenRef = useRef<string | null>(null)
  const sentRef = useRef(false)

  const tts = useSpeechSynthesis()
  const stt = useSpeechRecognition({
    onResult: (text, isFinal) => {
      if (!text) return
      setInput(text)
      if (isFinal && !sentRef.current) {
        sentRef.current = true
        setTimeout(() => {
          sentRef.current = false
          send(text)
        }, 250)
      }
    },
  })

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY)
      const parsed = raw ? (JSON.parse(raw) as Msg[]) : null
      if (Array.isArray(parsed) && parsed.length) {
        setMsgs(parsed.slice(-MAX_HISTORY))
      } else {
        setMsgs([GREETING])
      }
      const seen = localStorage.getItem(LS_SEEN) === '1'
      if (!seen) {
        setPulse(true)
        const t = setTimeout(() => {
          setOpen(true)
          localStorage.setItem(LS_SEEN, '1')
          setPulse(false)
        }, 2500)
        return () => clearTimeout(t)
      }
    } catch {
      setMsgs([GREETING])
    }
  }, [])

  useEffect(() => {
    setCreatorLanguage(loadCreatorLanguageSession())
  }, [])

  useEffect(() => {
    try {
      if (messages.length > 1 || (messages[0] && messages[0].content !== GREETING.content)) {
        localStorage.setItem(LS_HISTORY, JSON.stringify(messages.slice(-MAX_HISTORY)))
      }
    } catch {}
  }, [messages])

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  useEffect(() => {
    try {
      setVoiceOn(localStorage.getItem(LS_VOICE) === 'on')
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LS_VOICE, voiceOn ? 'on' : 'off')
    } catch {}
    if (!voiceOn) tts.stop()
  }, [voiceOn]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!voiceOn || !tts.supported || sending) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || last.content === GREETING.content) return
    if (lastSpokenRef.current === last.content) return
    lastSpokenRef.current = last.content
    tts.speak(last.content)
  }, [messages, sending, voiceOn, tts])

  useEffect(() => {
    if (!open || !voiceOn || !tts.supported || !stt.supported) return
    if (tts.speaking || sending || stt.listening) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    if (input.trim().length > 0) return
    const t = setTimeout(() => {
      if (!stt.listening && !tts.speaking && !sending) {
        try {
          stt.start?.()
        } catch {}
      }
    }, 700)
    return () => clearTimeout(t)
  }, [open, voiceOn, tts.speaking, sending, stt.listening, messages, input, stt, tts.supported, stt.supported])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setInput('')
    const detected = persistCreatorLanguageFromText(trimmed)
    setCreatorLanguage(detected)
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }]
    setMsgs(next)
    try {
      const res = await fetch('/api/mugtee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter(m => m.content !== GREETING.content).slice(-MAX_HISTORY),
          route: pathname,
          detectedLanguage: {
            languageCode: detected.languageCode,
            isMixed: detected.isMixed,
          },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err =
          data?.error === 'unauthorized'
            ? 'You need to sign in to use Mugtee. Open /login in a tab and come back.'
            : data?.error === 'upstream_error'
              ? 'The AI gateway is busy right now. Try again in a few seconds.'
              : 'Something went off-script. Try again.'
        setMsgs(m => [...m, { role: 'assistant', content: err }])
        return
      }
      const reply = String(data?.content || '').trim()
      if (reply) setMsgs(m => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: 'Network blip. Try again — your message stays here.' }])
    } finally {
      setSending(false)
    }
  }

  const showInlineAnswer = (question: string, answer: string) => {
    setMsgs(m => [
      ...m,
      { role: 'user', content: question },
      { role: 'assistant', content: answer },
    ])
  }

  const handleFaqClick = (item: MugteeFaqItem) => {
    if (item.answer) {
      showInlineAnswer(item.question, item.answer)
      return
    }
    if (item.prompt) {
      setInput(item.prompt)
      inputRef.current?.focus()
      return
    }
    if (item.href) router.push(item.href)
  }

  const handleQuickAction = (action: MugteeQuickAction) => {
    if (action.chatFirst) {
      setInput(action.prompt)
      inputRef.current?.focus()
      return
    }
    if (action.href) {
      router.push(buildHref(action.href, action.prompt))
      setOpen(false)
      return
    }
    send(action.prompt)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const isEmptyState =
    messages.length <= 1 && messages[0]?.content === GREETING.content && !sending

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/privacy') ||
    pathname?.startsWith('/terms') ||
    pathname?.startsWith('/about')
  ) {
    return null
  }

  if (pathname === '/dashboard') return null

  // Bottom primary CTAs (Generate) sit above the fold — hide orb so it cannot steal clicks.
  if (
    pathname === '/studio/video' ||
    pathname === '/studio/create' ||
    pathname === '/studio/quick' ||
    (pathname === '/create' && createMode === 'quick')
  ) {
    return null
  }

  const orbState: OrbState = stt.listening
    ? 'listening'
    : sending
      ? 'thinking'
      : tts.speaking
        ? 'speaking'
        : 'idle'

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close Mugtee' : 'Open Mugtee assistant'}
        className={
          'fixed z-40 right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-6 sm:bottom-[max(1.5rem,env(safe-area-inset-bottom))] w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 backdrop-blur-md border border-gold-500/40 shadow-gold-glow flex items-center justify-center transition-transform active:scale-95 hover:scale-105' +
          (pulse && !open ? ' ring-2 ring-amber-300/50 animate-pulse-gold' : '')
        }
      >
        {open ? (
          <X className="w-5 h-5 text-gold-200" />
        ) : (
          <span aria-hidden>
            <MugteeOrb state={orbState} size={40} useLogo />
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-40 right-3 sm:right-6 bottom-20 sm:bottom-24 w-[calc(100vw-1.5rem)] sm:w-[420px] max-w-[420px] h-[min(78vh,620px)] rounded-2xl glass-strong border border-gold-500/25 shadow-cinema flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-white/[0.05] bg-gradient-to-b from-amber-500/[0.07] to-transparent">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-black" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display text-sm tracking-[0.18em] text-gold-100">
                        MUGTEE AI
                      </div>
                      <div className="text-[11px] italic text-gold-300/75 font-display">
                        Your Cinematic Creator Director
                      </div>
                    </div>
                  </div>
                  <p className="mt-2.5 text-[11px] leading-relaxed text-luxe/70 pl-[42px]">
                    {MUGTEE_TAGLINE}
                  </p>
                  <div className="mt-2 pl-[42px]">
                    <CreatorLanguageIndicator detected={creatorLanguage} />
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {tts.supported && (
                    <button
                      onClick={() => setVoiceOn(v => !v)}
                      title={voiceOn ? 'Voice responses ON — click to mute' : 'Voice responses OFF — click to enable'}
                      aria-label={voiceOn ? 'Mute voice responses' : 'Enable voice responses'}
                      className={
                        'inline-flex items-center justify-center w-7 h-7 rounded-md transition ' +
                        (voiceOn
                          ? 'bg-gold-500/15 border border-gold-500/40 text-gold-200 hover:bg-gold-500/25'
                          : 'bg-white/[0.04] border border-white/[0.08] text-muted-foreground hover:text-luxe hover:border-white/[0.15]')
                      }
                    >
                      {voiceOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="text-muted-foreground hover:text-luxe transition p-1"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages + empty-state actions */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-luxe">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1
                const speakingThis = tts.speaking && isLast && m.role === 'assistant'
                return (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className="max-w-[90%]">
                      <div
                        className={
                          'px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ' +
                          (m.role === 'user'
                            ? 'bg-gold-500/15 border border-gold-500/30 text-luxe rounded-br-md font-display'
                            : 'bg-white/[0.04] border border-white/[0.06] text-luxe/95 rounded-bl-md')
                        }
                      >
                        {m.content}
                      </div>
                      {m.role === 'assistant' && tts.supported && m.content.length > 4 && (
                        <button
                          onClick={() => (speakingThis ? tts.stop() : tts.speak(m.content))}
                          className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wide text-muted-foreground hover:text-gold-300 hover:bg-gold-500/[0.08] transition"
                          aria-label={speakingThis ? 'Stop reading' : 'Read aloud'}
                        >
                          {speakingThis ? (
                            <>
                              <Square className="w-2.5 h-2.5" /> Stop
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-2.5 h-2.5" /> Read aloud
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-3.5 py-2.5 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-bounce [animation-delay:0ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-bounce [animation-delay:120ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-bounce [animation-delay:240ms]" />
                  </div>
                </div>
              )}

              {isEmptyState && (
                <>
                  <div className="pt-1">
                    <p className="text-[9px] tracking-[0.28em] uppercase text-gold-400/60 mb-2">
                      Start creating
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {MUGTEE_QUICK_ACTIONS.map(action => (
                        <button
                          key={action.label}
                          onClick={() => handleQuickAction(action)}
                          className="text-[10.5px] tracking-wide px-2.5 py-1.5 rounded-full bg-black/30 border border-gold-500/25 hover:bg-gold-500/[0.1] hover:border-gold-500/45 text-luxe/90 transition font-display"
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-3 mt-1">
                    <p className="text-[9px] tracking-[0.28em] uppercase text-gold-400/60 mb-2">
                      FAQ
                    </p>

                    <FaqAccordion
                      id="popular"
                      emoji="✨"
                      label="Popular"
                      expanded={expandedFaq === 'popular'}
                      onToggle={() => setExpandedFaq(expandedFaq === 'popular' ? null : 'popular')}
                      items={MUGTEE_FAQ_POPULAR}
                      onItemClick={handleFaqClick}
                    />

                    {MUGTEE_FAQ_CATEGORIES.map(cat => (
                      <FaqAccordion
                        key={cat.id}
                        id={cat.id}
                        emoji={cat.emoji}
                        label={cat.label}
                        expanded={expandedFaq === cat.id}
                        onToggle={() => setExpandedFaq(expandedFaq === cat.id ? null : cat.id)}
                        items={cat.items}
                        onItemClick={handleFaqClick}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 p-3 border-t border-white/[0.05] bg-black/20">
              <div className="flex items-end gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={sending}
                  placeholder={
                    stt.listening ? 'Listening… speak naturally' : MUGTEE_INPUT_PLACEHOLDER
                  }
                  className={
                    'flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-white/[0.03] border text-sm text-luxe placeholder:text-muted-foreground/60 focus:outline-none transition font-display ' +
                    (stt.listening
                      ? 'border-gold-500/60 ring-2 ring-gold-500/30 animate-pulse'
                      : 'border-white/[0.08] focus:border-gold-500/40')
                  }
                />
                {stt.supported && (
                  <button
                    onClick={stt.toggle}
                    disabled={sending}
                    title={stt.listening ? 'Stop listening' : 'Speak your idea'}
                    aria-label={stt.listening ? 'Stop listening' : 'Speak your idea'}
                    className={
                      'min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border transition ' +
                      (stt.listening
                        ? 'bg-gold-500/25 border-gold-500/60 text-gold-200 shadow-[0_0_18px_-2px_rgba(245,196,77,0.55)] animate-pulse'
                        : 'bg-white/[0.04] border-white/[0.08] text-luxe hover:bg-gold-500/10 hover:border-gold-500/40 hover:text-gold-200')
                    }
                  >
                    {stt.listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}
                <button
                  onClick={() => send(input)}
                  disabled={sending || !input.trim()}
                  className="min-w-[44px] min-h-[40px] flex items-center justify-center rounded-lg bg-gold-gradient text-black shadow-gold-glow disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition"
                  aria-label="Send"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
              {!input.trim() && !stt.listening && (
                <p className="mt-1.5 text-[10px] text-muted-foreground/70 pl-1 leading-relaxed italic">
                  {MUGTEE_INPUT_EXAMPLE}
                </p>
              )}
              {stt.listening && stt.interim && (
                <div className="mt-1.5 text-[10.5px] text-gold-300/70 italic pl-1 truncate">
                  &ldquo;{stt.interim}&rdquo;
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/70 inline-flex items-center gap-1">
                  <Crown className="w-2.5 h-2.5 text-gold-400/80" /> Creative Director AI
                </span>
                <button
                  onClick={() => {
                    setMsgs([GREETING])
                    try {
                      localStorage.removeItem(LS_HISTORY)
                    } catch {}
                  }}
                  className="text-[10px] tracking-wider uppercase text-muted-foreground hover:text-gold-300 transition"
                >
                  Clear chat
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function FaqAccordion({
  id,
  emoji,
  label,
  expanded,
  onToggle,
  items,
  onItemClick,
}: {
  id: string
  emoji: string
  label: string
  expanded: boolean
  onToggle: () => void
  items: MugteeFaqItem[]
  onItemClick: (item: MugteeFaqItem) => void
}) {
  return (
    <div className="mb-1 rounded-lg border border-white/[0.04] bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        {...(expanded
          ? { 'aria-expanded': 'true' as const, 'aria-controls': `faq-${id}` }
          : { 'aria-expanded': 'false' as const, 'aria-controls': `faq-${id}` })}
        className="w-full flex items-center justify-between gap-2 px-2.5 py-2 text-left hover:bg-gold-500/[0.04] transition"
      >
        <span className="text-[11px] text-luxe/90 font-display">
          {emoji} {label}
          <span className="ml-1.5 text-muted-foreground/60 text-[10px]">({items.length})</span>
        </span>
        <ChevronDown
          className={
            'w-3.5 h-3.5 text-gold-400/70 shrink-0 transition-transform ' +
            (expanded ? 'rotate-180' : '')
          }
        />
      </button>
      <ul id={`faq-${id}`} hidden={!expanded} className="pb-1 px-1 space-y-0.5">
        {items.map(item => (
          <li key={item.question}>
            <button
              type="button"
              onClick={() => onItemClick(item)}
              className="w-full text-left px-2 py-1.5 rounded-md text-[10.5px] leading-snug text-luxe/75 hover:text-gold-200 hover:bg-gold-500/[0.06] transition"
            >
              {item.question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
