'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createVoiceEngine } from '@/lib/ai-agent/voice-engine'

export function VoiceInput({
  onFinalTranscript,
  className,
}: {
  onFinalTranscript: (text: string) => void
  className?: string
}) {
  const [listening, setListening] = useState(false)
  const [live, setLive] = useState('')
  const [supported, setSupported] = useState(true)
  const engineRef = useRef<ReturnType<typeof createVoiceEngine> | null>(null)

  useEffect(() => {
    engineRef.current = createVoiceEngine({
      onStart: () => setListening(true),
      onEnd: () => {
        setListening(false)
        const text = engineRef.current?.transcript?.trim() ?? live.trim()
        if (text) onFinalTranscript(text)
        engineRef.current?.reset()
        setLive('')
      },
      onTranscript: (text, isFinal) => {
        setLive(text)
        if (isFinal && text.trim()) onFinalTranscript(text.trim())
      },
      onError: () => setSupported(false),
    })
    setSupported(engineRef.current.supported)
  }, [live, onFinalTranscript])

  const toggle = useCallback(() => {
    const engine = engineRef.current
    if (!engine?.supported) return
    if (listening) engine.stop()
    else {
      engine.reset()
      engine.start()
    }
  }, [listening])

  if (!supported) return null

  return (
    <button
      type="button"
      onClick={toggle}
      title={listening ? 'Stop voice input' : 'Start voice input'}
      className={cn(
        'fixed bottom-24 right-4 z-[90] h-12 w-12 rounded-full border flex items-center justify-center',
        'shadow-[0_0_30px_-6px_rgba(34,211,238,0.55)] transition-colors',
        listening
          ? 'border-cyan-400 bg-cyan-500/25 text-cyan-100'
          : 'border-cyan-500/40 bg-[#0a0f12]/90 text-cyan-300 hover:bg-cyan-500/15',
        className
      )}
      aria-pressed={listening}
    >
      {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
    </button>
  )
}
