'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lightbulb, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createEntryHref } from '@/lib/create/routes'
import { useCreatorAgentStore } from '@/stores/creator-agent-store'

export function IdeaCaptureInput({ className }: { className?: string }) {
  const [text, setText] = useState('')
  const [saved, setSaved] = useState(false)
  const captureIdea = useCreatorAgentStore((s) => s.captureIdea)
  const router = useRouter()

  const handleSubmit = async () => {
    if (text.trim().length < 6) return
    const result = await captureIdea(text.trim())
    if (result) {
      setSaved(true)
      setText('')
      if (result.projectPrompt) {
        router.push(`${createEntryHref('quick')}?prompt=${encodeURIComponent(result.projectPrompt)}`)
      }
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 flex gap-2 items-center',
        className
      )}
    >
      <Lightbulb className="w-4 h-4 text-gold-300/60 shrink-0" />
      <input
        value={text}
        onChange={(e) => {
          setSaved(false)
          setText(e.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') void handleSubmit()
        }}
        placeholder="I saw something interesting…"
        className="flex-1 bg-transparent text-xs text-luxe/80 placeholder:text-luxe/35 outline-none"
      />
      <button
        type="button"
        disabled={text.trim().length < 6}
        onClick={() => void handleSubmit()}
        className="shrink-0 p-2 rounded-lg text-gold-300/70 hover:text-gold-200 disabled:opacity-30"
        aria-label="Capture idea"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
      {saved ? (
        <span className="text-[9px] text-emerald-400/80 shrink-0">Saved</span>
      ) : null}
    </div>
  )
}
