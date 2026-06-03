'use client'

type BrowserSpeechRecognition = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: (() => void) | null
  onresult: ((ev: {
    results: { [i: number]: { [j: number]: { transcript: string }; isFinal?: boolean }; length: number }
    resultIndex: number
  }) => void) | null
  onend: (() => void) | null
  onerror: ((ev: { error: string }) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type SpeechRecognitionCtor = new () => BrowserSpeechRecognition

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export type VoiceEngineCallbacks = {
  onTranscript?: (text: string, isFinal: boolean) => void
  onStart?: () => void
  onEnd?: () => void
  onError?: (message: string) => void
}

export type MugteeVoiceEngine = {
  supported: boolean
  listening: boolean
  transcript: string
  start: () => void
  stop: () => void
  reset: () => void
}

export function createVoiceEngine(callbacks: VoiceEngineCallbacks = {}): MugteeVoiceEngine {
  const Ctor = getSpeechRecognition()
  let recognition: BrowserSpeechRecognition | null = null
  let listening = false
  let transcript = ''

  const engine: MugteeVoiceEngine = {
    supported: Boolean(Ctor),
    get listening() {
      return listening
    },
    get transcript() {
      return transcript
    },
    start() {
      if (!Ctor) {
        callbacks.onError?.('Speech recognition is not supported in this browser')
        return
      }
      if (listening) return
      recognition = new Ctor()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      recognition.onstart = () => {
        listening = true
        callbacks.onStart?.()
      }

      recognition.onresult = (event) => {
        let interim = ''
        let final = ''
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const chunk = event.results[i][0]?.transcript ?? ''
          if (event.results[i].isFinal) final += chunk
          else interim += chunk
        }
        if (final) transcript = `${transcript} ${final}`.trim()
        const live = (final || interim).trim()
        if (live) callbacks.onTranscript?.(live, Boolean(final))
      }

      recognition.onerror = (e) => {
        callbacks.onError?.(e.error || 'Voice input failed')
      }

      recognition.onend = () => {
        listening = false
        callbacks.onEnd?.()
      }

      try {
        recognition.start()
      } catch (e) {
        listening = false
        callbacks.onError?.(e instanceof Error ? e.message : 'Could not start microphone')
      }
    },
    stop() {
      recognition?.stop()
      listening = false
    },
    reset() {
      transcript = ''
    },
  }

  return engine
}
