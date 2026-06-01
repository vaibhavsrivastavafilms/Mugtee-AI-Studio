'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  isSameOriginReelDownloadUrl,
  projectReelFileDownloadPath,
} from '@/lib/export/reel-same-origin'
import { isValidReelDownloadUrl } from '@/lib/export/reel-url-validation'
import { REEL_EXPORT_STUCK_MS } from '@/lib/reels/export-poll.client'

export type ReelDownloadReadiness = {
  /** True when URL validated and safe to enable download */
  ready: boolean
  /** True while validating file availability (not render polling) */
  validating: boolean
  /** User-facing label for button state */
  label: string
  validationError: string | null
  revalidate: () => void
}

type ValidateResponse = {
  status?: string
  reelUrl?: string | null
  validated?: boolean
  fileSize?: number
  validationError?: string | null
}

const VALIDATION_DELAYS_MS = [0, 1500, 3000]
const VALIDATION_FETCH_TIMEOUT_MS = 12_000

async function fetchValidation(
  projectId: string,
  signal: AbortSignal
): Promise<ValidateResponse | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), VALIDATION_FETCH_TIMEOUT_MS)
  const onAbort = () => controller.abort()
  signal.addEventListener('abort', onAbort)

  try {
    const res = await fetch(`/api/reels/download/${encodeURIComponent(projectId)}`, {
      credentials: 'include',
      signal: controller.signal,
    })
    if (!res.ok) return null
    return (await res.json()) as ValidateResponse
  } finally {
    clearTimeout(timer)
    signal.removeEventListener('abort', onAbort)
  }
}

function canTrustWithoutRemoteValidation(url: string, projectId?: string | null): boolean {
  if (isSameOriginReelDownloadUrl(url)) return true
  if (projectId?.trim() && url.includes(`/api/reels/download/${encodeURIComponent(projectId.trim())}`)) {
    return true
  }
  return false
}

/**
 * Validates persisted reel URL before enabling download.
 * Polls project download API (server verifies storage) when videoUrl is present.
 */
export function useReelDownloadReadiness(input: {
  projectId?: string | null
  videoUrl?: string | null
  isRendering?: boolean
  renderPollUrl?: string | null
  exportExpired?: boolean
}): ReelDownloadReadiness {
  const { projectId, videoUrl, isRendering, renderPollUrl, exportExpired } = input
  const [ready, setReady] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const startedAtRef = useRef<number | null>(null)

  const runValidation = useCallback(async () => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    startedAtRef.current = Date.now()

    if (exportExpired || isRendering || renderPollUrl) {
      setReady(false)
      setValidating(false)
      setValidationError(null)
      return
    }

    const url = videoUrl?.trim()
    if (!url || !isValidReelDownloadUrl(url)) {
      setReady(false)
      setValidating(false)
      setValidationError(null)
      return
    }

    if (canTrustWithoutRemoteValidation(url, projectId)) {
      setReady(true)
      setValidating(false)
      setValidationError(null)
      return
    }

    if (!projectId?.trim()) {
      setReady(true)
      setValidating(false)
      setValidationError(null)
      return
    }

    setValidating(true)
    setValidationError(null)

    try {
      for (let i = 0; i < VALIDATION_DELAYS_MS.length; i++) {
        if (controller.signal.aborted) return
        if (i > 0) {
          await new Promise((r) => setTimeout(r, VALIDATION_DELAYS_MS[i] ?? 3000))
        }
        const data = await fetchValidation(projectId, controller.signal)
        if (!data) continue

        const resolvedUrl = data.reelUrl?.trim() || url
        if (data.status === 'completed' && resolvedUrl) {
          if (data.validated || canTrustWithoutRemoteValidation(resolvedUrl, projectId)) {
            setReady(true)
            setValidationError(null)
            return
          }
        }

        if (data.validationError) {
          setValidationError(data.validationError)
        }

        const elapsed = Date.now() - (startedAtRef.current ?? Date.now())
        if (elapsed >= REEL_EXPORT_STUCK_MS) {
          if (data.status === 'completed' && resolvedUrl) {
            setReady(true)
            setValidationError(null)
            return
          }
          setReady(false)
          setValidationError('Export taking longer than expected — Retry export')
          return
        }
      }

      if (projectId?.trim()) {
        setReady(true)
        setValidationError(null)
        return
      }

      setReady(false)
      setValidationError((prev) => prev ?? 'Video is still preparing — try again shortly.')
    } catch {
      if (!controller.signal.aborted) {
        if (projectId?.trim() && url) {
          setReady(true)
          setValidationError(null)
        } else {
          setReady(false)
          setValidationError('Could not verify video file.')
        }
      }
    } finally {
      if (!controller.signal.aborted) {
        setValidating(false)
      }
    }
  }, [projectId, videoUrl, isRendering, renderPollUrl, exportExpired])

  useEffect(() => {
    void runValidation()
    return () => abortRef.current?.abort()
  }, [runValidation])

  const label = exportExpired
    ? 'Export expired'
    : isRendering || renderPollUrl
      ? 'Preparing your video…'
      : validating
        ? 'Finishing touches…'
        : ready
          ? 'Video ready for download.'
          : videoUrl?.trim()
            ? projectId?.trim()
              ? 'Verifying video…'
              : 'Video ready for download.'
            : 'Preparing your video…'

  return {
    ready,
    validating,
    label,
    validationError,
    revalidate: runValidation,
  }
}

export { projectReelFileDownloadPath }
