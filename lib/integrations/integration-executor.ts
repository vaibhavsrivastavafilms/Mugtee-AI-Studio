import { getIntegration } from '@/lib/integrations/integration-registry'
import type { IntegrationActionResult } from '@/lib/integrations/types'

export async function executeIntegrationAction(
  provider: string,
  action: string,
  args: Record<string, unknown> = {}
): Promise<IntegrationActionResult> {
  const started = Date.now()
  const integration = getIntegration(provider)
  if (!integration) {
    return {
      ok: false,
      provider,
      action,
      stub: false,
      error: `Unknown provider: ${provider}`,
    }
  }

  try {
    const data = await integration.execute(action, args)
    return {
      ok: true,
      provider,
      action,
      stub: Boolean((data as { stub?: boolean })?.stub ?? true),
      data,
    }
  } catch (err) {
    return {
      ok: false,
      provider,
      action,
      stub: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    void started
  }
}
