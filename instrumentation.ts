export async function register() {
  const { logProviderConfigOnStartup } = await import('@/lib/ai/providers/config.server')
  logProviderConfigOnStartup()
}
