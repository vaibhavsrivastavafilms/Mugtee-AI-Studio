import 'server-only'

import { track } from '@/lib/posthog'

type ObservabilityContext = Record<string, string | number | boolean | null | undefined>

export function captureException(error: unknown, context?: ObservabilityContext): void {
  const message = error instanceof Error ? error.message : String(error)
  const stack = error instanceof Error ? error.stack : undefined

  track('app_error', {
    message,
    stack: stack?.slice(0, 500) ?? null,
    ...context,
  })

  if (process.env.SENTRY_DSN?.trim()) {
    void import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureException(error, { extra: context })
      })
      .catch(() => {
        /* optional dependency */
      })
  }
}

export function captureMessage(message: string, context?: ObservabilityContext): void {
  track('app_message', { message, ...context })

  if (process.env.SENTRY_DSN?.trim()) {
    void import('@sentry/nextjs')
      .then((Sentry) => {
        Sentry.captureMessage(message, { extra: context })
      })
      .catch(() => {
        /* optional dependency */
      })
  }
}

export function trackPipelineEvent(
  event: string,
  context?: ObservabilityContext
): void {
  track(event, context)
}
