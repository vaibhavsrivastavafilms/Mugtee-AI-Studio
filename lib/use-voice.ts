'use client'
// =====================================================================
// MUGTEE · Voice layer — browser-native only. Zero credit cost.
//
// Provides:
//   useSpeechRecognition() → mic STT via Web Speech API (Chrome/Safari/Edge)
//   useSpeechSynthesis()   → read-aloud TTS via window.speechSynthesis
//   readAloud(text)        → fire-and-forget convenience
//
// Notes:
//   - Feature-detects; returns `supported: false` when the browser lacks the API.
//   - Caller is responsible for stopping recognition/synthesis on unmount.
//   - No backend, no streaming, no paid TTS — pure SpeechRecognition + SpeechSynthesis.
// =====================================================================

import { useEffect, useRef, useState, useCallback } from 'react'
import { mugteePresence } from '@/lib/mugtee-presence'

// ---------- Types ----------
type AnySpeechRecognition = any

// ---------- Speech Recognition (STT) ----------
export function useSpeechRecognition(opts: { lang?: string; onResult?: (text: string, isFinal: boolean) => void } = {}) {
  const { lang = 'en-US', onResult } = opts
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const recRef = useRef<AnySpeechRecognition | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    if (typeof window === 'undefined') return
    const Cls = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Cls) { setSupported(false); return }
    setSupported(true)

    const rec: AnySpeechRecognition = new Cls()
    rec.lang = lang
    rec.continuous = true       // allow long voice ideas
    rec.interimResults = true   // show live partial transcript
    rec.maxAlternatives = 1

    rec.onresult = (ev: any) => {
      let finalText = ''
      let interimText = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interimText += r[0].transcript
      }
      if (finalText) {
        setInterim('')
        onResultRef.current?.(finalText.trim(), true)
      } else {
        setInterim(interimText)
        onResultRef.current?.(interimText.trim(), false)
      }
    }
    rec.onerror = () => { setListening(false); setInterim(''); mugteePresence.set({ listening: false, intentLabel: null }) }
    rec.onend = () => { setListening(false); setInterim(''); mugteePresence.set({ listening: false, intentLabel: null }) }

    recRef.current = rec
    return () => { try { rec.abort() } catch {} }
  }, [lang])

  const start = useCallback(() => {
    if (!recRef.current || listening) return
    try { recRef.current.start(); setListening(true); mugteePresence.set({ listening: true, intentLabel: 'Listening…' }) } catch {}
  }, [listening])

  const stop = useCallback(() => {
    if (!recRef.current) return
    try { recRef.current.stop() } catch {}
    setListening(false)
    mugteePresence.set({ listening: false, intentLabel: null })
  }, [])

  const toggle = useCallback(() => { listening ? stop() : start() }, [listening, start, stop])

  return { supported, listening, interim, start, stop, toggle }
}

// ---------- Speech Synthesis (TTS) ----------

// V3.8 — Voice profile presets. Each profile is a curated list of candidate voice
// names + language hints. We try them in order; the first one that exists on the
// user's OS/browser wins. This is intentionally a *light* multi-speaker layer —
// no ElevenLabs, no audio rendering, no extra deps.
export type VoiceProfile = 'indian_male' | 'indian_female' | 'us_male' | 'us_female' | 'cinematic'

export const VOICE_PROFILE_META: Record<VoiceProfile, { label: string; lang: string; description: string }> = {
  indian_male:    { label: 'Indian Male',    lang: 'en-IN', description: 'Cinematic, documentary-grade' },
  indian_female:  { label: 'Indian Female',  lang: 'en-IN', description: 'Warm, conversational' },
  us_male:        { label: 'American Male',  lang: 'en-US', description: 'Confident narrator' },
  us_female:      { label: 'American Female',lang: 'en-US', description: 'Emotional / reel-style' },
  cinematic:      { label: 'Cinematic',      lang: 'en-GB', description: 'Default broadcaster' },
}

const PROFILE_VOICE_CANDIDATES: Record<VoiceProfile, string[]> = {
  indian_male:   ['Rishi', 'Microsoft Prabhat Online (Natural) - English (India)', 'Google हिन्दी', 'Microsoft Madhur Online (Natural) - Hindi (India)'],
  indian_female: ['Veena', 'Microsoft Neerja Online (Natural) - English (India)', 'Google हिन्दी', 'Microsoft Swara Online (Natural) - Hindi (India)'],
  us_male:       ['Alex', 'Aaron', 'Tom', 'Fred', 'Google US English Male', 'Microsoft Guy Online (Natural) - English (United States)', 'Microsoft Davis Online (Natural) - English (United States)'],
  us_female:     ['Samantha', 'Karen', 'Google US English', 'Microsoft Aria Online (Natural) - English (United States)', 'Microsoft Jenny Online (Natural) - English (United States)'],
  cinematic:     ['Daniel', 'Oliver', 'Google UK English Male', 'Microsoft Ryan Online (Natural) - English (United Kingdom)', 'Microsoft Sonia Online (Natural) - English (United Kingdom)'],
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  // Default: cinematic English voices, male first.
  const preferred = [
    'Daniel', 'Alex', 'Aaron', 'Tom', 'Fred', 'Oliver', 'Rishi',
    'Google UK English Male', 'Google US English Male',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Microsoft Ryan Online (Natural) - English (United Kingdom)',
    'Microsoft Davis Online (Natural) - English (United States)',
    'Microsoft Tony Online (Natural) - English (United States)',
    'Samantha', 'Karen', 'Google UK English Female', 'Google US English',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Sonia Online (Natural) - English (United Kingdom)',
  ]
  for (const name of preferred) {
    const v = voices.find(x => x.name === name)
    if (v) return v
  }
  return voices.find(v => /en[-_]/i.test(v.lang)) || voices[0]
}

// V3.8 — Pick by profile. Falls back to the default cinematic pick if none match.
function pickVoiceByProfile(profile: VoiceProfile): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  const candidates = PROFILE_VOICE_CANDIDATES[profile] || []
  for (const name of candidates) {
    const v = voices.find(x => x.name === name)
    if (v) return v
  }
  // Lang-based fallback (any voice in the profile's preferred locale).
  const lang = VOICE_PROFILE_META[profile].lang
  const langMatch = voices.find(v => v.lang === lang)
  if (langMatch) return langMatch
  // Final fallback — default pick.
  return pickVoice()
}

export function useSpeechSynthesis() {
  const [supported, setSupported] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [paused, setPaused] = useState(false)
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null)
  // V3.8 — Track active profile so the UI can show "Indian Male" / "American Female" etc.
  const [profile, setProfileState] = useState<VoiceProfile>('cinematic')

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { setSupported(false); return }
    setSupported(true)
    const load = () => { voiceRef.current = pickVoiceByProfile(profile) }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => {
      try { window.speechSynthesis.cancel() } catch {}
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null
    }
  }, [profile])

  const setProfile = useCallback((p: VoiceProfile) => {
    setProfileState(p)
    voiceRef.current = pickVoiceByProfile(p)
  }, [])

  const speak = useCallback((text: string, opts?: { rate?: number; pitch?: number; lang?: string }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const clean = String(text || '').trim()
    if (!clean) return
    try { window.speechSynthesis.cancel() } catch {}   // always stop previous

    const utter = new SpeechSynthesisUtterance(clean)
    if (voiceRef.current) utter.voice = voiceRef.current
    // Cinematic, confident, slightly faster than default.
    utter.rate = opts?.rate ?? 1.05
    utter.pitch = opts?.pitch ?? 1.0
    utter.volume = 1.0
    // V3.8 — Allow explicit lang override (e.g. 'hi-IN' for Hindi narrations).
    if (opts?.lang) utter.lang = opts.lang
    else if (voiceRef.current?.lang) utter.lang = voiceRef.current.lang
    utter.onstart = () => { setSpeaking(true); setPaused(false); mugteePresence.set({ speaking: true }) }
    utter.onpause = () => setPaused(true)
    utter.onresume = () => setPaused(false)
    utter.onend = () => { setSpeaking(false); setPaused(false); mugteePresence.set({ speaking: false }) }
    utter.onerror = () => { setSpeaking(false); setPaused(false); mugteePresence.set({ speaking: false }) }

    try { window.speechSynthesis.speak(utter) } catch {}
  }, [])

  const stop = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try { window.speechSynthesis.cancel() } catch {}
    setSpeaking(false); setPaused(false); mugteePresence.set({ speaking: false })
  }, [])

  const pause = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try { window.speechSynthesis.pause() } catch {}
  }, [])

  const resume = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    try { window.speechSynthesis.resume() } catch {}
  }, [])

  return { supported, speaking, paused, speak, stop, pause, resume, profile, setProfile }
}
