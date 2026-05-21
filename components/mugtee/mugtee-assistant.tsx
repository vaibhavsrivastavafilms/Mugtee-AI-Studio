'use client'
// Phase 15 — Mugtee floating assistant.
// Cinematic chat UI. Reuses existing glass-strong + gold-gradient styling.
// Single API: POST /api/mugtee with the last 10 messages. localStorage stores conversation.
// Voice layer added — browser-native Web Speech (mic STT) + speechSynthesis (TTS), zero credit cost.

import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { Sparkles, X, Send, Loader2, Crown, Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react'
import { MugteeOrb, type OrbState } from '@/components/mugtee/mugtee-orb'
import { useSpeechRecognition, useSpeechSynthesis } from '@/lib/use-voice'

type Msg = { role: 'user' | 'assistant'; content: string }

const LS_HISTORY = 'mugtee:history:v1'
const LS_SEEN    = 'mugtee:seen:v1'
const LS_VOICE   = 'mugtee:voice:v1'   // 'on' | 'off' — voice-response toggle
const MAX_HISTORY = 10

const GREETING: Msg = {
  role: 'assistant',
  content: "Alright… what are we creating today? Drop the idea, niche, or vibe \u2014 voice or text \u2014 and we'll build something the algorithm can't ignore.",
}

const SUGGESTED = [
  { label: 'Walk me through the 5 steps', prompt: 'Walk me through the 5-step workflow from idea to published content.' },
  { label: 'Find a viral idea',           prompt: 'How do I find a viral idea for my niche?' },
  { label: 'Generate first script',       prompt: 'How do I generate my first cinematic faceless script?' },
  { label: 'Connect YouTube',              prompt: 'How do I connect YouTube and publish a video?' },
  { label: 'What\u2019s on this page?',    prompt: 'What can I do on this page right now?' },
]

export function MugteeAssistant() {
  const [open, setOpen]       = useState(false)
  const [messages, setMsgs]   = useState<Msg[]>([])
  const [input, setInput]     = useState('')
  const [sending, setSending] = useState(false)
  const [pulse, setPulse]     = useState(false)
  const [voiceOn, setVoiceOn] = useState(true)  // voice responses (TTS) default ON
  const scrollRef             = useRef<HTMLDivElement | null>(null)
  const inputRef              = useRef<HTMLInputElement | null>(null)
  const pathname              = usePathname()
  const lastSpokenRef         = useRef<string | null>(null)
  const sentRef               = useRef(false)   // guards mic auto-send

  // --- Voice hooks ---
  // STT: live transcript updates the input. On final result, auto-send if the
  // user stopped speaking (so long "voice ideas" go straight to the AI).
  const tts = useSpeechSynthesis()
  const stt = useSpeechRecognition({
    onResult: (text, isFinal) => {
      if (!text) return
      setInput(text)
      if (isFinal && !sentRef.current) {
        sentRef.current = true
        // Slight defer to let UI settle, then auto-send the spoken idea.
        setTimeout(() => { sentRef.current = false; send(text) }, 250)
      }
    },
  })

  // Bootstrap: load history, pulse + auto-open on first ever visit.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_HISTORY)
      const parsed = raw ? JSON.parse(raw) as Msg[] : null
      if (Array.isArray(parsed) && parsed.length) {
        setMsgs(parsed.slice(-MAX_HISTORY))
      } else {
        setMsgs([GREETING])
      }
      const seen = localStorage.getItem(LS_SEEN) === '1'
      if (!seen) {
        setPulse(true)
        // Auto-open on first session after a short delay so we don't fight the dashboard intro.
        const t = setTimeout(() => { setOpen(true); localStorage.setItem(LS_SEEN, '1'); setPulse(false) }, 2500)
        return () => clearTimeout(t)
      }
    } catch {
      setMsgs([GREETING])
    }
  }, [])

  // Persist history (skip the greeting alone)
  useEffect(() => {
    try {
      if (messages.length > 1 || (messages[0] && messages[0] !== GREETING)) {
        localStorage.setItem(LS_HISTORY, JSON.stringify(messages.slice(-MAX_HISTORY)))
      }
    } catch {}
  }, [messages])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, sending])

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  // Load voice-on preference once
  useEffect(() => {
    try { setVoiceOn(localStorage.getItem(LS_VOICE) !== 'off') } catch {}
  }, [])

  // Persist voice preference + stop any current speech when toggling off
  useEffect(() => {
    try { localStorage.setItem(LS_VOICE, voiceOn ? 'on' : 'off') } catch {}
    if (!voiceOn) tts.stop()
  }, [voiceOn]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-speak the latest assistant message (skip the static greeting unless explicitly clicked)
  useEffect(() => {
    if (!voiceOn || !tts.supported || sending) return
    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant' || last === GREETING) return
    if (lastSpokenRef.current === last.content) return
    lastSpokenRef.current = last.content
    tts.speak(last.content)
  }, [messages, sending, voiceOn, tts])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setInput('')
    const next: Msg[] = [...messages, { role: 'user', content: trimmed }]
    setMsgs(next)
    try {
      const res = await fetch('/api/mugtee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.filter(m => m !== GREETING).slice(-MAX_HISTORY),
          route: pathname,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        const err = data?.error === 'unauthorized'
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
      setMsgs(m => [...m, { role: 'assistant', content: 'Network blip. Try again \u2014 your message stays here.' }])
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) }
  }

  // Hide on auth & legal routes to keep them clean
  if (pathname === '/' || pathname === '/login' || pathname?.startsWith('/auth') || pathname?.startsWith('/privacy') || pathname?.startsWith('/terms') || pathname?.startsWith('/about')) {
    return null
  }

  // V3.7 — Auto-hide the floating assistant on the unified creator homepage
  // (the studio there already owns the orb + central conversational input).
  // Avoids duplication and keeps the dashboard hero clean.
  const hideOnRoute = pathname === '/dashboard'
  if (hideOnRoute) return null

  // Derive cinematic orb state — idle / listening / thinking / speaking.
  const orbState: OrbState =
    stt.listening ? 'listening' :
    sending       ? 'thinking'  :
    tts.speaking  ? 'speaking'  : 'idle'

  return (
    <>
      {/* V3.7 — Floating launcher uses the cinematic Mugtee Orb (4 states) instead
          of a static Sparkles icon. Subtle pulse ring is preserved as a "proactive
          help" cue. Bottom-right, safe-area aware, mobile-safe, non-blocking. */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close Mugtee' : 'Open Mugtee assistant'}
        className={
          'fixed z-40 right-4 bottom-4 sm:right-6 sm:bottom-6 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/40 backdrop-blur-md border border-gold-500/40 shadow-gold-glow flex items-center justify-center transition-transform active:scale-95 hover:scale-105' +
          (pulse && !open ? ' ring-2 ring-amber-300/50 animate-pulse-gold' : '')
        }
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {open ? <X className="w-5 h-5 text-gold-200" /> : <MugteeOrb state={orbState} size={40} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed z-40 right-3 sm:right-6 bottom-20 sm:bottom-24 w-[calc(100vw-1.5rem)] sm:w-[400px] max-w-[400px] h-[min(72vh,560px)] rounded-2xl glass-strong border border-gold-500/25 shadow-cinema flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3.5 border-b border-white/[0.05] bg-gradient-to-b from-amber-500/[0.05] to-transparent">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-gold-gradient flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4 text-black" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] tracking-[0.25em] uppercase text-gold-300/80">Mugtee</div>
                  <div className="text-xs text-luxe truncate">Your in-app strategist</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Voice responses toggle — speaks AI replies via SpeechSynthesis */}
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
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-luxe transition p-1" aria-label="Close">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-luxe">
              {messages.map((m, i) => {
                const isLast = i === messages.length - 1
                const speakingThis = tts.speaking && isLast && m.role === 'assistant'
                return (
                  <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                    <div className="max-w-[88%]">
                      <div className={
                        'px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap ' +
                        (m.role === 'user'
                          ? 'bg-gold-500/15 border border-gold-500/30 text-luxe rounded-br-md'
                          : 'bg-white/[0.04] border border-white/[0.06] text-luxe/95 rounded-bl-md')
                      }>
                        {m.content}
                      </div>
                      {/* Per-message Read Aloud control on assistant bubbles (skip for empty greeting) */}
                      {m.role === 'assistant' && tts.supported && m.content.length > 4 && (
                        <button
                          onClick={() => speakingThis ? tts.stop() : tts.speak(m.content)}
                          className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] tracking-wide text-muted-foreground hover:text-gold-300 hover:bg-gold-500/[0.08] transition"
                          aria-label={speakingThis ? 'Stop reading' : 'Read aloud'}
                        >
                          {speakingThis ? <><Square className="w-2.5 h-2.5" /> Stop</> : <><Volume2 className="w-2.5 h-2.5" /> Read aloud</>}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.04] border border-white/[0.06] rounded-2xl rounded-bl-md px-3.5 py-2.5 inline-flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-bounce" style={{ animationDelay: '120ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gold-300 animate-bounce" style={{ animationDelay: '240ms' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Suggested chips — only when conversation is light (just the greeting) */}
            {messages.length <= 1 && !sending && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5">
                {SUGGESTED.map(s => (
                  <button
                    key={s.label}
                    onClick={() => send(s.prompt)}
                    className="text-[10.5px] tracking-wide px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-gold-500/20 hover:bg-gold-500/[0.08] hover:border-gold-500/40 text-luxe/85 transition"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-white/[0.05]">
              <div className="flex items-end gap-2">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={onKeyDown}
                  disabled={sending}
                  placeholder={stt.listening ? 'Listening… speak naturally' : 'Ask Mugtee anything…'}
                  className={
                    'flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-white/[0.03] border text-sm text-luxe placeholder:text-muted-foreground/60 focus:outline-none transition ' +
                    (stt.listening
                      ? 'border-gold-500/60 ring-2 ring-gold-500/30 animate-pulse'
                      : 'border-white/[0.08] focus:border-gold-500/40')
                  }
                />
                {/* Microphone — Web Speech API STT. Hidden if browser doesn't support it. */}
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
              {/* Live interim transcript hint */}
              {stt.listening && stt.interim && (
                <div className="mt-1.5 text-[10.5px] text-gold-300/70 italic pl-1 truncate">
                  &ldquo;{stt.interim}&rdquo;
                </div>
              )}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/70 inline-flex items-center gap-1"><Crown className="w-2.5 h-2.5 text-gold-400/80" /> AI by Mugtee</span>
                <button
                  onClick={() => { setMsgs([GREETING]); try { localStorage.removeItem(LS_HISTORY) } catch {} }}
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
