'use client'

import { useDirectorStudioStore } from '@/stores/director-studio-store'

let installed = false

/** Patches fetch for /api/generate-script to inject director studio context (Director Mode only). */
export function installDirectorGenerationFetchPatch(): void {
  if (typeof window === 'undefined' || installed) return
  installed = true
  const originalFetch = window.fetch.bind(window)

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (
      url.includes('/api/generate-script') &&
      init?.method?.toUpperCase() === 'POST' &&
      typeof init.body === 'string'
    ) {
      const store = useDirectorStudioStore.getState()
      const hasStoryPackage = Boolean(store.storyDirectorPackage)
      if (store.projectId && (store.directorApproved || hasStoryPackage)) {
        try {
          const body = JSON.parse(init.body) as Record<string, unknown>
          body.projectId = store.projectId
          body.directorStudioContext = store.buildDirectorContext()
          init = { ...init, body: JSON.stringify(body) }
        } catch {
          /* keep original body */
        }
      }
    }
    return originalFetch(input, init)
  }
}
