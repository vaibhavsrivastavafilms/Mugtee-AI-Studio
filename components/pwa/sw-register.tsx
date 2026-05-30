'use client'
// PWA service worker — register in production; skip in dev to avoid stale chunk caches.
import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .catch(() => {})
  }, [])

  return null
}

/** @deprecated Dev-only cleanup — prefer ServiceWorkerRegister in layout */
export function ServiceWorkerUnregister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (process.env.NODE_ENV === 'production') return
    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .catch(() => {})
  }, [])

  return null
}

export default ServiceWorkerRegister
