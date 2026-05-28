'use client'
// Legacy PWA service worker — registration disabled to avoid stale /_next/static chunk caches in dev.
// On mount, unregister any existing workers so browsers stop serving old bundles.
import { useEffect } from 'react'

export function ServiceWorkerUnregister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return

    void navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((r) => r.unregister())))
      .catch(() => {})
  }, [])

  return null
}

/** @deprecated Registration disabled — use ServiceWorkerUnregister */
export function ServiceWorkerRegister() {
  return <ServiceWorkerUnregister />
}

export default ServiceWorkerUnregister