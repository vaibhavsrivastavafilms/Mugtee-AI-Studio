'use client'

import { useEffect, useState } from 'react'
import { isCompanionPublicEnabled } from '@/lib/companion/access'

type CompanionAccessState = {
  enabled: boolean
  loading: boolean
}

/**
 * Client gate for Live Companion UI — public env OR admin/beta (via /api/companion/access).
 */
export function useCompanionAccess(): CompanionAccessState {
  const publicEnabled = isCompanionPublicEnabled()
  const [enabled, setEnabled] = useState(publicEnabled)
  const [loading, setLoading] = useState(!publicEnabled)

  useEffect(() => {
    if (publicEnabled) {
      setEnabled(true)
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/companion/access', { cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) {
            setEnabled(false)
            setLoading(false)
          }
          return
        }
        const data = (await res.json()) as { enabled?: boolean }
        if (!cancelled) {
          setEnabled(Boolean(data.enabled))
          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setEnabled(false)
          setLoading(false)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [publicEnabled])

  return { enabled, loading }
}
