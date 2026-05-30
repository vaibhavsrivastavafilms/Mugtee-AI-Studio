'use client'

import { useEffect, useRef } from 'react'
import { requestExitFeedback } from '@/lib/creator/exit-feedback'

const MIN_DWELL_MS = 5000

/** Fires exit feedback once per session when user leaves /pricing. */
export function PricingExitTracker() {
  const enteredAt = useRef(Date.now())
  const fired = useRef(false)

  useEffect(() => {
    enteredAt.current = Date.now()

    const maybeFire = () => {
      if (fired.current) return
      if (Date.now() - enteredAt.current < MIN_DWELL_MS) return
      fired.current = true
      requestExitFeedback('pricing_leave')
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') maybeFire()
    }

    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      maybeFire()
    }
  }, [])

  return null
}
