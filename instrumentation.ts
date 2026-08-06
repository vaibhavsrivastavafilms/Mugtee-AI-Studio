export async function register() {
  const { logProviderConfigOnStartup } = await import('@/lib/ai/providers/config.server')
  logProviderConfigOnStartup()

  const { validateV3TextProvidersOnStartup } = await import(
    '@/agents/shared/provider-fallback.server'
  )
  validateV3TextProvidersOnStartup()

  const { validateV7TextProvidersOnStartup } = await import('@/lib/v7/providers/text.server')
  validateV7TextProvidersOnStartup()

  const { validateV7ImageProvidersOnStartup } = await import('@/lib/v7/providers/image.server')
  validateV7ImageProvidersOnStartup()

  const { validateV7VideoProvidersOnStartup } = await import('@/lib/v7/providers/video.server')
  validateV7VideoProvidersOnStartup()

  if (process.env.SENTRY_DSN?.trim() && process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const Sentry = await import('@sentry/nextjs')
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        tracesSampleRate: 0.1,
        enabled: process.env.NODE_ENV === 'production',
      })
    } catch {
      /* optional dependency */
    }
  }
}
