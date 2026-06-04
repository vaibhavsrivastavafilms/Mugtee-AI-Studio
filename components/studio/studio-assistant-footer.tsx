'use client'

import { useCallback, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { studioBtnPrimary } from '@/lib/studio/studio-design-tokens'

type StudioAssistantFooterProps = {
  className?: string
}

export function StudioAssistantFooter({ className }: StudioAssistantFooterProps) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastReply, setLastReply] = useState<string | null>(null)

  const send = useCallback(async () => {
    const text = message.trim()
    if (!text || busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/companion/realtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
      })
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string }
      if (!res.ok) {
        throw new Error(data.error || 'Assistant unavailable')
      }
      const reply = data.reply?.trim() || 'Mugtee is thinking — try again in a moment.'
      setLastReply(reply)
      setMessage('')
      toast.message('Mugtee', { description: reply.slice(0, 120) })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reach assistant')
    } finally {
      setBusy(false)
    }
  }, [busy, message])

  return (
    <div className={cn('shrink-0 p-3 border-t border-white/[0.06]', className)}>
      <p className="text-[9px] tracking-[0.2em] uppercase text-luxe/40 mb-2">AI Assistant</p>
      {lastReply ? (
        <p className="text-[10px] text-luxe/50 leading-snug mb-2 line-clamp-2">{lastReply}</p>
      ) : null}
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder="Ask anything about your project…"
          disabled={busy}
          className="flex-1 min-w-0 h-9 px-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-[12px] text-luxe placeholder:text-luxe/35 focus:outline-none focus:border-studio-primary/40"
        />
        <button
          type="button"
          disabled={busy || !message.trim()}
          onClick={() => void send()}
          className={cn(studioBtnPrimary, 'h-9 w-9 px-0 shrink-0')}
          aria-label="Send to assistant"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
