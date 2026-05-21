'use client'
// Mugtee PWA — Service Worker registration (client-only, production-only).
//
// Why a dedicated client component:
//   • SW must register *after* hydration to avoid SSR crashes
//   • Only enabled in production (NODE_ENV) to keep dev HMR working
//   • Registration is fire-and-forget; any failure is swallowed so it can
//     never break the rest of the app (analytics, auth, etc).
//
// Renders nothing.
import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    // Defer to idle so we never block first paint / hydration.
    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => { /* swallow — SW is best-effort */ })
    }

    if ('requestIdleCallback' in window) {
      ;(window as any).requestIdleCallback(register, { timeout: 4000 })
    } else {
      window.setTimeout(register, 1500)
    }
  }, [])

  return null
}

export default ServiceWorkerRegister
