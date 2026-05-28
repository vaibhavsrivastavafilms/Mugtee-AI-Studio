'use client'

import { useEffect, useState } from 'react'
import { Film } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LiveScriptReveal({
  script,
  active,
  className,
}: {
  script: string
  active?: boolean
  className?: string
}) {
  const [visible, setVisible] = useState('')

  useEffect(() => {
    if (!script) {
      setVisible('')
      return
    }
    if (!active) {
      setVisible(script)
      return
    }
    setVisible('')
    let i = 0
    const id = window.setInterval(() => {
      i += 2
      setVisible(script.slice(0, i))
      if (i >= script.length) window.clearInterval(id)
    }, 16)
    return () => window.clearInterval(id)
  }, [script, active])

  if (!script) return null

  return (
    <div className={cn('rounded-xl border border-white/[0.08] bg-black/30 p-4', className)}>
      <div className="flex items-center gap-1.5 text-[10px] tracking-[0.22em] uppercase text-gold-300/85 mb-3">
        <Film className="w-3 h-3" /> Cinematic Script
      </div>
      <pre className="whitespace-pre-wrap break-words text-[12px] leading-[1.65] text-luxe/75 font-sans max-h-[140px] overflow-y-auto scrollbar-luxe">
        {visible}
        {active && visible.length < script.length ? (
          <span className="inline-block w-[2px] h-[14px] bg-gold-400/80 ml-0.5 align-middle animate-pulse" />
        ) : null}
      </pre>
    </div>
  )
}
