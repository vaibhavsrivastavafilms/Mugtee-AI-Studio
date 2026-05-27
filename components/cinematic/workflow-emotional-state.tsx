'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  getWorkflowPresenceLine,
  type WorkflowPresencePhase,
} from '@/lib/creator/workflow-presence-copy'
import { cn } from '@/lib/utils'

export function WorkflowEmotionalState({
  phase,
  visible,
  seed = 0,
  className,
}: {
  phase: WorkflowPresencePhase
  visible: boolean
  seed?: number
  className?: string
}) {
  const line = useMemo(() => getWorkflowPresenceLine(phase, seed), [phase, seed])
  const [shown, setShown] = useState(false)

  useEffect(() => {
    if (visible) {
      setShown(true)
      return
    }
    const timer = setTimeout(() => setShown(false), 280)
    return () => clearTimeout(timer)
  }, [visible])

  if (!shown && !visible) return null

  return (
    <p
      className={cn(
        'text-center text-[10px] tracking-[0.2em] uppercase text-[#C8A24E]/58 py-2 calm-opacity-transition',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {line}
    </p>
  )
}
