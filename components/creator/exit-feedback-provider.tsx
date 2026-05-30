'use client'

import { useCallback, useEffect, useState } from 'react'
import { ExitFeedbackModal } from '@/components/creator/exit-feedback-modal'
import {
  EXIT_FEEDBACK_REQUEST_EVENT,
  hasExitFeedbackForTrigger,
  markExitFeedbackShown,
  type ExitFeedbackRequestDetail,
  type ExitFeedbackTrigger,
} from '@/lib/creator/exit-feedback'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export function ExitFeedbackProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [trigger, setTrigger] = useState<ExitFeedbackTrigger | null>(null)

  const close = useCallback(() => {
    setOpen(false)
    setTrigger(null)
  }, [])

  const dismiss = useCallback(() => {
    if (trigger) markExitFeedbackShown(trigger)
  }, [trigger])

  useEffect(() => {
    const onRequest = async (event: Event) => {
      const detail = (event as CustomEvent<ExitFeedbackRequestDetail>).detail
      if (!detail?.trigger) return
      if (hasExitFeedbackForTrigger(detail.trigger)) return

      const supabase = createSupabaseBrowserClient()
      if (!supabase) return
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      setTrigger(detail.trigger)
      setOpen(true)
    }

    window.addEventListener(EXIT_FEEDBACK_REQUEST_EVENT, onRequest)
    return () => window.removeEventListener(EXIT_FEEDBACK_REQUEST_EVENT, onRequest)
  }, [])

  const showSkip = trigger === 'export_inactive'

  return (
    <>
      {children}
      <ExitFeedbackModal
        open={open}
        trigger={trigger}
        onClose={close}
        onDismiss={dismiss}
        showSkip={showSkip}
      />
    </>
  )
}
