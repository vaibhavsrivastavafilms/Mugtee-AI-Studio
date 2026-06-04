import 'server-only'

type BackgroundTask = Promise<unknown>

/**
 * Keeps export work alive after the HTTP response on Vercel (waitUntil).
 * Falls back to fire-and-forget locally when @vercel/functions is unavailable.
 */
export function runExportInBackground(task: () => BackgroundTask): void {
  let promise: BackgroundTask
  try {
    promise = task()
  } catch (err) {
    console.error('[export] background task sync failed', err)
    return
  }

  promise = promise.catch((err) => {
    console.error('[export] background task failed', err)
  })

  try {
    const { waitUntil } = require('@vercel/functions') as {
      waitUntil: (p: Promise<unknown>) => void
    }
    if (typeof waitUntil === 'function') {
      waitUntil(promise)
      return
    }
  } catch {
    /* local dev or package not installed */
  }

  void promise
}
