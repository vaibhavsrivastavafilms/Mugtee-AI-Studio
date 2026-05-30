'use client'

import { ReactNode, useEffect, useState } from 'react'
import { OfflineScreen } from '@/components/app/offline-screen'

/**
 * Blocks the app only when the browser reports no network — never on API/auth failures.
 */
export function OfflineGate({ children }: { children: ReactNode }) {
  const [offline, setOffline] = useState(false)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const sync = () => {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine
      setOffline(isOffline)
      setChecked(true)
      if (process.env.NODE_ENV === 'development') {
        console.log('[bootstrap] offline status:', { navigatorOnLine: navigator.onLine, offline: isOffline })
      }
    }

    sync()
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  if (!checked) return <>{children}</>
  if (offline) return <OfflineScreen />
  return <>{children}</>
}
