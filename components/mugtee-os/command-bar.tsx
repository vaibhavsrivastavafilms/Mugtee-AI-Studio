'use client'

import { useCallback, useEffect, useState } from 'react'
import { Command } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMugteeAgentStore } from '@/stores/mugtee-agent-store'
import { parseBusinessCommand } from '@/lib/business/business-engine'

export function CommandBar() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const sendCommand = useMugteeAgentStore((s) => s.sendCommand)
  const loading = useMugteeAgentStore((s) => s.loading)

  const runCommand = useCallback(async () => {
    const cmd = input.trim()
    if (!cmd || loading) return
    setOpen(false)
    setInput('')

    const assetSearch = /^\/assets?\s/i.test(cmd) || /^find\s+(all\s+)?assets?\b/i.test(cmd)
    if (assetSearch) {
      const q = cmd.replace(/^\/assets?\s/i, '').replace(/^find\s+(all\s+)?assets?\s*/i, '').trim() || cmd
      window.location.href = `/studio/assets?q=${encodeURIComponent(q)}`
      return
    }

    if (parseBusinessCommand(cmd)) {
      window.location.href = `/studio/growth?cmd=${encodeURIComponent(cmd)}`
      return
    }

    await sendCommand(cmd)
  }, [input, loading, sendCommand])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-label="Mugtee command bar"
      onClick={() => setOpen(false)}
    >
      <div
        className={cn(
          'w-full max-w-lg rounded-2xl border border-cyan-500/30 bg-[#0a0f12]/95',
          'shadow-[0_0_60px_-10px_rgba(34,211,238,0.4)] p-4'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 text-cyan-300/90 mb-3">
          <Command className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider">Mugtee Cmd+K</span>
        </div>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void runCommand()
          }}
          placeholder="Help me grow Mugtee · Act as my COO · Ask anything…"
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-luxe focus:outline-none focus:border-cyan-400/50"
        />
        <p className="mt-2 text-[10px] text-luxe/45">
          Enter to run · growth/COO commands → Growth dashboard · Esc to close
        </p>
      </div>
    </div>
  )
}

/** Floating trigger when palette is closed */
export function CommandBarHint() {
  return (
    <button
      type="button"
      className="hidden lg:flex fixed bottom-6 right-20 z-[80] items-center gap-1.5 rounded-full border border-cyan-500/25 bg-[#0a0f12]/80 px-3 py-1.5 text-[10px] text-cyan-300/80 backdrop-blur-md"
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
      }}
    >
      <Command className="h-3 w-3" />
      <span>⌘K</span>
    </button>
  )
}
