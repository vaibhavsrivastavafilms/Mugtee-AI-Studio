'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Mic, MicOff, Send, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useMugteeCompanionStore } from '@/stores/mugtee-companion-store'
import { useCompanionLanguage } from '@/hooks/use-companion-language'
import { useSpeechRecognition } from '@/lib/use-voice'
import { CreatorLanguageIndicator } from '@/components/i18n/creator-language-indicator'

export function CompanionPromptBar() {
  const inputDraft = useMugteeCompanionStore((s) => s.inputDraft)
  const setInputDraft = useMugteeCompanionStore((s) => s.setInputDraft)
  const submitPrompt = useMugteeCompanionStore((s) => s.submitPrompt)
  const isProcessing = useMugteeCompanionStore((s) => s.isProcessing)
  const voiceMode = useMugteeCompanionStore((s) => s.voiceMode)
  const setVoiceMode = useMugteeCompanionStore((s) => s.setVoiceMode)
  const setListening = useMugteeCompanionStore((s) => s.setListening)
  const startConversation = useMugteeCompanionStore((s) => s.startConversation)
  const setDetectedLanguage = useMugteeCompanionStore((s) => s.setDetectedLanguage)
  const detectedLanguage = useMugteeCompanionStore((s) => s.detectedLanguage)

  const { detectFromText, language } = useCompanionLanguage(inputDraft)
  const [voiceActive, setVoiceActive] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  const stt = useSpeechRecognition({
    onResult: (text, isFinal) => {
      setInputDraft(text)
      if (isFinal && text.trim()) {
        const lang = detectFromText(text)
        setDetectedLanguage(lang)
      }
    },
  })

  useEffect(() => {
    if (!stt.listening && voiceActive) {
      setVoiceActive(false)
      setListening(false)
    }
  }, [stt.listening, voiceActive, setListening])

  const toggleVoice = useCallback(() => {
    if (voiceActive) {
      stt.stop()
      setVoiceActive(false)
      setListening(false)
      setVoiceMode('off')
      return
    }
    startConversation()
    setVoiceMode('push-to-talk')
    setVoiceActive(true)
    setListening(true)
    stt.start()
  }, [voiceActive, stt, setListening, setVoiceMode, startConversation])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = inputDraft.trim()
    if (!text) return
    const lang = detectFromText(text)
    setDetectedLanguage(lang)
    await submitPrompt(text)
  }

  const displayLang = detectedLanguage ?? language

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 px-3 sm:px-5 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <div className="mx-auto max-w-2xl rounded-2xl border border-gold-500/20 bg-[#0a0a0a]/90 backdrop-blur-xl shadow-[0_-8px_40px_rgba(0,0,0,0.45)] p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <button
            type="button"
            onClick={startConversation}
            className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.18em] uppercase text-gold-300/70 hover:text-gold-200 transition"
          >
            <MessageCircle className="w-3 h-3" />
            Start conversation
          </button>
          {displayLang ? <CreatorLanguageIndicator detected={displayLang} /> : null}
        </div>

        <form ref={formRef} onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputDraft}
              onChange={(e) => setInputDraft(e.target.value)}
              placeholder="Ask Mugtee anything..."
              disabled={isProcessing}
              className={cn(
                'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 pr-12',
                'text-sm text-luxe placeholder:text-luxe/40',
                'focus:outline-none focus:ring-1 focus:ring-gold-500/40 focus:border-gold-500/30',
                'disabled:opacity-60'
              )}
              aria-label="Ask Mugtee"
            />
          </div>

          <Button
            type="button"
            size="icon"
            variant={voiceActive ? 'default' : 'outline'}
            className={cn(
              'shrink-0 h-11 w-11 rounded-xl',
              voiceActive && 'bg-gold-gradient text-black border-0'
            )}
            onClick={toggleVoice}
            aria-pressed={voiceActive}
            aria-label={voiceActive ? 'Stop voice input' : 'Voice input'}
          >
            {voiceActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          <Button
            type="submit"
            size="icon"
            disabled={isProcessing || !inputDraft.trim()}
            className="shrink-0 h-11 w-11 rounded-xl bg-gold-gradient text-black hover:opacity-90 border-0"
            aria-label="Send message"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>

        {voiceMode === 'push-to-talk' && voiceActive ? (
          <p className="text-[10px] text-gold-300/60 mt-2 px-1 tracking-wide">
            Push-to-talk active — speak, then send. Hands-free mode coming in V2.
          </p>
        ) : null}
      </div>
    </motion.div>
  )
}
